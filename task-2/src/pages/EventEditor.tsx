import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { slugify } from "@/lib/format";
import { Info } from "lucide-react";
import { listTimezones, browserTimezone, tzLabel, zonedInputToISO, isoToZonedInput } from "@/lib/tz";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const EventEditor = () => {
  const { id } = useParams();
  const [params] = useSearchParams();
  const hostFromQuery = params.get("host");
  const { user } = useAuth();
  const nav = useNavigate();

  const [hosts, setHosts] = useState<any[]>([]);
  const [hostId, setHostId] = useState<string>(hostFromQuery || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [timezone, setTimezone] = useState(browserTimezone());
  const [tzOpen, setTzOpen] = useState(false);
  const allTimezones = listTimezones();
  const [venue, setVenue] = useState("");
  const [onlineUrl, setOnlineUrl] = useState("");
  const [capacity, setCapacity] = useState(50);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"public" | "unlisted">("public");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("host_members").select("hosts(*)").eq("user_id", user.id).eq("role", "host");
      const hs = (data || []).map((m: any) => m.hosts).filter(Boolean);
      setHosts(hs);
      if (!hostId && hs[0]) setHostId(hs[0].id);

      if (id) {
        const { data: ev } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
        if (ev) {
          setHostId(ev.host_id); setTitle(ev.title); setDescription(ev.description || "");
          const evTz = ev.timezone || browserTimezone();
          setTimezone(evTz);
          setStartsAt(isoToZonedInput(ev.starts_at, evTz));
          setEndsAt(isoToZonedInput(ev.ends_at, evTz));
          setVenue(ev.venue_address || ""); setOnlineUrl(ev.online_url || "");
          setCapacity(ev.capacity); setCoverUrl(ev.cover_image_url); setVisibility(ev.visibility); setStatus(ev.status);
        }
      }
    })();
    // eslint-disable-next-line
  }, [user?.id, id]);

  async function save(publish?: boolean) {
    if (!hostId || !title || !startsAt || !endsAt) { toast.error("Fill required fields"); return; }
    const startsISO = zonedInputToISO(startsAt, timezone);
    const endsISO = zonedInputToISO(endsAt, timezone);
    if (new Date(endsISO) <= new Date(startsISO)) { toast.error("End time must be after start time"); return; }
    if (id) {
      const { data: counts } = await supabase.rpc("event_rsvp_counts", { _event_id: id });
      const row = Array.isArray(counts) ? counts[0] : counts;
      const going = row?.going_count || 0;
      if (capacity < going) {
        toast.error(`Capacity can't be lower than current attendees (${going} going)`);
        return;
      }
    }
    setLoading(true);
    let cover = coverUrl;
    if (coverFile && user) {
      const path = `${hostId}/${Date.now()}-${coverFile.name.replace(/[^a-z0-9.]/gi, "_")}`;
      const up = await supabase.storage.from("event-covers").upload(path, coverFile);
      if (up.error) { toast.error(up.error.message); setLoading(false); return; }
      cover = supabase.storage.from("event-covers").getPublicUrl(path).data.publicUrl;
    }
    const payload: any = {
      host_id: hostId, title, description, starts_at: startsISO, ends_at: endsISO,
      timezone, venue_address: venue || null, online_url: onlineUrl || null, capacity, cover_image_url: cover, visibility,
      status: publish ? "published" : status,
    };
    if (id) {
      const { error } = await supabase.from("events").update(payload).eq("id", id);
      if (error) { toast.error(error.message); setLoading(false); return; }
      toast.success(publish ? "Published!" : "Saved");
      nav(`/dashboard/events/${id}`);
    } else {
      payload.slug = slugify(title);
      const { data, error } = await supabase.from("events").insert(payload).select().single();
      if (error) { toast.error(error.message); setLoading(false); return; }
      toast.success(publish ? "Published!" : "Draft created");
      nav(`/dashboard/events/${data.id}`);
    }
    setLoading(false);
  }

  return (
    <div className="container-page py-10 max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight mb-8">{id ? "Edit event" : "New event"}</h1>
      <div className="card-soft p-6 space-y-5">
        {hosts.length > 1 && (
          <div>
            <Label>Host</Label>
            <select className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3" value={hostId} onChange={e=>setHostId(e.target.value)}>
              {hosts.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
        )}
        <div><Label>Title *</Label><Input value={title} onChange={e=>setTitle(e.target.value)} required /></div>
        <div><Label>Description</Label><Textarea value={description} onChange={e=>setDescription(e.target.value)} rows={5} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Starts *</Label><Input type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)} required /></div>
          <div><Label>Ends *</Label><Input type="datetime-local" value={endsAt} onChange={e=>setEndsAt(e.target.value)} required /></div>
        </div>
        <div>
          <Label>Timezone</Label>
          <Popover open={tzOpen} onOpenChange={setTzOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={tzOpen}
                className="mt-1 w-full justify-between font-normal"
              >
                <span className="truncate">{tzLabel(timezone)}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search timezone…" />
                <CommandList>
                  <CommandEmpty>No timezone found.</CommandEmpty>
                  <CommandGroup>
                    {allTimezones.map((tz) => (
                      <CommandItem
                        key={tz}
                        value={tz}
                        onSelect={(v) => { setTimezone(v); setTzOpen(false); }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", timezone === tz ? "opacity-100" : "opacity-0")} />
                        <span className="truncate">{tzLabel(tz)}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground mt-1">Start/end times above are interpreted in this timezone.</p>
        </div>
        <div><Label>Venue address</Label><Input value={venue} onChange={e=>setVenue(e.target.value)} placeholder="123 Main St, Brooklyn" /></div>
        <div><Label>Online URL (optional)</Label><Input value={onlineUrl} onChange={e=>setOnlineUrl(e.target.value)} placeholder="https://meet…" /></div>
        <div><Label>Capacity</Label><Input type="number" min={0} value={capacity} onChange={e=>setCapacity(parseInt(e.target.value)||0)} /></div>
        <div>
          <Label>Cover image</Label>
          <Input type="file" accept="image/*" onChange={e=>setCoverFile(e.target.files?.[0] || null)} />
          {coverUrl && <img src={coverUrl} className="mt-2 rounded-lg max-h-40" alt="" />}
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-surface-2">
          <div>
            <div className="font-medium">Visibility</div>
            <div className="text-xs text-muted-foreground">{visibility === "public" ? "Searchable on Explore" : "Link only"}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Public</span>
            <Switch checked={visibility === "unlisted"} onCheckedChange={v => setVisibility(v ? "unlisted" : "public")} />
            <span className="text-sm">Unlisted</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-surface-2 opacity-90">
          <div>
            <div className="font-medium flex items-center gap-1">Pricing
              <Tooltip>
                <TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
                <TooltipContent>Paid events coming soon</TooltipContent>
              </Tooltip>
            </div>
            <div className="text-xs text-muted-foreground">Free events only for now</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Free</span>
            <Tooltip>
              <TooltipTrigger asChild><span><Switch disabled checked={false} /></span></TooltipTrigger>
              <TooltipContent>Coming soon</TooltipContent>
            </Tooltip>
            <span className="text-sm text-muted-foreground">Paid</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button onClick={() => save(false)} variant="outline" disabled={loading}>Save draft</Button>
          <Button onClick={() => save(true)} disabled={loading}>Publish</Button>
        </div>
      </div>
    </div>
  );
};

export default EventEditor;
