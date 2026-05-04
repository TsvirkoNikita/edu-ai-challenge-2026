# Build report

## Tools and techniques

- **Frontend**: React 18 + Vite + TypeScript + Tailwind + shadcn/ui. React Router for routing, Sonner for toasts, `qrcode.react` for tickets, `date-fns` for formatting.
- **Backend**: Lovable Cloud (managed Supabase) — Postgres with RLS, auth (email + password), storage (public buckets for covers, logos, photos), and SQL triggers/functions for the bits that need to be race-safe.
- **Calendar integration**: client-side `.ics` blob download and a Google Calendar URL — no external dependency.
- **CSV exports**: hand-rolled CSV builder with UTF-8 BOM so the file opens cleanly in both Excel and Google Sheets.
- **Roles**: separate `host_members` table + a `has_host_role()` `SECURITY DEFINER` SQL function used inside RLS policies to avoid recursion. This is the recommended Supabase pattern for role-gated access.
- **Public counters**: a `SECURITY DEFINER` SQL function exposes the per-event "going" count to anonymous visitors without leaking the underlying RSVP rows.
- **Capacity / waitlist automation**: a Postgres trigger on `events.capacity` promotes the top of the waitlist (FIFO) and renumbers positions when capacity grows, so hosts don't have to manually shuffle people.

## What worked well

- **shadcn/ui + design tokens** got me to a clean, Luma-style look fast without writing custom components.
- **RLS-first design** meant the client could just speak SQL through the supabase-js client. Almost no API layer was needed except for derivations (public counts, gallery moderation, capacity-driven promotions).
- **Database triggers for capacity changes** removed a whole class of "I bumped capacity but nobody got promoted" bugs — the logic lives next to the data.
- **Auto-confirmed email signup** in dev keeps the demo flow friction-free for graders.
- **Edge-case polish**: the FIFO waitlist promotion fires whenever someone with status `going` cancels (client-side) *and* whenever capacity is increased (DB trigger). Editing capacity below the current "going" count is blocked in the editor with a clear message.
- **Unified report queue**: events and photos are reported through the same `reports` table and shown in one moderation tab, which kept the UI simple.

## What didn't work / tradeoffs

- **Atomic capacity enforcement on RSVP** is currently best-effort on the client (read counters, then insert with the right status). For a real production system, this should move into a Postgres function with `select … for update` to be race-safe. The demo is fine because volumes are tiny, but I noted this as a known gap. Capacity *changes* by hosts are already trigger-driven, so that path is safe.
- **Site URL config** for the configure_auth tool rejected the dev URL; I left the auth dashboard at defaults. Email verification is auto-confirmed so this didn't block the flow.
- **Storage listing**: by default a public bucket allowed any client to list every file. I tightened the `storage.objects` SELECT policy to restrict listing to owners; the public CDN URLs still work for image rendering.
- **Profile FK to auth.users** prevents seeding without a real signup — so the seed migration only creates the host + events when at least one auth user exists. The first person who signs up after deployment owns the demo host. This keeps the schema clean (no orphan profiles) at the cost of a one-time setup step.

## Notable decisions

- **Visual direction**: clean and modern, Luma-like — generous whitespace, large rounded cover images, single warm coral accent, Inter font. Fewer bespoke micro-interactions, more polish on the cards and ticket QR view.
- **No camera scanner**: the spec explicitly allowed manual code entry, so I skipped the webcam dependency. Ticket codes are 8 chars from an unambiguous alphabet (no `O/0/I/1`) so they're easy to type.
- **Single ticket code per RSVP**, generated at insert time (`unique` constraint at the DB level). The QR encodes that string directly — no JWT / signing — because the unique random code is enough for an event-day check-in tool.
- **Reports cover both events and photos**, submitted by any authenticated user from the public event page. Hosts can hide the target or dismiss the report from a single queue.
- **Host profile editing** lives at `/dashboard/hosts/:id/edit` and is reachable from the dashboard. The host page itself has a one-click **Copy share link** button so hosts can share their public URL without hunting for it.
- **Free-only**: the editor shows the Free/Paid toggle with Paid disabled and a "Coming soon" tooltip per the spec.

## Submission

- Deployed app: published via the Lovable Publish button (URL appears in the project's publish dialog).
- `sample-export.csv`: example CSV export with the required schema.
- `README.md`: usage guide for the four main flows.
