import { isAdminEnabled } from "../config/admin-access";
import navThumbOverridesRaw from "../data/nav-thumb-overrides.json";
import { fibers } from "../data/fibers";

const navThumbBundled = navThumbOverridesRaw as Record<string, string>;

export const SECTION_COLORS = {
  fiber: {
    accent: "#34d399",
    bg: "rgba(52,211,153,0.08)",
    glow: "rgba(52,211,153,0.15)",
  },
  textile: {
    accent: "#60a5fa",
    bg: "rgba(96,165,250,0.08)",
    glow: "rgba(96,165,250,0.15)",
  },
  dye: {
    accent: "#c084fc",
    bg: "rgba(192,132,252,0.08)",
    glow: "rgba(192,132,252,0.15)",
  },
};

export const NAV_FONT_STYLE = {
  fontFamily: "'Pica', sans-serif",
  letterSpacing: "0.2em",
  textTransform: "uppercase" as const,
};

export const NAV_FONT_STYLE_MOBILE = {
  ...NAV_FONT_STYLE,
  letterSpacing: "0.12em",
};

/** Sizes are `--atlas-grid-*` in `theme.css` (fluid on the grid shell; mobile bumps in max-width media). */
export const ATLAS_GRID_TITLE_STYLE = {
  fontSize: "var(--atlas-grid-title)",
  fontWeight: 400 as const,
};

export const ATLAS_GRID_SEARCH_STYLE = {
  ...NAV_FONT_STYLE,
  fontSize: "var(--atlas-grid-search)",
};

export const ATLAS_GRID_CATEGORY_PILL_STYLE = {
  ...NAV_FONT_STYLE,
  fontSize: "var(--atlas-grid-pill)",
  fontWeight: 500 as const,
};

export const ATLAS_GRID_CLOSE_STYLE = {
  fontSize: "var(--atlas-grid-close)",
};

export const ATLAS_GRID_SUBHEAD_STYLE = {
  fontSize: "var(--atlas-grid-subhead)",
  fontWeight: 600 as const,
};

export const ATLAS_GRID_SUBHEAD_MUTED_STYLE = {
  fontSize: "var(--atlas-grid-subhead-muted)",
  fontWeight: 500 as const,
};

export const ATLAS_GRID_HINT_STYLE = {
  fontSize: "var(--atlas-grid-hint)",
  fontWeight: 600 as const,
};

export const ATLAS_GRID_LINK_STYLE = {
  fontSize: "var(--atlas-grid-link)",
  fontWeight: 500 as const,
};

export const ATLAS_GRID_EMPTY_TITLE_STYLE = {
  fontSize: "var(--atlas-grid-empty-title)",
  fontWeight: 500 as const,
};

export const ATLAS_GRID_EMPTY_BODY_STYLE = {
  fontSize: "var(--atlas-grid-empty-body)",
  fontWeight: 400 as const,
};

export const ATLAS_GRID_EMPTY_CTA_STYLE = {
  ...NAV_FONT_STYLE,
  fontSize: "var(--atlas-grid-empty-cta)",
  fontWeight: 500 as const,
};

export const ATLAS_GRID_LOADING_STYLE = {
  fontSize: "var(--atlas-grid-loading)",
  fontWeight: 500 as const,
};

/** Profile tiles on the grid: container is the cell (`container-type: inline-size`). */
export const ATLAS_GRID_PROFILE_PILL_FS = {
  fontSize: "clamp(8px, 2.5cqi, 10px)",
  fontWeight: 600 as const,
};

export const ATLAS_GRID_CARD_NAME_FONT_SIZE = "clamp(12px, 4.2cqi, 16px)";

/** TopNav labels under portal thumbs, path segments, children strip (`--atlas-nav-thumb-label` in theme.css). */
export const ATLAS_NAV_THUMB_LABEL_FONT_SIZE = "var(--atlas-nav-thumb-label)";

export const ATLAS_INACTIVE_LABEL_COLOR = "#737373";

export const ATLAS_SEARCH_WRAPPER_CLASS =
  "relative w-full max-w-[320px]";

export const ATLAS_SEARCH_ICON_CLASS =
  "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/20";

export const ATLAS_SEARCH_INPUT_CLASS =
  "w-full rounded-full border border-white/[0.08] bg-white/[0.04] py-1.5 pl-8 pr-8 text-[#e4dcd4] placeholder:text-white/45 focus:border-white/[0.18] focus:bg-white/[0.06] focus:outline-none focus-visible:ring-1 focus-visible:ring-white/[0.08] transition-[border-color,background-color,box-shadow] duration-200";

export const ATLAS_SEARCH_CLEAR_BUTTON_CLASS =
  "absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors";

export const ATLAS_PILL_BASE_CLASS =
  "rounded-full border transition-colors";

export const ATLAS_PILL_ACTIVE_CLASS =
  "bg-white/10 text-white border-white/12";

export const ATLAS_PILL_IDLE_CLASS =
  "text-white/35 border-transparent hover:text-white/55";

const byId = (id: string) => fibers.find((f) => f.id === id)?.image ?? null;
const NAV_PARENT_IMAGES_KEY = "atlas:nav-parent-images";
const ATLAS_IMAGES_KEY = "atlas-images";

function firstNonEmptyString(values: unknown[]): string | null {
  const first = values.find((value) => typeof value === "string" && value.trim().length > 0);
  return typeof first === "string" ? first : null;
}

function firstUrlFromUnknownEntry(entry: unknown): string | null {
  if (Array.isArray(entry)) {
    const stringCandidate = firstNonEmptyString(entry);
    if (stringCandidate) return stringCandidate;
    const objectCandidate = entry
      .find((value) => typeof value === "object" && value !== null && "url" in value) as
      | { url?: unknown }
      | undefined;
    if (typeof objectCandidate?.url === "string" && objectCandidate.url.trim().length > 0) {
      return objectCandidate.url;
    }
    return null;
  }

  if (typeof entry === "string" && entry.trim().length > 0) {
    return entry;
  }

  if (typeof entry === "object" && entry !== null && "url" in entry) {
    const url = (entry as { url?: unknown }).url;
    if (typeof url === "string" && url.trim().length > 0) return url;
  }

  return null;
}

const THUMB_IDS: Record<string, string[]> = {
  fiber: ["hemp", "jute", "flax-linen"],
  textile: ["flax-linen", "organic-cotton", "merino"],
  dye: ["silk", "mulberry-silk", "hemp"],
  plant: ["hemp", "jute", "banana"],
  animal: ["wool", "merino", "cashmere"],
  regen: ["lyocell", "viscose-rayon", "modal"],
  "bast-fiber": ["jute", "hemp", "ramie"],
  "bark-fiber": ["nettle", "jute", "hemp"],
  "seed-fiber": ["organic-cotton", "kapok"],
  "leaf-fiber": ["sisal", "abaca", "pineapple"],
  "grass-fiber": ["bamboo", "esparto"],
  "fruit-fiber": ["coir", "kapok"],
  woven: ["flax-linen", "organic-cotton"],
  knit: ["merino", "wool"],
  nonwoven: ["jute", "kapok"],
  "natural-dye": ["hemp", "jute"],
  "synthetic-dye": ["silk", "organic-cotton"],
  "bio-dye": ["lyocell", "bamboo"],
};

/** Admin tree uses plural IDs (seed-fibers, bark-fibers); frontend uses singular (seed-fiber, bark-fiber). */
const ADMIN_TO_FRONTEND_THUMB_ALIASES: Record<string, string[]> = {
  "seed-fiber": ["seed-fibers"],
  "grass-fiber": ["grass-fibers"],
  "bast-fiber": ["bast-fibers"],
  "bark-fiber": ["bark-fibers"],
  "leaf-fiber": ["leaf-fibers"],
  "fruit-fiber": ["fruit-fibers"],
  plant: ["plant-cellulose"],
  animal: ["animal-protein"],
  regen: ["mineral-regenerated"],
};

function getThumbCandidateIds(nodeId: string): string[] {
  const aliases = ADMIN_TO_FRONTEND_THUMB_ALIASES[nodeId];
  if (!aliases?.length) return [nodeId];
  // Prefer admin / bundled keys (e.g. mineral-regenerated, bast-fibers) before the
  // public nav segment id so published nav-thumb-overrides and Image DB wins are not
  // shadowed by a stale `regen` (or other) entry in atlas-images localStorage.
  return [...aliases, nodeId];
}

export function getThumbUrl(nodeId: string): string | null {
  if (typeof window !== "undefined" && isAdminEnabled()) {
    try {
      const raw = localStorage.getItem(NAV_PARENT_IMAGES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        for (const candidateId of getThumbCandidateIds(nodeId)) {
          const fromNavOverrides = firstUrlFromUnknownEntry(parsed?.[candidateId]);
          if (fromNavOverrides) return fromNavOverrides;
        }
      }

      const atlasImagesRaw = localStorage.getItem(ATLAS_IMAGES_KEY);
      if (atlasImagesRaw) {
        const parsedAtlasImages = JSON.parse(atlasImagesRaw) as Record<string, unknown>;
        for (const candidateId of getThumbCandidateIds(nodeId)) {
          const fromAtlasImages = firstUrlFromUnknownEntry(parsedAtlasImages?.[candidateId]);
          if (fromAtlasImages) return fromAtlasImages;
        }
      }
    } catch {
      // Ignore malformed local storage payloads and fall back to defaults.
    }
  }

  if (!isAdminEnabled()) {
    for (const candidateId of getThumbCandidateIds(nodeId)) {
      const u = navThumbBundled[candidateId];
      if (typeof u === "string" && u.trim().length > 0) return u;
    }
  }

  const ids = THUMB_IDS[nodeId] ?? [];
  for (const id of ids) {
    const image = byId(id);
    if (image) return image;
  }
  return fibers[0]?.image ?? null;
}
