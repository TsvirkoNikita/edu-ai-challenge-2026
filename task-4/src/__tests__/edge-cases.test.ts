import { describe, it, expect } from "vitest";
import { computeSchedule } from "../scheduler.js";
import { AirportStore } from "../state.js";
import { loadConfig } from "../config.js";
import { makeConfig } from "./scenario-morning-rush.test.js";

describe("Edge cases", () => {
  it("produces deterministic results for identical inputs and configuration", () => {
    function build(): AirportStore {
      const s = new AirportStore();
      s.addFlight({
        flightNumber: "A1",
        opType: "arrival",
        priority: "high",
        dependencies: [],
        requirements: {},
      });
      s.addFlight({
        flightNumber: "D1",
        opType: "departure",
        priority: "medium",
        dependencies: ["A1"],
        requirements: {},
      });
      s.addFlight({
        flightNumber: "A2",
        opType: "arrival",
        priority: "low",
        dependencies: [],
        requirements: {},
      });
      s.addFlight({
        flightNumber: "D2",
        opType: "departure",
        priority: "medium",
        dependencies: [],
        requirements: {},
      });
      return s;
    }
    const config = makeConfig();
    const r1 = computeSchedule(build().listFlights(), config);
    const r2 = computeSchedule(build().listFlights(), config);
    expect(JSON.stringify(r1)).toEqual(JSON.stringify(r2));
  });

  it("detects dependency cycles and marks the involved flights unscheduled", () => {
    const store = new AirportStore();
    store.addFlight({
      flightNumber: "X",
      opType: "arrival",
      priority: "medium",
      dependencies: ["Y"],
      requirements: {},
    });
    store.addFlight({
      flightNumber: "Y",
      opType: "departure",
      priority: "medium",
      dependencies: ["X"],
      requirements: {},
    });
    const result = computeSchedule(store.listFlights(), makeConfig());
    const reasons = new Set(
      result.unscheduled.map((u) => `${u.flightNumber}:${u.reason}`),
    );
    expect(reasons.has("X:dependency_cycle")).toBe(true);
    expect(reasons.has("Y:dependency_cycle")).toBe(true);
  });

  it("respects gate turnaround between arrival and same-gate reuse", () => {
    // Single gate forces sequential use; arrival holds gate through turnaround.
    const store = new AirportStore();
    store.addFlight({
      flightNumber: "A1",
      opType: "arrival",
      priority: "high",
      dependencies: [],
      requirements: {},
    });
    store.addFlight({
      flightNumber: "A2",
      opType: "arrival",
      priority: "medium",
      dependencies: [],
      requirements: {},
    });
    const config = makeConfig({ gateCount: 1 });
    const result = computeSchedule(store.listFlights(), config);
    const a1 = result.scheduled.find((s) => s.flightNumber === "A1")!;
    const a2 = result.scheduled.find((s) => s.flightNumber === "A2")!;
    // A2 must wait at least until A1.end + gateTurnaround at the same gate.
    if (a1.gateId === a2.gateId) {
      expect(a2.startTime).toBeGreaterThanOrEqual(
        a1.endTime + config.gateTurnaroundSec,
      );
    }
  });

  it("flags unknown dependency", () => {
    const store = new AirportStore();
    store.addFlight({
      flightNumber: "Z1",
      opType: "departure",
      priority: "medium",
      dependencies: ["NOPE"],
      requirements: {},
    });
    const result = computeSchedule(store.listFlights(), makeConfig());
    const u = result.unscheduled.find((x) => x.flightNumber === "Z1");
    expect(u).toBeDefined();
    expect(u!.reason).toMatch(/unknown_dependency/);
  });
});

describe("Dependency exclusion propagation", () => {
  it("marks dependents of a static-infeasible flight as unscheduled with root cause", () => {
    const store = new AirportStore();
    store.addFlight({
      flightNumber: "HVY",
      opType: "departure",
      priority: "high",
      dependencies: [],
      requirements: { minLength: 9000 },
    });
    store.addFlight({
      flightNumber: "DEP",
      opType: "departure",
      priority: "medium",
      dependencies: ["HVY"],
      requirements: {},
    });
    const result = computeSchedule(store.listFlights(), makeConfig());
    expect(result.scheduled.some((s) => s.flightNumber === "DEP")).toBe(false);
    const u = result.unscheduled.find((x) => x.flightNumber === "DEP");
    expect(u).toBeDefined();
    expect(u!.reason).toMatch(/dependency_unscheduled: HVY/);
  });

  it("marks dependents of a cycle member as unscheduled", () => {
    const store = new AirportStore();
    // B <-> C cycle, A depends on B.
    store.addFlight({
      flightNumber: "B",
      opType: "arrival",
      priority: "medium",
      dependencies: ["C"],
      requirements: {},
    });
    store.addFlight({
      flightNumber: "C",
      opType: "departure",
      priority: "medium",
      dependencies: ["B"],
      requirements: {},
    });
    store.addFlight({
      flightNumber: "A",
      opType: "arrival",
      priority: "high",
      dependencies: ["B"],
      requirements: {},
    });
    const result = computeSchedule(store.listFlights(), makeConfig());
    expect(result.scheduled.some((s) => s.flightNumber === "A")).toBe(false);
    const u = result.unscheduled.find((x) => x.flightNumber === "A");
    expect(u).toBeDefined();
    expect(u!.reason).toMatch(/dependency_unscheduled: B/);
  });

  it("propagates cancellation transitively through dependency chains", () => {
    const store = new AirportStore();
    store.addFlight({
      flightNumber: "ROOT",
      opType: "arrival",
      priority: "medium",
      dependencies: [],
      requirements: {},
    });
    store.addFlight({
      flightNumber: "MID",
      opType: "departure",
      priority: "medium",
      dependencies: ["ROOT"],
      requirements: {},
    });
    store.addFlight({
      flightNumber: "LEAF",
      opType: "departure",
      priority: "medium",
      dependencies: ["MID"],
      requirements: {},
    });
    store.cancelFlight("ROOT", "weather");
    const result = computeSchedule(store.listFlights(), makeConfig());
    const reasons = new Map(
      result.unscheduled.map((u) => [u.flightNumber, u.reason] as const),
    );
    expect(reasons.get("MID")).toMatch(/dependency_cancelled: ROOT/);
    expect(reasons.get("LEAF")).toBeDefined();
    expect(reasons.get("LEAF")!).toMatch(/dependency_/);
  });
});

describe("Config validation", () => {
  it("rejects missing required env vars with a clear aggregated error", () => {
    expect(() => loadConfig({})).toThrowError(/Invalid ATC configuration/);
  });

  it("rejects invalid runway JSON", () => {
    expect(() =>
      loadConfig({
        ATC_RUNWAYS: "not-json",
        ATC_GATE_COUNT: "1",
        ATC_GROUND_CREW_COUNT: "1",
        ATC_SEPARATION_TAKEOFF_SEC: "1",
        ATC_SEPARATION_LANDING_SEC: "1",
        ATC_SEPARATION_MIXED_SEC: "1",
        ATC_GATE_TURNAROUND_SEC: "1",
        ATC_DEPENDENCY_BUFFER_SEC: "1",
        ATC_SCHEDULING_HORIZON_SEC: "100",
        ATC_ARRIVAL_DURATION_SEC: "1",
        ATC_DEPARTURE_DURATION_SEC: "1",
      } as NodeJS.ProcessEnv),
    ).toThrow(/ATC_RUNWAYS/);
  });

  it("loads a fully valid configuration", () => {
    const cfg = loadConfig({
      ATC_RUNWAYS: '[{"id":"09L","length":3000,"ops":"both"}]',
      ATC_GATE_COUNT: "2",
      ATC_GROUND_CREW_COUNT: "2",
      ATC_SEPARATION_TAKEOFF_SEC: "60",
      ATC_SEPARATION_LANDING_SEC: "90",
      ATC_SEPARATION_MIXED_SEC: "120",
      ATC_GATE_TURNAROUND_SEC: "900",
      ATC_DEPENDENCY_BUFFER_SEC: "300",
      ATC_SCHEDULING_HORIZON_SEC: "3600",
      ATC_ARRIVAL_DURATION_SEC: "180",
      ATC_DEPARTURE_DURATION_SEC: "180",
      ATC_EPOCH_ISO: "2026-01-01T00:00:00Z",
    } as NodeJS.ProcessEnv);
    expect(cfg.runways).toHaveLength(1);
    expect(cfg.gateCount).toBe(2);
    expect(cfg.epochIso).toBe("2026-01-01T00:00:00.000Z");
  });
});
