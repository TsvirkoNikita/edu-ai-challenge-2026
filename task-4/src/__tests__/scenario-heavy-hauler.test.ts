import { describe, it, expect } from "vitest";
import { computeSchedule } from "../scheduler.js";
import { AirportStore } from "../state.js";
import { makeConfig } from "./scenario-morning-rush.test.js";

describe("Scenario 2: Heavy Hauler", () => {
  it("leaves oversized flights unscheduled while still scheduling smaller ones", () => {
    const store = new AirportStore();
    store.addFlight({
      flightNumber: "HVY1",
      opType: "departure",
      priority: "high",
      dependencies: [],
      requirements: { minLength: 5000 },
    });
    store.addFlight({
      flightNumber: "REG1",
      opType: "arrival",
      priority: "medium",
      dependencies: [],
      requirements: {},
    });

    const config = makeConfig(); // max runway length is 3500
    const result = computeSchedule(store.listFlights(), config);

    const unsched = result.unscheduled.find((u) => u.flightNumber === "HVY1");
    expect(unsched).toBeDefined();
    expect(unsched!.reason).toMatch(/no_runway_with_required_length/);
    expect(result.scheduled.some((s) => s.flightNumber === "REG1")).toBe(true);
  });

  it("rejects op types with no compatible runway", () => {
    const store = new AirportStore();
    store.addFlight({
      flightNumber: "DEP1",
      opType: "departure",
      priority: "medium",
      dependencies: [],
      requirements: {},
    });
    const config = makeConfig({
      runways: [{ id: "09A", length: 4000, ops: "arrival" }],
    });
    const result = computeSchedule(store.listFlights(), config);
    const u = result.unscheduled.find((x) => x.flightNumber === "DEP1");
    expect(u).toBeDefined();
    expect(u!.reason).toMatch(/no_runway_supports_op_type/);
  });
});
