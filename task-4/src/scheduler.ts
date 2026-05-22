import type { AtcConfig } from "./config.js";
import type {
  Flight,
  OpType,
  Priority,
  RunwayDef,
  ScheduledOp,
  ScheduleResult,
} from "./types.js";

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

interface RunwayUsage {
  /** Sorted list of ops placed on this runway, by startTime. */
  ops: ScheduledOp[];
}

interface GateUsage {
  /** Sorted list of (start, end) windows occupied at this gate. */
  windows: Array<{ start: number; end: number }>;
}

interface CrewUsage {
  /** Concurrent ops (sorted by start). For determining ground crew availability. */
  ops: Array<{ start: number; end: number }>;
}

export function durationFor(opType: OpType, config: AtcConfig): number {
  return opType === "arrival"
    ? config.arrivalDurationSec
    : config.departureDurationSec;
}

/** Required separation buffer between a previous and following op on the same runway. */
function separationFor(prev: OpType, next: OpType, config: AtcConfig): number {
  if (prev === next) {
    return next === "departure"
      ? config.separationTakeoffSec
      : config.separationLandingSec;
  }
  return config.separationMixedSec;
}

function runwayCompatible(opType: OpType, runway: RunwayDef): boolean {
  if (runway.ops === "both") return true;
  return runway.ops === opType;
}

function meetsLength(required: number | undefined, length: number): boolean {
  if (required === undefined) return true;
  return length >= required;
}

/**
 * Find the earliest startTime on this runway >= `notBefore` at which an op of `opType`
 * with `duration` seconds can fit, respecting separation buffers with neighbouring ops.
 */
function findRunwaySlot(
  usage: RunwayUsage,
  opType: OpType,
  duration: number,
  notBefore: number,
  config: AtcConfig,
  horizonEnd: number,
): number | null {
  let candidate = notBefore;
  for (let i = 0; i < usage.ops.length; i++) {
    const op = usage.ops[i];
    if (i > 0) {
      const prev = usage.ops[i - 1];
      candidate = Math.max(
        candidate,
        prev.endTime + separationFor(prev.opType, opType, config),
      );
    }
    const sepBefore = separationFor(opType, op.opType, config);
    if (candidate + duration + sepBefore <= op.startTime) {
      if (candidate + duration <= horizonEnd) return candidate;
      return null;
    }
    candidate = Math.max(
      candidate,
      op.endTime + separationFor(op.opType, opType, config),
    );
  }
  if (usage.ops.length > 0) {
    const prev = usage.ops[usage.ops.length - 1];
    candidate = Math.max(
      candidate,
      prev.endTime + separationFor(prev.opType, opType, config),
    );
  }
  if (candidate + duration <= horizonEnd) return candidate;
  return null;
}

/**
 * Earliest startTime at this gate >= `notBefore` at which the gate is free for
 * `holdDuration` seconds.
 */
function findGateSlot(
  usage: GateUsage,
  notBefore: number,
  holdDuration: number,
  horizonEnd: number,
): number | null {
  let candidate = notBefore;
  for (const w of usage.windows) {
    if (candidate + holdDuration <= w.start) {
      if (candidate + holdDuration <= horizonEnd) return candidate;
      return null;
    }
    candidate = Math.max(candidate, w.end);
  }
  if (candidate + holdDuration <= horizonEnd) return candidate;
  return null;
}

function concurrentCrewAt(crew: CrewUsage, start: number, end: number): number {
  let count = 0;
  for (const op of crew.ops) {
    if (op.start < end && op.end > start) count++;
  }
  return count;
}

/**
 * Among the flights flagged as unordered by `topoOrder`, identify those that are
 * actually members of a dependency cycle (i.e. reachable from themselves along the
 * dep → dependent edges). Other unordered flights are merely downstream of a cycle
 * and get a `dependency_unscheduled: ...` reason via propagation instead.
 */
function findTrueCycleMembers(
  candidates: Flight[],
  unordered: Set<string>,
): Set<string> {
  if (unordered.size === 0) return new Set();
  const byNumber = new Map(
    candidates.map((f) => [f.flightNumber, f] as const),
  );
  // Adjacency: dep -> dependents (only edges within the unordered subset matter).
  const fwd = new Map<string, string[]>();
  for (const fn of unordered) fwd.set(fn, []);
  for (const fn of unordered) {
    const f = byNumber.get(fn);
    if (!f) continue;
    for (const dep of f.dependencies) {
      if (unordered.has(dep)) fwd.get(dep)!.push(fn);
    }
  }
  const result = new Set<string>();
  for (const start of unordered) {
    const stack: string[] = [...(fwd.get(start) ?? [])];
    const visited = new Set<string>();
    while (stack.length > 0) {
      const n = stack.pop()!;
      if (n === start) {
        result.add(start);
        break;
      }
      if (visited.has(n)) continue;
      visited.add(n);
      for (const d of fwd.get(n) ?? []) stack.push(d);
    }
  }
  return result;
}

/**
 * Topological sort with deterministic tie-breaking. Returns the topo order and any
 * flights involved in dependency cycles.
 */
function topoOrder(flights: Flight[]): { order: Flight[]; cycle: Set<string> } {
  const byNumber = new Map(flights.map((f) => [f.flightNumber, f] as const));
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const f of flights) {
    indeg.set(f.flightNumber, 0);
    adj.set(f.flightNumber, []);
  }
  for (const f of flights) {
    for (const dep of f.dependencies) {
      if (!byNumber.has(dep)) continue;
      adj.get(dep)!.push(f.flightNumber);
      indeg.set(f.flightNumber, (indeg.get(f.flightNumber) ?? 0) + 1);
    }
  }
  const ready: Flight[] = flights.filter(
    (f) => (indeg.get(f.flightNumber) ?? 0) === 0,
  );
  ready.sort((a, b) => a.submissionSeq - b.submissionSeq);
  const order: Flight[] = [];
  const orderedSet = new Set<string>();
  while (ready.length > 0) {
    const f = ready.shift()!;
    order.push(f);
    orderedSet.add(f.flightNumber);
    for (const dependent of adj.get(f.flightNumber)!) {
      const newDeg = (indeg.get(dependent) ?? 0) - 1;
      indeg.set(dependent, newDeg);
      if (newDeg === 0) {
        const df = byNumber.get(dependent)!;
        let i = 0;
        while (i < ready.length && ready[i].submissionSeq < df.submissionSeq)
          i++;
        ready.splice(i, 0, df);
      }
    }
  }
  if (order.length === flights.length) return { order, cycle: new Set() };
  const cycle = new Set<string>();
  for (const f of flights) {
    if (!orderedSet.has(f.flightNumber)) cycle.add(f.flightNumber);
  }
  return { order, cycle };
}

/**
 * Propagate exclusion through the dependency graph. Any flight that depends — directly
 * or transitively — on an already-excluded flight is itself excluded with reason
 * `dependency_unscheduled: <rootFailureFlight>`. The first-discovered root is kept
 * so users can trace blockage to its cause.
 */
function propagateExclusion(
  candidates: Flight[],
  excludedReasons: Map<string, string>,
): void {
  // BFS over reverse-dependency edges starting from each currently-excluded flight.
  const dependentsOf = new Map<string, string[]>();
  const byNumber = new Map(
    candidates.map((f) => [f.flightNumber, f] as const),
  );
  for (const f of candidates) {
    for (const dep of f.dependencies) {
      if (!dependentsOf.has(dep)) dependentsOf.set(dep, []);
      dependentsOf.get(dep)!.push(f.flightNumber);
    }
  }
  const queue: string[] = [...excludedReasons.keys()];
  while (queue.length > 0) {
    const failed = queue.shift()!;
    for (const dep of dependentsOf.get(failed) ?? []) {
      if (excludedReasons.has(dep)) continue;
      if (!byNumber.has(dep)) continue;
      excludedReasons.set(dep, `dependency_unscheduled: ${failed}`);
      queue.push(dep);
    }
  }
}

/**
 * Deterministic greedy scheduler. Produces identical output for identical inputs and
 * configuration. Operates in seconds since `config.epochSec`; all returned times are
 * "seconds since epoch" (i.e. 0 == config.epochSec).
 */
export function computeSchedule(
  flights: Flight[],
  config: AtcConfig,
): ScheduleResult {
  const horizonEnd = config.schedulingHorizonSec;

  const candidates = flights.filter((f) => f.status !== "cancelled");
  const cancelledSet = new Set(
    flights.filter((f) => f.status === "cancelled").map((f) => f.flightNumber),
  );
  const candidateNumbers = new Set(candidates.map((f) => f.flightNumber));

  // excludedReasons maps flightNumber -> reason for any flight that cannot be scheduled.
  // We treat cancelled flights as roots so dependents can be propagated, but we do NOT
  // emit them in the result — cancelled is a distinct status owned by the store.
  const excludedReasons = new Map<string, string>();
  const cancelRoots = new Set<string>();
  for (const c of cancelledSet) {
    cancelRoots.add(c);
  }

  // --- Pre-check: direct dependency on a cancelled or unknown flight ---
  for (const f of candidates) {
    for (const dep of f.dependencies) {
      if (cancelledSet.has(dep)) {
        excludedReasons.set(f.flightNumber, `dependency_cancelled: ${dep}`);
        break;
      }
      if (!candidateNumbers.has(dep)) {
        excludedReasons.set(f.flightNumber, `unknown_dependency: ${dep}`);
        break;
      }
    }
  }

  // --- Pre-check: static runway feasibility ---
  for (const f of candidates) {
    if (excludedReasons.has(f.flightNumber)) continue;
    const compatible = config.runways.filter(
      (r) =>
        runwayCompatible(f.opType, r) &&
        meetsLength(f.requirements.minLength, r.length),
    );
    if (compatible.length === 0) {
      const reason = config.runways.some((r) => runwayCompatible(f.opType, r))
        ? `no_runway_with_required_length: needs >= ${f.requirements.minLength}m`
        : `no_runway_supports_op_type: ${f.opType}`;
      excludedReasons.set(f.flightNumber, reason);
    }
  }

  // --- Cycle detection over the remaining set ---
  const preCycleCandidates = candidates.filter(
    (f) => !excludedReasons.has(f.flightNumber),
  );
  const { cycle } = topoOrder(preCycleCandidates);
  // Distinguish true cycle members (nodes reachable from themselves via dep edges)
  // from downstream nodes that merely depend on cycle members. Downstream nodes get
  // a `dependency_unscheduled: <cycle root>` reason via the propagation pass below.
  const cycleMembers = findTrueCycleMembers(preCycleCandidates, cycle);
  for (const flightNumber of cycleMembers) {
    excludedReasons.set(flightNumber, "dependency_cycle");
  }

  // --- Propagate exclusion to all transitive dependents ---
  // Seed includes cancelled flights so dependents of cancelled (via unknown_dependency
  // chain breaks) get a clearer cascade root. Cancelled flights themselves are stripped
  // before emitting results.
  const propagationSeed = new Map<string, string>(excludedReasons);
  for (const c of cancelRoots) {
    if (!propagationSeed.has(c)) propagationSeed.set(c, "cancelled");
  }
  propagateExclusion(candidates, propagationSeed);
  // Merge propagated results back, but skip the synthetic "cancelled" roots.
  for (const [flightNumber, reason] of propagationSeed) {
    if (cancelRoots.has(flightNumber)) continue;
    if (!excludedReasons.has(flightNumber)) {
      excludedReasons.set(flightNumber, reason);
    }
  }

  const feasible = candidates.filter(
    (f) => !excludedReasons.has(f.flightNumber),
  );

  // --- Build dep graph over the feasible set ---
  const byNumber = new Map(feasible.map((f) => [f.flightNumber, f] as const));
  const indeg = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const f of feasible) {
    indeg.set(f.flightNumber, 0);
    dependents.set(f.flightNumber, []);
  }
  for (const f of feasible) {
    for (const dep of f.dependencies) {
      // All deps in `feasible` are guaranteed to be schedulable (propagation removed
      // anything depending on excluded flights), so this branch always finds dep.
      if (!byNumber.has(dep)) continue;
      dependents.get(dep)!.push(f.flightNumber);
      indeg.set(f.flightNumber, (indeg.get(f.flightNumber) ?? 0) + 1);
    }
  }

  // Resource calendars.
  const runwayUsage = new Map<string, RunwayUsage>(
    config.runways.map((r) => [r.id, { ops: [] }]),
  );
  const gateUsage: GateUsage[] = Array.from(
    { length: config.gateCount },
    () => ({ windows: [] }),
  );
  const crewUsage: CrewUsage = { ops: [] };

  const endTimeOf = new Map<string, number>();
  const scheduled: ScheduledOp[] = [];
  const scheduledSet = new Set<string>();

  // Pre-cache compatible runways per flight (avoids re-filtering in the hot loop).
  const compatibleRunwaysOf = new Map<string, RunwayDef[]>();
  for (const f of feasible) {
    const compat = config.runways
      .filter(
        (r) =>
          runwayCompatible(f.opType, r) &&
          meetsLength(f.requirements.minLength, r.length),
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    compatibleRunwaysOf.set(f.flightNumber, compat);
  }

  const ready: Flight[] = feasible.filter(
    (f) => indeg.get(f.flightNumber) === 0,
  );

  function sortReady() {
    ready.sort((a, b) => {
      const pa = PRIORITY_RANK[a.priority];
      const pb = PRIORITY_RANK[b.priority];
      if (pa !== pb) return pa - pb;
      if (a.submissionSeq !== b.submissionSeq)
        return a.submissionSeq - b.submissionSeq;
      return a.flightNumber.localeCompare(b.flightNumber);
    });
  }

  while (ready.length > 0) {
    sortReady();
    const flight = ready.shift()!;
    const duration = durationFor(flight.opType, config);

    // Earliest start from dependencies.
    let earliest = 0;
    for (const dep of flight.dependencies) {
      const depEnd = endTimeOf.get(dep);
      if (depEnd === undefined) {
        // Unreachable: feasible flights only depend on other feasible flights, and
        // they are processed in topological order via the indeg machinery.
        earliest = Infinity;
        break;
      }
      earliest = Math.max(earliest, depEnd + config.dependencyBufferSec);
    }

    if (!Number.isFinite(earliest)) {
      excludedReasons.set(flight.flightNumber, "internal_error_dep_missing");
      continue;
    }

    // Find best (start, runway, gate). Short-circuit if we find start === earliest.
    let best: { start: number; runwayId: string; gateIndex: number } | null = null;
    const sortedRunways = compatibleRunwaysOf.get(flight.flightNumber)!;

    outer: for (const runway of sortedRunways) {
      const rUsage = runwayUsage.get(runway.id)!;
      for (let gi = 0; gi < gateUsage.length; gi++) {
        const gate = gateUsage[gi];
        const gateHold =
          flight.opType === "arrival"
            ? duration + config.gateTurnaroundSec
            : duration;

        let cursor = earliest;
        let iterations = 0;
        let placed: number | null = null;
        while (iterations++ < 32) {
          const rSlot = findRunwaySlot(
            rUsage,
            flight.opType,
            duration,
            cursor,
            config,
            horizonEnd,
          );
          if (rSlot === null) break;
          const gSlot = findGateSlot(gate, rSlot, gateHold, horizonEnd);
          if (gSlot === null) break;
          if (gSlot === rSlot) {
            const concurrent = concurrentCrewAt(
              crewUsage,
              gSlot,
              gSlot + duration,
            );
            if (concurrent < config.groundCrewCount) {
              placed = gSlot;
              break;
            }
            cursor = nextCrewFreeTime(crewUsage, gSlot, gSlot + duration);
            continue;
          }
          // gSlot > rSlot; advance and retry.
          cursor = gSlot;
        }
        if (placed !== null) {
          const isBetter =
            best === null ||
            placed < best.start ||
            (placed === best.start &&
              (runway.id.localeCompare(best.runwayId) < 0 ||
                (runway.id === best.runwayId && gi < best.gateIndex)));
          if (isBetter) {
            best = { start: placed, runwayId: runway.id, gateIndex: gi };
          }
          // Globally optimal slot found — no need to explore further.
          if (placed === earliest) break outer;
        }
      }
    }

    if (best === null) {
      excludedReasons.set(
        flight.flightNumber,
        "no_resource_window_within_horizon",
      );
      // Propagate to dependents now, so we don't waste cycles trying to schedule them
      // (their indeg won't decrement since this flight never completed).
      const stack = [...(dependents.get(flight.flightNumber) ?? [])];
      const seen = new Set<string>();
      while (stack.length > 0) {
        const next = stack.pop()!;
        if (seen.has(next)) continue;
        seen.add(next);
        if (!excludedReasons.has(next)) {
          excludedReasons.set(
            next,
            `dependency_unscheduled: ${flight.flightNumber}`,
          );
        }
        for (const d of dependents.get(next) ?? []) stack.push(d);
      }
      continue;
    }

    const start = best.start;
    const end = start + duration;
    const op: ScheduledOp = {
      flightNumber: flight.flightNumber,
      opType: flight.opType,
      runwayId: best.runwayId,
      gateId: `G${best.gateIndex + 1}`,
      startTime: start,
      endTime: end,
    };
    scheduled.push(op);
    scheduledSet.add(flight.flightNumber);
    endTimeOf.set(flight.flightNumber, end);

    insertRunwayOp(runwayUsage.get(best.runwayId)!, op);
    const gateHold =
      flight.opType === "arrival" ? end + config.gateTurnaroundSec : end;
    insertGateWindow(gateUsage[best.gateIndex], { start, end: gateHold });
    insertCrewOp(crewUsage, { start, end });

    for (const dep of dependents.get(flight.flightNumber) ?? []) {
      const newDeg = (indeg.get(dep) ?? 0) - 1;
      indeg.set(dep, newDeg);
      if (newDeg === 0) {
        const df = byNumber.get(dep);
        if (df) ready.push(df);
      }
    }
  }

  // Any remaining feasible flights that didn't get placed (cascaded from
  // no_resource_window_within_horizon) already have an entry in excludedReasons.
  // Defensive sweep for anything missed.
  for (const f of feasible) {
    if (
      !scheduledSet.has(f.flightNumber) &&
      !excludedReasons.has(f.flightNumber)
    ) {
      excludedReasons.set(f.flightNumber, "dependency_unscheduled");
    }
  }

  scheduled.sort((a, b) => {
    if (a.startTime !== b.startTime) return a.startTime - b.startTime;
    if (a.runwayId !== b.runwayId) return a.runwayId.localeCompare(b.runwayId);
    return a.flightNumber.localeCompare(b.flightNumber);
  });

  const unscheduled = [...excludedReasons.entries()]
    .filter(([fn]) => !cancelledSet.has(fn))
    .map(([flightNumber, reason]) => ({ flightNumber, reason }))
    .sort((a, b) => a.flightNumber.localeCompare(b.flightNumber));

  let completionTime: number | null = null;
  for (const op of scheduled) {
    if (completionTime === null || op.endTime > completionTime) {
      completionTime = op.endTime;
    }
  }

  return { scheduled, unscheduled, completionTime };
}

function insertRunwayOp(usage: RunwayUsage, op: ScheduledOp): void {
  let i = 0;
  while (i < usage.ops.length && usage.ops[i].startTime < op.startTime) i++;
  usage.ops.splice(i, 0, op);
}

function insertGateWindow(
  usage: GateUsage,
  w: { start: number; end: number },
): void {
  let i = 0;
  while (i < usage.windows.length && usage.windows[i].start < w.start) i++;
  usage.windows.splice(i, 0, w);
}

function insertCrewOp(
  usage: CrewUsage,
  op: { start: number; end: number },
): void {
  let i = 0;
  while (i < usage.ops.length && usage.ops[i].start < op.start) i++;
  usage.ops.splice(i, 0, op);
}

function nextCrewFreeTime(crew: CrewUsage, start: number, end: number): number {
  // Advance to the earliest end among ops overlapping [start, end). Caller ensures
  // capacity is exhausted at `start`, so at least one such op exists.
  let earliestEnd = Infinity;
  for (const o of crew.ops) {
    if (o.start < end && o.end > start && o.end < earliestEnd) {
      earliestEnd = o.end;
    }
  }
  if (!Number.isFinite(earliestEnd)) return start + 1;
  return earliestEnd;
}
