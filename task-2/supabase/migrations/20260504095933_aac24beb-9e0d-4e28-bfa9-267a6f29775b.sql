
-- =========================================================
-- ENUMS
-- =========================================================
create type public.host_role as enum ('host', 'checker');
create type public.event_visibility as enum ('public', 'unlisted');
create type public.event_status as enum ('draft', 'published');
create type public.rsvp_status as enum ('going', 'waitlist', 'cancelled');
create type public.photo_status as enum ('pending', 'approved', 'hidden');
create type public.report_target as enum ('event', 'photo');
create type public.report_status as enum ('open', 'hidden', 'dismissed');

-- =========================================================
-- updated_at helper
-- =========================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- =========================================================
-- PROFILES
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles readable by everyone" on public.profiles for select using (true);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id);

create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, contact_email)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- HOSTS
-- =========================================================
create table public.hosts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  logo_url text,
  bio text,
  contact_email text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.hosts enable row level security;
create trigger hosts_updated before update on public.hosts for each row execute function public.set_updated_at();

create table public.host_members (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.hosts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.host_role not null,
  created_at timestamptz not null default now(),
  unique (host_id, user_id, role)
);
alter table public.host_members enable row level security;

-- Security definer role check (avoids RLS recursion)
create or replace function public.has_host_role(_user_id uuid, _host_id uuid, _role public.host_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.host_members
    where user_id = _user_id and host_id = _host_id and role = _role
  );
$$;

create or replace function public.is_host_member(_user_id uuid, _host_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.host_members
    where user_id = _user_id and host_id = _host_id
  );
$$;

-- Hosts policies
create policy "hosts public read" on public.hosts for select using (true);
create policy "any authed user can create a host" on public.hosts for insert
  with check (auth.uid() = owner_id);
create policy "host members can update host" on public.hosts for update
  using (public.has_host_role(auth.uid(), id, 'host') or auth.uid() = owner_id);
create policy "owner can delete host" on public.hosts for delete using (auth.uid() = owner_id);

-- Host members policies
create policy "members visible to other host members" on public.host_members for select
  using (public.is_host_member(auth.uid(), host_id) or auth.uid() = user_id);
create policy "host role can add members" on public.host_members for insert
  with check (public.has_host_role(auth.uid(), host_id, 'host')
              or exists (select 1 from public.hosts h where h.id = host_id and h.owner_id = auth.uid()));
create policy "host role can remove members" on public.host_members for delete
  using (public.has_host_role(auth.uid(), host_id, 'host')
         or exists (select 1 from public.hosts h where h.id = host_id and h.owner_id = auth.uid())
         or auth.uid() = user_id);

-- Auto-add owner as host member when host is created
create or replace function public.add_owner_as_host_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.host_members (host_id, user_id, role)
  values (new.id, new.owner_id, 'host')
  on conflict do nothing;
  return new;
end; $$;
create trigger hosts_owner_member after insert on public.hosts
  for each row execute function public.add_owner_as_host_member();

-- =========================================================
-- HOST INVITES
-- =========================================================
create table public.host_invites (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.hosts(id) on delete cascade,
  token text unique not null,
  role public.host_role not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '14 days'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.host_invites enable row level security;

create policy "invites readable by token (any authed user)" on public.host_invites for select
  to authenticated using (true);
create policy "host role can create invites" on public.host_invites for insert
  with check (public.has_host_role(auth.uid(), host_id, 'host'));
create policy "host role can delete invites" on public.host_invites for delete
  using (public.has_host_role(auth.uid(), host_id, 'host'));
create policy "host role can update invites" on public.host_invites for update
  using (public.has_host_role(auth.uid(), host_id, 'host'));

-- =========================================================
-- EVENTS
-- =========================================================
create table public.events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.hosts(id) on delete cascade,
  slug text unique not null,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'UTC',
  venue_address text,
  online_url text,
  capacity int not null default 50 check (capacity >= 0),
  cover_image_url text,
  visibility public.event_visibility not null default 'public',
  status public.event_status not null default 'draft',
  is_paid boolean not null default false,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.events enable row level security;
create trigger events_updated before update on public.events for each row execute function public.set_updated_at();
create index events_starts_at_idx on public.events(starts_at);
create index events_host_idx on public.events(host_id);

create policy "anyone reads published events" on public.events for select
  using (status = 'published' and is_hidden = false);
create policy "host members read all host events" on public.events for select
  using (public.is_host_member(auth.uid(), host_id));
create policy "host role inserts events" on public.events for insert
  with check (public.has_host_role(auth.uid(), host_id, 'host'));
create policy "host role updates events" on public.events for update
  using (public.has_host_role(auth.uid(), host_id, 'host'));
create policy "host role deletes events" on public.events for delete
  using (public.has_host_role(auth.uid(), host_id, 'host'));

-- =========================================================
-- RSVPS
-- =========================================================
create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.rsvp_status not null,
  waitlist_position int,
  ticket_code text unique not null,
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);
alter table public.rsvps enable row level security;
create trigger rsvps_updated before update on public.rsvps for each row execute function public.set_updated_at();
create index rsvps_event_status_idx on public.rsvps(event_id, status);

create policy "users see own rsvps" on public.rsvps for select using (auth.uid() = user_id);
create policy "host members see event rsvps" on public.rsvps for select
  using (exists (select 1 from public.events e where e.id = event_id and public.is_host_member(auth.uid(), e.host_id)));
create policy "users can cancel own rsvp" on public.rsvps for update using (auth.uid() = user_id);
create policy "host members can update event rsvps" on public.rsvps for update
  using (exists (select 1 from public.events e where e.id = event_id and public.is_host_member(auth.uid(), e.host_id)));

-- =========================================================
-- FEEDBACK
-- =========================================================
create table public.event_feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);
alter table public.event_feedback enable row level security;
create policy "feedback readable by everyone" on public.event_feedback for select using (true);
create policy "attendees can leave feedback" on public.event_feedback for insert
  with check (auth.uid() = user_id
              and exists (select 1 from public.rsvps r where r.event_id = event_feedback.event_id and r.user_id = auth.uid() and r.status = 'going')
              and exists (select 1 from public.events e where e.id = event_feedback.event_id and e.ends_at < now()));
create policy "users update own feedback" on public.event_feedback for update using (auth.uid() = user_id);

-- =========================================================
-- PHOTOS
-- =========================================================
create table public.event_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text not null,
  status public.photo_status not null default 'pending',
  created_at timestamptz not null default now()
);
alter table public.event_photos enable row level security;

create policy "approved photos readable by everyone" on public.event_photos for select
  using (status = 'approved');
create policy "uploader sees own photos" on public.event_photos for select
  using (auth.uid() = user_id);
create policy "host members see all event photos" on public.event_photos for select
  using (exists (select 1 from public.events e where e.id = event_id and public.is_host_member(auth.uid(), e.host_id)));
create policy "users upload photos" on public.event_photos for insert
  with check (auth.uid() = user_id);
create policy "host role moderates photos" on public.event_photos for update
  using (exists (select 1 from public.events e where e.id = event_id and public.has_host_role(auth.uid(), e.host_id, 'host')));
create policy "host role deletes photos" on public.event_photos for delete
  using (exists (select 1 from public.events e where e.id = event_id and public.has_host_role(auth.uid(), e.host_id, 'host')));

-- =========================================================
-- REPORTS
-- =========================================================
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type public.report_target not null,
  target_id uuid not null,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
create policy "any authed user can report" on public.reports for insert
  with check (auth.uid() = reporter_id);
create policy "reporter sees own reports" on public.reports for select using (auth.uid() = reporter_id);
-- Host members see reports for their host's events / photos
create policy "host members see relevant reports" on public.reports for select using (
  (target_type = 'event' and exists (select 1 from public.events e where e.id = target_id and public.is_host_member(auth.uid(), e.host_id)))
  or
  (target_type = 'photo' and exists (select 1 from public.event_photos p join public.events e on e.id = p.event_id where p.id = target_id and public.is_host_member(auth.uid(), e.host_id)))
);
create policy "host members update reports" on public.reports for update using (
  (target_type = 'event' and exists (select 1 from public.events e where e.id = target_id and public.has_host_role(auth.uid(), e.host_id, 'host')))
  or
  (target_type = 'photo' and exists (select 1 from public.event_photos p join public.events e on e.id = p.event_id where p.id = target_id and public.has_host_role(auth.uid(), e.host_id, 'host')))
);

-- =========================================================
-- STORAGE BUCKETS
-- =========================================================
insert into storage.buckets (id, name, public) values
  ('event-covers', 'event-covers', true),
  ('host-logos', 'host-logos', true),
  ('event-photos', 'event-photos', true)
on conflict (id) do nothing;

-- Storage policies: public read, authed upload, owner manage
create policy "public read event covers" on storage.objects for select using (bucket_id = 'event-covers');
create policy "authed upload event covers" on storage.objects for insert
  to authenticated with check (bucket_id = 'event-covers');
create policy "owner update event covers" on storage.objects for update
  to authenticated using (bucket_id = 'event-covers' and owner = auth.uid());
create policy "owner delete event covers" on storage.objects for delete
  to authenticated using (bucket_id = 'event-covers' and owner = auth.uid());

create policy "public read host logos" on storage.objects for select using (bucket_id = 'host-logos');
create policy "authed upload host logos" on storage.objects for insert
  to authenticated with check (bucket_id = 'host-logos');
create policy "owner update host logos" on storage.objects for update
  to authenticated using (bucket_id = 'host-logos' and owner = auth.uid());
create policy "owner delete host logos" on storage.objects for delete
  to authenticated using (bucket_id = 'host-logos' and owner = auth.uid());

create policy "public read event photos" on storage.objects for select using (bucket_id = 'event-photos');
create policy "authed upload event photos" on storage.objects for insert
  to authenticated with check (bucket_id = 'event-photos');
create policy "owner update event photos" on storage.objects for update
  to authenticated using (bucket_id = 'event-photos' and owner = auth.uid());
create policy "owner delete event photos" on storage.objects for delete
  to authenticated using (bucket_id = 'event-photos' and owner = auth.uid());
