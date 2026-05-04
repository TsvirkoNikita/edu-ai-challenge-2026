
CREATE OR REPLACE FUNCTION public.accept_host_invite(_token text)
RETURNS TABLE(host_id uuid, role host_role)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.host_invites%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO inv FROM public.host_invites WHERE token = _token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;
  IF inv.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invite already used';
  END IF;
  IF inv.expires_at < now() THEN
    RAISE EXCEPTION 'Invite expired';
  END IF;

  INSERT INTO public.host_members (host_id, user_id, role)
  VALUES (inv.host_id, auth.uid(), inv.role)
  ON CONFLICT DO NOTHING;

  UPDATE public.host_invites SET used_at = now() WHERE id = inv.id;

  RETURN QUERY SELECT inv.host_id, inv.role;
END;
$$;
