import type { Flight, ScheduleResult } from "./types.js";

/**
 * In-memory store for airport state. State is reset by `clear()` (used in tests)
 * and otherwise persists for the lifetime of the process.
 */
export class AirportStore {
  private flights = new Map<string, Flight>();
  private nextSeq = 1;
  private lastSchedule: ScheduleResult | null = null;

  clear(): void {
    this.flights.clear();
    this.nextSeq = 1;
    this.lastSchedule = null;
  }

  hasFlight(flightNumber: string): boolean {
    return this.flights.has(flightNumber);
  }

  addFlight(flight: Omit<Flight, "submissionSeq" | "status">): Flight {
    if (this.flights.has(flight.flightNumber)) {
      throw new Error(`Flight ${flight.flightNumber} already exists`);
    }
    const stored: Flight = {
      ...flight,
      status: "pending",
      submissionSeq: this.nextSeq++,
    };
    this.flights.set(stored.flightNumber, stored);
    return stored;
  }

  getFlight(flightNumber: string): Flight | undefined {
    return this.flights.get(flightNumber);
  }

  listFlights(): Flight[] {
    return [...this.flights.values()].sort(
      (a, b) => a.submissionSeq - b.submissionSeq,
    );
  }

  cancelFlight(flightNumber: string, reason = "cancelled_by_user"): Flight {
    const f = this.flights.get(flightNumber);
    if (!f) throw new Error(`Flight ${flightNumber} not found`);
    f.status = "cancelled";
    f.reason = reason;
    return f;
  }

  /** Apply the result of a scheduling pass to flight statuses. */
  applySchedule(result: ScheduleResult): void {
    for (const f of this.flights.values()) {
      if (f.status === "cancelled") continue;
      f.status = "pending";
      f.reason = undefined;
    }
    for (const op of result.scheduled) {
      const f = this.flights.get(op.flightNumber);
      if (f && f.status !== "cancelled") {
        f.status = "scheduled";
        f.reason = undefined;
      }
    }
    for (const u of result.unscheduled) {
      const f = this.flights.get(u.flightNumber);
      if (f && f.status !== "cancelled") {
        f.status = "unscheduled";
        f.reason = u.reason;
      }
    }
    this.lastSchedule = result;
  }

  getLastSchedule(): ScheduleResult | null {
    return this.lastSchedule;
  }
}
