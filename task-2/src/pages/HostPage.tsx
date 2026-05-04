import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import EventCard from "@/components/EventCard";
import { setSeo, truncate } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Check, Link2 } from "lucide-react";
import { toast } from "sonner";

const HostPage = () => {
  const { slug } = useParams();
  const [host, setHost] = useState<any>(null);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [past, setPast] = useState<any[]>([]);

  const [copied, setCopied] = useState(false);

  async function copyShareLink() {
    const url = `${window.location.origin}/h/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Share link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  }

  useEffect(() => {
    (async () => {
      const { data: h } = await supabase.from("hosts").select("*").eq("slug", slug!).maybeSingle();
      if (!h) return;
      setHost(h);
      setSeo({
        title: `${h.name} — Gather`,
        description: truncate(h.bio, 160) || `Discover events hosted by ${h.name} on Gather.`,
        image: h.logo_url || null,
        type: "profile",
      });
      const now = new Date().toISOString();
      const { data: up } = await supabase.from("events").select("id, slug, title, cover_image_url, starts_at, ends_at, venue_address, online_url")
        .eq("host_id", h.id).eq("status", "published").eq("visibility", "public").eq("is_hidden", false).gt("ends_at", now).order("starts_at");
      const { data: pa } = await supabase.from("events").select("id, slug, title, cover_image_url, starts_at, ends_at, venue_address, online_url")
        .eq("host_id", h.id).eq("status", "published").eq("visibility", "public").eq("is_hidden", false).lt("ends_at", now).order("starts_at", { ascending: false });
      setUpcoming(up || []); setPast(pa || []);
    })();
  }, [slug]);

  if (!host) return <div className="container-page py-20">Host not found.</div>;

  return (
    <div className="container-page py-10">
      <div className="card-soft p-8 mb-10 flex flex-col sm:flex-row gap-6 items-start">
        {host.logo_url ? (
          <img src={host.logo_url} className="h-24 w-24 rounded-2xl object-cover" alt={host.name} />
        ) : (
          <div className="h-24 w-24 rounded-2xl bg-primary/15 grid place-items-center text-3xl font-bold text-primary">
            {host.name[0]}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{host.name}</h1>
          {host.bio && <p className="mt-2 text-muted-foreground whitespace-pre-wrap">{host.bio}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {host.contact_email && <a href={`mailto:${host.contact_email}`} className="text-sm text-primary hover:underline">{host.contact_email}</a>}
            <Button size="sm" variant="outline" onClick={copyShareLink}>
              {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Link2 className="h-4 w-4 mr-1.5" />}
              {copied ? "Copied" : "Copy share link"}
            </Button>
          </div>
        </div>
      </div>

      {upcoming.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">Upcoming</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {upcoming.map(e => <EventCard key={e.id} event={e} />)}
          </div>
        </section>
      )}
      {past.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">Past</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {past.map(e => <EventCard key={e.id} event={e} />)}
          </div>
        </section>
      )}
      {upcoming.length === 0 && past.length === 0 && (
        <div className="card-soft p-10 text-center text-muted-foreground">No events yet.</div>
      )}
    </div>
  );
};

export default HostPage;
