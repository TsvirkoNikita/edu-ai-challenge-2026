import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="container-page py-20 text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to={`/auth?redirect=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return children;
};

export default RequireAuth;
