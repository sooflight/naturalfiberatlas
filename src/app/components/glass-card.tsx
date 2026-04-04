import { type ReactNode, useMemo, useRef, useEffect } from "react";
import { useImageBrightness } from "../hooks/use-image-brightness";
import { useImagePipeline } from "../context/image-pipeline";
import { ProgressiveImage } from "./progressive-image";

interface GlassCardProps {
  children: ReactNode;
  isHoverable?: boolean;
  isSelected?: boolean;
  className?: string;
  onClick?: () => void;
  onHoverChange?: (hovered: boolean) => void;
  as?: "button" | "div";
  /** Optional hero/fiber image rendered behind the glass for ambient colour illumination */
  ambientImage?: string;
  /**
   * Text density of the card content, 0–1.
   * 0 = no text overlay (gallery/profile), 1 = heavy text (about, trade).
   * Combined with runtime image brightness analysis to compute ideal
   * frost/blur/darkening values so text is always legible.
   */
  contentDensity?: number;
  ariaLabel?: string;
  tabIndex?: number;
  /** Profile grid: return focus after closing detail view */
  dataAtlasFiberId?: string;
}

/**
 * Shared glass-morphism card shell used by both profile and detail cards.
 * Features:
 *   - Frosted translucent background with backdrop-blur
 *   - Graduated frost density (thick top → thin bottom) via CSS mask
 *   - Ambient image underlayer for per-fiber color illumination
 *   - Outer edge-bleed glow derived from the ambient image
 *   - Frosted inner bevel (thick glass-slab illusion)
 *   - SVG noise/grain texture for tactile realism
 *   - Specular sweep animation on hover
 *   - 3:4 portrait aspect ratio
 */
export function GlassCard({
  children,
  isHoverable = true,
  isSelected = false,
  className = "",
  onClick,
  onHoverChange,
  as = "div",
  ambientImage,
  contentDensity = 0,
  ariaLabel,
  tabIndex,
  dataAtlasFiberId,
}: GlassCardProps) {
  const Tag = as;
  const pipeline = useImagePipeline();

  /* Randomised animation offsets so cards don't orbit/breathe in sync */
  const orbitDelay = useMemo(() => -Math.random() * 10, []);
  const breatheDelay = useMemo(() => -Math.random() * 5, []);

  /* ── Click-triggered specular sweep ──
     When isSelected transitions false→true, replay the sweep animation
     imperatively via the element's style. No React re-render needed. */
  const sweepRef = useRef<HTMLDivElement>(null);
  const prevSelected = useRef(false);

  useEffect(() => {
    if (isSelected && !prevSelected.current && sweepRef.current) {
      const el = sweepRef.current;
      el.style.opacity = "1";
      el.style.animation = "none";
      // Force reflow so the animation restarts cleanly
      void el.offsetWidth;
      el.style.animation =
        "specular-sweep 2.2s cubic-bezier(0.22, 0.61, 0.36, 1) forwards";
      const timer = setTimeout(() => {
        el.style.opacity = "";
        el.style.animation = "";
      }, 2400);
      prevSelected.current = isSelected;
      return () => clearTimeout(timer);
    }
    prevSelected.current = isSelected;
  }, [isSelected]);

  /* ── Adaptive frost: combine text density with measured image brightness ── */
  const imgBrightness = useImageBrightness(contentDensity > 0 ? pipeline.transform(ambientImage, "glow") : undefined);

  const frostParams = useMemo(() => {
    if (!contentDensity || !ambientImage) return null;

    // imgBrightness: 0 = very dark image, 1 = very bright image
    // Bright images need MORE darkening to maintain contrast against white text.
    // Dark images need LESS darkening — they're already providing contrast.
    const b = imgBrightness ?? 0.5; // fallback while loading

    // Combined intensity factor: how aggressively we darken / frost
    // Range roughly 0.15 – 1.0
    const intensity = contentDensity * (0.4 + 0.6 * b);

    // Image filter values — interpolate from "untouched" toward "heavy frost"
    const blur = 6 + 8 * intensity;                // 6px → 14px
    const saturate = 1 - 0.25 * intensity;          // 1.0 → 0.75
    const brightness = 1 - 0.35 * intensity;        // 1.0 → 0.65

    // Glass overlay opacity (black tint) — 0 → 0.2
    const overlayOpacity = 0.2 * intensity;

    // Frost mask bottom opacity — 0.55 (graduated) → 1.0 (uniform)
    const maskBottomOpacity = 0.55 + 0.45 * intensity;

    return { blur, saturate, brightness, overlayOpacity, maskBottomOpacity };
  }, [contentDensity, ambientImage, imgBrightness]);

  return (
    /* Outer wrapper – overflow visible so the edge-bleed glow and border ring
       can escape the card boundary.
       contain: layout style → isolates repaint boundary without clipping paint */
    <div className="group/glass relative h-full w-full pointer-events-none" style={{ contain: "layout style" }}>
      {/* ── Edge-bleed glow (renders behind the card boundary) ── */}
      {ambientImage && (
        <div
          className="pointer-events-none absolute -inset-[12%] z-0 transition-opacity duration-700"
          style={{ opacity: isSelected ? 0.35 : 0.18 }}
        >
          <img
            src={pipeline.transform(ambientImage, "glow")}
            alt=""
            aria-hidden
            loading="lazy"
            className="w-full h-full object-cover rounded-2xl"
            style={{
              filter: "blur(50px) saturate(1.5) brightness(0.55)",
            }}
          />
        </div>
      )}

      <Tag
        onClick={onClick}
        onMouseEnter={() => onHoverChange?.(true)}
        onMouseLeave={() => onHoverChange?.(false)}
        aria-label={ariaLabel}
        tabIndex={tabIndex}
        {...(dataAtlasFiberId ? { "data-atlas-fiber-id": dataAtlasFiberId } : {})}
        {...(as === "button" ? { type: "button" as const } : {})}
        className={`
          relative aspect-[3/4] w-full overflow-hidden rounded-xl p-0 pointer-events-auto
          transition-[opacity] duration-400 ease-out
          ${isHoverable ? "cursor-pointer" : ""}
          ${onClick ? "focus:outline-none" : ""}
          ${className}
        `}
        style={{ isolation: "isolate", transform: "translateZ(0)", WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
      >
        {/* ── Ambient image underlayer (inside the card, behind glass) ── */}
        {ambientImage && (
          <ProgressiveImage
            src={ambientImage}
            preset="ambient"
            alt=""
            skipLqip={false}
            loading="lazy"
            className="pointer-events-none absolute inset-0 w-full h-full object-cover rounded-xl z-0 transition-opacity duration-200"
            style={{
              filter: frostParams
                ? `blur(${frostParams.blur}px) saturate(${frostParams.saturate}) brightness(${frostParams.brightness})`
                : "blur(6px) saturate(1) brightness(1)",
              opacity: isSelected ? 0.6 : 0.6,
              transform: "scale(1.1)",
            }}
          />
        )}

        {/* ── Glass background layer — graduated frost via mask ── */}
        <div
          className={`
            absolute inset-0 rounded-xl transition-[background-color] duration-400
            ${ambientImage
              ? frostParams
                ? "backdrop-blur-2xl"
                : isSelected
                  ? "bg-white/30 backdrop-blur-xl"
                  : "bg-white/30 backdrop-blur-md"
              : ""
            }
          `}
          style={{
            zIndex: 1,
            ...(frostParams ? { backgroundColor: `rgba(0,0,0,${frostParams.overlayOpacity})` } : {}),
            maskImage: ambientImage
              ? frostParams
                ? `linear-gradient(to bottom, black 0%, black 40%, rgba(0,0,0,${frostParams.maskBottomOpacity}) 100%)`
                : "linear-gradient(to bottom, black 0%, black 40%, rgba(0,0,0,0.55) 100%)"
              : undefined,
            WebkitMaskImage: ambientImage
              ? frostParams
                ? `linear-gradient(to bottom, black 0%, black 40%, rgba(0,0,0,${frostParams.maskBottomOpacity}) 100%)`
                : "linear-gradient(to bottom, black 0%, black 40%, rgba(0,0,0,0.55) 100%)"
              : undefined,
          }}
        />

        {/* ── Frosted inner bevel — thick glass-slab illusion
             #8: ::after pseudo-element provides the top-edge highlight line,
             eliminating a separate DOM element. */}
        <div
          className={`
            pointer-events-none absolute inset-0 z-20 rounded-xl transition-[box-shadow] duration-400 glass-bevel
            ${isSelected ? "is-selected" : ""}
          `}
          style={{
            boxShadow: isSelected
              ? `inset 0 -1px 1px 0 rgba(0,0,0,0.12),
                 inset 1px 0 1px 0 rgba(255,255,255,0.06),
                 inset -1px 0 1px 0 rgba(0,0,0,0.06),
                 0 0 20px rgba(15,120,60,0.06)`
              : `inset 0 -1px 1px 0 rgba(0,0,0,0.10),
                 inset 1px 0 1px 0 rgba(255,255,255,0.04),
                 inset -1px 0 1px 0 rgba(0,0,0,0.04)`,
          }}
        />

        {/* ── Hover border REMOVED (#8) — merged into .glass-border-ring::before ── */}

        {/* ── Inner ambient vignette ── */}
        {ambientImage && (
          <div
            className="pointer-events-none absolute inset-0 z-[2] rounded-xl"
            style={{
              background:
                "radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(0,0,0,0.2) 100%)",
            }}
          />
        )}

        {/* ── SVG noise/grain texture for tactile realism ── */}
        {/* Filter is defined once in GridView; we reference the shared ID here */}
        <div
          className="pointer-events-none absolute inset-0 z-[3] rounded-xl mix-blend-overlay"
          style={{
            filter: `url(#glass-noise)`,
            opacity: 0.035,
          }}
        />

        {/* ── Specular sweep — animated diagonal highlight on hover
             #8: Collapsed from 2 elements to 1. Tag's overflow-hidden + rounded-xl
             provides the clipping that the former outer container duplicated. */}
        <div
          ref={sweepRef}
          className={`
            glass-specular-sweep pointer-events-none absolute z-10 opacity-0
            ${isSelected ? "" : ""}
          `}
          style={{
            top: "-20%",
            left: "-120%",
            width: "67%",
            height: "140%",
            background:
              "linear-gradient(105deg, transparent 0%, transparent 30%, rgba(255,255,255,0.06) 38%, rgba(255,255,255,0.14) 48%, rgba(255,255,255,0.14) 52%, rgba(255,255,255,0.06) 62%, transparent 70%, transparent 100%)",
            transform: "skewX(-10deg)",
          }}
        />

        {/* ── Top-edge highlight REMOVED (#8) — merged into .glass-bevel::after ── */}

        {/* ── Content ── */}
        <div className="absolute inset-0 z-10">{children}</div>
      </Tag>

      {/* ── Border: animated orbiting glow ──
           Rendered OUTSIDE the Tag's overflow-hidden so the 1px border
           is not clipped at the rounded corners.
           #8: ::before pseudo-element provides the hover variant (warm tones). */}
      <div
        className={`pointer-events-none absolute inset-0 z-30 rounded-xl glass-border-ring ${isSelected ? "is-selected" : ""}`}
        style={{
          padding: "1px",
          background: isSelected
            ? `conic-gradient(from var(--border-angle), rgba(15,120,60,0.5) 0deg, rgba(15,120,60,0.18) 60deg, transparent 140deg, transparent 220deg, rgba(15,120,60,0.18) 300deg, rgba(15,120,60,0.5) 360deg)`
            : `conic-gradient(from var(--border-angle), rgba(255,255,255,0.35) 0deg, rgba(255,255,255,0.1) 60deg, transparent 140deg, transparent 220deg, rgba(255,255,255,0.1) 300deg, rgba(255,255,255,0.35) 360deg)`,
          WebkitMask:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude" as any,
          animationName: "border-orbit, border-breathe",
          animationDuration: isSelected ? "6s, 3s" : "10s, 5s",
          animationTimingFunction: "linear, ease-in-out",
          animationIterationCount: "infinite, infinite",
          animationDelay: `${orbitDelay}s, ${breatheDelay}s`,
          filter: "blur(0.5px)",
          ["--breathe-low" as any]: isSelected ? "0.7" : "0.45",
          ["--breathe-high" as any]: isSelected ? "1" : "0.7",
          /* Pass orbit delay to ::before pseudo for synced rotation */
          ["--glass-orbit-delay" as any]: `${orbitDelay}s`,
        }}
      />
    </div>
  );
}