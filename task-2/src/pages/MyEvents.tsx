import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDateTime, isPast } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CalendarIcon, Search } from "lucide-react";
import { format } from "date-fns";

type DatePreset = "all" | "upcoming" | "today" | "this_week" | "this_month" | "past" | "custom";

function computeRange(preset: DatePreset, customFrom?: Date, customTo?: Date): { from?: Date; to?: Date } {
  const now = new Date();
  const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
  const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };
  switch (preset) {
    case "upcoming": return { from: now };
    case "past": return { to: now };
    case "today": return { from: startOfDay(now), to: endOfDay(now) };
    case "this_week": {
      const day = now.getDay(); // 0 Sun
      const diffToMon = (day + 6) % 7;
      const mon = startOfDay(new Date(now)); mon.setDate(mon.getDate() - diffToMon);
      const sun = endOfDay(new Date(mon)); sun.setDate(sun.getDate() + 6);
      return { from: mon, to: sun };
    }
    case "this_month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      return { from, to };
    }
    case "custom": return { from: customFrom ? startOfDay(customFrom) : undefined, to: customTo ? endOfDay(customTo) : undefined };
    case "all":
    default: return {};
  }
}

const MyEvents = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [hostFilter, setHostFilter] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("upcoming");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  useEffect(() => { (async () => {
    if (!user) return;
    const { data: members } = await supabase.from("host_members").select("host_id, role, hosts(*)").eq("user_id", user.id);
    const hostIds = (members || []).map((m: any) => m.host_id);
    if (hostIds.length === 0) { setRows([]); return; }
    const { data } = await supabase.from("events").select("*, hosts(name, slug)").in("host_id", hostIds).order("starts_at", { ascending: false });
    const roleByHost: Record<string, string> = {};
    (members || []).forEach((m: any) => { roleByHost[m.host_id] = m.role; });
    setRows((data || []).map((e: any) => ({ ...e, _role: roleByHost[e.host_id] })));
  })(); }, [user?.id]);

  const hosts = useMemo(
    () => Array.from(new Map(rows.map(r => [r.host_id, r.hosts])).values()),
    [rows]
  );

  const filtered = useMemo(() => {
    const range = computeRange(datePreset, customFrom, customTo);
    return rows.filter(r => {
      if (q && !r.title.toLowerCase().includes(q.toLowerCase())) return false;
      if (hostFilter !== "all" && r.host_id !== hostFilter) return false;
      const starts = new Date(r.starts_at);
      const ends = new Date(r.ends_at);
      if (range.from && ends < range.from) return false;
      if (range.to && starts > range.to) return false;
      return true;
    });
  }, [rows, q, hostFilter, datePreset, customFrom, customTo]);

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-bold tracking-tight mb-6">My events</h1>

      <div className="card-soft p-4 mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search events…" className="pl-9" />
        </div>

        <Select value={hostFilter} onValueChange={setHostFilter}>
          <SelectTrigger><SelectValue placeholder="All hosts" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All hosts</SelectItem>
            {hosts.map((h: any) => h && <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this_week">This week</SelectItem>
            <SelectItem value="this_month">This month</SelectItem>
            <SelectItem value="past">Past</SelectItem>
            <SelectItem value="all">All dates</SelectItem>
            <SelectItem value="custom">Custom range</SelectItem>
          </SelectContent>
        </Select>

        {datePreset === "custom" && (
          <div className="flex gap-2 lg:col-span-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !customFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customFrom ? format(customFrom, "PPP") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !customTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customTo ? format(customTo, "PPP") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customTo} onSelect={setCustomTo} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            {(customFrom || customTo) && (
              <Button variant="ghost" onClick={() => { setCustomFrom(undefined); setCustomTo(undefined); }}>Clear</Button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && <div className="card-soft p-10 text-center text-muted-foreground">No events match your filters.</div>}
        {filtered.map(e => (
          <div key={e.id} className="card-soft p-4 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link to={`/events/${e.slug}`} className="font-semibold hover:underline">{e.title}</Link>
                <span className="badge-soft text-[10px]">{e._role}</span>
                <span className="badge-soft text-[10px]">{e.status}</span>
                {isPast(e.ends_at) && <span className="badge-soft text-[10px] bg-foreground/80 text-background">Ended</span>}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{e.hosts?.name} · {fmtDateTime(e.starts_at)}</div>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              {e._role === "host" && (
                <>
                  <Link to={`/dashboard/events/${e.id}`} className="text-sm text-primary hover:underline">Manage</Link>
                  <Link to={`/dashboard/events/${e.id}/edit`} className="text-sm text-primary hover:underline">Edit</Link>
                </>
              )}
              {!isPast(e.ends_at) && <Link to={`/checkin/${e.id}`} className="text-sm text-primary hover:underline">Check-in</Link>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyEvents;
