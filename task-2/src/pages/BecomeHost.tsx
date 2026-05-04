import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { slugify } from "@/lib/format";

const BecomeHost = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    let logo_url: string | null = null;
    if (logoFile) {
      const path = `${user.id}/${Date.now()}-${logoFile.name.replace(/[^a-z0-9.]/gi, "_")}`;
      const up = await supabase.storage.from("host-logos").upload(path, logoFile);
      if (up.error) { toast.error(up.error.message); setLoading(false); return; }
      logo_url = supabase.storage.from("host-logos").getPublicUrl(path).data.publicUrl;
    }
    const { data, error } = await supabase.from("hosts").insert({
      name, bio, contact_email: contactEmail, slug: slugify(name), owner_id: user.id, logo_url,
    }).select().single();
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Host page created!");
    nav("/dashboard");
  }

  return (
    <div className="container-page py-10 max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Become a host</h1>
      <p className="text-muted-foreground mb-8">Set up your host page so people can find your events.</p>
      <form onSubmit={submit} className="space-y-5 card-soft p-6">
        <div><Label>Host name *</Label><Input required value={name} onChange={e=>setName(e.target.value)} placeholder="Brooklyn Run Club" /></div>
        <div><Label>Short bio</Label><Textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={500} placeholder="Tell people who you are." /></div>
        <div><Label>Contact email *</Label><Input type="email" required value={contactEmail} onChange={e=>setContactEmail(e.target.value)} /></div>
        <div><Label>Logo</Label><Input type="file" accept="image/*" onChange={e=>setLogoFile(e.target.files?.[0] || null)} /></div>
        <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create host page"}</Button>
      </form>
    </div>
  );
};

export default BecomeHost;
