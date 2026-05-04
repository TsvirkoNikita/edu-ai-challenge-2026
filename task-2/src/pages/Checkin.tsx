import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Undo2, CheckCircle2, XCircle } from "lucide-react";

interface ScanLog { rsvpId: string; name: string; code: string; previous: string | null; }

const Checkin = () => {
  const { eventId } = useParams();
  const [event, setEvent] = useState<any>(null);
  const [going, setGoing] = useState(0);
  const [checked, setChecked] = useState(0);
  const [code, setCode] = useState("");
  const [log, setLog] = useState<ScanLog[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [eventId]);

  async function load() {
    const { data: e } = await supabase.from("events").select("*").eq("id", eventId!).maybeSingle();
    setEvent(e);
    refresh();
  }

  async function refresh() {
    const [{ count: g }, { count: c }] = await Promise.all([
      supabase.from("rsvps").select("*", { count: "exact", head: true }).eq("event_id", eventId!).eq("status", "going"),
      supabase.from("rsvps").select("*", { count: "exact", head: true }).eq("event_id", eventId!).eq("status", "going").not("checked_in_at", "is", null),
    ]);
    setGoing(g || 0); setChecked(c || 0);
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const value = code.trim().toUpperCase();
    if (!value) return;
    const { data: rsvp } = await supabase.from("rsvps").select("*").eq("event_id", eventId!).eq("ticket_code", value).maybeSingle();
    let displayName = "Guest";
    if (rsvp) {
      const { data: prof } = await supabase.from("profiles").select("display_name").eq("id", rsvp.user_id).maybeSingle();
      displayName = prof?.display_name || "Guest";
    }
    if (!rsvp) { toast.error("Ticket not found"); }
    else if (rsvp.status !== "going") { toast.error(`Ticket is ${rsvp.status}, not going`); }
    else if (rsvp.checked_in_at) { toast.error(`Already checked in at ${new Date(rsvp.checked_in_at).toLocaleTimeString()}`); }
    else {
      const now = new Date().toISOString();
      const { error } = await supabase.from("rsvps").update({ checked_in_at: now }).eq("id", rsvp.id);
      if (error) toast.error(error.message);
      else {
        toast.success(`✓ ${displayName} checked in`);
        setLog(l => [{ rsvpId: rsvp.id, name: displayName, code: value, previous: null }, ...l].slice(0, 20));
        refresh();
      }
    }
    setCode(""); inputRef.current?.focus();
  }

  async function undo() {
    const last = log[0];
    if (!last) return;
    await supabase.from("rsvps").update({ checked_in_at: last.previous }).eq("id", last.rsvpId);
    setLog(log.slice(1));
    toast.success("Undone");
    refresh();
  }

  if (!event) return <div className="container-page py-20">Loading…</div>;

  return (
    <div className="container-page py-10 max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">{event.title}</h1>
      <p className="text-muted-foreground text-sm mb-6">Check-in</p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Going" value={going} />
        <Stat label="Checked-in" value={checked} highlight />
        <Stat label="Remaining" value={going - checked} />
      </div>

      <form onSubmit={submit} className="card-soft p-6 space-y-3">
        <label className="text-sm font-medium">Ticket code</label>
        <Input ref={inputRef} value={code} onChange={e=>setCode(e.target.value.toUpperCase())}
          placeholder="ABCD2345" autoFocus className="font-mono text-lg tracking-widest text-center h-14" maxLength={12} />
        <div className="flex gap-2">
          <Button type="submit" className="flex-1" size="lg">Check in</Button>
          <Button type="button" onClick={undo} variant="outline" disabled={log.length === 0}><Undo2 className="h-4 w-4 mr-1" />Undo</Button>
        </div>
      </form>

      <div className="mt-6 card-soft p-4">
        <h2 className="font-semibold mb-2 text-sm">Recent scans</h2>
        {log.length === 0 ? (
          <div className="text-sm text-muted-foreground">No scans yet.</div>
        ) : (
          <div className="space-y-1.5">
            {log.map((l, i) => (
              <div key={i} className="flex items-center justify-between text-sm border-b border-border/60 py-1.5">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" />{l.name}</div>
                <code className="text-xs text-muted-foreground">{l.code}</code>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Stat = ({ label, value, highlight }: any) => (
  <div className={`card-soft p-4 text-center ${highlight ? "bg-primary/5 border-primary/30" : ""}`}>
    <div className="text-3xl font-bold">{value}</div>
    <div className="text-xs uppercase tracking-wide text-muted-foreground mt-1">{label}</div>
  </div>
);

export default Checkin;
