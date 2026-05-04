import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { fmtDateTime, isPast, ticketCode } from "@/lib/format";
import { setSeo, truncate } from "@/lib/seo";
import { Calendar, MapPin, Users, Globe, Flag, Star } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const EventPage = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [going, setGoing] = useState(0);
  const [waitlist, setWaitlist] = useState(0);
  const [myRsvp, setMyRsvp] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [lightbox, setLightbox] = useState<any | null>(null);
  const [photoReportReason, setPhotoReportReason] = useState("");
  const [reportingPhoto, setReportingPhoto] = useState<any | null>(null);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [slug, user?.id]);

  async function load() {
    setLoading(true);
    const { data: ev } = await supabase
      .from("events")
      .select("*, hosts(id, name, slug, logo_url, bio, contact_email)")
      .eq("slug", slug!).maybeSingle();
    if (!ev) { setLoading(false); return; }
    setEvent(ev);
    const hostName = ev.hosts?.name ? ` · Hosted by ${ev.hosts.name}` : "";
    const when = (() => { try { return fmtDateTime(ev.starts_at); } catch { return ""; } })();
    const desc = truncate(ev.description, 160) || `${when}${hostName}. RSVP free on Gather.`;
    setSeo({
      title: `${ev.title} — Gather`,
      description: desc,
      image: ev.cover_image_url || null,
      type: "event",
    });

    const { data: counts } = await supabase.rpc("event_rsvp_counts", { _event_id: ev.id });
    const row = Array.isArray(counts) ? counts[0] : counts;
    setGoing(row?.going_count || 0);
    setWaitlist(row?.waitlist_count || 0);

    if (user) {
      const { data: r } = await supabase.from("rsvps").select("*").eq("event_id", ev.id).eq("user_id", user.id).maybeSingle();
      setMyRsvp(r);
    } else setMyRsvp(null);

    const { data: ps } = await supabase.from("event_photos").select("*").eq("event_id", ev.id).eq("status", "approved").order("created_at", { ascending: false });
    setPhotos(ps || []);
    const { data: fb } = await supabase.from("event_feedback").select("*").eq("event_id", ev.id).order("created_at", { ascending: false });
    setFeedback(fb || []);

    setLoading(false);
  }

  async function rsvp() {
    if (!user) { nav(`/auth?redirect=/events/${slug}`); return; }
    // Re-check live counts to avoid race conditions with stale state
    const [{ count: gNow }, { count: wNow }] = await Promise.all([
      supabase.from("rsvps").select("*", { count: "exact", head: true }).eq("event_id", event.id).eq("status", "going"),
      supabase.from("rsvps").select("*", { count: "exact", head: true }).eq("event_id", event.id).eq("status", "waitlist"),
    ]);
    const goingNow = gNow || 0;
    const waitlistNow = wNow || 0;
    const remaining = event.capacity - goingNow;
    const status = remaining > 0 ? "going" : "waitlist";
    const position = status === "waitlist" ? waitlistNow + 1 : null;

    // Check if an RSVP row already exists (e.g. previously cancelled) and update it instead of inserting.
    const { data: existing } = await supabase
      .from("rsvps").select("*").eq("event_id", event.id).eq("user_id", user.id).maybeSingle();

    const { error } = existing
      ? await supabase.from("rsvps").update({
          status, waitlist_position: position, ticket_code: existing.ticket_code || ticketCode(), checked_in_at: null,
        }).eq("id", existing.id)
      : await supabase.from("rsvps").insert({
          event_id: event.id, user_id: user.id, status, waitlist_position: position, ticket_code: ticketCode(),
        });
    if (error) return toast.error(error.message);
    toast.success(status === "going" ? "You're going! 🎉 Ticket added." : `You're on the waitlist (#${position}).`);
    load();
  }

  async function cancel() {
    if (!myRsvp) return;
    const wasGoing = myRsvp.status === "going";
    const { error } = await supabase.from("rsvps").update({ status: "cancelled", waitlist_position: null }).eq("id", myRsvp.id);
    if (error) return toast.error(error.message);
    toast.success("RSVP cancelled");
    if (wasGoing) {
      // Promote next from waitlist (FIFO)
      const { data: next } = await supabase
        .from("rsvps").select("*").eq("event_id", event.id).eq("status", "waitlist")
        .order("waitlist_position", { ascending: true }).limit(1).maybeSingle();
      if (next) {
        await supabase.from("rsvps").update({ status: "going", waitlist_position: null }).eq("id", next.id);
      }
    }
    load();
  }

  async function uploadPhoto(file: File) {
    if (!user) return;
    const path = `${event.id}/${user.id}-${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, "_")}`;
    const up = await supabase.storage.from("event-photos").upload(path, file);
    if (up.error) return toast.error(up.error.message);
    const { data } = supabase.storage.from("event-photos").getPublicUrl(path);
    const { error } = await supabase.from("event_photos").insert({ event_id: event.id, user_id: user.id, image_url: data.publicUrl });
    if (error) return toast.error(error.message);
    toast.success("Photo submitted — pending host approval.");
  }

  async function submitFeedback() {
    if (!user || !myRsvp) return;
    const { error } = await supabase.from("event_feedback").insert({ event_id: event.id, user_id: user.id, rating, comment });
    if (error) return toast.error(error.message);
    toast.success("Thanks for the feedback!");
    setComment("");
    load();
  }

  async function submitReport() {
    if (!user) { nav(`/auth?redirect=/events/${slug}`); return; }
    const { error } = await supabase.from("reports").insert({ target_type: "event", target_id: event.id, reporter_id: user.id, reason: reportReason });
    if (error) return toast.error(error.message);
    toast.success("Reported. Thanks for keeping the community safe.");
    setReportReason("");
  }

  async function submitPhotoReport() {
    if (!user) { nav(`/auth?redirect=/events/${slug}`); return; }
    if (!reportingPhoto) return;
    const { error } = await supabase.from("reports").insert({ target_type: "photo", target_id: reportingPhoto.id, reporter_id: user.id, reason: photoReportReason });
    if (error) return toast.error(error.message);
    toast.success("Photo reported. Thanks!");
    setPhotoReportReason("");
    setReportingPhoto(null);
  }

  if (loading) return <div className="container-page py-20 text-muted-foreground">Loading…</div>;
  if (!event) return <div className="container-page py-20">Event not found.</div>;

  const ended = isPast(event.ends_at);
  const remaining = event.capacity - going;
  const location = event.venue_address || (event.online_url ? "Online" : "TBA");

  return (
    <div className="container-page py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-8">
        <div className="space-y-6">
          <div className="aspect-[16/9] rounded-2xl bg-muted overflow-hidden">
            {event.cover_image_url ? (
              <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" />
            ) : <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />}
          </div>

          <div>
            {event.hosts && (
              <Link to={`/h/${event.hosts.slug}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                {event.hosts.logo_url && <img src={event.hosts.logo_url} className="h-5 w-5 rounded-full object-cover" alt="" />}
                Hosted by {event.hosts.name}
              </Link>
            )}
            <h1 className="text-4xl font-extrabold tracking-tight mt-2">{event.title}</h1>
            {ended && <span className="badge-soft mt-3 bg-foreground/80 text-background">Ended</span>}
          </div>

          {event.description && (
            <div className="card-soft p-6">
              <h2 className="font-semibold mb-2">About</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Gallery */}
          <div className="card-soft p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Gallery</h2>
              {user && (
                <label className="text-sm text-primary cursor-pointer hover:underline">
                  Add a photo
                  <input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
                </label>
              )}
            </div>
            {photos.length === 0 ? (
              <div className="text-sm text-muted-foreground">No photos yet.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map(p => (
                  <div key={p.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => setLightbox(p)}
                      className="block aspect-square w-full overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <img src={p.image_url} alt="" className="w-full h-full object-cover transition-transform hover:scale-105" />
                    </button>
                    {user && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setReportingPhoto(p); }}
                        className="absolute top-2 right-2 bg-background/80 backdrop-blur rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                        title="Report photo"
                      >
                        <Flag className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Feedback */}
          {ended && (
            <div className="card-soft p-6">
              <h2 className="font-semibold mb-4">Feedback</h2>
              {user && myRsvp?.status === "going" && !feedback.find(f => f.user_id === user.id) && (
                <div className="mb-4 space-y-3">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setRating(n)} type="button">
                        <Star className={`h-6 w-6 ${n <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                      </button>
                    ))}
                  </div>
                  <Textarea placeholder="Optional comment" value={comment} onChange={e=>setComment(e.target.value)} maxLength={500} />
                  <Button onClick={submitFeedback} size="sm">Submit feedback</Button>
                </div>
              )}
              {feedback.length === 0 ? (
                <div className="text-sm text-muted-foreground">No feedback yet.</div>
              ) : (
                <div className="space-y-3">
                  {feedback.map(f => (
                    <div key={f.id} className="flex gap-3">
                      <div className="flex">{[1,2,3,4,5].map(n => <Star key={n} className={`h-4 w-4 ${n <= f.rating ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />)}</div>
                      <div className="text-sm">{f.comment || <span className="text-muted-foreground italic">No comment</span>}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="card-soft p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="font-medium">{fmtDateTime(event.starts_at)}</div>
                <div className="text-sm text-muted-foreground">to {fmtDateTime(event.ends_at)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{event.timezone}</div>
              </div>
            </div>
            {event.venue_address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div className="text-sm">{event.venue_address}</div>
              </div>
            )}
            {event.online_url && (
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-primary mt-0.5" />
                <a href={event.online_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">
                  {event.online_url}
                </a>
              </div>
            )}
            {!event.venue_address && !event.online_url && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div className="text-sm">TBA</div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <div>{going} going · {remaining > 0 ? `${remaining} spots left` : "Full"}</div>
                {waitlist > 0 && <div className="text-xs text-muted-foreground">{waitlist} on waitlist</div>}
              </div>
            </div>

            {ended ? (
              <Button disabled className="w-full" variant="outline">Event ended</Button>
            ) : myRsvp && myRsvp.status !== "cancelled" ? (
              <div className="space-y-2">
                <div className={`text-center text-sm font-medium py-2 rounded-lg ${myRsvp.status === "going" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                  {myRsvp.status === "going" ? "✓ You're going" : `Waitlist #${myRsvp.waitlist_position}`}
                </div>
                <Button asChild className="w-full"><Link to="/tickets">View ticket</Link></Button>
                <Button onClick={cancel} variant="outline" className="w-full">Cancel RSVP</Button>
              </div>
            ) : (
              <Button onClick={rsvp} className="w-full" size="lg">
                {remaining > 0 ? "RSVP — it's free" : "Join waitlist"}
              </Button>
            )}

            <button
              onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); }}
              className="w-full text-sm text-muted-foreground hover:text-foreground">
              Copy share link
            </button>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <button className="w-full text-xs text-muted-foreground hover:text-destructive flex items-center justify-center gap-1">
                <Flag className="h-3 w-3" /> Report this event
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Report event</DialogTitle>
                <DialogDescription>Tell us what's wrong. The host team will review.</DialogDescription>
              </DialogHeader>
              <Input placeholder="Reason" value={reportReason} onChange={e=>setReportReason(e.target.value)} maxLength={200} />
              <Button onClick={submitReport}>Submit report</Button>
            </DialogContent>
          </Dialog>
        </aside>
      </div>

      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-5xl p-2 bg-background/95">
          <DialogHeader className="sr-only">
            <DialogTitle>Photo</DialogTitle>
          </DialogHeader>
          {lightbox && <img src={lightbox.image_url} alt="" className="w-full max-h-[85vh] object-contain rounded-md" />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!reportingPhoto} onOpenChange={(o) => !o && setReportingPhoto(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report photo</DialogTitle>
            <DialogDescription>Tell us what's wrong. The host team will review.</DialogDescription>
          </DialogHeader>
          <Input placeholder="Reason" value={photoReportReason} onChange={e=>setPhotoReportReason(e.target.value)} maxLength={200} />
          <Button onClick={submitPhotoReport}>Submit report</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventPage;
