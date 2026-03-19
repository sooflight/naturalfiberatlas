export function rankSearchResults<T extends Record<string, any>>(
  items: T[],
  query: string
): Array<{ item: T; score: number }> {
  const q = query.toLowerCase().trim();
  if (!q) return items.map((item) => ({ item, score: 0 }));

  const scoreItem = (item: T) => {
    const id = String(item.id ?? "").toLowerCase();
    const label = String(item.label ?? "").toLowerCase();
    const parent = String(item.parentLabel ?? "").toLowerCase();
    const scientific = String(item.scientific ?? "").toLowerCase();

    if (label === q || id === q) return 100;
    if (label.startsWith(q) || id.startsWith(q)) return 75;
    if (label.includes(q) || id.includes(q)) return 55;
    if (parent.includes(q)) return 35;
    if (scientific.includes(q)) return 25;
    return 0;
  };

  return items
    .map((item) => ({ item, score: scoreItem(item) }))
    .sort((a, b) => b.score - a.score);
}
