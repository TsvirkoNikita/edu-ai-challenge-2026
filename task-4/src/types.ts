export type OpType = "arrival" | "departure";
export type Priority = "high" | "medium" | "low";
export type RunwayOps = "arrival" | "departure" | "both";

export type FlightStatus =
  | "pending"
  | "scheduled"
  | "unscheduled"
  | "cancelled";

export interface RunwayRequirement {
  /** Minimum runway length (meters) required by the aircraft. */
  minLength?: number;
}

export interface Flight {
  flightNumber: string;
  opType: OpType;
  priority: Priority;
  dependencies: string[];
  requirements: RunwayRequirement;
  status: FlightStatus;
  /** Monotonic counter assigned at submission time; used for deterministic ordering. */
  submissionSeq: number;
  /** Set when status === "unscheduled" or "cancelled". */
  reason?: string;
}

export interface RunwayDef {
  id: string;
  length: number;
  ops: RunwayOps;
}

export interface ScheduledOp {
  flightNumber: string;
  opType: OpType;
  runwayId: string;
  gateId: string;
  /** Seconds since the configured epoch. */
  startTime: number;
  endTime: number;
}

export interface ScheduleResult {
  scheduled: ScheduledOp[];
  /** Flight numbers that could not be placed, with reasons. */
  unscheduled: Array<{ flightNumber: string; reason: string }>;
  /** End time of the last scheduled operation, or null if nothing was scheduled. */
  completionTime: number | null;
}

export interface BottleneckChain {
  flights: string[];
  totalDurationSec: number;
}
