// Lightweight SEO/social meta helper for SPA pages.
// Updates document title, meta description, canonical, and Open Graph / Twitter tags.

type SeoOptions = {
  title: string;
  description?: string;
  image?: string | null;
  url?: string;
  type?: "website" | "article" | "profile" | "event";
};

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  if (!content) return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function setSeo({ title, description, image, url, type = "website" }: SeoOptions) {
  const pageUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  document.title = title;

  if (description) upsertMeta("name", "description", description);

  // Open Graph
  upsertMeta("property", "og:title", title);
  if (description) upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:type", type);
  if (pageUrl) upsertMeta("property", "og:url", pageUrl);
  if (image) upsertMeta("property", "og:image", image);

  // Twitter
  upsertMeta("name", "twitter:card", image ? "summary_large_image" : "summary");
  upsertMeta("name", "twitter:title", title);
  if (description) upsertMeta("name", "twitter:description", description);
  if (image) upsertMeta("name", "twitter:image", image);

  if (pageUrl) upsertCanonical(pageUrl);
}

export function truncate(s: string | null | undefined, n = 160) {
  if (!s) return "";
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > n ? clean.slice(0, n - 1) + "…" : clean;
}
