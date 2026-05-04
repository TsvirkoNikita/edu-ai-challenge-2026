// Timezone helpers using IANA zones.

// List of IANA zones. Uses Intl.supportedValuesOf when available, with a fallback.
export function listTimezones(): string[] {
  const anyIntl = Intl as any;
  if (typeof anyIntl.supportedValuesOf === "function") {
    try {
      return anyIntl.supportedValuesOf("timeZone") as string[];
    } catch {
      /* fall through */
    }
  }
  return [
    "UTC",
    "America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York",
    "America/Toronto", "America/Mexico_City", "America/Sao_Paulo",
    "Europe/London", "Europe/Dublin", "Europe/Lisbon", "Europe/Paris", "Europe/Berlin",
    "Europe/Madrid", "Europe/Rome", "Europe/Amsterdam", "Europe/Stockholm",
    "Europe/Athens", "Europe/Istanbul", "Europe/Moscow",
    "Africa/Cairo", "Africa/Johannesburg", "Africa/Lagos",
    "Asia/Dubai", "Asia/Karachi", "Asia/Kolkata", "Asia/Dhaka", "Asia/Bangkok",
    "Asia/Singapore", "Asia/Hong_Kong", "Asia/Shanghai", "Asia/Tokyo", "Asia/Seoul",
    "Australia/Perth", "Australia/Sydney", "Pacific/Auckland", "Pacific/Honolulu",
  ];
}

export function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

// Returns the offset (minutes) of the given UTC instant in the given IANA tz.
function tzOffsetMinutes(utcMs: number, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = dtf.formatToParts(new Date(utcMs)).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});
  const asUTC = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour === "24" ? "00" : parts.hour),
    Number(parts.minute), Number(parts.second),
  );
  return Math.round((asUTC - utcMs) / 60000);
}

// Convert a "YYYY-MM-DDTHH:mm" wall-clock value in `tz` -> ISO UTC string.
export function zonedInputToISO(localInput: string, tz: string): string {
  if (!localInput) return "";
  // Parse as if it were UTC to get a baseline timestamp.
  const baseUTC = Date.parse(localInput + ":00Z");
  // First-pass offset, then refine once to handle DST boundaries.
  let offset = tzOffsetMinutes(baseUTC, tz);
  let utcMs = baseUTC - offset * 60000;
  offset = tzOffsetMinutes(utcMs, tz);
  utcMs = baseUTC - offset * 60000;
  return new Date(utcMs).toISOString();
}

// Convert ISO UTC -> "YYYY-MM-DDTHH:mm" wall-clock in `tz` for <input type="datetime-local">.
export function isoToZonedInput(iso: string, tz: string): string {
  if (!iso) return "";
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
  const parts = dtf.formatToParts(new Date(iso)).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});
  const hh = parts.hour === "24" ? "00" : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hh}:${parts.minute}`;
}

// Pretty label like "Europe/Berlin (GMT+02:00)"
export function tzLabel(tz: string, at: Date = new Date()): string {
  const offMin = tzOffsetMinutes(at.getTime(), tz);
  const sign = offMin >= 0 ? "+" : "-";
  const abs = Math.abs(offMin);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${tz} (GMT${sign}${hh}:${mm})`;
}
