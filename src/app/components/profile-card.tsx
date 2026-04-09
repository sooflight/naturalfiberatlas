import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useImagePipeline } from "../context/image-pipeline";
import { useCrossfade } from "../hooks/use-crossfade";
import { useHasRealHover } from "../hooks/use-has-real-hover";
import { useImageBrightness } from "../hooks/use-image-brightness";
import { usePrefersReducedMotion } from "../hooks/use-prefers-reduced-motion";
import type { GalleryImageEntry } from "../data/fibers";
import {
  buildProfileCardCrossfadeLayers,
  type GalleryPreviewLine,
} from "../utils/profile-card-images";
import { GlassCard } from "./glass-card";
import {
  ATLAS_GRID_CARD_NAME_FONT_SIZE,
  ATLAS_GRID_PROFILE_PILL_FS,
} from "./atlas-shared";

interface ProfilePills {
  scientificName: string;
  plantPart: string;
  handFeel: string;
  fiberType: string;
  era: string;
  origin: string;
}

interface ProfileCardProps {
  id: string;
  name: string;
  image: string;
  galleryImages?: string[];
  /**
   * When set (e.g. from merged fiber gallery), drives crossfade layers and optional
   * `previewFocal` → `object-position` for grid crop. If omitted, `galleryImages` URLs are used.
   */
  galleryPreviewEntries?: GalleryPreviewLine[] | GalleryImageEntry[];
  crossfadePaused?: boolean;
  category: string;
  isSelected?: boolean;
  onClick: () => void;
  profilePills?: ProfilePills;
  ambientPills?: boolean;
  /** Earlier grid indices: loading="eager" on the hero layer for better scheduling */
  priority?: boolean;
  /**
   * Subset of priority cells get fetchpriority="high" on layer 0 so the first rows
   * win without marking the whole eager band as high priority.
   */
  fetchPriorityHigh?: boolean;
}

/* ── Color-coded pill palette ──
   Dark frosted glass bg with natural-world text tones:
   sky, plant, earth — warm golds, greens, natural hues.
*/
const pillColors = {
  scientificName: { bg: "rgba(0,0,0,0.65)", border: "rgba(255,255,255,0.13)", text: "rgba(205,185,140,0.90)" },  // warm gold
  plantPart:      { bg: "rgba(0,0,0,0.65)", border: "rgba(255,255,255,0.13)", text: "rgba(145,190,120,0.90)" },  // leaf green
  handFeel:       { bg: "rgba(0,0,0,0.65)", border: "rgba(255,255,255,0.13)", text: "rgba(195,180,145,0.90)" },  // sandstone
  fiberType:      { bg: "rgba(0,0,0,0.65)", border: "rgba(255,255,255,0.13)", text: "rgba(125,185,140,0.90)" },  // sage green
  era:            { bg: "rgba(0,0,0,0.65)", border: "rgba(255,255,255,0.13)", text: "rgba(200,175,130,0.90)" },  // aged amber
  origin:         { bg: "rgba(0,0,0,0.65)", border: "rgba(255,255,255,0.13)", text: "rgba(170,190,155,0.90)" },  // moss / muted green
} as const;

type PillKey = keyof typeof pillColors;

function isProfilePillPlaceholder(value: string): boolean {
  const t = value.trim();
  if (!t) return true;
  return /^n\/a$/i.test(t);
}

function Pill({
  colorKey,
  children,
  delay,
}: {
  colorKey: PillKey;
  children: React.ReactNode;
  delay: number;
}) {
  const c = pillColors[colorKey];
  return (
    <span
      className="inline-block rounded-[5px] tracking-[0.13em] uppercase whitespace-nowrap transition-[opacity,transform] duration-500 ease-out leading-none"
      style={{
        ...ATLAS_GRID_PROFILE_PILL_FS,
        padding: "clamp(3.5px, 1.2cqi, 6.5px) clamp(6px, 2.5cqi, 12px)",
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        transitionDelay: `${delay}ms`,
        boxShadow: "inset 0 0.5px 0 rgba(255,255,255,0.06)",
      }}
    >
      {children}
    </span>
  );
}

export function ProfileCard({
  id,
  name,
  image,
  galleryImages,
  galleryPreviewEntries,
  crossfadePaused = false,
  isSelected,
  onClick,
  profilePills,
  priority = false,
  fetchPriorityHigh = true,
}: ProfileCardProps) {
  const pipeline = useImagePipeline();
  const revealed = isSelected ? "is-revealed" : "";
  const [hovered, setHovered] = useState(false);
  const [imageStackRevealed, setImageStackRevealed] = useState(false);
  const [failedLayerMap, setFailedLayerMap] = useState<Record<number, true>>({});
  const [layerSrcOverrideMap, setLayerSrcOverrideMap] = useState<Record<number, string>>({});
  const primaryImgRef = useRef<HTMLImageElement | null>(null);
  const hasRealHover = useHasRealHover();
  const hoverLogRef = useRef(false);
  const brightness = useImageBrightness(pipeline.transform(image, "glow"));
  const nameShadow = useMemo(() => {
    const b = brightness ?? 0.4;
    const spread = 4 + b * 10;
    const opacity = 0.35 + b * 0.45;
    const outerOpacity = opacity * 0.48;
    return `0 1px ${spread}px rgba(0,0,0,${outerOpacity.toFixed(2)}), 0 0 2px rgba(0,0,0,${(opacity * 0.6).toFixed(2)})`;
  }, [brightness]);
  const galleryLines = useMemo((): GalleryPreviewLine[] => {
    if (galleryPreviewEntries !== undefined) return galleryPreviewEntries;
    return (galleryImages ?? []).map((url) => ({ url }));
  }, [galleryPreviewEntries, galleryImages]);

  const crossfadeLayers = useMemo(
    () => buildProfileCardCrossfadeLayers(image, galleryLines, pipeline.transform),
    [image, galleryLines, pipeline],
  );
  const { activeIndex, previousIndex } = useCrossfade({
    id,
    imageCount: crossfadeLayers.length,
    paused: (hasRealHover && hovered) || crossfadePaused,
  });
  const primarySrc = crossfadeLayers[0]?.url;
  const primaryImageFailed = failedLayerMap[0] === true;
  const useHighFetch = priority && fetchPriorityHigh;
  const prefersReducedMotion = usePrefersReducedMotion();
  const revealMs = prefersReducedMotion ? 0 : 500;
  const revealTransition =
    revealMs === 0 ? "none" : `opacity ${revealMs}ms ease-out`;

  useEffect(() => {
    setFailedLayerMap({});
    setLayerSrcOverrideMap({});
  }, [id, primarySrc]);

  const markLayerFailed = useCallback((layerIndex: number) => {
    setFailedLayerMap((prev) => {
      if (prev[layerIndex]) return prev;
      return { ...prev, [layerIndex]: true };
    });
  }, []);

  const handleLayerError = useCallback(
    (layerIndex: number) => {
      const layer = crossfadeLayers[layerIndex];
      const fallbackSrc = layer?.sourceUrl?.trim();
      const transformedSrc = layer?.url?.trim();
      const hasTriedFallback = layerSrcOverrideMap[layerIndex] !== undefined;
      const canFallback =
        !!fallbackSrc &&
        !!transformedSrc &&
        fallbackSrc !== transformedSrc &&
        !hasTriedFallback;

      if (canFallback) {
        setLayerSrcOverrideMap((prev) => {
          if (prev[layerIndex] !== undefined) return prev;
          return { ...prev, [layerIndex]: fallbackSrc };
        });
        return;
      }

      markLayerFailed(layerIndex);
    },
    [crossfadeLayers, layerSrcOverrideMap, markLayerFailed],
  );

  useEffect(() => {
    if (!primarySrc) {
      setImageStackRevealed(true);
      return;
    }
    setImageStackRevealed(false);
    const el = primaryImgRef.current;
    if (!el) return;

    let cancelled = false;
    const reveal = () => {
      if (!cancelled) {
        requestAnimationFrame(() => setImageStackRevealed(true));
      }
    };
    const runAfterDecoded = () => {
      if (typeof el.decode === "function") {
        el.decode().then(reveal).catch(reveal);
      } else {
        reveal();
      }
    };

    if (el.complete && el.naturalWidth > 0) {
      runAfterDecoded();
    } else {
      el.addEventListener("load", runAfterDecoded, { once: true });
      el.addEventListener("error", reveal, { once: true });
    }

    return () => {
      cancelled = true;
    };
  }, [primarySrc, id]);

  useEffect(() => {
    if (!imageStackRevealed || crossfadeLayers.length <= 1) return;

    const urls = crossfadeLayers.slice(1).map((l) => l.url);
    let cancelled = false;

    const work = () => {
      if (cancelled) return;
      for (const url of urls) {
        const pre = new Image();
        pre.src = url;
        if (typeof pre.decode === "function") {
          pre.decode().catch(() => {});
        }
      }
    };

    if (fetchPriorityHigh) {
      queueMicrotask(work);
      return () => {
        cancelled = true;
      };
    }

    if (typeof requestIdleCallback !== "undefined") {
      const idleId = requestIdleCallback(work, { timeout: 2500 });
      return () => {
        cancelled = true;
        cancelIdleCallback(idleId);
      };
    }

    const timeoutId = window.setTimeout(work, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [fetchPriorityHigh, imageStackRevealed, crossfadeLayers]);

  const debugProfileCycle =
    import.meta.env.DEV
    && import.meta.env.VITE_ATLAS_DEBUG_PROFILE_CYCLE === "1";

  useEffect(() => {
    if (!debugProfileCycle) return;

    if (hovered && !hoverLogRef.current) {
      console.debug("[Atlas][ProfileCardCycle]", {
        id,
        name,
        activeIndex,
        previousIndex,
        imageCount: crossfadeLayers.length,
        crossfadePaused,
        images: crossfadeLayers.map((l) => l.url),
      });
      hoverLogRef.current = true;
      return;
    }

    if (!hovered) {
      hoverLogRef.current = false;
    }
  }, [
    activeIndex,
    crossfadeLayers,
    crossfadePaused,
    debugProfileCycle,
    hovered,
    id,
    name,
    previousIndex,
  ]);

  const topPillEntries = profilePills
    ? ([
        ["scientificName", profilePills.scientificName, 0] as const,
        ["plantPart", profilePills.plantPart, 60] as const,
        ["handFeel", profilePills.handFeel, 120] as const,
      ] satisfies ReadonlyArray<readonly [PillKey, string, number]>)
    : [];
  const bottomPillEntries = profilePills
    ? ([
        ["fiberType", profilePills.fiberType, 70] as const,
        ["era", profilePills.era, 130] as const,
        ["origin", profilePills.origin, 190] as const,
      ] satisfies ReadonlyArray<readonly [PillKey, string, number]>)
    : [];
  const visibleTopPills = topPillEntries.filter(([, v]) => !isProfilePillPlaceholder(v));
  const visibleBottomPills = bottomPillEntries.filter(([, v]) => !isProfilePillPlaceholder(v));

  return (
    <GlassCard
      as="button"
      onClick={onClick}
      onHoverChange={setHovered}
      isSelected={isSelected}
      ariaLabel={`Open ${name} profile`}
      tabIndex={0}
      dataAtlasFiberId={id}
      className="focus-visible:ring-1 focus-visible:ring-white/40 focus-visible:ring-offset-0"
    >
      {/* Neutral plate until the hero bitmap is fully decoded (avoids progressive strip-in) */}
      <div
        className="absolute inset-0 -z-20 bg-gradient-to-b from-[#0e0e0e] via-[#0a0a0a] to-[#0c0c0c] pointer-events-none"
        style={{
          opacity: imageStackRevealed && !primaryImageFailed ? 0 : 1,
          transition: revealTransition,
        }}
        aria-hidden
      />

      {/* Background image stack: active fades on top of previous image */}
      <div
        className="absolute inset-0 -z-10 overflow-hidden"
        style={{
          opacity: imageStackRevealed && !primaryImageFailed ? 1 : 0,
          transition: revealTransition,
        }}
      >
        {crossfadeLayers.map((layer, layerIndex) => {
          const isActive = layerIndex === activeIndex;
          const isPrevious = layerIndex === previousIndex && layerIndex !== activeIndex;
          const isFailed = failedLayerMap[layerIndex] === true;
          const style: React.CSSProperties = {
            opacity: isFailed ? 0 : (isActive || isPrevious ? 1 : 0),
            zIndex: isActive ? 2 : isPrevious ? 1 : 0,
            transition: isActive ? "opacity 3s ease" : "none",
            ...(layer.objectPosition ? { objectPosition: layer.objectPosition } : {}),
          };
          const eagerLayer =
            priority && (layerIndex === 0 || fetchPriorityHigh);
          return (
            <img
              key={`${layer.url}-${layerIndex}`}
              ref={layerIndex === 0 ? primaryImgRef : undefined}
              src={layerSrcOverrideMap[layerIndex] ?? layer.url}
              alt={name}
              className="absolute inset-0 h-full w-full object-cover"
              style={style}
              loading={eagerLayer ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
              onError={() => handleLayerError(layerIndex)}
              {...(useHighFetch && layerIndex === 0
                ? ({ fetchpriority: "high" } as Record<string, string>)
                : {})}
            />
          );
        })}
      </div>

      {/* ── Subtle graduated frost overlay ── */}
      <div
        className="absolute inset-0 z-0 bg-white/[0.06] pointer-events-none"
        style={{
          maskImage:
            "linear-gradient(to bottom, black 0%, rgba(0,0,0,0.4) 25%, transparent 50%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 0%, rgba(0,0,0,0.4) 25%, transparent 50%)",
        }}
      />
      {/* ── Bottom frost overlay — subtle tint anchoring the lower portion ── */}
      <div
        className="absolute inset-0 z-0 bg-white/[0.06] pointer-events-none"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.4) 70%, black 90%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.4) 70%, black 90%)",
        }}
      />
      {/* ── Breathing mask expansion layer removed — hover is specular sweep only ── */}

      {/* Readability scrim — subtle black vignette; title & pills sit above at z-[2] */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.26) 0%, rgba(0,0,0,0.05) 16%, transparent 38%, transparent 55%, rgba(0,0,0,0.1) 70%, rgba(0,0,0,0.48) 100%)",
        }}
        aria-hidden
      />

      {/* Selected dot */}
      {isSelected && (
        <div
          className="absolute top-[6%] right-[8%] z-[2] rounded-full bg-[#0F783C]"
          style={{
            width: "clamp(6px, 2.5cqi, 10px)",
            height: "clamp(6px, 2.5cqi, 10px)",
            boxShadow: "0 0 10px rgba(15,120,60,0.55)",
          }}
        />
      )}

      {/* ── Property pills — top zone ── */}
      {visibleTopPills.length > 0 && (
        <div
          className={`absolute top-[6%] right-[8%] z-[2] flex flex-wrap gap-[clamp(3px,1.2cqi,6px)] pointer-events-none pill-zone ${revealed}`}
          style={{ left: "clamp(10px,5cqi,20px)" }}
        >
          {visibleTopPills.map(([colorKey, text, delay]) => (
            <Pill key={colorKey} colorKey={colorKey} delay={delay}>
              {text}
            </Pill>
          ))}
        </div>
      )}

      {/* ── Property pills — bottom zone (above name) ── */}
      {visibleBottomPills.length > 0 && (
        <div
          className={`absolute bottom-[6%] right-[8%] z-[2] flex flex-wrap gap-[clamp(3px,1.2cqi,6px)] pointer-events-none pill-zone ${revealed}`}
          style={{ left: "clamp(10px,5cqi,20px)" }}
        >
          {visibleBottomPills.map(([colorKey, text, delay]) => (
            <Pill key={colorKey} colorKey={colorKey} delay={delay}>
              {text}
            </Pill>
          ))}
        </div>
      )}

      {/* Name — vertically centered */}
      <div className="absolute inset-0 z-[2] flex items-center justify-start p-[clamp(10px,5cqi,20px)]">
        <h3
          className="text-white tracking-[0.28em] uppercase text-left"
          style={{
            fontFamily: "var(--font-atlas-profile-card-name)",
            fontSize: ATLAS_GRID_CARD_NAME_FONT_SIZE,
            fontWeight: 500,
            lineHeight: 1.3,
            paintOrder: "stroke fill",
            textShadow: nameShadow,
          }}
        >
          {name}
        </h3>
      </div>
    </GlassCard>
  );
}
