import { z } from "zod";
import type { RunwayDef } from "./types.js";

const runwaySchema = z.object({
  id: z.string().min(1),
  length: z.number().int().positive(),
  ops: z.enum(["arrival", "departure", "both"]),
});

const runwaysSchema = z.array(runwaySchema).min(1);

function parseRunways(raw: string | undefined): RunwayDef[] {
  if (!raw) throw new Error("ATC_RUNWAYS is required");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`ATC_RUNWAYS must be valid JSON: ${(e as Error).message}`);
  }
  const result = runwaysSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`ATC_RUNWAYS invalid: ${result.error.message}`);
  }
  const ids = new Set<string>();
  for (const r of result.data) {
    if (ids.has(r.id))
      throw new Error(`ATC_RUNWAYS contains duplicate id "${r.id}"`);
    ids.add(r.id);
  }
  return result.data;
}

function intEnv(
  name: string,
  raw: string | undefined,
  opts: { min?: number; required?: boolean } = {},
): number {
  const { min = 0, required = true } = opts;
  if (raw === undefined || raw === "") {
    if (required) throw new Error(`${name} is required`);
    return min;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new Error(`${name} must be an integer, got "${raw}"`);
  }
  if (n < min) {
    throw new Error(`${name} must be >= ${min}, got ${n}`);
  }
  return n;
}

function parseEpoch(raw: string | undefined): number {
  if (!raw) return 0;
  const ms = Date.parse(raw);
  if (Number.isNaN(ms))
    throw new Error(`ATC_EPOCH_ISO is not a valid ISO timestamp: "${raw}"`);
  return Math.floor(ms / 1000);
}

export interface AtcConfig {
  runways: RunwayDef[];
  gateCount: number;
  groundCrewCount: number;
  separationTakeoffSec: number;
  separationLandingSec: number;
  separationMixedSec: number;
  gateTurnaroundSec: number;
  dependencyBufferSec: number;
  schedulingHorizonSec: number;
  arrivalDurationSec: number;
  departureDurationSec: number;
  /** Schedule anchor as seconds since unix epoch. */
  epochSec: number;
  /** ISO form of the epoch (for display/resources). */
  epochIso: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AtcConfig {
  const errors: string[] = [];
  const safe = <T>(label: string, fn: () => T): T | undefined => {
    try {
      return fn();
    } catch (e) {
      errors.push((e as Error).message);
      return undefined;
    }
  };

  const runways = safe("runways", () => parseRunways(env.ATC_RUNWAYS));
  const gateCount = safe("gates", () =>
    intEnv("ATC_GATE_COUNT", env.ATC_GATE_COUNT, { min: 1 }),
  );
  const groundCrewCount = safe("crew", () =>
    intEnv("ATC_GROUND_CREW_COUNT", env.ATC_GROUND_CREW_COUNT, { min: 1 }),
  );
  const sepTakeoff = safe("sep-t", () =>
    intEnv("ATC_SEPARATION_TAKEOFF_SEC", env.ATC_SEPARATION_TAKEOFF_SEC, {
      min: 0,
    }),
  );
  const sepLanding = safe("sep-l", () =>
    intEnv("ATC_SEPARATION_LANDING_SEC", env.ATC_SEPARATION_LANDING_SEC, {
      min: 0,
    }),
  );
  const sepMixed = safe("sep-m", () =>
    intEnv("ATC_SEPARATION_MIXED_SEC", env.ATC_SEPARATION_MIXED_SEC, {
      min: 0,
    }),
  );
  const turnaround = safe("turn", () =>
    intEnv("ATC_GATE_TURNAROUND_SEC", env.ATC_GATE_TURNAROUND_SEC, { min: 0 }),
  );
  const depBuffer = safe("dep-buf", () =>
    intEnv("ATC_DEPENDENCY_BUFFER_SEC", env.ATC_DEPENDENCY_BUFFER_SEC, {
      min: 0,
    }),
  );
  const horizon = safe("horizon", () =>
    intEnv("ATC_SCHEDULING_HORIZON_SEC", env.ATC_SCHEDULING_HORIZON_SEC, {
      min: 1,
    }),
  );
  const arrDur = safe("arr-dur", () =>
    intEnv("ATC_ARRIVAL_DURATION_SEC", env.ATC_ARRIVAL_DURATION_SEC, {
      min: 1,
    }),
  );
  const depDur = safe("dep-dur", () =>
    intEnv("ATC_DEPARTURE_DURATION_SEC", env.ATC_DEPARTURE_DURATION_SEC, {
      min: 1,
    }),
  );
  const epochSec = safe("epoch", () => parseEpoch(env.ATC_EPOCH_ISO));

  if (errors.length > 0) {
    throw new Error("Invalid ATC configuration:\n  - " + errors.join("\n  - "));
  }

  const epochIso = new Date((epochSec ?? 0) * 1000).toISOString();

  return {
    runways: runways!,
    gateCount: gateCount!,
    groundCrewCount: groundCrewCount!,
    separationTakeoffSec: sepTakeoff!,
    separationLandingSec: sepLanding!,
    separationMixedSec: sepMixed!,
    gateTurnaroundSec: turnaround!,
    dependencyBufferSec: depBuffer!,
    schedulingHorizonSec: horizon!,
    arrivalDurationSec: arrDur!,
    departureDurationSec: depDur!,
    epochSec: epochSec!,
    epochIso,
  };
}
