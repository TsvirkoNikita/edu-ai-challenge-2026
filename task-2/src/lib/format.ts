import { format } from "date-fns";

export const fmtDate = (d: string | Date) => format(new Date(d), "EEE, MMM d, yyyy");
export const fmtTime = (d: string | Date) => format(new Date(d), "h:mm a");
export const fmtDateTime = (d: string | Date) => format(new Date(d), "EEE, MMM d · h:mm a");
export const fmtShort = (d: string | Date) => format(new Date(d), "MMM d");

export const isPast = (d: string | Date) => new Date(d).getTime() < Date.now();

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) +
  "-" + Math.random().toString(36).slice(2, 7);

export const ticketCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
};

export const inviteToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(18)))
    .map(b => b.toString(36).padStart(2, "0")).join("").slice(0, 24);
