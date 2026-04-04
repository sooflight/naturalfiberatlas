/**
 * Parse pasted admin image URLs without splitting on commas inside Cloudinary
 * transforms (e.g. .../c_scale,w_400,h_300/file.jpg).
 */

function trimTrailingJunk(url: string): string {
  return url.replace(/[)\],.;]+$/g, "").trim();
}

function tryParseHttpUrl(candidate: string): string | undefined {
  const trimmed = trimTrailingJunk(candidate);
  if (!/^https?:\/\//i.test(trimmed)) return undefined;
  try {
    return new URL(trimmed).href;
  } catch {
    return trimmed;
  }
}

/** Longest valid http(s) URL starting at or after searchFrom (handles commas inside the URL). */
function nextHttpUrl(line: string, searchFrom: number): { href: string; nextIndex: number } | undefined {
  const tail = line.slice(searchFrom);
  const m = tail.match(/https?:\/\//i);
  if (!m || m.index === undefined) return undefined;
  const start = searchFrom + m.index;
  const minEnd = start + m[0].length;
  for (let end = line.length; end > minEnd; end--) {
    const slice = line.slice(start, end);
    try {
      const u = new URL(slice);
      if (u.protocol !== "http:" && u.protocol !== "https:") continue;
      return { href: u.href, nextIndex: end };
    } catch {
      continue;
    }
  }
  return undefined;
}

/** Split only before another http(s) URL so Cloudinary commas (…,w_400,…) stay intact. */
function splitAtCommaBeforeNextHttp(line: string): string[] {
  return line.split(/,(?=\s*https?:\/\/)/i);
}

function extractHttpUrlsFromLine(line: string): string[] {
  const out: string[] = [];
  for (const chunk of splitAtCommaBeforeNextHttp(line)) {
    const part = chunk.trim();
    if (!part) continue;
    let i = 0;
    while (i < part.length) {
      const hit = nextHttpUrl(part, i);
      if (!hit) break;
      out.push(hit.href);
      i = hit.nextIndex;
      while (i < part.length && /\s/.test(part[i])) i++;
    }
  }
  return out;
}

/** Markdown image: ![alt](url) — assumes no raw ")" inside the URL (use %29 in links). */
function extractFromMarkdownLine(line: string): string | undefined {
  const m = line.match(/^!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/i);
  return m ? tryParseHttpUrl(m[1]) : undefined;
}

/**
 * One URL per line is preferred; multiple URLs on one line are detected without breaking
 * Cloudinary-style comma transforms.
 */
export function parseImageUrlsFromPastedText(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (raw: string | undefined) => {
    const u = raw ? tryParseHttpUrl(raw) : undefined;
    if (!u || seen.has(u)) return;
    seen.add(u);
    out.push(u);
  };

  for (const rawLine of input.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line) continue;

    line = line.replace(/^[`'"[(]+|[\]`'")\]]+$/g, "").trim();
    if (!line) continue;

    if (/^!\[/.test(line)) {
      const md = extractFromMarkdownLine(line);
      if (md) {
        push(md);
        continue;
      }
    }

    for (const u of extractHttpUrlsFromLine(line)) {
      push(u);
    }
  }

  return out;
}

/** First usable image URL from arbitrary clipboard text (title + URL, markdown, etc.). */
export function extractFirstImageUrlFromClipboardText(text: string): string | undefined {
  return parseImageUrlsFromPastedText(text)[0];
}
