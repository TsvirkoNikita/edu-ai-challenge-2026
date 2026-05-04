
-- Set search_path explicitly on all functions (already done but be safe)
alter function public.set_updated_at() set search_path = public;

-- Restrict execute on internal helpers
revoke execute on function public.has_host_role(uuid, uuid, public.host_role) from public, anon;
grant execute on function public.has_host_role(uuid, uuid, public.host_role) to authenticated;

revoke execute on function public.is_host_member(uuid, uuid) from public, anon;
grant execute on function public.is_host_member(uuid, uuid) to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.add_owner_as_host_member() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- Tighten storage SELECT: allow read of individual files (still public for img urls) but disallow listing
drop policy if exists "public read event covers" on storage.objects;
drop policy if exists "public read host logos" on storage.objects;
drop policy if exists "public read event photos" on storage.objects;

-- Allow direct file access for public buckets via signed-public URLs but restrict bulk listing.
-- Public buckets in Supabase serve files via /object/public/<bucket>/<path> regardless of RLS.
-- We only need RLS to govern API listing — restrict to file owner / authed.
create policy "owner lists own event covers" on storage.objects for select
  to authenticated using (bucket_id = 'event-covers' and owner = auth.uid());
create policy "owner lists own host logos" on storage.objects for select
  to authenticated using (bucket_id = 'host-logos' and owner = auth.uid());
create policy "owner lists own event photos" on storage.objects for select
  to authenticated using (bucket_id = 'event-photos' and owner = auth.uid());
