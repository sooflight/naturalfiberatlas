/** Treat Shopify-style `file_600x.jpg` and `file.jpg` as one asset for dedupe / focal matching. */
export function galleryUrlDedupeKey(url: string): string {
  const t = url.trim();
  try {
    const u = new URL(t);
    const path = u.pathname.replace(/_600x(\.(?:jpg|jpeg|png|webp|gif))$/i, "$1");
    return `${u.origin}${path}`;
  } catch {
    return t;
  }
}
