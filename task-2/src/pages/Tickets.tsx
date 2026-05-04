import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { fmtDateTime, isPast } from "@/lib/format";
import { downloadICS, googleCalendarUrl } from "@/lib/calendar";
import { Calendar, Download } from "lucide-react";
import { toast } from "sonner";

const Tickets = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("rsvps")
      .select("*, events(*)")
      .eq("user_id", user.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });
    setRows((data || []).filter((r: any) => r.events && !isPast(r.events.ends_at)));
    setLoading(false);
  }

  async function cancel(rsvp: any) {
    const wasGoing = rsvp.status === "going";
    const { error } = await supabase.from("rsvps").update({ status: "cancelled", waitlist_position: null }).eq("id", rsvp.id);
    if (error) return toast.error(error.message);
    if (wasGoing) {
      const { data: next } = await supabase.from("rsvps").select("*").eq("event_id", rsvp.event_id).eq("status", "waitlist").order("waitlist_position").limit(1).maybeSingle();
      if (next) await supabase.from("rsvps").update({ status: "going", waitlist_position: null }).eq("id", next.id);
    }
    toast.success("RSVP cancelled");
    load();
  }

  if (!user) return null;
  if (loading) return <div className="container-page py-20 text-muted-foreground">Loading…</div>;

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-bold tracking-tight mb-8">My tickets</h1>
      {rows.length === 0 ? (
        <div className="card-soft p-10 text-center text-muted-foreground">
          No upcoming tickets. <Link to="/explore" className="text-primary hover:underline">Find an event</Link>.
        </div>
      ) : (
        <div className="space-y-5">
          {rows.map(r => {
            const ev = r.events;
            const evt = { title: ev.title, description: ev.description, location: ev.venue_address || ev.online_url || "", start: new Date(ev.starts_at), end: new Date(ev.ends_at) };
            return (
              <div key={r.id} className="card-soft p-6 grid grid-cols-1 md:grid-cols-[1fr,200px] gap-6">
                <div>
                  <div className="text-xs text-muted-foreground">{fmtDateTime(ev.starts_at)}</div>
                  <Link to={`/events/${ev.slug}`} className="text-xl font-bold hover:text-primary block mt-1">{ev.title}</Link>
                  {r.status === "waitlist" ? (
                    <div className="mt-2 inline-block badge-soft bg-warning/10 text-warning">Waitlist #{r.waitlist_position}</div>
                  ) : (
                    <div className="mt-2 inline-block badge-soft bg-success/10 text-success">✓ Going</div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => downloadICS(evt)}>
                      <Download className="h-4 w-4 mr-1" />.ics
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={googleCalendarUrl(evt)} target="_blank" rel="noreferrer">
                        <Calendar className="h-4 w-4 mr-1" />Google Calendar
                      </a>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => cancel(r)}>Cancel RSVP</Button>
                  </div>
                </div>
                {r.status === "going" && (
                  <div className="flex flex-col items-center gap-2 bg-surface-2 rounded-xl p-4">
                    <QRCodeSVG value={r.ticket_code} size={140} level="M" />
                    <div className="font-mono text-sm font-bold tracking-widest">{r.ticket_code}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Tickets;
