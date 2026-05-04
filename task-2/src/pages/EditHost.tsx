import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { slugify } from "@/lib/format";

const EditHost = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [host, setHost] = useState<any>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [bio, setBio] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data, error } = await supabase.from("hosts").select("*").eq("id", id).maybeSingle();
      if (error || !data) { toast.error("Host not found"); nav("/dashboard"); return; }
      setHost(data);
      setName(data.name || "");
      setSlug(data.slug || "");
      setBio(data.bio || "");
      setContactEmail(data.contact_email || "");
      setLogoUrl(data.logo_url || null);
      setLoading(false);
    })();
  }, [id, nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !host) return;
    setSaving(true);
    let newLogoUrl = logoUrl;
    if (logoFile) {
      const path = `${user.id}/${Date.now()}-${logoFile.name.replace(/[^a-z0-9.]/gi, "_")}`;
      const up = await supabase.storage.from("host-logos").upload(path, logoFile);
      if (up.error) { toast.error(up.error.message); setSaving(false); return; }
      newLogoUrl = supabase.storage.from("host-logos").getPublicUrl(path).data.publicUrl;
    }
    const cleanSlug = slugify(slug || name);
    const { error } = await supabase.from("hosts").update({
      name, bio, contact_email: contactEmail, slug: cleanSlug, logo_url: newLogoUrl,
    }).eq("id", host.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Host updated");
    nav("/dashboard");
  }

  if (loading) return <div className="container-page py-20 text-muted-foreground">Loading…</div>;

  return (
    <div className="container-page py-10 max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Edit host</h1>
      <p className="text-muted-foreground mb-8">Update your host page details.</p>
      <form onSubmit={submit} className="space-y-5 card-soft p-6">
        <div><Label>Host name *</Label><Input required value={name} onChange={e=>setName(e.target.value)} maxLength={120} /></div>
        <div>
          <Label>Slug *</Label>
          <Input required value={slug} onChange={e=>setSlug(e.target.value)} maxLength={80} />
          <p className="text-xs text-muted-foreground mt-1">Public URL: /h/{slugify(slug || name)}</p>
        </div>
        <div><Label>Short bio</Label><Textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={500} /></div>
        <div><Label>Contact email *</Label><Input type="email" required value={contactEmail} onChange={e=>setContactEmail(e.target.value)} /></div>
        <div>
          <Label>Logo</Label>
          {logoUrl && <img src={logoUrl} alt="Logo" className="h-20 w-20 rounded-xl object-cover my-2" />}
          <Input type="file" accept="image/*" onChange={e=>setLogoFile(e.target.files?.[0] || null)} />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
          <Button type="button" variant="outline" onClick={() => nav("/dashboard")}>Cancel</Button>
        </div>
      </form>
    </div>
  );
};

export default EditHost;
