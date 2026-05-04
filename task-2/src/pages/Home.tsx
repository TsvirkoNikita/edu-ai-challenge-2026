import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import EventCard from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const Home = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("id, slug, title, cover_image_url, starts_at, ends_at, venue_address, online_url, hosts(name, slug)")
        .eq("status", "published")
        .eq("visibility", "public")
        .eq("is_hidden", false)
        .gt("ends_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(6);
      setEvents(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <>
      <section className="container-page py-16 sm:py-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 badge-soft mb-6">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Free for community organizers
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">
            Host events <span className="text-primary">people show up to.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
            Publish a beautiful event page, share a link, collect RSVPs, send digital tickets,
            and check guests in at the door — all in one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/explore">Browse events <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/become-a-host">Create your host page</Link></Button>
          </div>
        </div>
      </section>

      <section className="container-page pb-16">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Upcoming events</h2>
          <Link to="/explore" className="text-sm text-primary hover:underline">See all</Link>
        </div>
        {loading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : events.length === 0 ? (
          <div className="card-soft p-10 text-center text-muted-foreground">
            No upcoming events yet — be the first to <Link to="/become-a-host" className="text-primary hover:underline">host one</Link>.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map(e => <EventCard key={e.id} event={e} />)}
          </div>
        )}
      </section>
    </>
  );
};

export default Home;
