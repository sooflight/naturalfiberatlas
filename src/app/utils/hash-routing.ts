/**
 * Hash-based deep link helpers for the Natural Fiber Atlas.
 *
 * URL format: #fiberId?cat=category
 *   e.g. #hemp?cat=fiber  →  select hemp, filter to fibers
 *         #hemp            →  select hemp, show all categories
 *         #?cat=textile    →  no selection, filter to textiles
 *
 * Navigation State Machine (#5):
 *   - Uses pushState for fiber selection so browser Back closes detail views
 *   - Uses replaceState for category changes (lightweight, no history entry)
 *   - Exposes a popstate listener hook for back/forward navigation
 */

export function parseHash(): { fiberId: string | null; category: string | null } {
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return { fiberId: null, category: null };

  const [path, query] = raw.split("?");
  const params = new URLSearchParams(query ?? "");
  const category = params.get("cat");
  const fiberId = path || null;

  return { fiberId, category };
}

/**
 * Write the current selection state to the URL hash.
 *
 * @param selectedId  — currently selected fiber (null = browse mode)
 * @param activeCategory — active filter category
 * @param push — if true, creates a new history entry (pushState);
 *               if false, replaces the current entry (replaceState).
 *               Default: true for fiber selection changes, false for category-only.
 */
export function writeHash(
  selectedId: string | null,
  activeCategory: string,
  push: boolean = false,
) {
  let hash = "";
  if (selectedId) hash += selectedId;
  if (activeCategory !== "all") {
    hash += `${hash ? "?" : "?"}cat=${activeCategory}`;
  }
  const newHash = hash ? `#${hash}` : "";
  if (window.location.hash === newHash) return;

  const url = newHash || window.location.pathname;
  if (push) {
    history.pushState(null, "", url);
  } else {
    history.replaceState(null, "", url);
  }
}

/** Saved scroll position for grid-browse mode */
let savedScrollY: number | null = null;

/** Call when entering detail mode to snapshot scroll position */
export function saveScrollPosition(): void {
  savedScrollY = window.scrollY;
}

/** Call when leaving detail mode to restore scroll position */
export function restoreScrollPosition(): void {
  if (savedScrollY !== null) {
    requestAnimationFrame(() => {
      window.scrollTo({ top: savedScrollY!, behavior: "instant" as ScrollBehavior });
      savedScrollY = null;
    });
  }
}
