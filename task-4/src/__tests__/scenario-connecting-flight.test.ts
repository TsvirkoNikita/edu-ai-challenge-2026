import { describe, it, expect } from "vitest";
import { computeSchedule } from "../scheduler.js";
import { AirportStore } from "../state.js";
import { makeConfig } from "./scenario-morning-rush.test.js";
import { findLongestChain } from "../bottleneck.js";

describe("Scenario 3: Connecting Flight", () => {
  it("schedules a dependent departure only after its inbound arrival completes plus buffer", () => {
    const store = new AirportStore();
    store.addFlight({
      flightNumber: "IN100",
      opType: "arrival",
      priority: "medium",
      dependencies: [],
      requirements: {},
    });
    store.addFlight({
      flightNumber: "OUT200",
      opType: "departure",
      priority: "medium",
      dependencies: ["IN100"],
      requirements: {},
    });

    const config = makeConfig();
    const result = computeSchedule(store.listFlights(), config);

    expect(result.scheduled).toHaveLength(2);
    const inbound = result.scheduled.find((s) => s.flightNumber === "IN100")!;
    const outbound = result.scheduled.find((s) => s.flightNumber === "OUT200")!;
    expect(outbound.startTime).toBeGreaterThanOrEqual(
      inbound.endTime + config.dependencyBufferSec,
    );
  });

  it("identifies the dependency chain as the bottleneck", () => {
    const store = new AirportStore();
    store.addFlight({
      flightNumber: "IN100",
      opType: "arrival",
      priority: "medium",
      dependencies: [],
      requirements: {},
    });
    store.addFlight({
      flightNumber: "OUT200",
      opType: "departure",
      priority: "medium",
      dependencies: ["IN100"],
      requirements: {},
    });
    const config = makeConfig();
    const result = computeSchedule(store.listFlights(), config);
    const chain = findLongestChain(
      result.scheduled,
      store.listFlights(),
      config,
    );
    expect(chain).not.toBeNull();
    expect(chain!.flights).toEqual(["IN100", "OUT200"]);
    expect(chain!.totalDurationSec).toBe(
      config.arrivalDurationSec +
        config.dependencyBufferSec +
        config.departureDurationSec,
    );
  });

  it("marks dependents unscheduled when the dependency is cancelled", () => {
    const store = new AirportStore();
    store.addFlight({
      flightNumber: "IN100",
      opType: "arrival",
      priority: "medium",
      dependencies: [],
      requirements: {},
    });
    store.addFlight({
      flightNumber: "OUT200",
      opType: "departure",
      priority: "medium",
      dependencies: ["IN100"],
      requirements: {},
    });
    store.cancelFlight("IN100", "weather");
    const config = makeConfig();
    const result = computeSchedule(store.listFlights(), config);
    const u = result.unscheduled.find((x) => x.flightNumber === "OUT200");
    expect(u).toBeDefined();
    expect(u!.reason).toMatch(/dependency_cancelled/);
  });
});
