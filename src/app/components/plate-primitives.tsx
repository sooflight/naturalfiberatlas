/**
 * plate-primitives.tsx — Shared UI primitives for detail plates and screen plates.
 *
 * Consolidates typography scales, layout tokens, semantic opacity,
 * accent-color theming, modular spacing, and common helper components
 * so changes propagate everywhere.
 */

/*
 * Tailwind class safelist — these classes are constructed dynamically via
 * template literals and must appear as full strings for the scanner:
 *
 * text-white/[0.88] text-white/[0.68] text-white/[0.48] text-white/[0.28] text-white/[0.12]
 * border-white/[0.88] border-white/[0.68] border-white/[0.48] border-white/[0.28] border-white/[0.12]
 * text-[#6FA882]/90 text-[#5D9A6D]/90 text-[#4F9270]/90 text-[#C17F3E]/90 text-[#7AA2D4]/90 text-[#A78BDB]/90
 * text-[#6FA882]/20 text-[#6FA882]/70 text-[#6FA882]/60 text-[#6FA882]/40 text-[#6FA882]/30 text-[#6FA882]/25
 * text-[#4F9270]/50
 * text-[#5D9A6D]/40 text-[#5D9A6D]/70 text-[#5D9A6D]/25 text-[#5D9A6D]/80
 * bg-[#6FA882]/50 bg-[#6FA882]/30
 * bg-[#5D9A6D]/60 bg-[#5D9A6D]/50 bg-[#5D9A6D]/30 bg-[#5D9A6D]/10 bg-[#5D9A6D]/25
 * border-[#6FA882]/40 border-[#6FA882]/30
 * border-[#5D9A6D]/25
 * text-[#6FA882]/50 text-[#6FA882]/40
 * text-[#5D9A6D]/60
 * bg-white/[0.12]
 * gap-[clamp(5px,1.5cqi,8px)] gap-[clamp(7px,2.5cqi,12px)] gap-[clamp(12px,4cqi,18px)] gap-[clamp(14px,5.5cqi,24px)] gap-[clamp(20px,8cqi,32px)]
 * mb-[clamp(5px,1.5cqi,8px)] mb-[clamp(7px,2.5cqi,12px)] mb-[clamp(12px,4cqi,18px)]
 * mt-[clamp(5px,1.5cqi,8px)] mt-[clamp(7px,2.5cqi,12px)] mt-[clamp(12px,4cqi,18px)]
 * pt-[clamp(5px,1.5cqi,8px)] pt-[clamp(7px,2.5cqi,12px)]
 * pb-[clamp(5px,1.5cqi,8px)] pb-[clamp(7px,2.5cqi,12px)]
 * px-[clamp(12px,4cqi,18px)]
 * h-[clamp(20px,8cqi,32px)] h-[clamp(14px,5.5cqi,24px)]
 * w-[clamp(12px,4cqi,18px)] w-[clamp(14px,5.5cqi,24px)] w-[clamp(20px,8cqi,32px)] w-[clamp(5px,1.5cqi,8px)]
 * p-[clamp(7px,2.5cqi,12px)] p-[clamp(12px,4cqi,18px)] p-[clamp(14px,5.5cqi,24px)]
 */

// Keep dynamic template-generated utility classes in production CSS output.
const TAILWIND_DYNAMIC_SAFELIST = `
text-[#6FA882]/20 text-[#6FA882]/25 text-[#6FA882]/30 text-[#6FA882]/40 text-[#6FA882]/50 text-[#6FA882]/60 text-[#6FA882]/70
text-[#5D9A6D]/40 text-[#5D9A6D]/45 text-[#5D9A6D]/60 text-[#5D9A6D]/70 text-[#5D9A6D]/80
bg-[#5D9A6D]/10 bg-[#5D9A6D]/25 bg-[#5D9A6D]/30 bg-[#5D9A6D]/50 bg-[#5D9A6D]/60
border-[#6FA882]/30 border-[#6FA882]/40 border-[#5D9A6D]/20 border-[#5D9A6D]/25 border-[#5D9A6D]/30
bg-white/[0.12]
`;
void TAILWIND_DYNAMIC_SAFELIST;

import type { PlateType } from "../data/atlas-data";
import type { CSSProperties, ReactNode, ComponentType } from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

/* ══════════════════════════════════════════════════════════
   §1 — Semantic White Opacity Scale
   5-tier system replacing ad-hoc white/XX values.
   ══════════════════════════════════════════════════════════ */

/** Raw opacity values for style props */
export const ink = {
  primary:   0.88,   // hero values, fiber names, blockquote text
  secondary: 0.68,   // body prose, data values
  tertiary:  0.48,   // labels, captions, attribution
  muted:     0.28,   // decorative symbols (◈ ··· "), faint affordances
  ghost:     0.12,   // structural lines, tag borders, hairlines
} as const;

/** Tailwind-ready text color classes */
export const T = {
  primary:   "text-white/[0.88]",
  secondary: "text-white/[0.68]",
  tertiary:  "text-white/[0.48]",
  muted:     "text-white/[0.28]",
  ghost:     "text-white/[0.12]",
} as const;

/** Tailwind-ready border color classes */
export const B = {
  primary:   "border-white/[0.88]",
  secondary: "border-white/[0.68]",
  tertiary:  "border-white/[0.48]",
  muted:     "border-white/[0.28]",
  ghost:     "border-white/[0.12]",
} as const;

/* ══════════════════════════════════════════════════════════
   §2 — Accent Color Contextual Warmth
   Warm green for editorial, cool green for data,
   neutral green for discovery plates.
   ══════════════════════════════════════════════════════════ */

export const accent = {
  warm:    "#6FA882",   // editorial plates (About, Insight, Quote)
  neutral: "#5D9A6D",   // discovery + default UI green
  cool:    "#4F9270",   // data plates (Trade, Anatomy, Care)
} as const;

/** Top-left section header icons — single atlas green */
export const plateIcon = {
  card: `text-[${accent.neutral}]/90`,
} as const;

/* ══════════════════════════════════════════════════════════
   §3 — Modular Vertical Spacing Scale (4px grid)
   Container-query-responsive clamp() strings.
   ══════════════════════════════════════════════════════════ */

export const sp = {
  xs:  "clamp(5px,1.5cqi,8px)",
  sm:  "clamp(7px,2.5cqi,12px)",
  md:  "clamp(12px,4cqi,18px)",
  lg:  "clamp(14px,5.5cqi,24px)",
  xl:  "clamp(20px,8cqi,32px)",
} as const;

/* ══════════════════════════════════════════════════════════
   §4 — Typography scale tokens (container-query-responsive)
   ══════════════════════════════════════════════════════════ */

export const PLATE_PAD = "p-[clamp(12px,4cqi,18px)]";
export const SCREEN_PAD = "p-[clamp(14px,5.5cqi,24px)]";

export const labelFs = { fontSize: "clamp(10px, 3.5cqi, 13px)", fontWeight: 700 } as const;
export const bodyFs = { fontSize: "clamp(12px, 3.8cqi, 16px)", lineHeight: 1.55 } as const;
export const heroFs = { fontSize: "clamp(13px, 4.5cqi, 18px)", fontWeight: 400, lineHeight: 1.25 } as const;
export const valueFs = { fontSize: "clamp(14px, 5.5cqi, 24px)", fontWeight: 500 } as const;
export const tagFs = { fontSize: "clamp(9px, 3cqi, 12px)", fontWeight: 500 } as const;

/** Properties plate — tag chips and label/value cells share this surface */
export const propertiesCellSurface =
  "rounded-lg bg-white/[0.03] border border-white/[0.05]";

/** Container-responsive type for Properties metadata rows and tag text */
export const propertiesPlateLabelStyle = {
  fontSize: "clamp(8px, 2.8cqi, 11px)",
  fontWeight: 600,
} as const;
export const propertiesPlateValueStyle = {
  fontSize: "clamp(11px, 3.8cqi, 16px)",
  fontWeight: 500,
} as const;

/** Screen-plate overrides (slightly larger bounds for the expanded view) */
export const screenBodyFs = { ...bodyFs, lineHeight: 1.65 } as const;
export const screenHeroFs = { ...heroFs, fontSize: "clamp(12px, 4.5cqi, 20px)" } as const;
export const screenTagFs = { ...tagFs, fontSize: "clamp(8px, 3cqi, 13px)" } as const;

/* ══════════════════════════════════════════════════════════
   §5 — Density map — used by DetailCard and ScreenPlate
   ══════════════════════════════════════════════════════════ */

export const densityByPlate: Record<string, number> = {
  about: 0.8,
  properties: 0.78,
  insight1: 0.75,
  insight2: 0.75,
  insight3: 0.75,
  silkCharmeuse: 0.78,
  silkHabotai: 0.78,
  silkDupioni: 0.78,
  silkTaffeta: 0.78,
  silkChiffon: 0.78,
  silkOrganza: 0.78,
  quote: 0.7,
  youtubeEmbed: 0.35,
  trade: 0.85,
  worldNames: 0.4,
  regions: 0.65,
  sustainability: 0.7,
  process: 0.8,
  anatomy: 0.75,
  care: 0.8,
  seeAlso: 0.3,
  contactSheet: 0.1,
};

/* ══════════════════════════════════════════════════════════
   §6 — Human-readable plate labels
   ══════════════════════════════════════════════════════════ */

export const plateLabelMap: Partial<Record<PlateType, string>> = {
  about: "Identity",
  properties: "Properties",
  insight1: "Insight",
  insight2: "Insight",
  insight3: "Insight",
  silkCharmeuse: "Silk Type",
  silkHabotai: "Silk Type",
  silkDupioni: "Silk Type",
  silkTaffeta: "Silk Type",
  silkChiffon: "Silk Type",
  silkOrganza: "Silk Type",
  quote: "Quote",
  youtubeEmbed: "Video",
  trade: "Source & Trade",
  worldNames: "World Names",
  regions: "Regions",
  sustainability: "Sustainability",
  process: "Process",
  anatomy: "Anatomy",
  care: "Care & Use",
  seeAlso: "See Also",
};

/* ══════════════════════════════════════════════════════════
   §7 — Shared components
   ══════════════════════════════════════════════════════════ */

/** Edge fade height — matches bottom fade; used for top/bottom scroll masks. */
const DETAIL_SCROLL_FADE = "2.25rem";

/** Bottom-only fade (alpha mask) when more content sits below the fold. */
const DETAIL_SCROLL_BOTTOM_FADE = `linear-gradient(to bottom, #000 0%, #000 calc(100% - ${DETAIL_SCROLL_FADE}), transparent 100%)`;

/** Top-only fade when more content sits above the visible area. */
const DETAIL_SCROLL_TOP_FADE = `linear-gradient(to bottom, transparent 0%, #000 ${DETAIL_SCROLL_FADE}, #000 100%)`;

/** Top and bottom fades when scrolled into the middle of overflow content. */
const DETAIL_SCROLL_TOP_BOTTOM_FADE = `linear-gradient(to bottom, transparent 0%, #000 ${DETAIL_SCROLL_FADE}, #000 calc(100% - ${DETAIL_SCROLL_FADE}), transparent 100%)`;

/**
 * Scrollable region for detail (and screen) plates: soft masks at the top and/or bottom
 * instead of a hard clip when content overflows in that direction.
 */
export function DetailScrollRegion({
  children,
  wrapperClassName = "",
  scrollClassName = "",
  scrollStyle,
  lang,
}: {
  children: ReactNode;
  wrapperClassName?: string;
  scrollClassName?: string;
  scrollStyle?: CSSProperties;
  lang?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fadeTop, setFadeTop] = useState(false);
  const [fadeBottom, setFadeBottom] = useState(false);

  const updateFade = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const overflowY = el.scrollHeight > el.clientHeight + 1;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
    const atTop = el.scrollTop <= 2;
    setFadeBottom(overflowY && !atBottom);
    setFadeTop(overflowY && !atTop);
  }, []);

  useLayoutEffect(() => {
    updateFade();
    const el = scrollRef.current;
    if (!el) return undefined;

    const RO = typeof ResizeObserver !== "undefined" ? ResizeObserver : null;
    const ro = RO ? new RO(updateFade) : null;
    ro?.observe(el);

    let cancelled = false;
    void document.fonts?.ready?.then(() => {
      if (!cancelled) updateFade();
    });

    return () => {
      cancelled = true;
      ro?.disconnect();
    };
  }, [updateFade]);

  const fadeMask =
    fadeTop && fadeBottom
      ? DETAIL_SCROLL_TOP_BOTTOM_FADE
      : fadeTop
        ? DETAIL_SCROLL_TOP_FADE
        : fadeBottom
          ? DETAIL_SCROLL_BOTTOM_FADE
          : null;

  const fadeStyle: CSSProperties | undefined = fadeMask
    ? {
        maskImage: fadeMask,
        WebkitMaskImage: fadeMask,
      }
    : undefined;

  return (
    <div className={`relative min-h-0 ${wrapperClassName}`.trim()}>
      <div
        ref={scrollRef}
        lang={lang}
        className={`h-full w-full min-h-0 overflow-y-auto overflow-x-hidden ${scrollClassName}`.trim()}
        style={{ ...scrollStyle, ...fadeStyle }}
        onScroll={updateFade}
      >
        {children}
      </div>
    </div>
  );
}

/** Section label with optional leading icon. */
export function SectionLabel({
  children,
  icon: Icon,
  accentColor = "text-white",
  iconSize = 11,
  iconColor,
}: {
  children: ReactNode;
  icon?: ComponentType<{ size?: number; className?: string }>;
  /** Text color class — "text-white" for detail plates, accent for screen plates */
  accentColor?: string;
  iconSize?: number;
  /** Override icon color class (defaults to neutral accent green) */
  iconColor?: string;
}) {
  return (
    <div className={`flex shrink-0 items-center gap-[${sp.xs}] mb-[${sp.sm}]`}>
      {Icon && <Icon size={iconSize} className={`${iconColor ?? plateIcon.card} flex-shrink-0`} />}
      <span
        className={`tracking-[0.2em] uppercase ${accentColor}`}
        style={{ ...labelFs, fontWeight: 400 }}
      >
        {children}
      </span>
    </div>
  );
}

/** Screen-plate variant with larger bottom margin and green accent by default. */
export function ScreenSectionLabel({
  children,
  icon: Icon,
  iconColor,
}: {
  children: ReactNode;
  icon?: ComponentType<{ size?: number; className?: string }>;
  iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-[clamp(4px,1.5cqi,8px)] mb-[clamp(10px,4cqi,18px)]">
      {Icon && <Icon size={12} className={`${iconColor ?? plateIcon.card} flex-shrink-0`} />}
      <span
        className={`tracking-[0.2em] uppercase text-[${accent.neutral}]`}
        style={{ ...labelFs, fontWeight: 400 }}
      >
        {children}
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   §8 — Stacked Data Row (Unified Architecture)
   Shared by Trade, Anatomy, and Care plates.
   ══════════════════════════════════════════════════════════ */

export interface DataRowItem {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
}

/** Stacked data row: icon+label above value, separated by hairline dividers. */
export function StackedDataRows({
  rows,
  accentHex = accent.neutral,
  wrapValues = false,
  layout = "fill",
}: {
  rows: DataRowItem[];
  /** Hex color for icon tinting (without opacity) */
  accentHex?: string;
  /** When true, long values wrap instead of truncating (use inside scroll regions). */
  wrapValues?: boolean;
  /** `fill` = grow in a flex card; `flow` = stack only (inside DetailScrollRegion). */
  layout?: "fill" | "flow";
}) {
  const rootClass =
    layout === "fill"
      ? `flex-1 flex flex-col justify-center gap-[${sp.sm}]`
      : `flex flex-col gap-[${sp.sm}]`;
  const valueClass = wrapValues
    ? `${T.primary} [overflow-wrap:anywhere]`
    : `${T.primary} truncate`;
  return (
    <div className={rootClass}>
      {rows.map((r, i) => (
        <div key={r.label} className={`flex flex-col gap-[clamp(2px,0.8cqi,5px)]`}>
          {/* Hairline divider (skip first row) */}
          {i > 0 && <div className={`w-full h-px bg-white/[0.06] mb-[clamp(2px,0.6cqi,4px)]`} />}
          {/* Icon + label row */}
          <div className="flex items-center gap-[clamp(3px,1cqi,5px)]">
            <r.icon size={11} className={`${T.tertiary} flex-shrink-0`} />
            <span className={`tracking-[0.15em] uppercase ${T.tertiary}`} style={{ fontSize: "clamp(8px, 2.8cqi, 10px)", fontWeight: 700 }}>{r.label}</span>
          </div>
          {/* Value */}
          <span className={valueClass} style={{ fontSize: "clamp(11px, 4.5cqi, 20px)", fontWeight: 500 }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Expanded screen-plate variant — more breathing room, no truncation. */
export function StackedDataRowsExpanded({
  rows,
  accentHex = accent.neutral,
}: {
  rows: DataRowItem[];
  accentHex?: string;
}) {
  return (
    <div className={`flex flex-col gap-[${sp.lg}]`}>
      {rows.map((r, i) => (
        <div key={r.label} className={`flex flex-col gap-[${sp.xs}]`}>
          {i > 0 && <div className={`w-full h-px bg-white/[0.06] mb-[${sp.xs}]`} />}
          <div className="flex items-center gap-[clamp(3px,1.2cqi,6px)]">
            <r.icon size={13} className={`${T.tertiary} flex-shrink-0`} />
            <span className={`tracking-[0.15em] uppercase ${T.tertiary}`} style={{ fontSize: "clamp(9px, 3cqi, 12px)", fontWeight: 700 }}>{r.label}</span>
          </div>
          <span className={T.primary} style={{ fontSize: "clamp(14px, 5.5cqi, 24px)", fontWeight: 500 }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   §9 — Text helpers
   ══════════════════════════════════════════════════════════ */

/** Split a fiber's about text into N roughly equal sentence groups. */
export function splitAboutText(about: string, parts = 2): string[] {
  const sentences = about.match(/[^.!?]+[.!?]+/g) ?? [about];
  const safeParts = Math.max(1, Math.floor(parts));
  if (safeParts === 1) return [sentences.join(" ").trim()];

  const chunkSize = Math.ceil(sentences.length / safeParts);
  return Array.from({ length: safeParts }, (_, i) =>
    sentences.slice(i * chunkSize, (i + 1) * chunkSize).join(" ").trim(),
  );
}
