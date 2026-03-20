import { ProgressiveImage } from "./progressive-image";
import { ProfileImageExperience } from "./profile-image-experience";
import { useImagePipeline } from "../context/image-pipeline";
import { useCallback, useMemo, useState } from "react";
import { type FiberProfile, type GalleryImageEntry } from "../data/atlas-data";
import { dataSource } from "../data/data-provider";
import { resolveRegionDots, InteractiveWorldMap, SustainabilityRadar, getSustainabilityMetrics } from "./map-helpers";
import {
  Droplets,
  Globe2,
  FlaskConical,
  Recycle,
  Leaf,
  MapPin,
  CalendarDays,
  DollarSign,
  Package,
  Clock,
  Link2,
  Layers,
  ShieldCheck,
  Microscope,
  ArrowRight,
  Expand,
  Dna,
  Shirt,
  Thermometer,
  WashingMachine,
  Sun,
  Flame,
  Scissors,
} from "lucide-react";

/* ─── Shared primitives ─── */
import {
  PLATE_PAD as pad,
  bodyFs, heroFs, tagFs,
  SectionLabel, splitAboutText,
  StackedDataRows,
  T, ink, accent, sp, plateIcon,
  B,
  type DataRowItem,
} from "./plate-primitives";

/* ─── Helper: accent-tinted style generators ─── */
const warmA = accent.warm;
const coolA = accent.cool;
const neutA = accent.neutral;

function ExpandAffordance() {
  return (
    <div className={`flex items-center justify-center mt-[${sp.xs}]`}>
      <span
        className={`${T.muted} uppercase tracking-[0.2em]`}
        style={{ fontSize: "clamp(7px, 2.2cqi, 9px)", fontWeight: 600 }}
      >
        Expand
      </span>
    </div>
  );
}

function RatingRow({ icon: Icon, label, value, max = 5, iconColor }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: number; max?: number; iconColor: string }) {
  return (
    <div className={`flex items-center gap-[${sp.xs}]`}>
      <Icon size={12} className={`${iconColor} flex-shrink-0`} />
      <span className={`tracking-[0.1em] uppercase ${T.tertiary} flex-shrink-0`} style={{ fontSize: "clamp(9px, 3cqi, 12px)", fontWeight: 600, width: "clamp(36px, 20cqi, 95px)" }}>{label}</span>
      <div className="flex-1 h-[clamp(3px,0.8cqi,5px)] rounded-full bg-white/[0.12] overflow-hidden">
        <div className={`h-full rounded-full bg-[${neutA}] transition-[width] duration-700`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className={`${T.primary} text-right flex-shrink-0`} style={{ fontSize: "clamp(10px, 3.2cqi, 13px)", fontWeight: 600, width: "clamp(14px, 5cqi, 24px)" }}>{value}</span>
    </div>
  );
}

/* ═══ 1 ─ ABOUT (Editorial — warm accent) ═══ */
export function AboutPlate({ fiber }: { fiber: FiberProfile }) {
  return (
    <div className={`h-full flex flex-col ${pad}`}>
      <SectionLabel icon={Layers} iconColor={plateIcon.editorial}>About</SectionLabel>

      {/* Accent divider */}
      <div className={`w-[${sp.xl}] h-px bg-[${warmA}]/50 mb-[${sp.sm}]`} />

      <h3 className={`${T.primary} uppercase tracking-[0.06em] mb-[1px]`} style={heroFs}>{fiber.name}</h3>
      <p className={`text-[${warmA}]/70 mb-[${sp.sm}]`} style={{ fontSize: "clamp(10px, 3cqi, 12px)", fontWeight: 500 }}>{fiber.subtitle}</p>

      {/* Body text — Inter Regular, line-clamped in card */}
      <p
        className={`${T.secondary} detail-prose flex-1`}
        style={{
          ...bodyFs,
          letterSpacing: "0.01em",
          display: "-webkit-box",
          WebkitLineClamp: 4,
          WebkitBoxOrient: "vertical" as const,
          overflow: "hidden",
        }}
      >
        {fiber.about}
      </p>

      {/* Tags */}
      <div className={`flex flex-wrap gap-[${sp.xs}] mt-[${sp.sm}]`}>
        {fiber.tags.slice(0, 4).map((tag) => (
          <span key={tag} className={`px-[clamp(5px,2cqi,10px)] py-[clamp(2px,0.6cqi,4px)] rounded-full border ${B.ghost} ${T.tertiary}`} style={tagFs}>{tag}</span>
        ))}
      </div>

      {/* Expand affordance */}
      <ExpandAffordance />
    </div>
  );
}

/* ═══ 1b ─ INSIGHT (Editorial — warm accent) ═══ */
export function InsightPlate({ fiber, half }: { fiber: FiberProfile; half: 1 | 2 | 3 }) {
  const parts = splitAboutText(fiber.about, 3);
  const text = parts[half - 1];
  if (!text) return null;

  return (
    <div className={`h-full flex flex-col ${pad}`}>
      {/* Diamond symbol — pinned to top */}
      <span className={`text-[${warmA}]/20 shrink-0`} style={{ fontSize: "clamp(18px, 8cqi, 36px)", lineHeight: 0.7 }}>◈</span>

      {/* Content area — flex-1, vertically centered */}
      <div className={`flex-1 min-h-0 flex flex-col justify-center gap-[${sp.md}] pt-[${sp.xs}]`}>
        {/* Blockquote with left border */}
        <div className="relative">
          <div aria-hidden="true" className={`absolute inset-0 border-l-[1.667px] border-[${warmA}]/40 pointer-events-none`} />
          <p
            className={`${T.primary} detail-prose`}
            style={{
              fontSize: "clamp(13px, 3.8cqi, 18px)",
              lineHeight: 1.5,
              fontFamily: "'Pica', serif",
              letterSpacing: "0.06em",
              paddingLeft: `${sp.md}`,
              display: "-webkit-box",
              WebkitLineClamp: 6,
              WebkitBoxOrient: "vertical" as const,
              overflow: "hidden",
            }}
          >
            {text}
          </p>
        </div>

        {/* Attribution */}
        <div className={`flex items-center gap-[${sp.xs}]`}>
          <div className={`w-[${sp.md}] h-px bg-[${warmA}]/30 shrink-0`} />
          <span
            className={`text-[${warmA}]/60 uppercase tracking-[0.15em]`}
            style={{ fontSize: "clamp(8px, 2.5cqi, 10px)" }}
          >
            {fiber.name} — {half === 1 ? "Origins" : half === 2 ? "Depth" : "Context"}
          </span>
        </div>
      </div>

      {/* Expand affordance — pinned to bottom */}
      <div className={`shrink-0 h-[${sp.xl}]`}>
        <ExpandAffordance />
      </div>
    </div>
  );
}

const SILK_VARIANT_BY_PLATE = {
  silkCharmeuse: "charmeuse",
  silkHabotai: "habotai",
  silkDupioni: "dupioni",
  silkTaffeta: "taffeta",
  silkChiffon: "chiffon",
  silkOrganza: "organza",
} as const;

export function SilkVariantPlate({
  plateType,
}: {
  plateType:
    | "silkCharmeuse"
    | "silkHabotai"
    | "silkDupioni"
    | "silkTaffeta"
    | "silkChiffon"
    | "silkOrganza";
}) {
  const variantId = SILK_VARIANT_BY_PLATE[plateType];
  const variant = dataSource.getFiberById(variantId);
  if (!variant) return null;
  const applications = (variant.applications ?? []).slice(0, 3).join(" · ");

  return (
    <div className={`h-full flex flex-col ${pad}`}>
      <SectionLabel icon={Layers}>Silk Type</SectionLabel>
      <div className={`w-[${sp.xl}] h-px bg-[${neutA}]/40 mb-[${sp.sm}]`} />
      <h3 className={`${T.primary} uppercase tracking-[0.08em] mb-[1px]`} style={heroFs}>
        {variant.name}
      </h3>
      <p className={`${T.tertiary} mb-[${sp.sm}]`} style={{ fontSize: "clamp(10px, 3cqi, 12px)" }}>
        {variant.subtitle}
      </p>
      <p
        className={`${T.secondary} detail-prose flex-1`}
        style={{
          ...bodyFs,
          letterSpacing: "0.01em",
          display: "-webkit-box",
          WebkitLineClamp: 5,
          WebkitBoxOrient: "vertical" as const,
          overflow: "hidden",
        }}
      >
        {variant.about}
      </p>
      <div className={`mt-[${sp.sm}]`}>
        <span className={T.muted} style={{ fontSize: "clamp(8px, 2.6cqi, 10px)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Common Use
        </span>
        <p className={T.tertiary} style={{ fontSize: "clamp(9px, 2.8cqi, 11px)", lineHeight: 1.35 }}>
          {applications}
        </p>
      </div>
    </div>
  );
}

/* ═══ 2 ─ QUOTE (Editorial — warm accent) ═══ */
export function QuotePlate({ fiber }: { fiber: FiberProfile }) {
  const quotes = dataSource.getQuoteData()[fiber.id] ?? [];

  /* Fallback to auto-extracted pull quote if no curated quotes */
  if (quotes.length === 0) {
    const sentences = fiber.about.match(/[^.!?]+[.!?]+/g) ?? [fiber.about];
    /* Limit pull quote to ~60 words for compact cards */
    const pullQuote = sentences.slice(0, 1).join(" ").trim();
    return (
      <div className={`h-full flex flex-col ${pad}`}>
        <span className={`text-[${warmA}]/20 shrink-0`} style={{ fontSize: "clamp(18px, 8cqi, 36px)", fontFamily: "'PICA', 'Pica', serif", lineHeight: 0.7 }}>&ldquo;</span>
        <div className={`flex-1 min-h-0 flex flex-col justify-center gap-[${sp.md}] pt-[${sp.xs}]`}>
          <div className="relative">
            <div aria-hidden="true" className={`absolute inset-0 border-l-[1.667px] border-[${warmA}]/40 pointer-events-none`} />
            <p
              className={`${T.primary} detail-prose`}
              style={{
                fontSize: "clamp(14px, 4.8cqi, 22px)",
                lineHeight: 1.5,
                fontFamily: "'Pica', serif",
                letterSpacing: "0.06em",
                paddingLeft: sp.md,
                display: "-webkit-box",
                WebkitLineClamp: 5,
                WebkitBoxOrient: "vertical" as const,
                overflow: "hidden",
              }}
            >
              {pullQuote}
            </p>
          </div>
          <div className={`flex items-center gap-[${sp.xs}]`}>
            <div className={`w-[${sp.md}] h-px bg-[${warmA}]/30 shrink-0`} />
            <span className={`text-[${warmA}]/60 uppercase tracking-[0.15em]`} style={{ fontSize: "clamp(8px, 2.5cqi, 10px)" }}>{fiber.name}</span>
          </div>
        </div>
        <div className={`shrink-0 h-[${sp.xl}]`}>
          <ExpandAffordance />
        </div>
      </div>
    );
  }

  /* Limit to 2 quotes max in card view to prevent overflow */
  const visibleQuotes = quotes.slice(0, 2);

  return (
    <div className={`h-full flex flex-col ${pad}`}>
      <span className={`text-[${warmA}]/20 shrink-0`} style={{ fontSize: "clamp(18px, 8cqi, 36px)", fontFamily: "'PICA', 'Pica', serif", lineHeight: 0.7 }}>&ldquo;</span>
      <div className={`flex-1 min-h-0 flex flex-col justify-center gap-[${sp.sm}] pt-[${sp.xs}]`}>
        {visibleQuotes.map((q, i) => (
          <div key={i} className={`flex flex-col gap-[${sp.xs}]`}>
            <div className="relative">
              <div aria-hidden="true" className={`absolute inset-0 border-l-[1.667px] border-[${warmA}]/40 pointer-events-none`} />
              <p
                className={`${T.primary} detail-prose`}
                style={{
                  fontSize: "clamp(13px, 4.2cqi, 18px)",
                  lineHeight: 1.5,
                  fontFamily: "'Pica', serif",
                  letterSpacing: "0.06em",
                  paddingLeft: sp.sm,
                  display: "-webkit-box",
                  WebkitLineClamp: visibleQuotes.length > 1 ? 3 : 5,
                  WebkitBoxOrient: "vertical" as const,
                  overflow: "hidden",
                }}
              >
                {q.text}
              </p>
            </div>
            <div className={`flex items-center gap-[${sp.xs}]`}>
              <div className={`w-[${sp.md}] h-px bg-[${warmA}]/30 shrink-0`} />
              <span className={`text-[${warmA}]/60 uppercase tracking-[0.15em]`} style={{ fontSize: "clamp(8px, 2.2cqi, 10px)" }}>
                {q.attribution}
              </span>
            </div>
            {i < visibleQuotes.length - 1 && (
              <div className="w-[clamp(20px,8cqi,48px)] h-px bg-white/[0.06] mx-auto mt-[clamp(2px,1cqi,4px)]" />
            )}
          </div>
        ))}
      </div>
      <div className={`shrink-0 h-[${sp.xl}]`}>
        <ExpandAffordance />
      </div>
    </div>
  );
}

/* ═══ 3 ─ REGIONS (Discovery — neutral accent) ═══ */
export function RegionsPlate({ fiber }: { fiber: FiberProfile }) {
  const regions = useMemo(
    () => fiber.regions.map((region) => region.trim()).filter(Boolean),
    [fiber.regions],
  );
  const dots = useMemo(() => resolveRegionDots(regions.join(", ")), [regions]);
  const [hoveredChipIndex, setHoveredChipIndex] = useState<number | null>(null);
  const [hoveredDotIndex, setHoveredDotIndex] = useState<number | null>(null);

  const normalizeRegion = (region: string) => region.replace(/\s*\(.*?\)\s*$/, "").trim().toLowerCase();

  const chipToDotIndex = useMemo(
    () =>
      regions.map((region) => dots.findIndex((dot) => normalizeRegion(dot.label) === normalizeRegion(region))),
    [regions, dots],
  );

  const dotToChipIndex = useMemo(
    () => dots.map((dot) => regions.findIndex((region) => normalizeRegion(dot.label) === normalizeRegion(region))),
    [dots, regions],
  );

  const highlightIndex =
    hoveredChipIndex !== null
      ? chipToDotIndex[hoveredChipIndex] >= 0
        ? chipToDotIndex[hoveredChipIndex]
        : null
      : hoveredDotIndex;

  const activeChipIndex =
    hoveredChipIndex !== null
      ? hoveredChipIndex
      : hoveredDotIndex !== null && dotToChipIndex[hoveredDotIndex] >= 0
        ? dotToChipIndex[hoveredDotIndex]
        : null;

  return (
    <div className={`h-full flex flex-col ${pad}`}>
      <SectionLabel icon={MapPin}>Regions</SectionLabel>
      <div className="flex-1 flex items-center justify-center">
        <InteractiveWorldMap dots={dots} highlightIndex={highlightIndex} onHoverDot={setHoveredDotIndex} />
      </div>
      <div className={`mt-[${sp.xs}] flex flex-wrap gap-[${sp.xs}]`}>
        {regions.map((region, index) => {
          const isActive = activeChipIndex === index;
          return (
            <button
              key={`${region}-${index}`}
              type="button"
              className={`px-[clamp(6px,2cqi,10px)] py-[clamp(2px,0.8cqi,5px)] rounded-full border transition-colors duration-200 ${
                isActive
                  ? `border-[${neutA}]/70 bg-[${neutA}]/16 text-white/92`
                  : "border-white/[0.12] bg-white/[0.03] text-white/[0.62] hover:text-white/[0.86]"
              }`}
              style={{ fontSize: "clamp(9px, 2.8cqi, 11px)", letterSpacing: "0.04em" }}
              onMouseEnter={() => setHoveredChipIndex(index)}
              onMouseLeave={() => setHoveredChipIndex(null)}
              onFocus={() => setHoveredChipIndex(index)}
              onBlur={() => setHoveredChipIndex(null)}
            >
              {region}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══ 4 ─ SOURCE & TRADE (Data — cool accent, amber icon) ═══ */
export function TradePlate({ fiber }: { fiber: FiberProfile }) {
  const rows: DataRowItem[] = [
    { icon: DollarSign, label: "Cost Range", value: fiber.priceRange.raw },
    { icon: Package, label: "Typical MOQ", value: `${fiber.typicalMOQ.quantity} ${fiber.typicalMOQ.unit.toUpperCase()}` },
    { icon: Clock, label: "Lead Time", value: `${fiber.leadTime.minWeeks}–${fiber.leadTime.maxWeeks} Weeks` },
    { icon: CalendarDays, label: "Season", value: fiber.seasonality },
  ];
  return (
    <div className={`h-full flex flex-col ${pad}`}>
      <SectionLabel icon={DollarSign} iconColor={plateIcon.trade}>Source &amp; Trade</SectionLabel>
      <StackedDataRows rows={rows} accentHex={coolA} />
    </div>
  );
}

/* ═══ 4b ─ WORLD NAMES (Discovery — neutral accent) ═══ */

function parseWorldName(raw: string): { native: string; romanized: string | null } {
  const match = raw.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (match) return { native: match[1].trim(), romanized: match[2].trim() };
  return { native: raw.trim(), romanized: null };
}

const LANG_CODE_TO_NAME: Record<string, string> = {
  ja: "Japanese", ko: "Korean", zh: "Chinese (Mandarin)", "zh-Hans": "Chinese (Mandarin)", "zh-Hant": "Chinese (Mandarin)", yue: "Cantonese",
  hi: "Hindi / Sanskrit", ru: "Russian", ar: "Arabic", fa: "Persian (Farsi)", es: "Spanish", en: "English", fr: "French", qu: "Quechua",
  bn: "Bengali", te: "Telugu", th: "Thai", pt: "Portuguese", vi: "Vietnamese", de: "German", sv: "Swedish",
  ro: "Romanian", cs: "Czech", tr: "Turkish", nl: "Dutch", fi: "Finnish", da: "Danish",
  it: "Italian", la: "Latin", id: "Indonesian", bo: "Tibetan",
};

function detectLangTag(native: string, romanized: string | null): string | null {
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(native)) return "ja";
  if (/[\uAC00-\uD7AF]/.test(native)) return "ko";
  if (/[\u4E00-\u9FFF\u3400-\u4DBF]/.test(native)) {
    if (romanized && /[zcs]h|q|x/i.test(romanized) && /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/i.test(romanized)) return /[\u4E9F\u570B\u7D72\u7D79\u7DB5\u9ECF\u7121\u9EC4\u70CF\u7E3D\u7D93\u7DAD\u7D44\u7E2B\u7E8C\u7E54]/.test(native) ? "zh-Hant" : "zh-Hans";
    if (romanized && /[āáǎàēéěèīíǐìóòǒúùǔǖǘǚǜü]/i.test(romanized)) return /[\u4E9F\u570B\u7D72\u7D79\u7DB5\u9ECF\u7121\u9EC4\u70CF\u7E3D\u7D93\u7DAD\u7D44\u7E2B\u7E8C\u7E54]/.test(native) ? "zh-Hant" : "zh-Hans";
    if (romanized && /[\u016b\u014d]/i.test(romanized)) return "ja";
    if (romanized && /(?:oe|eoi|eon|eot|eung)(?![a-z])|(?:^|\s)[a-z]*[ptkmng](?:\s|$|[^a-z])|(?:^|\s)aa[a-z]*(?:\s|$)/i.test(romanized)) return "yue";
    const isTraditional = /[\u4E9F\u570B\u7D72\u7D79\u7DB5\u9ECF\u7121\u9EC4\u70CF\u7E3D\u7D93\u7DAD\u7D44\u7E2B\u7E8C\u7E54]/.test(native);
    if (romanized && /(?:^|[^a-z])[zch]h|[\u00fc]|[\u0101\u00e1\u01ce\u00e0\u0113\u00e9\u011b\u00e8\u012b\u00ed\u01d0\u00ec\u014d\u00f3\u01d2\u00f2\u016b\u00fa\u01d4\u00f9]/i.test(romanized)) return isTraditional ? "zh-Hant" : "zh-Hans";
    return isTraditional ? "zh-Hant" : "zh-Hans";
  }
  if (/[\u0400-\u04FF]/.test(native)) return "ru";
  if (/[\u0900-\u097F]/.test(native)) return "hi";
  if (/[\u0980-\u09FF]/.test(native)) return "bn";
  if (/[\u0C00-\u0C7F]/.test(native)) return "te";
  if (/[\u0E00-\u0E7F]/.test(native)) return "th";
  if (/[\u0600-\u06FF]/.test(native)) return /[\u067E\u0686\u0698\u06AF\u06A9]/.test(native) ? "fa" : "ar";
  if (/[\u0F00-\u0FFF]/.test(native)) return "bo";
  if (/\u00f1/i.test(native)) return "es";
  if (/\u00e3o|\u00e2n|\u00ea/.test(native)) return "pt";
  if (/(?:Piaçava|Cortiça|Cânhamo)/i.test(native)) return "pt";
  if (/\u1ee5|\u1edd|\u01a1|\u01b0|\u1eaf|\u1ec1/.test(native)) return "vi";
  if (/^(?:Pamuk|Çivit|Zerdeçal|Kök Boya|Yün)$/i.test(native)) return "tr";
  if (/\u00f6|\u00fc|\u00e4/.test(native) && !/\u0151|\u0171/.test(native)) return "de";
  if (/\u00f8|\u00e5/.test(native)) return "sv";
  if (/\u0103|\u0219|\u021b/.test(native)) return "ro";
  if (/\u00ed|\u010d|\u0159|\u017e/.test(native)) return "cs";
  if (/\u0153|(?:^(?:Chanvre|Lin|Soie|Fibre|Bambou|Coton|Fromager|Laine|Liège|Mérinos|Asclépiade|Herbe|Éponge|Écorce|Pelure|Teinture|Vétiver|Alpaga|Cachemire|Mohair|Vicuña|Poil|Crin|Roseau|Sparte|Vacoa|Garance|Pastel|Guède|Gaude|Roucou|Campêche|Réséda))/i.test(native)) return "fr";
  if (/\u0130|\u015f|\u00e7/.test(native) && !/(?:Piaçava|Cortiça)/i.test(native)) return "tr";
  if (/^(?:Hennep|Vlas)$/i.test(native)) return "nl";
  if (/^(?:Pellava|Hamppu)$/i.test(native)) return "fi";
  if (/^(?:H\u00f8r|Ull)$/i.test(native)) return "da";
  if (/^(?:Lana|Seta|Ramia|Iuta|Lino|Raphia|Ceiba)$/i.test(native)) return "it";
  if (/^(?:Fibra|Yute|Corcho|Ortiga|Seda|Cabuya|Pita|Caña|Hierba|Estropajo|Cachemira|Cempasúchil|Índigo)/i.test(native)) return "es";
  if (/de\s+(?:Coco|Banana|Llama|Fique|Palmier|Agave|Maguey|Campeche|Camello)/i.test(native)) return "es";
  if (/(?:faser|wolle|stoff|baumwolle|seegras|halfagras|mariengras|palmfaser|schilf|modalfaser|bambus|kork|brennnessel|seidenpflanze|ananas-faser|agavenfaser|bananenfaser|yakwolle|bisonfaser|qiviut-faser|raffiabast|merinowolle|koridēru|ranbuie|schwarznuss|eisenoxid|studentenblume|mädchenauge|teefärbung|zwiebelschale|blutwurzel|pilzfärbung|sonnenfärbung)(?:\s|$|-)/i.test(native)) return "de";
  if (/^(?:Hanf|Leinen|Seide|Wolle|Kork|Bambus|Brennnessel|Kokosfaser|Manilahanf|Ananas-Faser|Lyocell-Faser|Modalfaser|Yakwolle|Bisonfaser|Seegras|Schraubenpalme|Palmfaser|Seerosenfaser|Agavenfaser|Bananenfaser|Neuseelandflachs|Feigenrindenstoff|Sonnenhanf|Tigerfaser|Vicuñafaser)/i.test(native)) return "de";
  if (/^(?:Randu)$/i.test(native)) return "id";
  if (/^(?:Wik'uña|Q'aytu|Wichuña|Chumpi|Away|Llamk'a|Rumi|Pacha|Q'ero|Qarwa|Paco|Utku|Utcu|Millma|Millwa|Kanab)/i.test(native)) return "qu";
  if (/^(?:China Grass|Manila Hemp|Buffalo Fiber|Angora Goat Fiber|Musk Ox Down|Llama Fiber|Sisal Blanco|Churro Wool|Lana Churro|Navajo Sheep Fiber|Himalayan Nettle|Himalayan Paper|Sedge Grass|New Zealand Flax|Bowstring Hemp|Snake Plant Fiber|Bhabar Grass|Bromeliad Fiber|Chambira Palm|Tucuma Fiber|Red Cotton Tree|Silk Cotton|Daphne Bark Fiber|Java Jute|Bissap Fiber|Karkadé Fiber|Bahia Piassava|Moriche Palm|Mauritia Fiber|Dyer's Rocket|Indigo \(Indigofera\)|Pineapple Leaf|Pineapple Fiber|Piña Fiber|Yak Fiber|Yak Wool|Banana Fiber|Banana Leaf Fiber|Camel Hair|Camel Wool)/i.test(native)) return "en";
  if (/^[A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(native) || /^(?:Agave|Musa|Hibiscus|Stipa|Lepironia|Phragmites|Girardinia|Eulaliopsis|Vetiveria|Ananas|Phormium|Crotalaria|Asclepias|Maclura)/i.test(native)) return "la";
  return "en";
}

export function WorldNamesPlate({ fiber }: { fiber: FiberProfile }) {
  const allNames = dataSource.getWorldNames()[fiber.id] ?? [];
  const names = allNames.slice(1);
  const parsed = names.map((raw) => {
    const p = parseWorldName(raw);
    const tag = detectLangTag(p.native, p.romanized);
    return { ...p, tag };
  });

  if (names.length === 0) return null;

  return (
    <div className="h-full flex flex-col" style={{ padding: sp.lg }}>
      <SectionLabel icon={Globe2}>World Names</SectionLabel>
      <div className={`flex-1 flex flex-col justify-center gap-[${sp.sm}] overflow-hidden`}>
        {parsed.map((entry, i) => (
          <div key={names[i]} className={`flex items-baseline gap-[${sp.sm}] min-w-0`}>
            <span className={`${T.primary} flex-1 min-w-0`} style={{ fontSize: "clamp(13px, 5.5cqi, 24px)", lineHeight: 1.3, letterSpacing: "0.03em" }}>
              {entry.native}
              {entry.romanized && (
                <span className={`${T.muted}`} style={{ fontSize: "clamp(8px, 2.8cqi, 11px)", letterSpacing: "0.04em" }}>
                  {" "}({entry.romanized})
                </span>
              )}
            </span>
            {entry.tag && (
              <>
                <span className={`w-[${sp.md}] h-px bg-white/[${ink.ghost}] flex-shrink-0 self-center`} />
                <span className={`text-[${neutA}]/40 flex-shrink-0 tracking-[0.04em]`} style={{ fontSize: "clamp(9px, 2.8cqi, 12px)", fontWeight: 600 }}>
                  {LANG_CODE_TO_NAME[entry.tag] ?? entry.tag}
                </span>
              </>
            )}
          </div>
        ))}
      </div>
      <div className={`flex items-center gap-[${sp.xs}] mt-[${sp.sm}]`}>
        <div className={`w-[${sp.lg}] h-px bg-[${neutA}]/25`} />
        <span className={`${T.muted} tracking-[0.12em]`} style={{ fontSize: "clamp(7px, 2.5cqi, 10px)" }}>
          {fiber.profilePills.origin}
        </span>
      </div>
    </div>
  );
}

/* ═══ 5 ─ SUSTAINABILITY (Discovery — neutral accent) ═══ */
export function SustainabilityPlate({ fiber }: { fiber: FiberProfile }) {
  const s = fiber.sustainability;
  const metrics = getSustainabilityMetrics(s);
  /* Key metrics for compact card view — full set available in ScreenPlate */
  const keyRatings: { icon: typeof Droplets; label: string; value: number; iconColor: string }[] = [
    { icon: Droplets, label: "Water", value: s.waterUsage, iconColor: "text-blue-400/80" },
    { icon: Leaf, label: "Carbon", value: s.carbonFootprint, iconColor: "text-green-400/80" },
    { icon: Recycle, label: "Circular", value: s.circularity, iconColor: "text-emerald-400/80" },
  ];
  return (
    <div className={`h-full flex flex-col ${pad}`}>
      <SectionLabel icon={Leaf}>Sustainability</SectionLabel>
      <div className="flex-1 flex items-center justify-center min-h-0" style={{ maxHeight: "45%" }}>
        <SustainabilityRadar values={metrics} showValues />
      </div>
      <div className={`flex flex-col gap-[clamp(3px,1cqi,6px)] mt-[${sp.xs}]`}>
        {keyRatings.map((r) => (
          <RatingRow key={r.label} icon={r.icon} label={r.label} value={r.value} iconColor={r.iconColor} />
        ))}
      </div>
      <div className={`flex flex-wrap gap-[${sp.xs}] mt-[${sp.xs}]`}>
        {s.biodegradable && <span className="px-[clamp(4px,1.5cqi,8px)] py-[clamp(1px,0.4cqi,3px)] rounded-full bg-green-500/10 border border-green-500/20 text-green-400/80" style={tagFs}>Biodegradable</span>}
        {s.recyclable && <span className="px-[clamp(4px,1.5cqi,8px)] py-[clamp(1px,0.4cqi,3px)] rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400/80" style={tagFs}>Recyclable</span>}
        {s.certifications.slice(0, 2).map((c) => (
          <span key={c} className={`px-[clamp(4px,1.5cqi,8px)] py-[clamp(1px,0.4cqi,3px)] rounded-full bg-white/[0.04] border ${B.ghost} ${T.tertiary}`} style={tagFs}>{c}</span>
        ))}
      </div>
    </div>
  );
}

/* ═══ 6 ─ SEE ALSO (Discovery — neutral accent) ═══ */
export function SeeAlsoPlate({ fiber, onSelect }: { fiber: FiberProfile; onSelect: (id: string) => void }) {
  const related = fiber.seeAlso
    .map((s) => dataSource.getFiberById(s.id))
    .filter(Boolean) as FiberProfile[];

  return (
    <div className={`h-full flex flex-col ${pad}`}>
      <SectionLabel icon={Link2}>See Also</SectionLabel>
      <div className={`flex-1 flex flex-col justify-center gap-[${sp.sm}]`}>
        {related.map((r) => (
          <button
            key={r.id}
            className={`flex items-center gap-[${sp.sm}] text-left cursor-pointer group/see-also`}
            onClick={() => onSelect(r.id)}
          >
            <div className="w-[clamp(28px,12cqi,48px)] h-[clamp(28px,12cqi,48px)] rounded-lg overflow-hidden flex-shrink-0 border border-white/[0.12]">
              <ProgressiveImage src={r.image} preset="seeAlso" alt={r.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <span className={`${T.primary} uppercase tracking-[0.1em] block truncate group-hover/see-also:text-white transition-colors`} style={{ fontSize: "clamp(10px, 3.5cqi, 14px)", fontWeight: 500 }}>{r.name}</span>
              <span className={`${T.muted} block truncate`} style={{ fontSize: "clamp(9px, 2.8cqi, 12px)" }}>{r.subtitle}</span>
            </div>
            <ArrowRight size={12} className={`${T.muted} flex-shrink-0 group-hover/see-also:text-white/[0.48] transition-colors`} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══ 7 ─ CONTACT SHEET ═══ */

export function ContactSheetPlate({
  images,
  fiberName,
  onOpenAt,
}: {
  images: GalleryImageEntry[];
  fiberName: string;
  onOpenAt?: (imageIndex: number, sourceRect?: DOMRect) => void;
}) {
  const pipeline = useImagePipeline();

  const prefetchLightbox = useCallback((url: string) => {
    const lightboxUrl = pipeline.transform(url, "lightbox");
    if (!lightboxUrl) return;
    const img = new Image();
    img.src = lightboxUrl;
  }, [pipeline]);

  const resolveFilmstripIndex = useCallback((root: HTMLElement, button: HTMLButtonElement): number => {
    const filmstrip = button.closest("ul");
    if (!filmstrip || !root.contains(filmstrip)) return -1;
    const buttons = filmstrip.querySelectorAll<HTMLButtonElement>("button");
    return Array.from(buttons).indexOf(button);
  }, []);

  return (
    <div
      className="h-full w-full overflow-hidden"
      onPointerEnterCapture={(event) => {
        const target = event.target as HTMLElement | null;
        const button = target?.closest("button");
        if (!button || !(button instanceof HTMLButtonElement)) return;
        const index = resolveFilmstripIndex(event.currentTarget, button);
        if (index < 0) return;
        const image = images[index];
        if (!image) return;
        prefetchLightbox(image.url);
      }}
    >
      <ProfileImageExperience
        fiberName={fiberName}
        images={images}
        onFilmstripActivate={(imageIndex, button) => {
          if (!onOpenAt) return;
          onOpenAt(imageIndex, button.getBoundingClientRect());
        }}
      />
    </div>
  );
}

/* ═══ 8 ─ PROCESS (Discovery — neutral accent) ═══ */
export function ProcessPlate({ fiber }: { fiber: FiberProfile }) {
  const steps = dataSource.getProcessData()[fiber.id] ?? [];
  if (steps.length === 0) return null;
  /* Cap visible steps to 4 in card view to prevent overflow */
  const maxSteps = 4;
  const visible = steps.slice(0, maxSteps);
  const overflow = steps.length - maxSteps;
  return (
    <div className={`h-full flex flex-col ${pad}`}>
      <SectionLabel icon={Layers}>Process</SectionLabel>
      <div className={`flex-1 flex flex-col justify-center gap-[clamp(2px,0.6cqi,5px)]`}>
        {visible.map((step, i) => (
          <div key={step.name} className={`flex gap-[${sp.sm}]`}>
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-[${sp.lg}] h-[${sp.lg}] rounded-full bg-[${neutA}]/10 border border-[${neutA}]/25 flex items-center justify-center`}>
                <span className={`text-[${neutA}]/70`} style={{ fontSize: "clamp(8px, 2.5cqi, 11px)", fontWeight: 700 }}>{i + 1}</span>
              </div>
              {i < visible.length - 1 && <div className={`flex-1 w-px bg-white/[${ink.ghost}] my-[clamp(1px,0.4cqi,3px)]`} />}
            </div>
            <div className={`pb-[clamp(2px,0.6cqi,5px)] min-w-0`}>
              <span className={`${T.primary} block truncate`} style={{ fontSize: "clamp(10px, 3.2cqi, 13px)", fontWeight: 600 }}>{step.name}</span>
              <span
                className={`${T.tertiary} block`}
                style={{
                  fontSize: "clamp(9px, 2.8cqi, 12px)",
                  lineHeight: 1.35,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical" as const,
                  overflow: "hidden",
                }}
              >
                {step.detail}
              </span>
            </div>
          </div>
        ))}
        {overflow > 0 && (
          <div className={`flex items-center gap-[${sp.xs}] mt-[clamp(1px,0.4cqi,3px)]`}>
            <Expand size={10} className={T.muted} style={{ opacity: 0.7 }} />
            <span className={T.muted} style={{ fontSize: "clamp(8px, 2.5cqi, 10px)" }}>+{overflow} more</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══ 9 ─ ANATOMY (Data — cool accent, steel-blue icon) ═══ */
export function AnatomyPlate({ fiber }: { fiber: FiberProfile }) {
  const data = dataSource.getAnatomyData()[fiber.id];
  if (!data) return null;
  const metricValue = (value: unknown): string => {
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && "raw" in value) {
      const raw = (value as { raw?: unknown }).raw;
      return typeof raw === "string" ? raw : "";
    }
    return String(value ?? "");
  };
  const allRows: DataRowItem[] = [
    { icon: Dna, label: "Diameter", value: metricValue(data.diameter) },
    { icon: Layers, label: "Cross Section", value: data.crossSection },
    { icon: Microscope, label: "Surface", value: data.surfaceTexture },
    { icon: Flame, label: "Tensile Str.", value: metricValue(data.tensileStrength) },
    { icon: Droplets, label: "Moisture", value: metricValue(data.moistureRegain) },
    { icon: Scissors, label: "Staple Len.", value: metricValue(data.length) },
  ];
  const visibleRows = allRows.slice(0, 4);
  const hiddenCount = Math.max(0, allRows.length - visibleRows.length);
  return (
    <div className={`h-full flex flex-col ${pad}`}>
      <SectionLabel icon={Dna} iconColor={plateIcon.anatomy}>Anatomy</SectionLabel>
      <StackedDataRows rows={visibleRows} accentHex={coolA} />
      {hiddenCount > 0 && (
        <div className={`flex items-center justify-between pt-[${sp.xs}]`}>
          <span className={T.muted} style={{ fontSize: "clamp(8px, 2.6cqi, 10px)" }}>
            +{hiddenCount} additional metrics
          </span>
          <span className={T.muted} style={{ fontSize: "clamp(8px, 2.6cqi, 10px)" }}>
            Open expanded view
          </span>
        </div>
      )}
    </div>
  );
}

/* ═══ 10 ─ CARE (Data — cool accent, lavender icon) ═══ */
export function CarePlate({ fiber }: { fiber: FiberProfile }) {
  const data = dataSource.getCareData()[fiber.id];
  if (!data) return null;
  const allRows: DataRowItem[] = [
    { icon: WashingMachine, label: "Wash", value: data.washTemp },
    { icon: Sun, label: "Dry", value: data.dryMethod },
    { icon: Thermometer, label: "Iron", value: data.ironTemp },
    { icon: ShieldCheck, label: "Note", value: data.specialNotes },
  ];
  const visibleRows = allRows.slice(0, 3);
  const hiddenCount = Math.max(0, allRows.length - visibleRows.length);
  return (
    <div className={`h-full flex flex-col ${pad}`}>
      <SectionLabel icon={Shirt} iconColor={plateIcon.care}>Care &amp; Use</SectionLabel>
      <StackedDataRows rows={visibleRows} accentHex={coolA} />
      {hiddenCount > 0 && (
        <div className={`flex items-center justify-between pt-[${sp.xs}]`}>
          <span className={T.muted} style={{ fontSize: "clamp(8px, 2.6cqi, 10px)" }}>
            +{hiddenCount} care detail
          </span>
          <span className={T.muted} style={{ fontSize: "clamp(8px, 2.6cqi, 10px)" }}>
            Open expanded view
          </span>
        </div>
      )}
    </div>
  );
}