import type { AtcConfig } from "./config.js";
import type { BottleneckChain, Flight, ScheduledOp } from "./types.js";

/**
 * Find the longest dependency chain among scheduled flights. The chain length is the
 * elapsed wall-clock time from the start of the first scheduled op to the end of the
 * last, accounting for both operation durations and dependency buffers.
 *
 * Returns null if no scheduled flights exist.
 */
export function findLongestChain(
  scheduledOps: ScheduledOp[],
  flights: Flight[],
  config: AtcConfig,
): BottleneckChain | null {
  if (scheduledOps.length === 0) return null;

  const scheduledByNumber = new Map(
    scheduledOps.map((o) => [o.flightNumber, o] as const),
  );
  const flightByNumber = new Map(
    flights.map((f) => [f.flightNumber, f] as const),
  );

  // Build adjacency: dep -> dependents, but only for scheduled flights whose deps are
  // also scheduled (these are "active" dependency edges).
  const edges = new Map<string, string[]>();
  for (const f of flights) {
    if (!scheduledByNumber.has(f.flightNumber)) continue;
    for (const dep of f.dependencies) {
      if (!scheduledByNumber.has(dep)) continue;
      if (!edges.has(dep)) edges.set(dep, []);
      edges.get(dep)!.push(f.flightNumber);
    }
  }

  // For each scheduled flight, the longest chain ending at it = its op end time minus
  // the earliest start time of any chain leading to it. Use memoized DFS computing
  // (earliestStart, chainPath) for each node from its "roots" (nodes with no scheduled deps).
  const memo = new Map<string, { earliestStart: number; path: string[] }>();

  function compute(flightNumber: string): {
    earliestStart: number;
    path: string[];
  } {
    const cached = memo.get(flightNumber);
    if (cached) return cached;
    const op = scheduledByNumber.get(flightNumber)!;
    const flight = flightByNumber.get(flightNumber)!;
    const scheduledDeps = flight.dependencies.filter((d) =>
      scheduledByNumber.has(d),
    );
    if (scheduledDeps.length === 0) {
      const r = { earliestStart: op.startTime, path: [flightNumber] };
      memo.set(flightNumber, r);
      return r;
    }
    // Pick the dep that yields the longest chain duration ending here.
    // Tie-break: prefer the longer chain (more flights); then lexicographic for
    // determinism.
    let best: { earliestStart: number; path: string[] } | null = null;
    for (const dep of scheduledDeps) {
      const sub = compute(dep);
      const candidatePath = [...sub.path, flightNumber];
      if (best === null || sub.earliestStart < best.earliestStart) {
        best = { earliestStart: sub.earliestStart, path: candidatePath };
      } else if (sub.earliestStart === best.earliestStart) {
        if (candidatePath.length > best.path.length) {
          best = { earliestStart: sub.earliestStart, path: candidatePath };
        } else if (
          candidatePath.length === best.path.length &&
          candidatePath.join(",") < best.path.join(",")
        ) {
          best = { earliestStart: sub.earliestStart, path: candidatePath };
        }
      }
    }
    memo.set(flightNumber, best!);
    return best!;
  }

  let bestChain: BottleneckChain | null = null;
  for (const op of scheduledOps) {
    const { earliestStart, path } = compute(op.flightNumber);
    const duration = op.endTime - earliestStart;
    if (
      bestChain === null ||
      duration > bestChain.totalDurationSec ||
      (duration === bestChain.totalDurationSec &&
        path.length > bestChain.flights.length)
    ) {
      bestChain = { flights: path, totalDurationSec: duration };
    }
  }

  return bestChain;
}
