import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import Layout from "@/components/Layout";
import RequireAuth from "@/components/RequireAuth";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import EventPage from "./pages/EventPage";
import HostPage from "./pages/HostPage";
import Auth from "./pages/Auth";
import Tickets from "./pages/Tickets";
import BecomeHost from "./pages/BecomeHost";
import EditHost from "./pages/EditHost";
import Dashboard from "./pages/Dashboard";
import EventEditor from "./pages/EventEditor";
import EventAdmin from "./pages/EventAdmin";
import Team from "./pages/Team";
import MyEvents from "./pages/MyEvents";
import JoinHost from "./pages/JoinHost";
import Checkin from "./pages/Checkin";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/join/:token" element={<JoinHost />} />
            <Route path="/checkin/:eventId" element={<RequireAuth><Checkin /></RequireAuth>} />
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/events/:slug" element={<EventPage />} />
              <Route path="/h/:slug" element={<HostPage />} />
              <Route path="/tickets" element={<RequireAuth><Tickets /></RequireAuth>} />
              <Route path="/become-a-host" element={<RequireAuth><BecomeHost /></RequireAuth>} />
              <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
              <Route path="/dashboard/team" element={<RequireAuth><Team /></RequireAuth>} />
              <Route path="/dashboard/hosts/:id/edit" element={<RequireAuth><EditHost /></RequireAuth>} />
              <Route path="/dashboard/events/new" element={<RequireAuth><EventEditor /></RequireAuth>} />
              <Route path="/dashboard/events/:id" element={<RequireAuth><EventAdmin /></RequireAuth>} />
              <Route path="/dashboard/events/:id/edit" element={<RequireAuth><EventEditor /></RequireAuth>} />
              <Route path="/my-events" element={<RequireAuth><MyEvents /></RequireAuth>} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
