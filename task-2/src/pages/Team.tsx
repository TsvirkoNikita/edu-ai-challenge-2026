import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { inviteToken } from "@/lib/format";
import { Copy, Trash2 } from "lucide-react";

const Team = () => {
  const { user } = useAuth();
  const [hosts, setHosts] = useState<any[]>([]);
  const [activeHost, setActiveHost] = useState<string>("");
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);

  useEffect(() => { (async () => {
    if (!user) return;
    const { data } = await supabase.from("host_members").select("hosts(*)").eq("user_id", user.id).eq("role", "host");
    const hs = (data || []).map((m: any) => m.hosts).filter(Boolean);
    setHosts(hs); if (hs[0]) setActiveHost(hs[0].id);
  })(); }, [user?.id]);

  useEffect(() => { if (activeHost) loadHost(); /* eslint-disable-next-line */ }, [activeHost]);

  async function loadHost() {
    const { data: m } = await supabase.from("host_members").select("*, profiles:user_id(display_name, contact_email)").eq("host_id", activeHost);
    setMembers(m || []);
    const { data: inv } = await supabase.from("host_invites").select("*").eq("host_id", activeHost).is("used_at", null);
    setInvites(inv || []);
  }

  async function createInvite(role: "host" | "checker") {
    const token = inviteToken();
    const { error } = await supabase.from("host_invites").insert({ host_id: activeHost, role, token, created_by: user!.id });
    if (error) return toast.error(error.message);
    loadHost();
  }

  function inviteUrl(token: string) { return `${window.location.origin}/join/${token}`; }

  async function deleteInvite(id: string) {
    await supabase.from("host_invites").delete().eq("id", id);
    loadHost();
  }

  async function removeMember(m: any) {
    if (m.user_id === user!.id) return toast.error("Can't remove yourself");
    await supabase.from("host_members").delete().eq("id", m.id);
    loadHost();
  }

  if (hosts.length === 0) return <div className="container-page py-20 text-muted-foreground">You don't manage any hosts yet.</div>;

  return (
    <div className="container-page py-10 max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Team</h1>

      {hosts.length > 1 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {hosts.map(h => (
            <button key={h.id} onClick={() => setActiveHost(h.id)} className={`px-3 py-1.5 rounded-full text-sm border ${activeHost === h.id ? "bg-primary text-primary-foreground border-primary" : ""}`}>{h.name}</button>
          ))}
        </div>
      )}

      <div className="card-soft p-6 mb-6">
        <h2 className="font-semibold mb-3">Members</h2>
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="flex items-center justify-between border-b border-border/60 py-2">
              <div>
                <div className="font-medium">{m.profiles?.display_name || "—"}</div>
                <div className="text-xs text-muted-foreground">{m.profiles?.contact_email}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="badge-soft">{m.role}</span>
                <button onClick={() => removeMember(m)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card-soft p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Invite links</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => createInvite("host")}>+ Host invite</Button>
            <Button size="sm" variant="outline" onClick={() => createInvite("checker")}>+ Checker invite</Button>
          </div>
        </div>
        <div className="space-y-2">
          {invites.length === 0 && <div className="text-sm text-muted-foreground">No pending invites.</div>}
          {invites.map(i => (
            <div key={i.id} className="flex items-center gap-2 border border-border rounded-lg p-2">
              <span className="badge-soft">{i.role}</span>
              <code className="flex-1 text-xs truncate">{inviteUrl(i.token)}</code>
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(inviteUrl(i.token)); toast.success("Copied"); }}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => deleteInvite(i.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Team;
