import type { AtcConfig } from "../config.js";
import type { AirportStore } from "../state.js";

function jsonResource(uri: string, payload: unknown) {
  return {
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

function toIso(secondsFromEpoch: number, config: AtcConfig): string {
  return new Date((config.epochSec + secondsFromEpoch) * 1000).toISOString();
}

export interface ResourceDeps {
  store: AirportStore;
  config: AtcConfig;
}

export function registerResources(
  server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer,
  deps: ResourceDeps,
): void {
  const { store, config } = deps;

  server.registerResource(
    "flight-queue",
    "atc://flights/queue",
    {
      title: "Flight Queue",
      description:
        "All known flights with current status (pending, scheduled, unscheduled, cancelled) and reasons.",
      mimeType: "application/json",
    },
    async (uri) => {
      const flights = store.listFlights();
      return jsonResource(uri.href, {
        flights: flights.map((f) => ({
          flightNumber: f.flightNumber,
          opType: f.opType,
          priority: f.priority,
          dependencies: f.dependencies,
          requirements: f.requirements,
          status: f.status,
          reason: f.reason,
          submissionSeq: f.submissionSeq,
        })),
        groups: {
          pending: flights
            .filter((f) => f.status === "pending")
            .map((f) => f.flightNumber),
          scheduled: flights
            .filter((f) => f.status === "scheduled")
            .map((f) => f.flightNumber),
          unscheduled: flights
            .filter((f) => f.status === "unscheduled")
            .map((f) => f.flightNumber),
          cancelled: flights
            .filter((f) => f.status === "cancelled")
            .map((f) => f.flightNumber),
        },
      });
    },
  );

  server.registerResource(
    "runways",
    "atc://runways",
    {
      title: "Runways",
      description:
        "Runway definitions, capabilities, and current usage windows from the most recent schedule.",
      mimeType: "application/json",
    },
    async (uri) => {
      const last = store.getLastSchedule();
      const runways = config.runways.map((r) => {
        const ops = (last?.scheduled ?? [])
          .filter((s) => s.runwayId === r.id)
          .map((s) => ({
            flightNumber: s.flightNumber,
            opType: s.opType,
            startTime: s.startTime,
            endTime: s.endTime,
            startIso: toIso(s.startTime, config),
            endIso: toIso(s.endTime, config),
          }));
        return {
          id: r.id,
          length: r.length,
          ops: r.ops,
          available: ops.length === 0,
          scheduledOps: ops,
        };
      });
      return jsonResource(uri.href, { runways, epochIso: config.epochIso });
    },
  );

  server.registerResource(
    "timeline",
    "atc://timeline",
    {
      title: "Operations Timeline",
      description:
        "Chronological list of scheduled airport operations across runways and gates.",
      mimeType: "application/json",
    },
    async (uri) => {
      const last = store.getLastSchedule();
      const events = (last?.scheduled ?? [])
        .slice()
        .sort((a, b) => a.startTime - b.startTime)
        .map((op) => ({
          flightNumber: op.flightNumber,
          opType: op.opType,
          runwayId: op.runwayId,
          gateId: op.gateId,
          startTime: op.startTime,
          endTime: op.endTime,
          startIso: toIso(op.startTime, config),
          endIso: toIso(op.endTime, config),
        }));
      return jsonResource(uri.href, {
        epochIso: config.epochIso,
        events,
        completionTime: last?.completionTime ?? null,
        completionIso:
          last?.completionTime != null
            ? toIso(last.completionTime, config)
            : null,
      });
    },
  );
}
