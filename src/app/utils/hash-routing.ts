/**
 * Deep-link helpers for the Natural Fiber Atlas.
 *
 * Browse on `/` uses the hash: #fiberId?cat=category
 * Shareable / indexable profile URLs use /fiber/:id?cat=… (see routes + GridView).
 *
 * Navigation state machine:
 *   - Fiber open from grid: React Router push to /fiber/:id
 *   - Browser Back closes detail (popstate)
 *   - Category changes on /: replaceState on hash; on /fiber/: replaceState on path
 */

export const FIBER_PATH_PREFIX = "/fiber/";

export function parseFiberPath(pathname: string): string | null {
  if (!pathname.startsWith(FIBER_PATH_PREFIX)) return null;
  const rest = pathname.slice(FIBER_PATH_PREFIX.length);
  if (!rest) return null;
  const segment = rest.split("/")[0];
  if (!segment) return null;
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/**
 * Resolve fiber + category from pathname (fiber routes), hash (home), and optional ?cat= on fiber URLs.
 */
export function parseUrlNavigationState(
  pathname: string,
  search: string,
  hash: string,
): { fiberId: string | null; category: string | null } {
  const pathFiber = parseFiberPath(pathname);
  const qs = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const categoryFromSearch = qs.get("cat");

  if (pathFiber) {
    return { fiberId: pathFiber, category: categoryFromSearch };
  }

  const raw = hash.replace(/^#/, "");
  if (!raw) {
    return { fiberId: null, category: categoryFromSearch };
  }

  const [pathPart, queryPart] = raw.split("?");
  const hp = new URLSearchParams(queryPart ?? "");
  const categoryFromHash = hp.get("cat");
  const fiberId = pathPart || null;
  return {
    fiberId,
    category: categoryFromHash ?? categoryFromSearch,
  };
}

/** @deprecated use parseUrlNavigationState */
export function parseHash(): { fiberId: string | null; category: string | null } {
  if (typeof window === "undefined") return { fiberId: null, category: null };
  return parseUrlNavigationState(window.location.pathname, window.location.search, window.location.hash);
}

/**
 * Sync hash on `/` only (browse + legacy deep links). No-op on `/fiber/…` — Router handles that.
 */
export function writeBrowseHashState(
  pathname: string,
  selectedId: string | null,
  activeCategory: string,
  push: boolean = false,
) {
  if (pathname.startsWith(FIBER_PATH_PREFIX)) return;

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

/** @deprecated use writeBrowseHashState(pathname, …) from components with Router location */
export function writeHash(
  selectedId: string | null,
  activeCategory: string,
  push: boolean = false,
) {
  writeBrowseHashState(typeof window !== "undefined" ? window.location.pathname : "/", selectedId, activeCategory, push);
}

/** Saved scroll position for grid-browse mode */
let savedScrollY: number | null = null;

export function saveScrollPosition(): void {
  savedScrollY = window.scrollY;
}

export function restoreScrollPosition(): void {
  if (savedScrollY !== null) {
    requestAnimationFrame(() => {
      window.scrollTo({ top: savedScrollY!, behavior: "instant" as ScrollBehavior });
      savedScrollY = null;
    });
  }
}
