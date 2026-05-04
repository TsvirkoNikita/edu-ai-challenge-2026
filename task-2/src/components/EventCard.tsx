import { Link } from "react-router-dom";
import { Calendar, MapPin } from "lucide-react";
import { fmtDateTime, isPast } from "@/lib/format";

interface Props {
  event: {
    id: string;
    slug: string;
    title: string;
    cover_image_url: string | null;
    starts_at: string;
    ends_at: string;
    venue_address: string | null;
    online_url: string | null;
    hosts?: { name: string; slug: string } | null;
  };
}

const EventCard = ({ event }: Props) => {
  const ended = isPast(event.ends_at);
  const location = event.venue_address || (event.online_url ? "Online" : "TBA");
  return (
    <Link to={`/events/${event.slug}`} className="group block card-soft card-hover overflow-hidden">
      <div className="aspect-[16/9] bg-muted relative overflow-hidden">
        {event.cover_image_url ? (
          <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
        )}
        {ended && (
          <span className="absolute top-3 left-3 badge-soft bg-foreground/80 text-background">Ended</span>
        )}
      </div>
      <div className="p-4 space-y-2">
        {event.hosts && <div className="text-xs text-muted-foreground">{event.hosts.name}</div>}
        <h3 className="font-semibold text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {event.title}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />{fmtDateTime(event.starts_at)}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />{location}
        </div>
      </div>
    </Link>
  );
};

export default EventCard;
