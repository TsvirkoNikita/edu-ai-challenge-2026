import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import EventCard from "@/components/EventCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Search, CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

type RangePreset = "upcoming" | "today" | "this_week" | "this_month" | "past" | "all" | "custom";

function computeRange(preset: RangePreset, custom?: DateRange): { from?: Date; to?: Date; orderAsc: boolean } {
  const now = new Date();
  const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
  const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };

  switch (preset) {
    case "upcoming":
      return { from: now, orderAsc: true };
    case "today":
      return { from: startOfDay(now), to: endOfDay(now), orderAsc: true };
    case "this_week": {
      const day = now.getDay(); // 0 Sun
      const diffToMon = (day + 6) % 7;
      const monday = startOfDay(new Date(now.getTime() - diffToMon * 86400000));
      const sunday = endOfDay(new Date(monday.getTime() + 6 * 86400000));
      return { from: monday, to: sunday, orderAsc: true };
    }
    case "this_month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1, 0,0,0,0);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23,59,59,999);
      return { from, to, orderAsc: true };
    }
    case "past":
      return { to: now, orderAsc: false };
    case "all":
      return { orderAsc: true };
    case "custom":
      return {
        from: custom?.from ? startOfDay(custom.from) : undefined,
        to: custom?.to ? endOfDay(custom.to) : (custom?.from ? endOfDay(custom.from) : undefined),
        orderAsc: true,
      };
  }
}

const Explore = () => {
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const [preset, setPreset] = useState<RangePreset>("upcoming");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => computeRange(preset, customRange), [preset, customRange]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [q, loc, preset, customRange?.from, customRange?.to]);

  async function load() {
    setLoading(true);
    let query = supabase
      .from("events")
      .select("id, slug, title, cover_image_url, starts_at, ends_at, venue_address, online_url, hosts(name, slug)")
      .eq("status", "published")
      .eq("visibility", "public")
      .eq("is_hidden", false);

    if (range.from) query = query.gte("ends_at", range.from.toISOString());
    if (range.to) query = query.lte("starts_at", range.to.toISOString());

    if (q) query = query.ilike("title", `%${q}%`);
    if (loc) query = query.ilike("venue_address", `%${loc}%`);
    query = query.order("starts_at", { ascending: range.orderAsc });
    const { data } = await query.limit(60);
    setEvents(data || []);
    setLoading(false);
  }

  const customLabel = customRange?.from
    ? customRange.to
      ? `${format(customRange.from, "LLL d")} – ${format(customRange.to, "LLL d, y")}`
      : format(customRange.from, "LLL d, y")
    : "Pick dates";

  return (
    <div className="container-page py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Explore events</h1>
        <p className="text-muted-foreground">Find something happening near you.</p>
      </div>

      <div className="card-soft p-4 sm:p-5 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr,1fr,200px,auto] gap-3 sm:gap-4 items-end">
        <div>
          <Label className="text-xs">Search</Label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search events…" className="pl-9" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Location</Label>
          <Input value={loc} onChange={e=>setLoc(e.target.value)} placeholder="City or venue" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Date range</Label>
          <Select value={preset} onValueChange={(v) => setPreset(v as RangePreset)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this_week">This week</SelectItem>
              <SelectItem value="this_month">This month</SelectItem>
              <SelectItem value="past">Past events</SelectItem>
              <SelectItem value="all">All dates</SelectItem>
              <SelectItem value="custom">Custom range…</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {preset === "custom" && (
          <div>
            <Label className="text-xs">Custom dates</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("mt-1 w-full justify-start text-left font-normal", !customRange?.from && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={customRange}
                  onSelect={setCustomRange}
                  numberOfMonths={2}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : events.length === 0 ? (
        <div className="card-soft p-10 text-center text-muted-foreground">No events match your filters.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map(e => <EventCard key={e.id} event={e} />)}
        </div>
      )}
    </div>
  );
};

export default Explore;
