import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Pencil, Plus, Settings, Users } from "lucide-react";
import { fmtDateTime, isPast } from "@/lib/format";

const Dashboard = () => {
  const { user } = useAuth();
  const [hosts, setHosts] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, { going: number; waitlist: number; checked: number }>>({});
  const [loading, setLoading] = useState(true);
  const [activeHost, setActiveHost] = useState<string | null>(null);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data: members } = await supabase.from("host_members").select("host_id, role, hosts(*)").eq("user_id", user.id).eq("role", "host");
    const hs = (members || []).map((m: any) => m.hosts).filter(Boolean);
    setHosts(hs);
    if (!activeHost && hs[0]) setActiveHost(hs[0].id);
    const hostIds = hs.map((h: any) => h.id);
    if (hostIds.length === 0) { setEvents([]); setLoading(false); return; }
    const { data: evs } = await supabase.from("events").select("*, hosts(name, slug)").in("host_id", hostIds).order("starts_at", { ascending: false });
    setEvents(evs || []);
    // load stats
    const ids = (evs || []).map(e => e.id);
    if (ids.length) {
      const { data: rsvps } = await supabase.from("rsvps").select("event_id, status, checked_in_at").in("event_id", ids);
      const s: any = {};
      ids.forEach(id => s[id] = { going: 0, waitlist: 0, checked: 0 });
      (rsvps || []).forEach((r: any) => {
        if (r.status === "going") s[r.event_id].going++;
        if (r.status === "waitlist") s[r.event_id].waitlist++;
        if (r.checked_in_at) s[r.event_id].checked++;
      });
      setStats(s);
    }
    setLoading(false);
  }

  if (loading) return <div className="container-page py-20 text-muted-foreground">Loading…</div>;
  if (hosts.length === 0) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">No host page yet</h1>
        <p className="text-muted-foreground mb-6">Create your host page to start publishing events.</p>
        <Button asChild><Link to="/become-a-host">Become a host</Link></Button>
      </div>
    );
  }

  const visible = activeHost ? events.filter(e => e.host_id === activeHost) : events;
  const upcoming = visible.filter(e => !isPast(e.ends_at));
  const past = visible.filter(e => isPast(e.ends_at));

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your events and team.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/dashboard/team"><Users className="h-4 w-4 mr-1" />Team</Link></Button>
          <Button asChild><Link to={`/dashboard/events/new?host=${activeHost}`}><Plus className="h-4 w-4 mr-1" />New event</Link></Button>
        </div>
      </div>

      {hosts.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap items-center">
          {hosts.map(h => (
            <button key={h.id} onClick={() => setActiveHost(h.id)}
              className={`px-3 py-1.5 rounded-full text-sm border ${activeHost === h.id ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
              {h.name}
            </button>
          ))}
          {activeHost && (
            <Button asChild size="sm" variant="outline">
              <Link to={`/dashboard/hosts/${activeHost}/edit`}><Pencil className="h-3.5 w-3.5 mr-1" />Edit host</Link>
            </Button>
          )}
        </div>
      )}

      <Section title="Upcoming" events={upcoming} stats={stats} />
      <Section title="Past" events={past} stats={stats} />
    </div>
  );
};

const Section = ({ title, events, stats }: any) => (
  <section className="mb-10">
    <h2 className="text-lg font-bold mb-3">{title}</h2>
    {events.length === 0 ? (
      <div className="card-soft p-6 text-sm text-muted-foreground">Nothing here yet.</div>
    ) : (
      <div className="space-y-3">
        {events.map((e: any) => {
          const s = stats[e.id] || { going: 0, waitlist: 0, checked: 0 };
          return (
            <div key={e.id} className="card-soft p-4 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[240px]">
                <div className="flex items-center gap-2">
                  <Link to={`/dashboard/events/${e.id}`} className="font-semibold hover:text-primary">{e.title}</Link>
                  <span className="badge-soft text-[10px]">{e.status}</span>
                  <span className="badge-soft text-[10px]">{e.visibility}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{fmtDateTime(e.starts_at)}</div>
              </div>
              <div className="flex gap-4 text-sm">
                <Stat label="Going" value={s.going} />
                <Stat label="Waitlist" value={s.waitlist} />
                <Stat label="Checked-in" value={s.checked} />
              </div>
              <div className="flex gap-1">
                <Button asChild variant="outline" size="sm"><Link to={`/dashboard/events/${e.id}`}><Settings className="h-3.5 w-3.5" /></Link></Button>
                <Button asChild variant="outline" size="sm"><Link to={`/checkin/${e.id}`}>Check-in</Link></Button>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </section>
);

const Stat = ({ label, value }: any) => (
  <div className="text-center">
    <div className="font-bold text-lg leading-none">{value}</div>
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
  </div>
);

export default Dashboard;
