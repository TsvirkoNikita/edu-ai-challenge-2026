import { z } from "zod";
import type { AtcConfig } from "../config.js";
import type { AirportStore } from "../state.js";
import { computeSchedule } from "../scheduler.js";
import { findLongestChain } from "../bottleneck.js";
import type { Flight, ScheduleResult } from "../types.js";

/**
 * Convert internal "seconds since epoch" times to absolute ISO timestamps for output.
 */
function toIso(secondsFromEpoch: number, config: AtcConfig): string {
  return new Date((config.epochSec + secondsFromEpoch) * 1000).toISOString();
}

function flightToJson(f: Flight) {
  return {
    flightNumber: f.flightNumber,
    opType: f.opType,
    priority: f.priority,
    dependencies: f.dependencies,
    requirements: f.requirements,
    status: f.status,
    reason: f.reason,
    submissionSeq: f.submissionSeq,
  };
}

function scheduleToJson(result: ScheduleResult | null, config: AtcConfig) {
  if (!result) return null;
  return {
    scheduled: result.scheduled.map((op) => ({
      ...op,
      startIso: toIso(op.startTime, config),
      endIso: toIso(op.endTime, config),
    })),
    unscheduled: result.unscheduled,
    completionTime: result.completionTime,
    completionIso:
      result.completionTime !== null
        ? toIso(result.completionTime, config)
        : null,
  };
}

function textResult(payload: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

function errorResult(message: string) {
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: message,
      },
    ],
  };
}

export interface ToolDeps {
  store: AirportStore;
  config: AtcConfig;
}

export function registerTools(
  server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer,
  deps: ToolDeps,
): void {
  const { store, config } = deps;

  // --- submit_flight ---------------------------------------------------------
  server.registerTool(
    "submit_flight",
    {
      title: "Submit Flight",
      description:
        "Submit a new arrival or departure to the flight queue. Flights remain in 'pending' state until generate_schedule is called.",
      inputSchema: {
        flightNumber: z
          .string()
          .min(1)
          .describe("Unique flight identifier (e.g. 'AA123')."),
        opType: z.enum(["arrival", "departure"]).describe("Operation type."),
        priority: z
          .enum(["high", "medium", "low"])
          .default("medium")
          .describe("Scheduling priority."),
        dependencies: z
          .array(z.string().min(1))
          .default([])
          .describe(
            "Flight numbers this flight depends on. A dependent flight will not be scheduled until its dependencies complete plus the configured dependency buffer.",
          ),
        requirements: z
          .object({
            minLength: z
              .number()
              .int()
              .positive()
              .optional()
              .describe(
                "Minimum runway length (meters) required by the aircraft.",
              ),
          })
          .default({})
          .describe("Optional runway requirements."),
      },
    },
    async (input) => {
      try {
        const flight = store.addFlight({
          flightNumber: input.flightNumber,
          opType: input.opType,
          priority: input.priority,
          dependencies: input.dependencies,
          requirements: input.requirements,
        });
        return textResult({ ok: true, flight: flightToJson(flight) });
      } catch (e) {
        return errorResult((e as Error).message);
      }
    },
  );

  // --- generate_schedule -----------------------------------------------------
  server.registerTool(
    "generate_schedule",
    {
      title: "Generate Schedule",
      description:
        "Recompute the airport schedule from the current flight queue and configuration. Replaces any existing schedule. Deterministic for identical inputs.",
      inputSchema: {},
    },
    async () => {
      const result = computeSchedule(store.listFlights(), config);
      store.applySchedule(result);
      return textResult({ ok: true, schedule: scheduleToJson(result, config) });
    },
  );

  // --- get_airport_status ----------------------------------------------------
  server.registerTool(
    "get_airport_status",
    {
      title: "Get Airport Status",
      description:
        "Return a structured operational snapshot: flight counts by state and op type, runway/gate capacity and usage, constraint indicators, blocked flights with reasons, and current completion time.",
      inputSchema: {},
    },
    async () => {
      const flights = store.listFlights();
      const last = store.getLastSchedule();

      const countsByStatus = {
        pending: 0,
        scheduled: 0,
        unscheduled: 0,
        cancelled: 0,
      };
      const countsByOpType = { arrival: 0, departure: 0 };
      for (const f of flights) {
        countsByStatus[f.status]++;
        countsByOpType[f.opType]++;
      }

      // Runway usage
      const runwayUsage = config.runways.map((r) => {
        const ops = (last?.scheduled ?? []).filter((s) => s.runwayId === r.id);
        const busyTime = ops.reduce(
          (acc, o) => acc + (o.endTime - o.startTime),
          0,
        );
        return {
          runwayId: r.id,
          length: r.length,
          ops: r.ops,
          scheduledCount: ops.length,
          busyTimeSec: busyTime,
        };
      });

      // Gate usage
      const gateUsage = Array.from({ length: config.gateCount }, (_, gi) => {
        const gateId = `G${gi + 1}`;
        const ops = (last?.scheduled ?? []).filter((s) => s.gateId === gateId);
        return { gateId, scheduledCount: ops.length };
      });

      const blocked = (last?.unscheduled ?? []).concat(
        flights
          .filter(
            (f) =>
              f.status === "unscheduled" &&
              !(last?.unscheduled ?? []).some(
                (u) => u.flightNumber === f.flightNumber,
              ),
          )
          .map((f) => ({
            flightNumber: f.flightNumber,
            reason: f.reason ?? "unknown",
          })),
      );

      const allRunwaysFull =
        last !== null &&
        last.scheduled.length > 0 &&
        runwayUsage.every((r) => r.scheduledCount > 0);
      const allGatesUsed =
        last !== null &&
        last.scheduled.length > 0 &&
        gateUsage.every((g) => g.scheduledCount > 0);

      return textResult({
        ok: true,
        epochIso: config.epochIso,
        countsByStatus,
        countsByOpType,
        runwayUsage,
        gateUsage,
        constraints: {
          gateCount: config.gateCount,
          groundCrewCount: config.groundCrewCount,
          schedulingHorizonSec: config.schedulingHorizonSec,
          allRunwaysUsed: allRunwaysFull,
          allGatesUsed,
          hasUnscheduled: blocked.length > 0,
        },
        blocked,
        completionTime: last?.completionTime ?? null,
        completionIso:
          last?.completionTime != null
            ? toIso(last.completionTime, config)
            : null,
      });
    },
  );

  // --- cancel_flight ---------------------------------------------------------
  server.registerTool(
    "cancel_flight",
    {
      title: "Cancel Flight",
      description:
        "Mark a flight as cancelled and recompute the schedule. Dependents of the cancelled flight become unscheduled with reason 'dependency_cancelled'.",
      inputSchema: {
        flightNumber: z.string().min(1).describe("Flight number to cancel."),
        reason: z
          .string()
          .optional()
          .describe("Optional human-readable cancellation reason."),
      },
    },
    async (input) => {
      try {
        const cancelled = store.cancelFlight(
          input.flightNumber,
          input.reason ?? "cancelled_by_user",
        );
        const result = computeSchedule(store.listFlights(), config);
        store.applySchedule(result);
        const affected = result.unscheduled.filter((u) =>
          u.reason.startsWith("dependency_cancelled"),
        );
        return textResult({
          ok: true,
          cancelled: flightToJson(cancelled),
          affectedDependents: affected,
          schedule: scheduleToJson(result, config),
        });
      } catch (e) {
        return errorResult((e as Error).message);
      }
    },
  );

  // --- analyze_bottleneck ----------------------------------------------------
  server.registerTool(
    "analyze_bottleneck",
    {
      title: "Analyze Bottleneck",
      description:
        "Identify the longest active dependency chain in the current schedule. Returns the ordered list of flights and the total elapsed duration (including dependency buffers).",
      inputSchema: {},
    },
    async () => {
      const last = store.getLastSchedule();
      if (!last || last.scheduled.length === 0) {
        return textResult({
          ok: true,
          chain: null,
          message: "No schedule available; call generate_schedule first.",
        });
      }
      const chain = findLongestChain(
        last.scheduled,
        store.listFlights(),
        config,
      );
      return textResult({
        ok: true,
        chain,
        dependencyBufferSec: config.dependencyBufferSec,
        arrivalDurationSec: config.arrivalDurationSec,
        departureDurationSec: config.departureDurationSec,
      });
    },
  );

}
