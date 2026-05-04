
REVOKE ALL ON FUNCTION public.accept_host_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_host_invite(text) TO authenticated;
