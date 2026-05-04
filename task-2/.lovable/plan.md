
# Event Hosting & Attendance Platform

A Luma-style platform for running free community events end-to-end: hosts publish events, attendees RSVP and get QR tickets, checkers verify entry, and everyone can leave feedback or share photos afterward.

## Visual direction
Clean & modern, Luma-inspired: light theme, generous whitespace, large rounded cover images, soft shadows, subtle accent color. Inter font, rounded cards, calm neutrals with a single brand accent.

## Backend (Lovable Cloud)
- Email/password auth (no Google).
- Tables (all with RLS):
  - `profiles` — user display name, avatar, contact email.
  - `hosts` — host org: name, slug, logo, bio, contact email, owner.
  - `host_members` — `(host_id, user_id, role)` where role ∈ `host` | `checker`. Roles stored separately from profile per security best practice; a `has_host_role()` security-definer function gates policies.
  - `host_invites` — token, host_id, role, expires_at (copyable invite links).
  - `events` — host_id, title, description, starts_at, ends_at, timezone, venue/address, online_url, capacity, cover_image, visibility (`public`/`unlisted`), status (`draft`/`published`), is_paid (always false for now).
  - `rsvps` — event_id, user_id, status (`going`/`waitlist`/`cancelled`), position (for waitlist), created_at, ticket_code (unique), checked_in_at.
  - `event_feedback` — event_id, user_id, rating 1–5, comment.
  - `event_photos` — event_id, user_id, image_url, status (`pending`/`approved`/`hidden`).
  - `reports` — target_type (`event`/`photo`), target_id, reporter_id, reason, status.
- Storage buckets: `event-covers` (public), `host-logos` (public), `event-photos` (public, but rows gated by approval).
- Edge functions:
  - `rsvp` — atomic capacity check, assigns going vs waitlist, generates ticket code.
  - `cancel-rsvp` — frees seat, promotes next waitlister (FIFO), notifies in-app.
  - `checkin` — validates ticket code, prevents duplicates, supports undo of last action per checker session.

## Pages & flows

**Public**
- `/` Home — hero, featured upcoming events, CTA to explore / become a host.
- `/explore` — search bar, date range (default Upcoming), location filter, "Include past" toggle. Past events show "Ended" badge, no RSVP button.
- `/events/:slug` — cover, title, host, when/where, description, capacity bar, RSVP button (or "Ended"), share buttons, gallery (approved photos), feedback (after end), report link. Open Graph metadata for shareable previews.
- `/h/:hostSlug` — public host page: logo, bio, contact, list of upcoming + past events.

**Auth**
- `/auth` — sign in / sign up. Returns user to original event page after sign-in (handles RSVP redirect).

**Attendee**
- `/tickets` — "My Tickets": upcoming tickets with QR, ticket code, Add-to-Calendar (.ics download + Google Calendar URL), cancel button. Shows waitlist position and promotion notifications.
- `/become-a-host` — self-serve host creation form.

**Host area** (gated by `host` role)
- `/dashboard` — list of upcoming/past events with Going / Waitlist / Checked-in counts; quick actions (edit, duplicate, publish/unpublish, export CSV, check-in link).
- `/dashboard/events/new` and `/dashboard/events/:id/edit` — full editor; Free/Paid toggle with Paid disabled + "Coming soon" tooltip; Publish/Unpublish/Duplicate; Public/Unlisted; cover upload.
- `/dashboard/events/:id` — event admin: attendee list, waitlist, check-in stats, CSV export, gallery moderation queue, reports queue.
- `/dashboard/team` — invite members as Host or Checker via copyable link; member list with role.
- `/my-events` — aggregated view across all hosts the user has a role in; filters by host, date range, text; role-appropriate actions.

**Checker area** (gated by `checker` or `host` role)
- `/checkin/:eventId` — manual code entry input, big Submit button; live counters (Going / Checked-in / Remaining); recent scans list; Undo last; duplicate scans rejected with clear message. QR codes are generated for each ticket; cameras not required.

**Moderation**
- Reports queue inside event admin: list reported events/photos, hide action.

## Key behaviors
- Unauthenticated users browse everything (including past). Clicking RSVP redirects to `/auth?redirect=/events/:slug`.
- Capacity enforced atomically in edge function; overflow → waitlist with FIFO `position`.
- Cancellation triggers automatic promotion of next waitlister; promoted user sees an in-app toast/badge on `/tickets`.
- Ticket code is a short unique string (e.g. 8 chars). QR encodes the code. Manual entry on check-in accepts the same string.
- Add to Calendar: generate `.ics` client-side and a `https://calendar.google.com/calendar/render?...` link.
- Past events: `ends_at < now` ⇒ "Ended" badge, RSVP hidden, feedback form revealed.
- CSV export: `name,email,rsvp_status,checked_in_at` with proper quoting + UTF-8 BOM so Excel and Google Sheets both open it cleanly.

## Submission artifacts
- `report.md` at project root: tools used (Lovable + Cloud), what worked, what didn't, decisions.
- `README.md`: step-by-step usage guide for Publish → RSVP → Ticket → Check-in flows.
- `sample-export.csv`: example RSVP/attendance export with the required schema.
- Seed script (run once after deploy) creating: 1 host, 1 upcoming event, 1 past event with a few RSVPs.

Note on GitHub `task-2` folder: Lovable syncs this project to its own GitHub repo at the root. After approval I'll add a clear note in the README about how to relocate into a `task-2/` folder if your submission requires that exact structure; the deployed Lovable URL satisfies the "shareable public URL" requirement.

## Technical notes
- React + Vite + Tailwind + shadcn/ui; React Router.
- `qrcode.react` for QR rendering; `date-fns` + `date-fns-tz` for timezone handling.
- All role checks use a `has_host_role(user, host, role)` security-definer SQL function to avoid recursive RLS.
- Atomic RSVP/cancel/promote logic lives in edge functions, not the client, to prevent race conditions on capacity.
- ICS generated as a Blob download; no third-party dependency required.
