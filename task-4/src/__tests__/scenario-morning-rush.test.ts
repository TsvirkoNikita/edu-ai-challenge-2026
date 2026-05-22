import { describe, it, expect, beforeEach } from "vitest";
import { computeSchedule } from "../scheduler.js";
import { AirportStore } from "../state.js";
import type { AtcConfig } from "../config.js";

export function makeConfig(overrides: Partial<AtcConfig> = {}): AtcConfig {
  return {
    runways: [
      { id: "09L", length: 3500, ops: "both" },
      { id: "09R", length: 2400, ops: "both" },
    ],
    gateCount: 4,
    groundCrewCount: 3,
    separationTakeoffSec: 90,
    separationLandingSec: 120,
    separationMixedSec: 150,
    gateTurnaroundSec: 1800,
    dependencyBufferSec: 600,
    schedulingHorizonSec: 86400,
    arrivalDurationSec: 300,
    departureDurationSec: 240,
    epochSec: 0,
    epochIso: "1970-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("Scenario 1: Morning Rush", () => {
  let store: AirportStore;
  beforeEach(() => {
    store = new AirportStore();
  });

  it("schedules mixed arrivals and departures with priority ordering", () => {
    store.addFlight({
      flightNumber: "HI-ARR",
      opType: "arrival",
      priority: "high",
      dependencies: [],
      requirements: {},
    });
    store.addFlight({
      flightNumber: "MED-DEP",
      opType: "departure",
      priority: "medium",
      dependencies: [],
      requirements: {},
    });
    store.addFlight({
      flightNumber: "LO-ARR",
      opType: "arrival",
      priority: "low",
      dependencies: [],
      requirements: {},
    });
    store.addFlight({
      flightNumber: "LO-DEP",
      opType: "departure",
      priority: "low",
      dependencies: [],
      requirements: {},
    });

    const config = makeConfig();
    const result = computeSchedule(store.listFlights(), config);

    expect(result.scheduled).toHaveLength(4);
    expect(result.unscheduled).toHaveLength(0);

    // Higher priority should be scheduled at or before lower priority on the same runway.
    const startByNumber = new Map(
      result.scheduled.map((s) => [s.flightNumber, s.startTime] as const),
    );
    expect(startByNumber.get("HI-ARR")!).toBeLessThanOrEqual(
      startByNumber.get("LO-ARR")!,
    );
    expect(startByNumber.get("HI-ARR")!).toBeLessThanOrEqual(
      startByNumber.get("LO-DEP")!,
    );
    expect(startByNumber.get("MED-DEP")!).toBeLessThanOrEqual(
      startByNumber.get("LO-ARR")!,
    );

    // No overlap on the same runway.
    for (const r of config.runways) {
      const ops = result.scheduled
        .filter((s) => s.runwayId === r.id)
        .sort((a, b) => a.startTime - b.startTime);
      for (let i = 1; i < ops.length; i++) {
        expect(ops[i].startTime).toBeGreaterThanOrEqual(ops[i - 1].endTime);
      }
    }
    // No overlap on the same gate.
    const gates = new Set(result.scheduled.map((s) => s.gateId));
    for (const g of gates) {
      const ops = result.scheduled
        .filter((s) => s.gateId === g)
        .sort((a, b) => a.startTime - b.startTime);
      for (let i = 1; i < ops.length; i++) {
        expect(ops[i].startTime).toBeGreaterThanOrEqual(ops[i - 1].endTime);
      }
    }
  });
});
