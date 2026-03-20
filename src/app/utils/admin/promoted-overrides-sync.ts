function parseJsonRecord(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function mergeRecords(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const current = merged[key];
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      current &&
      typeof current === "object" &&
      !Array.isArray(current)
    ) {
      merged[key] = mergeRecords(
        current as Record<string, unknown>,
        value as Record<string, unknown>,
      );
      continue;
    }
    merged[key] = value;
  }
  return merged;
}

export function hasPromotedOverridesContent(content: string): boolean {
  const parsed = parseJsonRecord(content);
  if (!parsed) return false;
  return Object.keys(parsed).length > 0;
}

export function buildPromotedOverridesWritePayload(
  nextContent: string,
  currentContent: string | null,
): string | null {
  const next = parseJsonRecord(nextContent);
  if (!next || Object.keys(next).length === 0) return null;

  const current = currentContent ? parseJsonRecord(currentContent) : null;
  const merged = mergeRecords(current ?? {}, next);
  return `${JSON.stringify(merged, null, 2)}\n`;
}

export function shouldWritePromotedOverrides(nextContent: string, currentContent: string | null): boolean {
  const merged = buildPromotedOverridesWritePayload(nextContent, currentContent);
  if (!merged) return false;
  return merged !== (currentContent ?? "");
}
