import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadCSV } from "@/lib/csv";
import { fmtDateTime } from "@/lib/format";
import { toast } from "sonner";
import { Copy, Download, Eye, EyeOff, FileEdit } from "lucide-react";

const EventAdmin = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const [ev, setEv] = useState<any>(null);
  const [rsvps, setRsvps] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function load() {
    const { data: e } = await supabase.from("events").select("*, hosts(name, slug)").eq("id", id!).maybeSingle();
    setEv(e);
    const { data: rs } = await supabase.from("rsvps").select("*").eq("event_id", id!).order("created_at");
    const userIds = Array.from(new Set((rs || []).map((r: any) => r.user_id)));
    let profilesById: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name, contact_email").in("id", userIds);
      profilesById = Object.fromEntries((profs || []).map((p: any) => [p.id, p]));
    }
    setRsvps((rs || []).map((r: any) => ({ ...r, profiles: profilesById[r.user_id] || null })));
    const { data: ps } = await supabase.from("event_photos").select("*").eq("event_id", id!).order("created_at", { ascending: false });
    setPhotos(ps || []);
    const photoIds = (ps || []).map((p: any) => p.id);
    const { data: evReports } = await supabase.from("reports").select("*").eq("target_type", "event").eq("target_id", id!);
    let photoReports: any[] = [];
    if (photoIds.length > 0) {
      const { data: pr } = await supabase.from("reports").select("*").eq("target_type", "photo").in("target_id", photoIds);
      photoReports = pr || [];
    }
    const photosById = Object.fromEntries((ps || []).map((p: any) => [p.id, p]));
    const merged = [
      ...(evReports || []).map((r: any) => ({ ...r, _photo: null })),
      ...photoReports.map((r: any) => ({ ...r, _photo: photosById[r.target_id] || null })),
    ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    setReports(merged);
  }

  async function exportCSV() {
    const rows = rsvps.map(r => ({
      name: r.profiles?.display_name || "",
      email: r.profiles?.contact_email || "",
      rsvp_status: r.status,
      check_in_time: r.checked_in_at || "",
    }));
    downloadCSV(`${ev.slug}-rsvps.csv`, rows, ["name", "email", "rsvp_status", "check_in_time"]);
  }

  async function togglePublish() {
    const next = ev.status === "published" ? "draft" : "published";
    await supabase.from("events").update({ status: next }).eq("id", ev.id);
    toast.success(next === "published" ? "Published" : "Unpublished");
    load();
  }

  async function duplicate() {
    const { data: dup } = await supabase.from("events").insert({
      host_id: ev.host_id, title: ev.title + " (copy)", description: ev.description,
      starts_at: ev.starts_at, ends_at: ev.ends_at, timezone: ev.timezone,
      venue_address: ev.venue_address, online_url: ev.online_url, capacity: ev.capacity,
      cover_image_url: ev.cover_image_url, visibility: ev.visibility, status: "draft",
      slug: ev.slug + "-copy-" + Math.random().toString(36).slice(2, 6),
    }).select().single();
    if (dup) { toast.success("Duplicated"); nav(`/dashboard/events/${dup.id}/edit`); }
  }

  async function setPhoto(p: any, status: "approved" | "hidden" | "pending") {
    await supabase.from("event_photos").update({ status }).eq("id", p.id);
    load();
  }

  async function hideEvent(r?: any) {
    const { error: evErr } = await supabase.from("events").update({ is_hidden: true }).eq("id", ev.id);
    if (evErr) { toast.error(evErr.message); return; }
    if (r) {
      const { error: rErr } = await supabase.from("reports").update({ status: "hidden" }).eq("id", r.id);
      if (rErr) { toast.error(rErr.message); return; }
    }
    toast.success("Event hidden from public");
    load();
  }

  async function hidePhoto(r: any) {
    const { error: pErr } = await supabase.from("event_photos").update({ status: "hidden" }).eq("id", r.target_id);
    if (pErr) { toast.error(pErr.message); return; }
    const { error: rErr } = await supabase.from("reports").update({ status: "hidden" }).eq("id", r.id);
    if (rErr) { toast.error(rErr.message); return; }
    toast.success("Photo hidden");
    load();
  }

  async function dismissReport(r: any) {
    const { error } = await supabase.from("reports").update({ status: "dismissed" }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Report dismissed");
    load();
  }

  if (!ev) return <div className="container-page py-20">Loading…</div>;

  return (
    <div className="container-page py-10">
      <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
      <div className="flex flex-wrap items-start justify-between gap-4 mt-2 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{ev.title}</h1>
          <div className="text-sm text-muted-foreground mt-1">{fmtDateTime(ev.starts_at)} · {ev.status} · {ev.visibility}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm"><Link to={`/events/${ev.slug}`}>View public</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to={`/dashboard/events/${ev.id}/edit`}><FileEdit className="h-4 w-4 mr-1" />Edit</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to={`/checkin/${ev.id}`}>Check-in</Link></Button>
          <Button onClick={togglePublish} variant="outline" size="sm">
            {ev.status === "published" ? <><EyeOff className="h-4 w-4 mr-1" />Unpublish</> : <><Eye className="h-4 w-4 mr-1" />Publish</>}
          </Button>
          <Button onClick={duplicate} variant="outline" size="sm"><Copy className="h-4 w-4 mr-1" />Duplicate</Button>
        </div>
      </div>

      <Tabs defaultValue="attendees">
        <TabsList>
          <TabsTrigger value="attendees">Attendees ({rsvps.filter(r => r.status === "going").length})</TabsTrigger>
          <TabsTrigger value="waitlist">Waitlist ({rsvps.filter(r => r.status === "waitlist").length})</TabsTrigger>
          <TabsTrigger value="gallery">Gallery ({photos.length})</TabsTrigger>
          <TabsTrigger value="reports">Reports ({reports.filter(r => r.status === "open").length})</TabsTrigger>
        </TabsList>

        <TabsContent value="attendees" className="mt-4">
          <div className="card-soft p-4">
            <div className="flex justify-end mb-3">
              <Button onClick={exportCSV} size="sm" variant="outline"><Download className="h-4 w-4 mr-1" />Export CSV</Button>
            </div>
            <Table rows={rsvps.filter(r => r.status === "going")} />
          </div>
        </TabsContent>
        <TabsContent value="waitlist" className="mt-4">
          <div className="card-soft p-4"><Table rows={rsvps.filter(r => r.status === "waitlist")} showPosition /></div>
        </TabsContent>

        <TabsContent value="gallery" className="mt-4">
          <div className="card-soft p-4">
            {photos.length === 0 ? <div className="text-sm text-muted-foreground">No photos yet.</div> : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {photos.map(p => (
                  <div key={p.id} className="space-y-1">
                    <img src={p.image_url} className="aspect-square w-full object-cover rounded-lg" alt="" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="badge-soft">{p.status}</span>
                      <div className="flex gap-1">
                        {p.status !== "approved" && <button onClick={() => setPhoto(p, "approved")} className="text-success hover:underline">Approve</button>}
                        {p.status !== "hidden" && <button onClick={() => setPhoto(p, "hidden")} className="text-destructive hover:underline">Hide</button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <div className="card-soft p-4 space-y-3">
            {reports.length === 0 ? <div className="text-sm text-muted-foreground">No reports.</div> : reports.map(r => (
              <div key={r.id} className="border border-border rounded-lg p-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  {r._photo && (
                    <img src={r._photo.image_url} alt="" className="h-14 w-14 rounded object-cover shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{r.target_type === "photo" ? "Photo report" : "Event report"}</div>
                    <div className="text-sm font-medium">{r.reason || "(no reason)"}</div>
                    <div className="text-xs text-muted-foreground">{fmtDateTime(r.created_at)} · {r.status}</div>
                  </div>
                </div>
                {r.status === "open" && (
                  <div className="flex gap-2 shrink-0">
                    {r.target_type === "photo" ? (
                      <Button onClick={() => hidePhoto(r)} size="sm" variant="destructive">Hide photo</Button>
                    ) : (
                      <Button onClick={() => hideEvent(r)} size="sm" variant="destructive">Hide event</Button>
                    )}
                    <Button onClick={() => dismissReport(r)} size="sm" variant="outline">Dismiss</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Table = ({ rows, showPosition }: any) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="text-xs uppercase text-muted-foreground border-b border-border">
        <tr>
          {showPosition && <th className="text-left py-2 pr-3">#</th>}
          <th className="text-left py-2 pr-3">Name</th>
          <th className="text-left py-2 pr-3">Email</th>
          <th className="text-left py-2 pr-3">Ticket</th>
          <th className="text-left py-2 pr-3">Checked-in</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">None yet.</td></tr>}
        {rows.map((r: any) => (
          <tr key={r.id} className="border-b border-border/60">
            {showPosition && <td className="py-2 pr-3">{r.waitlist_position}</td>}
            <td className="py-2 pr-3">{r.profiles?.display_name || "—"}</td>
            <td className="py-2 pr-3">{r.profiles?.contact_email || "—"}</td>
            <td className="py-2 pr-3 font-mono">{r.ticket_code}</td>
            <td className="py-2 pr-3">{r.checked_in_at ? fmtDateTime(r.checked_in_at) : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default EventAdmin;
