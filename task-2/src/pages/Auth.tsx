import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CalendarDays } from "lucide-react";

const Auth = () => {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const redirect = params.get("redirect") || "/";
  const initial = params.get("mode") === "signup" ? "signup" : "signin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    nav(redirect, { replace: true });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}${redirect}`,
        data: { display_name: name || email.split("@")[0] },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — you're signed in");
    nav(redirect, { replace: true });
  };

  return (
    <div className="container-page py-12 sm:py-20 max-w-md">
      <Link to="/" className="flex items-center justify-center gap-2 font-bold text-2xl mb-8">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <CalendarDays className="h-5 w-5" />
        </span>
        Gather
      </Link>

      <div className="card-soft p-6 sm:p-8">
        <Tabs defaultValue={initial}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div><Label>Email</Label><Input type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></div>
              <div><Label>Password</Label><Input type="password" required value={password} onChange={e=>setPassword(e.target.value)} /></div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div><Label>Display name</Label><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Alex Johnson" /></div>
              <div><Label>Email</Label><Input type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></div>
              <div><Label>Password</Label><Input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} /></div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating account…" : "Create account"}</Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auth;
