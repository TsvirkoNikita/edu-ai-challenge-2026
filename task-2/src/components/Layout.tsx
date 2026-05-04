import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { CalendarDays, Ticket, LayoutDashboard, LogOut, Compass } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const Layout = () => {
  const { user, signOut } = useAuth();
  const nav = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 backdrop-blur bg-background/80">
        <div className="container-page h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <CalendarDays className="h-4 w-4" />
            </span>
            Gather
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm">
            <NavLink to="/explore" className={({isActive}) => `px-3 py-2 rounded-lg hover:bg-muted ${isActive ? "text-primary font-medium" : "text-foreground/80"}`}>
              <span className="inline-flex items-center gap-1.5"><Compass className="h-4 w-4" />Explore</span>
            </NavLink>
            {user && (
              <>
                <NavLink to="/tickets" className={({isActive}) => `px-3 py-2 rounded-lg hover:bg-muted ${isActive ? "text-primary font-medium" : "text-foreground/80"}`}>
                  <span className="inline-flex items-center gap-1.5"><Ticket className="h-4 w-4" />Tickets</span>
                </NavLink>
                <NavLink to="/my-events" className={({isActive}) => `px-3 py-2 rounded-lg hover:bg-muted ${isActive ? "text-primary font-medium" : "text-foreground/80"}`}>
                  <span className="inline-flex items-center gap-1.5"><LayoutDashboard className="h-4 w-4" />My events</span>
                </NavLink>
              </>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-full">
                    {user.email?.split("@")[0]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => nav("/tickets")}><Ticket className="h-4 w-4 mr-2" />My tickets</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => nav("/my-events")}><LayoutDashboard className="h-4 w-4 mr-2" />My events</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => nav("/dashboard")}><LayoutDashboard className="h-4 w-4 mr-2" />Host dashboard</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => nav("/become-a-host")}>Become a host</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => { await signOut(); nav("/"); }}>
                    <LogOut className="h-4 w-4 mr-2" />Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => nav("/auth")}>Sign in</Button>
                <Button size="sm" onClick={() => nav("/auth?mode=signup")}>Get started</Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border/60 mt-16">
        <div className="container-page py-8 text-sm text-muted-foreground flex flex-col sm:flex-row justify-between gap-2">
          <span>© Gather — community events platform</span>
          <span>Built on Lovable Cloud</span>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
