CREATE OR REPLACE FUNCTION public.event_rsvp_counts(_event_id uuid)
RETURNS TABLE(going_count integer, waitlist_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE(SUM(CASE WHEN status = 'going' THEN 1 ELSE 0 END), 0)::int,
    COALESCE(SUM(CASE WHEN status = 'waitlist' THEN 1 ELSE 0 END), 0)::int
  FROM public.rsvps WHERE event_id = _event_id;
$$;
GRANT EXECUTE ON FUNCTION public.event_rsvp_counts(uuid) TO anon, authenticated;