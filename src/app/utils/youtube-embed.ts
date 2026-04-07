/**
 * Parse a YouTube watch / share URL into an 11-character video id.
 * Supports youtu.be, youtube.com/watch?v=, /embed/, and /shorts/.
 */
export function youtubeVideoIdFromUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const withScheme = /^[a-z]+:/i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return null;
  }

  const host = u.hostname.replace(/^www\./i, "").toLowerCase();

  if (host === "youtu.be") {
    const segment = u.pathname.split("/").filter(Boolean)[0] ?? "";
    return /^[a-zA-Z0-9_-]{11}$/.test(segment) ? segment : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (u.pathname.startsWith("/embed/")) {
      const segment = u.pathname.slice("/embed/".length).split("/")[0] ?? "";
      return /^[a-zA-Z0-9_-]{11}$/.test(segment) ? segment : null;
    }
    if (u.pathname.startsWith("/shorts/")) {
      const segment = u.pathname.slice("/shorts/".length).split("/")[0] ?? "";
      return /^[a-zA-Z0-9_-]{11}$/.test(segment) ? segment : null;
    }
    const v = u.searchParams.get("v");
    return v && /^[a-zA-Z0-9_-]{11}$/.test(v) ? v : null;
  }

  return null;
}
