export type SeoPayload = {
  title: string;
  description: string;
  canonicalHref: string;
  ogImage: string;
  ogType: "website" | "article";
  /** When set, adds or removes `<meta name="robots">`. Use `noindex, nofollow` for error surfaces. */
  robots?: string | null;
};

function upsertMeta(attr: "name" | "property", key: string, content: string): void {
  const sel = `meta[${attr}="${CSS.escape(key)}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(sel);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertLink(rel: string, href: string): void {
  const sel = `link[rel="${CSS.escape(rel)}"]`;
  let el = document.head.querySelector<HTMLLinkElement>(sel);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function upsertJsonLd(id: string, json: Record<string, unknown>): void {
  const sel = `script[data-atlas-seo="${CSS.escape(id)}"]`;
  let el = document.head.querySelector<HTMLScriptElement>(sel);
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-atlas-seo", id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(json);
}

export function applyDocumentSeo(payload: SeoPayload, jsonLd: Record<string, unknown> | null): void {
  document.title = payload.title;

  upsertMeta("name", "description", payload.description);

  if (payload.robots === null) {
    document.head.querySelector('meta[name="robots"]')?.remove();
  } else if (payload.robots !== undefined) {
    upsertMeta("name", "robots", payload.robots);
  }

  upsertLink("canonical", payload.canonicalHref);

  upsertMeta("property", "og:title", payload.title);
  upsertMeta("property", "og:description", payload.description);
  upsertMeta("property", "og:url", payload.canonicalHref);
  upsertMeta("property", "og:type", payload.ogType);
  upsertMeta("property", "og:image", payload.ogImage);
  upsertMeta("property", "og:locale", "en_US");

  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", payload.title);
  upsertMeta("name", "twitter:description", payload.description);
  upsertMeta("name", "twitter:image", payload.ogImage);

  if (jsonLd) {
    upsertJsonLd("primary", jsonLd);
  } else {
    const stale = document.head.querySelector('script[data-atlas-seo="primary"]');
    stale?.remove();
  }
}
