// Format a Date as a UTC ICS timestamp: YYYYMMDDTHHMMSS (caller appends "Z").
const pad = (n: number) => String(n).padStart(2, "0");
const fmtICS = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T` +
  `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;

interface CalEvt {
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
}

export const buildICS = (e: CalEvt) => {
  const uid = `${Date.now()}@gather`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Gather//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${fmtICS(new Date())}Z`,
    `DTSTART:${fmtICS(e.start)}Z`,
    `DTEND:${fmtICS(e.end)}Z`,
    `SUMMARY:${escapeICS(e.title)}`,
    e.description ? `DESCRIPTION:${escapeICS(e.description)}` : "",
    e.location ? `LOCATION:${escapeICS(e.location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
};

const escapeICS = (s: string) => s.replace(/[\\,;]/g, m => "\\" + m).replace(/\n/g, "\\n");

export const downloadICS = (e: CalEvt) => {
  const blob = new Blob([buildICS(e)], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${e.title.replace(/[^a-z0-9]+/gi, "-")}.ics`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
};

export const googleCalendarUrl = (e: CalEvt) => {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${fmtICS(e.start)}Z/${fmtICS(e.end)}Z`,
    details: e.description ?? "",
    location: e.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
};
