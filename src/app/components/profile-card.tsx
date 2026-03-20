import { useEffect, useMemo, useRef, useState } from "react";
import { useImagePipeline } from "../context/image-pipeline";
import { useCrossfade } from "../hooks/use-crossfade";
import { useImageBrightness } from "../hooks/use-image-brightness";
import { buildProfileCardCrossfadeImages } from "../utils/profile-card-images";
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
  crossfadePaused?: boolean;
  category: string;
  isSelected?: boolean;
  onClick: () => void;
  profilePills?: ProfilePills;
  /** Above-the-fold cards get fetchpriority="high" and loading="eager" for faster LCP */
  priority?: boolean;
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
  crossfadePaused = false,
  isSelected,
  onClick,
  profilePills,
  priority = false,
}: ProfileCardProps) {
  const pipeline = useImagePipeline();
  const revealed = isSelected ? "is-revealed" : "";
  const [hovered, setHovered] = useState(false);
  const hoverLogRef = useRef(false);
  const brightness = useImageBrightness(pipeline.transform(image, "glow"));
  const nameShadow = useMemo(() => {
    const b = brightness ?? 0.4;
    const spread = 4 + b * 10;
    const opacity = 0.35 + b * 0.45;
    return `0 1px ${spread}px rgba(0,0,0,${opacity.toFixed(2)}), 0 0 2px rgba(0,0,0,${(opacity * 0.6).toFixed(2)})`;
  }, [brightness]);
  const crossfadeImages = useMemo(
    () => buildProfileCardCrossfadeImages(image, galleryImages, pipeline.transform),
    [image, galleryImages, pipeline],
  );
  const { activeIndex, previousIndex } = useCrossfade({
    id,
    imageCount: crossfadeImages.length,
    paused: hovered || crossfadePaused,
  });
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
        imageCount: crossfadeImages.length,
        crossfadePaused,
        images: crossfadeImages,
      });
      hoverLogRef.current = true;
      return;
    }

    if (!hovered) {
      hoverLogRef.current = false;
    }
  }, [
    activeIndex,
    crossfadeImages,
    crossfadePaused,
    debugProfileCycle,
    hovered,
    id,
    name,
    previousIndex,
  ]);

  return (
    <GlassCard
      as="button"
      onClick={onClick}
      onHoverChange={setHovered}
      isSelected={isSelected}
      ariaLabel={`Open ${name} profile`}
      tabIndex={0}
      className="focus-visible:ring-1 focus-visible:ring-white/40 focus-visible:ring-offset-0"
    >
      {/* Background image stack: active fades on top of previous image */}
      <div className="absolute inset-0 -z-10">
        {crossfadeImages.map((src, layerIndex) => {
          const isActive = layerIndex === activeIndex;
          const isPrevious = layerIndex === previousIndex && layerIndex !== activeIndex;
          const style: React.CSSProperties = {
            opacity: isActive || isPrevious ? 1 : 0,
            zIndex: isActive ? 2 : isPrevious ? 1 : 0,
            transition: isActive ? "opacity 3s ease" : "none",
          };
          return (
            <img
              key={`${src}-${layerIndex}`}
              src={src}
              alt={name}
              className="absolute inset-0 h-full w-full object-cover"
              style={style}
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
              {...(priority && layerIndex === 0 ? { fetchPriority: "high" as const } : {})}
            />
          );
        })}
      </div>

      {/* ── Subtle graduated frost overlay ── */}
      <div
        className="absolute inset-0 bg-white/[0.06] pointer-events-none"
        style={{
          maskImage:
            "linear-gradient(to bottom, black 0%, rgba(0,0,0,0.4) 25%, transparent 50%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 0%, rgba(0,0,0,0.4) 25%, transparent 50%)",
        }}
      />
      {/* ── Bottom frost overlay — subtle tint anchoring the lower portion ── */}
      <div
        className="absolute inset-0 bg-white/[0.06] pointer-events-none"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.4) 70%, black 90%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.4) 70%, black 90%)",
        }}
      />
      {/* ── Breathing mask expansion layer removed — hover is specular sweep only ── */}

      {/* Gradient scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent pointer-events-none" />

      {/* Selected dot */}
      {isSelected && (
        <div
          className="absolute top-[8%] left-[8%] rounded-full bg-[#0F783C]"
          style={{
            width: "clamp(6px, 2.5cqi, 10px)",
            height: "clamp(6px, 2.5cqi, 10px)",
            boxShadow: "0 0 10px rgba(15,120,60,0.55)",
          }}
        />
      )}

      {/* ── Property pills — top zone ── */}
      {profilePills && (
        <div
          className={`absolute top-[6%] right-[8%] flex flex-wrap gap-[clamp(3px,1.2cqi,6px)] pointer-events-none pill-zone ${revealed}`}
          style={{ left: "clamp(10px,5cqi,20px)" }}
        >
          <Pill colorKey="scientificName" delay={0}>
            {profilePills.scientificName}
          </Pill>
          <Pill colorKey="plantPart" delay={60}>
            {profilePills.plantPart}
          </Pill>
          <Pill colorKey="handFeel" delay={120}>
            {profilePills.handFeel}
          </Pill>
        </div>
      )}

      {/* ── Property pills — bottom zone (above name) ── */}
      {profilePills && (
        <div
          className={`absolute bottom-[6%] right-[8%] flex flex-wrap gap-[clamp(3px,1.2cqi,6px)] pointer-events-none pill-zone ${revealed}`}
          style={{ left: "clamp(10px,5cqi,20px)" }}
        >
          <Pill colorKey="fiberType" delay={70}>
            {profilePills.fiberType}
          </Pill>
          <Pill colorKey="era" delay={130}>
            {profilePills.era}
          </Pill>
          <Pill colorKey="origin" delay={190}>
            {profilePills.origin}
          </Pill>
        </div>
      )}

      {/* Name — vertically centered */}
      <div className="absolute inset-0 flex items-center justify-start p-[clamp(10px,5cqi,20px)]">
        <h3
          className="text-white tracking-[0.3em] uppercase text-left"
          style={{
            fontSize: ATLAS_GRID_CARD_NAME_FONT_SIZE,
            fontWeight: 500,
            lineHeight: 1.3,
            WebkitTextStroke: "0.33px rgba(255,255,255,1)",
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
