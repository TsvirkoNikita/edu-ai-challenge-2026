CREATE OR REPLACE FUNCTION public.promote_waitlist_on_capacity_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  going_count int;
  slots int;
  promoted_ids uuid[];
BEGIN
  IF NEW.capacity IS NULL OR NEW.capacity <= COALESCE(OLD.capacity, 0) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO going_count FROM public.rsvps
   WHERE event_id = NEW.id AND status = 'going';

  slots := NEW.capacity - going_count;
  IF slots <= 0 THEN
    RETURN NEW;
  END IF;

  WITH to_promote AS (
    SELECT id FROM public.rsvps
     WHERE event_id = NEW.id AND status = 'waitlist'
     ORDER BY waitlist_position NULLS LAST, created_at
     LIMIT slots
  ),
  upd AS (
    UPDATE public.rsvps r
       SET status = 'going', waitlist_position = NULL, updated_at = now()
      FROM to_promote tp
     WHERE r.id = tp.id
     RETURNING r.id
  )
  SELECT array_agg(id) INTO promoted_ids FROM upd;

  -- Renumber remaining waitlist
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY waitlist_position NULLS LAST, created_at) AS rn
      FROM public.rsvps
     WHERE event_id = NEW.id AND status = 'waitlist'
  )
  UPDATE public.rsvps r
     SET waitlist_position = ranked.rn
    FROM ranked
   WHERE r.id = ranked.id AND r.waitlist_position IS DISTINCT FROM ranked.rn;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promote_waitlist_on_capacity ON public.events;
CREATE TRIGGER trg_promote_waitlist_on_capacity
AFTER UPDATE OF capacity ON public.events
FOR EACH ROW
WHEN (NEW.capacity IS DISTINCT FROM OLD.capacity)
EXECUTE FUNCTION public.promote_waitlist_on_capacity_change();