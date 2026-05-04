# Gather — Event Hosting & Attendance Platform

A lightweight platform for running free community events end to end. Hosts publish event pages and share them publicly; attendees RSVP, get a digital ticket with a QR code, and check in at the door.

Built with React + Vite + Tailwind + shadcn/ui on Lovable Cloud (managed Postgres + auth + storage + edge functions).

## Quick start (usage guide)

The app supports four primary flows. Each is described below in order.

### 1. Publish an event (Host)

1. Sign up at `/auth` (email + password — no email verification needed in demo).
2. Click **Become a host** in the user menu and create your host page (name, bio, logo, contact email). You can revisit and update these details anytime from **Dashboard → Edit host**.
3. From the **Dashboard**, click **+ New event**.
4. Fill in title, description, start/end (with timezone), venue or online URL, capacity, and a cover image.
5. Choose visibility:
   - **Public** — appears on the Explore page and is searchable.
   - **Unlisted** — only people with the link can find it.
6. Pricing toggle: **Free** is selected; **Paid** is disabled with a "Coming soon" tooltip.
7. Click **Save draft** to keep editing or **Publish** to go live. **Unpublish** and **Duplicate** are available later from the event admin page.

Share the public URL `/events/:slug` anywhere — the page includes Open Graph metadata for nice social previews. The host profile page (`/h/:slug`) has a **Copy share link** button to share the host's public URL in one click.

> **Editing capacity**: lowering capacity below the current "going" count is blocked with a clear message. Raising capacity automatically promotes the top of the waitlist (FIFO) into Going and renumbers the remaining waitlist — no manual action required.

### 2. RSVP & get a ticket (Attendee)

1. Open any event page (signed-out users can browse everything, including past events, and see the live "going" counter).
2. Click **RSVP — it's free**.
   - If signed out, you're redirected to `/auth?redirect=…` and bounced back to the event after sign-in.
   - If the event is at capacity, you join the **waitlist** (FIFO). When someone cancels — or the host increases capacity — the next person is auto-promoted to Going.
3. After RSVPing, view the ticket at `/tickets`:
   - Unique 8-character ticket code
   - QR code (encodes the ticket code)
   - **Add to calendar**: download `.ics` or open in Google Calendar
   - **Cancel RSVP** at any time — the next waitlister is auto-promoted

Past events show an "Ended" badge and the RSVP button is hidden.

### 3. Check guests in (Checker / Host)

1. From the dashboard or the event admin page, click **Check-in**.
2. The check-in page (`/checkin/:eventId`) shows live counters: Going, Checked-in, Remaining.
3. Type or paste the attendee's ticket code (e.g. shown on their phone) and press **Check in**:
   - Duplicate scans are rejected with a clear message.
   - Wrong/cancelled codes are rejected.
4. **Undo** reverses the most recent scan.
5. Recent scans are shown beneath for live confirmation.

To delegate check-in, go to **Dashboard → Team**, create a **Checker** invite link, and share it. Checker-role members can only access the check-in page; they cannot edit events.

### 4. After the event

- **CSV export**: Event admin → Attendees tab → **Export CSV** (`name,email,rsvp_status,check_in_time`, UTF-8 with BOM, opens cleanly in Excel and Google Sheets).
- **Feedback**: After `ends_at`, attendees who were Going see a 1–5 star rating + comment form on the event page.
- **Gallery**: Anyone signed in can upload a photo to an event's gallery. Photos are **pending** until a Host approves them in the admin panel.
- **Reports**: Any signed-in user can flag **either an event or a photo** from the public event page. Hosts review the unified report queue in the admin panel and can hide the event/photo or dismiss the report.

## Roles

Each host has two member roles:

- **Host** — full management: create/edit events, edit the host profile, approve gallery uploads, view dashboard, export CSVs, invite team members, moderate reports.
- **Checker** — limited to the check-in page for that host's events.

Members are added via copyable invite links from **Dashboard → Team**.

## "My Events"

`/my-events` aggregates all events the signed-in user has a role in (Host or Checker), with filters by host and free-text search. Quick actions are shown according to the user's role.

## Tech notes

- Capacity, waitlist promotion, and ticket-code generation are enforced with a mix of client-side patterns and database triggers. A Postgres trigger on `events.capacity` promotes waitlisted RSVPs and renumbers positions when capacity grows. RLS policies prevent users from RSVPing on behalf of others or seeing other people's tickets.
- Roles are stored in a separate `host_members` table and checked via a `has_host_role()` security-definer SQL function (avoids recursive RLS).
- Event "going" counts are exposed publicly via a SECURITY DEFINER SQL function so signed-out visitors see the correct number on the event page.
- All public storage URLs are direct CDN links; the storage bucket SELECT policy intentionally restricts file *listing* to file owners only.

## Demo content

The deployed app is seeded with:
- 1 host: **Brooklyn Run Club** (`/h/brooklyn-run-club-demo`)
- 1 upcoming event: **Sunset 5K in Prospect Park**
- 1 past event: **Spring Fun Run**

Sign up to RSVP and try the full flow.
