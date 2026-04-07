/**
 * plate-preview-panel.tsx — Live preview of every detail-card for a fiber.
 *
 * Renders the actual plate components (About, Insight, Trade, etc.) in
 * miniature frosted-glass cards with edit/delete controls. Uses the same
 * getAvailablePlates logic as the mobile detail view to determine which
 * plates this fiber qualifies for.
 */

import { useMemo, useCallback, useState } from "react";
import { type FiberProfile, type PlateType, withMergedGalleryImages } from "../../data/atlas-data";
import { dataSource } from "../../data/data-provider";
import {
  AboutPlate,
  PropertiesPlate,
  InsightPlate,
  SilkVariantPlate,
  RegionsPlate,
  TradePlate,
  WorldNamesPlate,
  SeeAlsoPlate,
  QuotePlate,
  ContactSheetPlate,
  ProcessPlate,
  AnatomyPlate,
  CarePlate,
  YouTubeEmbedPlate,
} from "../detail-plates";
import {
  Pencil,
  Eye,
  EyeOff,
  Layers,
  Lightbulb,
  MapPin,
  DollarSign,
  Globe2,
  Link2,
  Quote,
  Dna,
  Shirt,
  Image as ImageIcon,
  ChevronDown,
  ChevronRight,
  Info,
  BookOpen,
  LayoutGrid,
  Youtube,
} from "lucide-react";
import { hasAnyValidYoutubeEmbed } from "../../utils/youtube-embed-urls";

/* ── Plate metadata for display ── */
const PLATE_META: Record<PlateType, {
  label: string;
  icon: typeof Layers;
  color: string;
  editorSection?: string;
}> = {
  about: { label: "Identity", icon: Layers, color: "text-blue-300/65", editorSection: "About" },
  properties: { label: "Properties", icon: LayoutGrid, color: "text-blue-300/65", editorSection: "About" },
  insight1: { label: "Insight — Origins", icon: Lightbulb, color: "text-[#5D9A6D]/70", editorSection: "About" },
  insight2: { label: "Insight — Depth", icon: BookOpen, color: "text-[#5D9A6D]/70", editorSection: "About" },
  insight3: { label: "Insight — Context", icon: BookOpen, color: "text-[#5D9A6D]/70", editorSection: "About" },
  silkCharmeuse: { label: "Silk Type — Charmeuse", icon: Layers, color: "text-blue-300/60", editorSection: "About" },
  silkHabotai: { label: "Silk Type — Habotai", icon: Layers, color: "text-blue-300/60", editorSection: "About" },
  silkDupioni: { label: "Silk Type — Dupioni", icon: Layers, color: "text-blue-300/60", editorSection: "About" },
  silkTaffeta: { label: "Silk Type — Taffeta", icon: Layers, color: "text-blue-300/60", editorSection: "About" },
  silkChiffon: { label: "Silk Type — Chiffon", icon: Layers, color: "text-blue-300/60", editorSection: "About" },
  silkOrganza: { label: "Silk Type — Organza", icon: Layers, color: "text-blue-300/60", editorSection: "About" },
  quote: { label: "Quote", icon: Quote, color: "text-blue-300/60", editorSection: "Quotes" },
  youtubeEmbed: { label: "Video (YouTube)", icon: Youtube, color: "text-red-400/50", editorSection: "Video (YouTube)" },
  trade: { label: "Source & Trade", icon: DollarSign, color: "text-blue-400/60", editorSection: "Trade Details" },
  regions: { label: "Regions", icon: MapPin, color: "text-blue-400/65", editorSection: "Trade Details" },
  worldNames: { label: "World Names", icon: Globe2, color: "text-blue-300/60", editorSection: "World Names" },
  process: { label: "Process", icon: Layers, color: "text-blue-300/60", editorSection: "Process Steps" },
  anatomy: { label: "Anatomy", icon: Dna, color: "text-blue-300/60", editorSection: "Anatomy" },
  care: { label: "Care & Use", icon: Shirt, color: "text-blue-300/60", editorSection: "Care & Use" },
  seeAlso: { label: "See Also", icon: Link2, color: "text-blue-300/70", editorSection: "See Also" },
  contactSheet: { label: "Contact Sheet", icon: ImageIcon, color: "text-blue-300/70", editorSection: "Gallery" },
};

/* ── Full plate order ── */
const ALL_PLATES: PlateType[] = [
  "about",
  "properties",
  "insight1",
  "insight2",
  "insight3",
  "silkCharmeuse",
  "silkHabotai",
  "silkDupioni",
  "silkTaffeta",
  "silkChiffon",
  "silkOrganza",
  "quote",
  "youtubeEmbed",
  "trade",
  "regions",
  "worldNames",
  "process",
  "anatomy",
  "care",
  "seeAlso",
  "contactSheet",
];

/* ── Determine which plates this fiber qualifies for ── */
function getAvailablePlates(fiber: FiberProfile): PlateType[] {
  const processData = dataSource.getProcessData();
  const anatomyData = dataSource.getAnatomyData();
  const careData = dataSource.getCareData();
  const quoteData = dataSource.getQuoteData();
  const wn = dataSource.getWorldNames();

  return ALL_PLATES.filter((pt) => {
    switch (pt) {
      case "worldNames": {
        const names = wn[fiber.id];
        return names && names.length > 1;
      }
      case "process":
        return (processData[fiber.id] ?? []).length > 0;
      case "anatomy":
        return !!anatomyData[fiber.id];
      case "care":
        return !!careData[fiber.id];
      case "quote":
        return (quoteData[fiber.id] ?? []).length > 0;
      case "youtubeEmbed":
        return hasAnyValidYoutubeEmbed(fiber);
      case "insight1":
      case "insight2":
      case "insight3": {
        const sentences = fiber.about?.match(/[^.!?]+[.!?]+/g) ?? [];
        if (pt === "insight3") return sentences.length >= 3;
        return sentences.length >= 2;
      }
      case "silkCharmeuse":
      case "silkHabotai":
      case "silkDupioni":
      case "silkTaffeta":
      case "silkChiffon":
      case "silkOrganza":
        return fiber.id === "silk";
      case "seeAlso":
        return fiber.seeAlso.length > 0;
      case "contactSheet":
        return (fiber.galleryImages ?? []).length > 0;
      default:
        return true;
    }
  });
}

/* ── Missing plates (the ones this fiber doesn't qualify for) ── */
function getMissingPlates(fiber: FiberProfile): PlateType[] {
  const available = new Set(getAvailablePlates(fiber));
  return ALL_PLATES.filter((pt) => !available.has(pt));
}

/* ── Render a plate component in a preview container ── */
function PlateRenderer({ fiber, plateType }: { fiber: FiberProfile; plateType: PlateType }) {
  switch (plateType) {
    case "about":
      return <AboutPlate fiber={fiber} />;
    case "properties":
      return <PropertiesPlate fiber={fiber} />;
    case "insight1":
      return <InsightPlate fiber={fiber} half={1} />;
    case "insight2":
      return <InsightPlate fiber={fiber} half={2} />;
    case "insight3":
      return <InsightPlate fiber={fiber} half={3} />;
    case "silkCharmeuse":
    case "silkHabotai":
    case "silkDupioni":
    case "silkTaffeta":
    case "silkChiffon":
    case "silkOrganza":
      return <SilkVariantPlate plateType={plateType} />;
    case "quote":
      return <QuotePlate fiber={fiber} />;
    case "youtubeEmbed":
      return <YouTubeEmbedPlate fiber={fiber} />;
    case "regions":
      return <RegionsPlate fiber={fiber} />;
    case "trade":
      return <TradePlate fiber={fiber} />;
    case "worldNames":
      return <WorldNamesPlate fiber={fiber} />;
    case "process":
      return <ProcessPlate fiber={fiber} />;
    case "anatomy":
      return <AnatomyPlate fiber={fiber} />;
    case "care":
      return <CarePlate fiber={fiber} />;
    case "seeAlso":
      return <SeeAlsoPlate fiber={fiber} onSelect={() => {}} />;
    case "contactSheet":
      return (
        <ContactSheetPlate
          images={fiber.galleryImages ?? []}
          fiberName={fiber.name}
        />
      );
    default:
      return null;
  }
}

/* ═══════════════════════════════════════════════════════════
   Single plate preview card
   ═══════════════════════════════════════════════════════════ */

function PlatePreviewCard({
  fiber,
  plateType,
  isHidden,
  onToggleHide,
  onEdit,
}: {
  fiber: FiberProfile;
  plateType: PlateType;
  isHidden: boolean;
  onToggleHide: () => void;
  onEdit: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const meta = PLATE_META[plateType];

  return (
    <div
      className={`rounded-xl overflow-hidden border transition-opacity ${
        isHidden
          ? "border-white/[0.03] opacity-40"
          : "border-white/[0.08]"
      }`}
    >
      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.02]">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-white/25 hover:text-white/50 cursor-pointer"
        >
          {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </button>
        <meta.icon size={11} className={meta.color} />
        <span className="text-white/60 flex-1 truncate" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {meta.label}
        </span>

        {/* Insight explanation */}
        {(plateType === "insight1" || plateType === "insight2" || plateType === "insight3") && (
          <span
            className="px-1.5 py-0.5 rounded bg-blue-400/[0.07] border border-blue-400/15 text-blue-300/70"
            style={{ fontSize: "8px" }}
            title="Each Insight card shows a short pull-quote from a segment of About; the full narrative is on Identity."
          >
            auto
          </span>
        )}

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={onToggleHide}
            className={`p-1 rounded cursor-pointer transition-colors ${
              isHidden
                ? "text-white/20 hover:text-white/50"
                : "text-white/30 hover:text-white/60"
            }`}
            title={isHidden ? "Show plate" : "Hide plate"}
          >
            {isHidden ? <EyeOff size={11} /> : <Eye size={11} />}
          </button>
          <button
            onClick={onEdit}
            className="p-1 rounded text-blue-300/55 hover:text-blue-300/85 cursor-pointer transition-colors"
            title={`Edit ${meta.label} data`}
          >
            <Pencil size={11} />
          </button>
        </div>
      </div>

      {/* Plate render */}
      {expanded && !isHidden && (
        <div
          className="relative bg-[#121212] overflow-hidden"
          style={{ containerType: "inline-size" }}
        >
          {/* Frosted glass effect approximation */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: fiber.image ? `url(${fiber.image})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(40px) saturate(0.5)",
            }}
          />
          <div className="absolute inset-0 bg-[#121212]/80" />

          {/* Actual plate content */}
          <div className="relative z-10" style={{ minHeight: plateType === "contactSheet" ? 180 : 140 }}>
            <PlateRenderer fiber={fiber} plateType={plateType} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main Panel
   ═══════════════════════════════════════════════════════════ */

interface PlatePreviewPanelProps {
  fiber: FiberProfile;
  onScrollToEditorSection?: (section: string) => void;
}

export function PlatePreviewPanel({ fiber, onScrollToEditorSection }: PlatePreviewPanelProps) {
  const [hiddenPlates, setHiddenPlates] = useState<Set<PlateType>>(new Set());

  const fiberForPlates = useMemo(() => withMergedGalleryImages(fiber), [fiber]);

  const availablePlates = useMemo(() => getAvailablePlates(fiberForPlates), [fiberForPlates]);
  const missingPlates = useMemo(() => getMissingPlates(fiberForPlates), [fiberForPlates]);
  const [showMissing, setShowMissing] = useState(false);

  const sentences = useMemo(
    () => fiber.about?.match(/[^.!?]+[.!?]+/g) ?? [],
    [fiber.about],
  );

  const toggleHide = useCallback((pt: PlateType) => {
    setHiddenPlates((prev) => {
      const next = new Set(prev);
      if (next.has(pt)) next.delete(pt);
      else next.add(pt);
      return next;
    });
  }, []);

  const handleEdit = useCallback((pt: PlateType) => {
    const section = PLATE_META[pt]?.editorSection;
    if (section && onScrollToEditorSection) {
      onScrollToEditorSection(section);
    }
  }, [onScrollToEditorSection]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-white/[0.06] shrink-0 flex items-center justify-between">
        <div>
          <span className="text-white/30 uppercase tracking-wider block" style={{ fontSize: "10px", fontWeight: 600 }}>
            Detail Cards
          </span>
          <span className="text-white/15" style={{ fontSize: "9px" }}>
            {availablePlates.length} active · {missingPlates.length} unavailable
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hiddenPlates.size > 0 && (
            <button
              onClick={() => setHiddenPlates(new Set())}
              className="text-white/25 hover:text-white/50 cursor-pointer"
              style={{ fontSize: "9px" }}
            >
              Show all
            </button>
          )}
        </div>
      </div>

      {/* Scrollable plate list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ scrollbarWidth: "none" }}>
        {/* Profile card hero */}
        <div className="rounded-xl overflow-hidden border border-white/[0.08]">
          <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.02]">
            <ImageIcon size={11} className="text-blue-300/65" />
            <span className="text-white/60" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Profile Card
            </span>
          </div>
          {fiber.image && (
            <div className="aspect-[3/4] relative max-h-[200px]">
              <img
                src={fiber.image}
                alt={fiber.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)" }}
              />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <span
                  className="text-white/40 uppercase tracking-widest block mb-0.5"
                  style={{ fontSize: "8px", fontWeight: 600 }}
                >
                  {fiber.category}
                </span>
                <h3
                  className="text-white/90"
                  style={{ fontSize: "14px", fontWeight: 300, lineHeight: 1.2 }}
                >
                  {fiber.name}
                </h3>
                <p className="text-white/40 mt-0.5" style={{ fontSize: "9px", lineHeight: 1.4 }}>
                  {fiber.subtitle}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Insight sourcing info */}
        {sentences.length >= 2 && (
          <div className="rounded-lg px-3 py-2 bg-blue-400/[0.05] border border-blue-400/12">
            <div className="flex items-center gap-1.5 mb-1">
              <Info size={9} className="text-blue-300/60" />
              <span className="text-blue-300/65" style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Insight Source
              </span>
            </div>
            <span className="text-white/30 block" style={{ fontSize: "9px", lineHeight: 1.5 }}>
              {sentences.length} sentences in About text → split into {sentences.length >= 3 ? 3 : 2} insight cards.
              Edit the About field to change insight content.
            </span>
          </div>
        )}

        {/* Active plate cards */}
        {availablePlates.map((pt) => (
          <PlatePreviewCard
            key={pt}
            fiber={fiberForPlates}
            plateType={pt}
            isHidden={hiddenPlates.has(pt)}
            onToggleHide={() => toggleHide(pt)}
            onEdit={() => handleEdit(pt)}
          />
        ))}

        {/* Missing plates section */}
        {missingPlates.length > 0 && (
          <div className="mt-3 pt-2 border-t border-white/[0.04]">
            <button
              onClick={() => setShowMissing(!showMissing)}
              className="flex items-center gap-1.5 text-white/20 hover:text-white/40 cursor-pointer transition-colors"
              style={{ fontSize: "10px" }}
            >
              {showMissing ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              <EyeOff size={10} />
              {missingPlates.length} unavailable plate{missingPlates.length !== 1 ? "s" : ""}
            </button>

            {showMissing && (
              <div className="mt-2 space-y-1">
                {missingPlates.map((pt) => {
                  const meta = PLATE_META[pt];
                  let reason = "";
                  switch (pt) {
                    case "insight1":
                    case "insight2":
                      reason = `About text needs ≥ 2 sentences (has ${sentences.length})`;
                      break;
                    case "insight3":
                      reason = `About text needs ≥ 3 sentences (has ${sentences.length})`;
                      break;
                    case "worldNames":
                      reason = "No world names defined";
                      break;
                    case "process":
                      reason = "No process steps defined";
                      break;
                    case "anatomy":
                      reason = "No anatomy data defined";
                      break;
                    case "care":
                      reason = "No care data defined";
                      break;
                    case "quote":
                      reason = "No quotes defined";
                      break;
                    case "youtubeEmbed":
                      reason = "No valid YouTube URL on the fiber profile";
                      break;
                    case "seeAlso":
                      reason = "No seeAlso references";
                      break;
                    case "contactSheet":
                      reason = "No gallery images";
                      break;
                  }

                  return (
                    <div
                      key={pt}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.01] border border-white/[0.03]"
                    >
                      <meta.icon size={10} className="text-white/15 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-white/25 block" style={{ fontSize: "10px" }}>
                          {meta.label}
                        </span>
                        {reason && (
                          <span className="text-white/15 block" style={{ fontSize: "8px" }}>
                            {reason}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleEdit(pt)}
                        className="p-1 rounded text-white/15 hover:text-white/40 cursor-pointer"
                        title="Add data to enable this plate"
                      >
                        <Pencil size={9} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}