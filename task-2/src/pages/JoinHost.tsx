import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const JoinHost = () => {
  const { token } = useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => { (async () => {
    if (loading) return;
    if (!user) { nav(`/auth?redirect=/join/${token}`); return; }
    const { data, error } = await supabase.rpc("accept_host_invite", { _token: token! });
    if (error) { toast.error(error.message); nav("/"); return; }
    const role = (data as any)?.[0]?.role;
    toast.success(`Joined as ${role}!`);
    nav(role === "host" ? "/dashboard" : "/my-events");
  })(); /* eslint-disable-next-line */ }, [token, user?.id, loading]);

  return <div className="container-page py-20 text-muted-foreground">Joining…</div>;
};

export default JoinHost;
