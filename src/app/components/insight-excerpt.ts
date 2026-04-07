/** Max run length for a single Insight pull-quote line (full Identity keeps the rest). */
const DEFAULT_MAX_INSIGHT_EXCERPT_CHARS = 200;

/**
 * One teaser line for an Insight card, from a segment of About (see `splitAboutText`).
 * Avoids replaying whole paragraphs from Identity; long lines trim at a word boundary with …
 *
 * Origins (half 1): prefers the *second* sentence in that segment when there are two or more,
 * so the card teases a detail beat instead of repeating the profile’s opening line.
 */
export function insightExcerptFromAboutPart(
  part: string,
  half: 1 | 2 | 3,
  maxChars: number = DEFAULT_MAX_INSIGHT_EXCERPT_CHARS,
): string {
  const trimmed = part.trim();
  if (!trimmed) return "";

  const sentences = trimmed.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
  let hook: string;
  if (half === 1 && sentences.length >= 2) {
    hook = sentences[1]!;
  } else {
    hook = (sentences[0] ?? trimmed).trim();
  }
  if (!hook) return "";

  if (hook.length <= maxChars) return hook;

  const slice = hook.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > maxChars * 0.45 ? slice.slice(0, lastSpace) : slice;
  const base = cut.trimEnd();
  return base.endsWith("…") ? base : `${base}…`;
}
