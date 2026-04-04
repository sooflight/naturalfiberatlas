/**
 * Public site URL for canonical / OG tags. Set VITE_SITE_URL in production
 * (e.g. https://example.com) so crawlers and shares resolve absolute URLs.
 */
const DEFAULT_DESCRIPTION =
  "Explore natural fibers, textiles, and dyes worldwide — profiles, sustainability context, and imagery in the Natural Fiber Atlas.";

export function getDefaultMetaDescription(): string {
  return DEFAULT_DESCRIPTION;
}

export function getSiteOrigin(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL as string | undefined;
  if (fromEnv && fromEnv.trim() !== "") {
    try {
      return new URL(fromEnv).origin;
    } catch {
      /* fall through */
    }
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

export function absoluteUrl(pathOrUrl: string): string {
  const origin = getSiteOrigin();
  if (!origin) return pathOrUrl;
  try {
    return new URL(pathOrUrl, origin).href;
  } catch {
    return pathOrUrl;
  }
}

export function defaultOgImageUrl(): string {
  const custom = import.meta.env.VITE_OG_IMAGE_URL as string | undefined;
  if (custom && custom.trim() !== "") return custom.trim();
  return absoluteUrl("/favicon.svg");
}
