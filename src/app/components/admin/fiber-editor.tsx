/**
 * fiber-editor.tsx — Form for editing a single FiberProfile.
 *
 * Enhanced with:
 *   C1 — Override indicators (amber dots on modified fields, per-field reset)
 *   C3 — Supplementary table editors (Process, Anatomy, Care, Quotes, World Names)
 *   C4 — Contextual constraints (category select, image preview, seeAlso autocomplete,
 *         completeness ring)
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router";
import { useAtlasData } from "../../context/atlas-data-context";
import { type FiberProfile, mergeFiberGalleryWithFallback } from "../../data/atlas-data";
import {
  ChevronDown,
  ChevronRight,
  RotateCcw,
  AlertCircle,
  Check,
  Lightbulb,
  Plus,
  X,
} from "lucide-react";
import { youtubeVideoIdFromUrl } from "../../utils/youtube-embed";
import { getYoutubeEmbedUrlRowsForEdit } from "../../utils/youtube-embed-urls";
import { fibers as bundledFibers } from "../../data/fibers";
import { dataSource } from "../../data/data-provider";
import { ProcessEditor, AnatomyEditor, CareEditor, QuoteEditor, WorldNamesEditor } from "./supplementary-editors";
import { GalleryEditor } from "./gallery-editor";
import { ImageQuickActions } from "./image-quick-actions";
import { getCloudinaryConfig } from "./runtime/cloudinary-upload";
import { uploadFromUrl } from "@/utils/cloudinary";
import { splitAboutText } from "../plate-primitives";
import { insightExcerptFromAboutPart } from "../insight-excerpt";
import { toast } from "sonner";

const DEFAULT_SUSTAINABILITY: FiberProfile["sustainability"] = {
  environmentalRating: 2,
  waterUsage: 2,
  carbonFootprint: 2,
  chemicalProcessing: 2,
  circularity: 3,
  biodegradable: true,
  recyclable: false,
  certifications: [],
};

function withDefaultSustainability(
  sustainability: FiberProfile["sustainability"] | undefined,
): FiberProfile["sustainability"] {
  if (!sustainability) return { ...DEFAULT_SUSTAINABILITY };
  return {
    ...DEFAULT_SUSTAINABILITY,
    ...sustainability,
    certifications: Array.isArray(sustainability.certifications)
      ? sustainability.certifications
      : DEFAULT_SUSTAINABILITY.certifications,
  };
}

/* ── Section collapse helper ── */
function Section({
  title,
  defaultOpen = false,
  badge,
  forceOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  badge?: number;
  forceOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const sectionRef = useRef<HTMLDivElement>(null);

  /* Allow external force-open (e.g. from scroll-to-section event) */
  useEffect(() => {
    if (forceOpen) {
      if (!open) setOpen(true);
      // Scroll into view after opening (or if already open)
      requestAnimationFrame(() => {
        sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [forceOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="border-b border-white/[0.06]" ref={sectionRef} data-section-title={title}>
      <button
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-white/70 hover:text-white/90 transition-colors cursor-pointer"
        onClick={() => setOpen(!open)}
        style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="flex-1">{title}</span>
        {badge !== undefined && badge > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-blue-400/10 text-blue-400/60 border border-blue-400/15" style={{ fontSize: "9px", fontWeight: 700 }}>
            {badge}
          </span>
        )}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   C1 — Override-aware field components
   ══════════════════════════════════════════════════════════ */

function OverrideDot({ isOverridden, bundledValue, onReset }: {
  isOverridden: boolean;
  bundledValue?: unknown;
  onReset: () => void;
}) {
  if (!isOverridden) return null;
  return (
    <span className="relative group/dot inline-flex ml-1.5">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onReset(); }}
        className="w-2 h-2 rounded-full bg-blue-400/60 hover:bg-blue-400 cursor-pointer transition-colors"
        title="Modified — click to reset"
      />
      {bundledValue !== undefined && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-[#1a1a1a] border border-white/[0.1] rounded text-white/50 whitespace-nowrap opacity-0 group-hover/dot:opacity-100 transition-opacity pointer-events-none z-50" style={{ fontSize: "9px" }}>
          Default: {typeof bundledValue === "object" ? JSON.stringify(bundledValue).slice(0, 40) : String(bundledValue)}
        </span>
      )}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  isOverridden,
  bundledValue,
  onReset,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "number";
  placeholder?: string;
  isOverridden?: boolean;
  bundledValue?: unknown;
  onReset?: () => void;
}) {
  return (
    <label className="block">
      <span className="flex items-center text-white/40 mb-1" style={{ fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
        {isOverridden && onReset && (
          <OverrideDot isOverridden bundledValue={bundledValue} onReset={onReset} />
        )}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-2.5 py-1.5 bg-white/[0.04] border rounded-md text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors ${
          isOverridden ? "border-blue-400/15" : "border-white/[0.08]"
        }`}
        style={{ fontSize: "12px" }}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 4,
  isOverridden,
  bundledValue,
  onReset,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  isOverridden?: boolean;
  bundledValue?: unknown;
  onReset?: () => void;
}) {
  return (
    <label className="block">
      <span className="flex items-center text-white/40 mb-1" style={{ fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
        {isOverridden && onReset && (
          <OverrideDot isOverridden bundledValue={bundledValue} onReset={onReset} />
        )}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={`w-full px-2.5 py-1.5 bg-white/[0.04] border rounded-md text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors resize-y ${
          isOverridden ? "border-blue-400/15" : "border-white/[0.08]"
        }`}
        style={{ fontSize: "12px", lineHeight: "1.5" }}
      />
    </label>
  );
}

function TagEditor({
  label,
  tags,
  onChange,
  isOverridden,
  onReset,
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  isOverridden?: boolean;
  onReset?: () => void;
}) {
  const [input, setInput] = useState("");
  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInput("");
    }
  };
  return (
    <div>
      <span className="flex items-center text-white/40 mb-1" style={{ fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
        {isOverridden && onReset && (
          <OverrideDot isOverridden onReset={onReset} />
        )}
      </span>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((tag, i) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/[0.06] border border-white/[0.08] rounded-full text-white/60"
            style={{ fontSize: "10px" }}
          >
            {tag}
            <button
              className="text-white/30 hover:text-white/70 cursor-pointer"
              onClick={() => onChange(tags.filter((_, j) => j !== i))}
            >
              x
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
          placeholder="Add tag..."
          className="flex-1 px-2.5 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-md text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20"
          style={{ fontSize: "12px" }}
        />
        <button
          onClick={addTag}
          className="px-3 py-1.5 bg-white/[0.06] border border-white/[0.08] rounded-md text-white/50 hover:text-white/80 hover:border-white/20 transition-colors cursor-pointer"
          style={{ fontSize: "11px" }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function RatingSlider({
  label,
  value,
  onChange,
  max = 5,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  const clamped = Math.min(Math.max(value, 1), max);
  return (
    <label className="flex items-center gap-3">
      <span
        className="w-36 text-white/40 shrink-0"
        style={{ fontSize: "10px", letterSpacing: "0.06em", textTransform: "uppercase" }}
      >
        {label}
      </span>
      <input
        type="range"
        min={1}
        max={max}
        value={clamped}
        onChange={(e) => onChange(Math.min(Math.max(Number(e.target.value), 1), max))}
        className="flex-1 accent-emerald-400"
      />
      <span className={`w-5 text-right flex-shrink-0 ${clamped !== value ? "text-blue-400/70" : "text-white/60"}`} style={{ fontSize: "11px" }}>
        {clamped}
      </span>
    </label>
  );
}

/* ══════════════════════════════════════════════════════════
   C4 — Category Select (constraint: enum)
   ══════════════════════════════════════════════════════════ */

const CATEGORIES = ["fiber", "textile", "dye"] as const;

function CategorySelect({
  value,
  onChange,
  isOverridden,
  onReset,
}: {
  value: string;
  onChange: (v: string) => void;
  isOverridden?: boolean;
  onReset?: () => void;
}) {
  const isValid = CATEGORIES.includes(value as typeof CATEGORIES[number]);
  return (
    <div>
      <span className="flex items-center text-white/40 mb-1" style={{ fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Category
        {isOverridden && onReset && <OverrideDot isOverridden onReset={onReset} />}
        {!isValid && <AlertCircle size={10} className="ml-1.5 text-red-400/50" />}
      </span>
      <div className="flex gap-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className={`flex-1 px-2.5 py-1.5 rounded-md border cursor-pointer transition-colors ${
              value === cat
                ? "bg-white/[0.08] border-white/[0.15] text-white/80"
                : "bg-white/[0.02] border-white/[0.06] text-white/30 hover:text-white/50 hover:border-white/[0.1]"
            }`}
            style={{ fontSize: "11px", fontWeight: 500, textTransform: "capitalize" }}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   C4 — SeeAlso with autocomplete & validation
   ══════════════════════════════════════════════════════════ */

function SeeAlsoEditor({
  seeAlso,
  onChange,
  isOverridden,
  onReset,
}: {
  seeAlso: Array<{ id: string; reason?: string }>;
  onChange: (v: Array<{ id: string; reason?: string }>) => void;
  isOverridden?: boolean;
  onReset?: () => void;
}) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { fiberIndex } = useAtlasData();

  const suggestions = useMemo(() => {
    if (!input) return [];
    const q = input.toLowerCase();
    return fiberIndex
      .filter(
        (f) =>
          (f.id.toLowerCase().includes(q) || f.name.toLowerCase().includes(q)) &&
          !seeAlso.some((s) => s.id === f.id),
      )
      .slice(0, 8);
  }, [input, fiberIndex, seeAlso]);

  const addId = (id: string) => {
    if (!seeAlso.some((s) => s.id === id)) {
      onChange([...seeAlso, { id }]);
    }
    setInput("");
    setShowSuggestions(false);
  };

  const removeId = (index: number) => onChange(seeAlso.filter((_, i) => i !== index));

  // Check for orphaned references
  const fiberIds = useMemo(() => new Set(fiberIndex.map((f) => f.id)), [fiberIndex]);

  return (
    <div>
      <span className="flex items-center text-white/40 mb-1" style={{ fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        See Also
        {isOverridden && onReset && <OverrideDot isOverridden onReset={onReset} />}
      </span>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {seeAlso.map((s, i) => {
          const id = s.id;
          const fiber = fiberIndex.find((f) => f.id === id);
          const isOrphaned = !fiberIds.has(id);
          return (
            <span
              key={id}
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${
                isOrphaned
                  ? "bg-red-400/5 border-red-400/20 text-red-400/60"
                  : "bg-white/[0.06] border-white/[0.08] text-white/60"
              }`}
              style={{ fontSize: "10px" }}
            >
              {fiber && (
                <img src={fiber.image} alt="" className="w-3.5 h-3.5 rounded-sm object-cover" />
              )}
              {isOrphaned && <AlertCircle size={9} className="text-red-400/50" />}
              <span>{fiber?.name ?? id}</span>
              <button
                className="text-white/30 hover:text-white/70 cursor-pointer"
                onClick={() => removeId(i)}
              >
                x
              </button>
            </span>
          );
        })}
      </div>
      <div className="relative">
        <input
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Search fibers..."
          className="w-full px-2.5 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-md text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20"
          style={{ fontSize: "12px" }}
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/[0.1] rounded-md shadow-xl z-50 max-h-40 overflow-y-auto">
            {suggestions.map((f) => (
              <button
                key={f.id}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-white/[0.06] cursor-pointer text-left transition-colors"
                onMouseDown={(e) => { e.preventDefault(); addId(f.id); }}
              >
                <img src={f.image} alt="" className="w-5 h-5 rounded-sm object-cover bg-white/[0.04]" />
                <span className="text-white/70 flex-1 truncate" style={{ fontSize: "11px" }}>{f.name}</span>
                <span className="text-white/20" style={{ fontSize: "9px" }}>{f.id}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   C4 — Completeness ring
   ══════════════════════════════════════════════════════════ */

function CompletenessRing({ fiber }: { fiber: FiberProfile }) {
  const fields: string[] = [
    "name", "subtitle", "image", "category", "about", "regions",
    "seasonality", "priceRange", "typicalMOQ", "leadTime",
  ];
  const filled = fields.filter((f) => {
    const v = (fiber as unknown as Record<string, unknown>)[f];
    return v !== "" && v !== undefined && v !== null;
  });
  const pct = Math.round((filled.length / fields.length) * 100);
  const r = 10;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="flex items-center gap-1.5" title={`${pct}% complete (${filled.length}/${fields.length} fields)`}>
      <svg width={24} height={24} viewBox="0 0 24 24" className="-rotate-90">
        <circle cx={12} cy={12} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={2} />
        <circle cx={12} cy={12} r={r} fill="none" stroke={pct === 100 ? "rgba(52,211,153,0.5)" : "rgba(96,165,250,0.4)"} strokeWidth={2} strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="text-white/25" style={{ fontSize: "9px" }}>{pct}%</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Insights Preview — read-only preview of auto-generated insight cards
   ══════════════════════════════════════════════════════════ */

function InsightsPreview({ about, fiberName }: { about: string; fiberName: string }) {
  const sentences = useMemo(() => about?.match(/[^.!?]+[.!?]+/g) ?? [], [about]);
  const partsCount = sentences.length >= 3 ? 3 : 2;
  const parts = useMemo(() => splitAboutText(about, partsCount), [about, partsCount]);
  const hasInsights = sentences.length >= 2;

  return (
    <div className="border-b border-white/[0.06]" data-section-title="Insights">
      <div
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-white/70"
        style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}
      >
        <Lightbulb size={12} className="text-blue-400/40" />
        <span className="flex-1">Insights</span>
        {hasInsights ? (
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400/50 border border-emerald-400/15" style={{ fontSize: "9px", fontWeight: 700 }}>
            {partsCount} cards
          </span>
        ) : (
          <span className="px-1.5 py-0.5 rounded-full bg-white/[0.04] text-white/25 border border-white/[0.06]" style={{ fontSize: "9px", fontWeight: 700 }}>
            unavailable
          </span>
        )}
      </div>

      <div className="px-4 pb-4 space-y-3">
        {!hasInsights ? (
          <div className="rounded-lg px-3 py-2.5 bg-white/[0.02] border border-white/[0.04]">
            <span className="text-white/30 block" style={{ fontSize: "10px", lineHeight: 1.5 }}>
              Insight cards require at least 2 sentences in the About text.
              Currently: {sentences.length} sentence{sentences.length !== 1 ? "s" : ""}.
            </span>
          </div>
        ) : (
          <>
            <div className="rounded-lg px-3 py-2.5 bg-[#5D9A6D]/[0.03] border border-[#5D9A6D]/10">
              <span className="text-[#5D9A6D]/45 block mb-1" style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Pull-quotes from About segments · {sentences.length} sentences → {partsCount} cards (full text stays on Identity)
              </span>
            </div>

            {parts.map((part, idx) =>
              part ? (
              <div key={`insight-${idx}`} className="rounded-lg overflow-hidden border border-white/[0.06]">
                <div className="px-3 py-1.5 bg-white/[0.02] flex items-center gap-1.5">
                  <span className="text-white/40 uppercase tracking-wider" style={{ fontSize: "9px", fontWeight: 600 }}>
                    Insight {idx + 1} — {idx === 0 ? "Origins" : idx === 1 ? "Depth" : "Context"}
                  </span>
                </div>
                <div className="px-3 py-2.5 border-l-2 border-[#5D9A6D]/25 ml-3">
                  <p className="text-white/60" style={{ fontSize: "11px", lineHeight: 1.6, fontFamily: "'PICA', 'Pica', serif", letterSpacing: "0.03em" }}>
                    {insightExcerptFromAboutPart(part, (idx + 1) as 1 | 2 | 3)}
                  </p>
                </div>
                <div className="px-3 py-1.5 flex items-center gap-1.5">
                  <div className="w-4 h-px bg-[#5D9A6D]/25" />
                  <span className="text-[#5D9A6D]/45 uppercase tracking-wider" style={{ fontSize: "8px" }}>
                    {fiberName} — {idx === 0 ? "Origins" : idx === 1 ? "Insight" : "Context"}
                  </span>
                </div>
              </div>
              ) : null,
            )}

            {/* Sentence breakdown */}
            <details className="group">
              <summary className="text-white/20 hover:text-white/40 cursor-pointer list-none flex items-center gap-1" style={{ fontSize: "9px" }}>
                <ChevronRight size={9} className="group-open:rotate-90 transition-transform" />
                Sentence breakdown ({sentences.length})
              </summary>
              <div className="mt-2 space-y-1 pl-3 border-l border-white/[0.04]">
                {sentences.map((s, i) => {
                  const chunkSize = Math.ceil(sentences.length / partsCount);
                  const insightIdx = Math.floor(i / chunkSize) + 1;
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <span
                        className="shrink-0 px-1 py-0 rounded bg-blue-400/10 text-blue-400/40"
                        style={{ fontSize: "8px", fontWeight: 600 }}
                      >
                        I{Math.min(insightIdx, partsCount)}
                      </span>
                      <span className="text-white/35 flex-1" style={{ fontSize: "9px", lineHeight: 1.5 }}>
                        {s.trim()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </details>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main editor component
   ══════════════════════════════════════════════════════════ */

export function FiberEditor({ fiberId }: { fiberId: string }) {
  const navigate = useNavigate();
  const { getFiberById, updateFiber, version } = useAtlasData();
  const fiber = getFiberById(fiberId);

  /* C1: Which fields are overridden? */
  const overrideKeys = useMemo(() => new Set(dataSource.getFiberOverrideKeys(fiberId)), [fiberId, version]);
  const bundledFiber = useMemo(() => dataSource.getBundledFiber(fiberId), [fiberId]);

  /* Local draft state — syncs from data source when fiberId changes */
  const [draft, setDraft] = useState<FiberProfile | null>(null);
  const lastIdRef = useRef<string | null>(null);

  /* ── Scroll-to-section event listener ── */
  const [forceOpenSection, setForceOpenSection] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const section = (e as CustomEvent<string>).detail;
      if (section) {
        setForceOpenSection(section);
        // Clear after a tick so it can be re-triggered for the same section
        setTimeout(() => setForceOpenSection(null), 500);
      }
    };
    window.addEventListener("admin:scroll-to-section", handler);
    return () => window.removeEventListener("admin:scroll-to-section", handler);
  }, []);

  /* ── Accumulated patch + debounced save ──
     The pendingPatchRef accumulates ALL patches between debounce ticks,
     so a rapid gallery change + name change within 300ms won't clobber
     the gallery patch. The flush function writes accumulated patches
     immediately and is also called on unmount / fiber switch. */
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatchRef = useRef<Partial<FiberProfile>>({});
  const [saveState, setSaveState] = useState<"idle" | "pending" | "saved">("idle");
  const saveStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const confirmSave = useCallback(() => {
    setSaveState("saved");
    if (saveStateTimerRef.current) clearTimeout(saveStateTimerRef.current);
    saveStateTimerRef.current = setTimeout(() => setSaveState("idle"), 1500);
  }, []);

  /* Sync draft from data source when fiberId changes; flush pending saves first */
  useEffect(() => {
    if (fiberId !== lastIdRef.current) {
      /* Flush saves for the PREVIOUS fiber before switching */
      if (lastIdRef.current && Object.keys(pendingPatchRef.current).length > 0) {
        const prevId = lastIdRef.current;
        const prevPatch = pendingPatchRef.current;
        pendingPatchRef.current = {};
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
        updateFiber(prevId, prevPatch);
      }
      lastIdRef.current = fiberId;
      const f = getFiberById(fiberId);
      if (f) setDraft({ ...f, sustainability: withDefaultSustainability(f.sustainability) });
      setSaveState("idle");
    }
  }, [fiberId, getFiberById, updateFiber]);

  /* Re-sync draft when version changes (e.g. undo/redo from workspace header) */
  useEffect(() => {
    const f = getFiberById(fiberId);
    if (f && Object.keys(pendingPatchRef.current).length === 0) {
      setDraft({ ...f, sustainability: withDefaultSustainability(f.sustainability) });
    }
  }, [version, fiberId, getFiberById]);

  /* Flush on unmount to prevent data loss when admin drawer closes */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const accumulated = pendingPatchRef.current;
      if (Object.keys(accumulated).length > 0 && lastIdRef.current) {
        /* Direct write — updateFiber may not work during unmount */
        dataSource.updateFiber(lastIdRef.current, accumulated);
      }
    };
  }, []);

  const pushUpdate = useCallback(
    (patch: Partial<FiberProfile>) => {
      setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
      /* Accumulate into the pending patch ref */
      pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };
      setSaveState("pending");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const accumulated = pendingPatchRef.current;
        pendingPatchRef.current = {};
        updateFiber(fiberId, accumulated);
        confirmSave();
      }, 300);
    },
    [fiberId, updateFiber, confirmSave],
  );

  const pushPill = useCallback(
    (key: keyof FiberProfile["profilePills"], value: string) => {
      setDraft((prev) => {
        if (!prev) return prev;
        const pills = { ...prev.profilePills, [key]: value };
        pendingPatchRef.current = { ...pendingPatchRef.current, profilePills: pills };
        setSaveState("pending");
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          const accumulated = pendingPatchRef.current;
          pendingPatchRef.current = {};
          updateFiber(fiberId, accumulated);
          confirmSave();
        }, 300);
        return { ...prev, profilePills: pills };
      });
    },
    [fiberId, updateFiber, confirmSave],
  );

  const pushSustainability = useCallback(
    (key: keyof FiberProfile["sustainability"], value: number | boolean | string[]) => {
      setDraft((prev) => {
        if (!prev) return prev;
        const sust = { ...withDefaultSustainability(prev.sustainability), [key]: value };
        pendingPatchRef.current = { ...pendingPatchRef.current, sustainability: sust };
        setSaveState("pending");
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          const accumulated = pendingPatchRef.current;
          pendingPatchRef.current = {};
          updateFiber(fiberId, accumulated);
          confirmSave();
        }, 300);
        return { ...prev, sustainability: sust };
      });
    },
    [fiberId, updateFiber, confirmSave],
  );

  /** Same gallery as the public site; draft.galleryImages stays the persisted override only. */
  const galleryImagesEffective = useMemo(
    () => (draft ? mergeFiberGalleryWithFallback(fiberId, draft) : []),
    [fiberId, draft],
  );

  const resetFiber = useCallback(() => {
    const bundled = bundledFibers.find((f) => f.id === fiberId);
    if (bundled) {
      /* Clear any pending accumulated patches first */
      pendingPatchRef.current = {};
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      setDraft({ ...bundled });
      dataSource.removeFiberOverride(fiberId);
      toast.success("Fiber reset to defaults");
    }
  }, [fiberId]);

  const resetField = useCallback((field: string) => {
    /* Clear the field from pending patches if present */
    const { [field]: _, ...rest } = pendingPatchRef.current as Record<string, unknown>;
    pendingPatchRef.current = rest as Partial<FiberProfile>;
    dataSource.removeFieldOverride(fiberId, field);
    // Re-sync draft from source
    const fresh = dataSource.getFiberById(fiberId);
    if (fresh) setDraft({ ...fresh });
    toast.success(`Field "${field}" reset to default`);
  }, [fiberId]);

  /* C1: Count overrides per section */
  const basicOverrides = useMemo(() =>
    ["name", "subtitle", "image", "category"].filter((f) => overrideKeys.has(f)).length,
    [overrideKeys],
  );
  const videoOverrides = useMemo(
    () => (overrideKeys.has("youtubeEmbedUrl") || overrideKeys.has("youtubeEmbedUrls") ? 1 : 0),
    [overrideKeys],
  );
  const pillOverrides = useMemo(() => overrideKeys.has("profilePills") ? 1 : 0, [overrideKeys]);
  const sustainOverrides = useMemo(() => overrideKeys.has("sustainability") ? 1 : 0, [overrideKeys]);

  if (!draft || !fiber) {
    return (
      <div className="flex items-center justify-center h-40 text-white/20" style={{ fontSize: "12px" }}>
        Select a fiber to edit
      </div>
    );
  }

  const isFieldOverridden = (field: string) => overrideKeys.has(field);
  const getBundledVal = (field: string) => bundledFiber ? (bundledFiber as unknown as Record<string, unknown>)[field] : undefined;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-white/90 truncate" style={{ fontSize: "14px", fontWeight: 600 }}>{draft.name}</h3>
            <CompletenessRing fiber={draft} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/30" style={{ fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {draft.id} / {draft.category}
            </span>
            {overrideKeys.size > 0 && (
              <span className="text-blue-400/40" style={{ fontSize: "9px" }}>
                {overrideKeys.size} override{overrideKeys.size !== 1 ? "s" : ""}
              </span>
            )}
            {/* Save state indicator */}
            {saveState === "pending" && (
              <span className="text-white/20 animate-pulse" style={{ fontSize: "9px" }}>saving…</span>
            )}
            {saveState === "saved" && (
              <span className="inline-flex items-center gap-0.5 text-emerald-400/60" style={{ fontSize: "9px" }}>
                <Check size={8} /> saved
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={resetFiber}
            className={`p-1.5 rounded-md bg-white/[0.04] border border-white/[0.08] transition-colors cursor-pointer ${
              overrideKeys.size > 0 ? "text-blue-400/50 hover:text-blue-400/80" : "text-white/20"
            }`}
            title="Reset all fields to defaults"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Always-visible image quick actions to avoid deep-scroll blocking */}
      <div className="px-4 py-2 border-b border-white/[0.06] shrink-0">
        <ImageQuickActions
          fiberId={fiberId}
          fiberName={draft.name}
          existingImageUrls={galleryImagesEffective.map((img) => img.url)}
          onAddImages={(urls, mode) => {
            void (async () => {
              let resolved = urls;
              if (mode === "upload") {
                const config = getCloudinaryConfig();
                if (!config) {
                  toast.error("Set Cloudinary cloud name and upload preset in Admin settings to use Upload & Add.");
                  return;
                }
                const uploaded: string[] = [];
                for (const url of urls) {
                  try {
                    uploaded.push(await uploadFromUrl(url, config, { folder: "atlas" }));
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : "Upload failed";
                    toast.error(msg);
                  }
                }
                if (uploaded.length === 0) return;
                resolved = uploaded;
              }

              let addedCount = 0;
              setDraft((prev) => {
                if (!prev) return prev;
                const current = prev.galleryImages ?? [];
                const seededCurrent =
                  current.length === 0 && prev.image
                    ? [{ url: prev.image, title: "" }, ...current]
                    : current;
                const seen = new Set(seededCurrent.map((entry) => entry.url));
                const additions = resolved
                  .filter((url) => !seen.has(url))
                  .map((url) => ({
                    url,
                    title: "",
                  }));
                addedCount = additions.length;
                const next = [...seededCurrent, ...additions];
                const patch: Partial<FiberProfile> = {
                  galleryImages: next,
                  image: next[0]?.url ?? prev.image,
                };
                pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };
                setSaveState("pending");
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => {
                  timerRef.current = null;
                  const accumulated = pendingPatchRef.current;
                  pendingPatchRef.current = {};
                  updateFiber(fiberId, accumulated);
                  confirmSave();
                }, 300);
                return { ...prev, ...patch };
              });
              if (mode === "upload" && addedCount > 0) {
                toast.success(`Added ${addedCount} image(s) via Cloudinary`);
              }
            })();
          }}
          onOpenAdvancedWorkspace={() =>
            navigate(`/admin/images?fiber=${encodeURIComponent(fiberId)}`)
          }
        />
      </div>

      {/* Scrollable form body */}
      <div className="flex-1 overflow-y-auto">
        <Section title="Basic Info" defaultOpen badge={basicOverrides} forceOpen={forceOpenSection === "Basic Info"}>
          <Field label="Name" value={draft.name} onChange={(v) => pushUpdate({ name: v })}
            isOverridden={isFieldOverridden("name")} bundledValue={getBundledVal("name")} onReset={() => resetField("name")} />
          <Field label="Subtitle" value={draft.subtitle} onChange={(v) => pushUpdate({ subtitle: v })}
            isOverridden={isFieldOverridden("subtitle")} bundledValue={getBundledVal("subtitle")} onReset={() => resetField("subtitle")} />
          {/* Hero image is driven by galleryImages[0] — shown as read-only preview */}
          <div>
            <span className="flex items-center text-white/40 mb-1" style={{ fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Profile Image
              <span className="text-white/20 normal-case tracking-normal ml-1.5" style={{ fontSize: "9px" }}>
                (first gallery image)
              </span>
            </span>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-md border border-white/[0.08] overflow-hidden bg-white/[0.04] shrink-0">
                {draft.image ? (
                  <img src={draft.image} alt="Hero" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/15">
                    <AlertCircle size={14} />
                  </div>
                )}
              </div>
              <span className="text-white/30 truncate flex-1" style={{ fontSize: "10px", fontFamily: "monospace" }}>
                {draft.image || "No gallery images"}
              </span>
            </div>
          </div>
          <CategorySelect value={draft.category} onChange={(v) => pushUpdate({ category: v as FiberProfile["category"] })}
            isOverridden={isFieldOverridden("category")} onReset={() => resetField("category")} />
        </Section>

        <Section title="About" badge={isFieldOverridden("about") ? 1 : 0} forceOpen={forceOpenSection === "About"}>
          <TextArea label="About Text" value={draft.about} onChange={(v) => pushUpdate({ about: v })} rows={6}
            isOverridden={isFieldOverridden("about")} bundledValue={getBundledVal("about")} onReset={() => resetField("about")} />
        </Section>

        <Section title="Video (YouTube)" badge={videoOverrides} forceOpen={forceOpenSection === "Video (YouTube)"}>
          <p className="text-white/30 mb-3" style={{ fontSize: "10px", lineHeight: 1.5 }}>
            Optional. Add one or more YouTube watch or share links; they stack in order on the public profile. Remove every link to hide the video card.
          </p>
          {(() => {
            const stored = getYoutubeEmbedUrlRowsForEdit(draft);
            const editRows = stored.length > 0 ? stored : [""];
            const commitRows = (rows: string[]) => {
              const hasContent = rows.some((r) => r.trim().length > 0);
              pushUpdate({
                youtubeEmbedUrls: hasContent ? rows : undefined,
                youtubeEmbedUrl: undefined,
              });
            };
            return (
              <div className="space-y-3">
                {editRows.map((url, i) => {
                  const vid = url.trim() ? youtubeVideoIdFromUrl(url) : null;
                  const invalid = url.trim().length > 0 && !vid;
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <Field
                          label={`YouTube URL ${i + 1}`}
                          value={url}
                          onChange={(v) => {
                            const next = [...editRows];
                            next[i] = v;
                            commitRows(next);
                          }}
                          placeholder="https://www.youtube.com/watch?v=…"
                        />
                        {invalid && (
                          <p className="text-amber-400/50 mt-1" style={{ fontSize: "9px" }}>
                            Not a supported YouTube URL.
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => commitRows(editRows.filter((_, j) => j !== i))}
                        className="mt-6 p-2 rounded-md border border-white/[0.08] text-white/30 hover:text-red-400/70 cursor-pointer transition-colors shrink-0"
                        title="Remove link"
                        aria-label={`Remove YouTube URL ${i + 1}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => commitRows([...editRows, ""])}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-white/[0.12] text-white/35 hover:text-white/55 hover:border-white/[0.18] transition-colors cursor-pointer"
                  style={{ fontSize: "10px", fontWeight: 600 }}
                >
                  <Plus size={14} />
                  Add another YouTube link
                </button>
              </div>
            );
          })()}
        </Section>

        {/* ── Insights Preview (auto-generated from About text) ── */}
        <InsightsPreview about={draft.about} fiberName={draft.name} />

        <Section title="Profile Pills" badge={pillOverrides} forceOpen={forceOpenSection === "Profile Pills"}>
          <Field label="Scientific Name" value={draft.profilePills.scientificName} onChange={(v) => pushPill("scientificName", v)} />
          <Field label="Plant Part" value={draft.profilePills.plantPart} onChange={(v) => pushPill("plantPart", v)} />
          <Field label="Hand" value={draft.profilePills.handFeel} onChange={(v) => pushPill("handFeel", v)} />
          <Field label="Fiber Type" value={draft.profilePills.fiberType} onChange={(v) => pushPill("fiberType", v)} />
          <Field label="Era" value={draft.profilePills.era} onChange={(v) => pushPill("era", v)} />
          <Field label="Origin" value={draft.profilePills.origin} onChange={(v) => pushPill("origin", v)} />
        </Section>

        <Section title="Tags" badge={isFieldOverridden("tags") ? 1 : 0} forceOpen={forceOpenSection === "Tags"}>
          <TagEditor label="Tags" tags={draft.tags} onChange={(v) => pushUpdate({ tags: v })}
            isOverridden={isFieldOverridden("tags")} onReset={() => resetField("tags")} />
        </Section>

        <Section title="Trade Details" forceOpen={forceOpenSection === "Trade Details"}>
          <Field label="Regions" value={draft.regions.join(", ")} onChange={(v) => pushUpdate({ regions: v.split(",").map((r) => r.trim()).filter(Boolean) })}
            isOverridden={isFieldOverridden("regions")} bundledValue={getBundledVal("regions")} onReset={() => resetField("regions")} />
          <Field label="Seasonality" value={draft.seasonality} onChange={(v) => pushUpdate({ seasonality: v })}
            isOverridden={isFieldOverridden("seasonality")} bundledValue={getBundledVal("seasonality")} onReset={() => resetField("seasonality")} />
          <Field label="Price Range" value={draft.priceRange.raw} onChange={(v) => pushUpdate({ priceRange: { ...draft.priceRange, raw: v } })}
            isOverridden={isFieldOverridden("priceRange")} bundledValue={getBundledVal("priceRange")} onReset={() => resetField("priceRange")} />
          <Field label="Typical MOQ" value={`${draft.typicalMOQ.quantity} ${draft.typicalMOQ.unit.toUpperCase()}`} onChange={(v) => { const m = v.match(/^(\d+)\s*(.*)/); pushUpdate({ typicalMOQ: m ? { quantity: Number(m[1]), unit: m[2].trim().toLowerCase() } : draft.typicalMOQ }); }}
            isOverridden={isFieldOverridden("typicalMOQ")} bundledValue={getBundledVal("typicalMOQ")} onReset={() => resetField("typicalMOQ")} />
          <Field label="Lead Time" value={`${draft.leadTime.minWeeks}–${draft.leadTime.maxWeeks} Weeks`} onChange={(v) => { const m = v.match(/(\d+)[–\-](\d+)/); pushUpdate({ leadTime: m ? { minWeeks: Number(m[1]), maxWeeks: Number(m[2]) } : draft.leadTime }); }}
            isOverridden={isFieldOverridden("leadTime")} bundledValue={getBundledVal("leadTime")} onReset={() => resetField("leadTime")} />
          <Field label="Names Worldwide" value={String(draft.translationCount)} onChange={(v) => pushUpdate({ translationCount: Number(v) || 0 })} type="number"
            isOverridden={isFieldOverridden("translationCount")} bundledValue={getBundledVal("translationCount")} onReset={() => resetField("translationCount")} />
        </Section>

        <Section title="Sustainability" badge={sustainOverrides} forceOpen={forceOpenSection === "Sustainability"}>
          <RatingSlider label="Environmental" value={draft.sustainability.environmentalRating} onChange={(v) => pushSustainability("environmentalRating", v)} />
          <RatingSlider label="Water Usage" value={draft.sustainability.waterUsage} onChange={(v) => pushSustainability("waterUsage", v)} />
          <RatingSlider label="Carbon Footprint" value={draft.sustainability.carbonFootprint} onChange={(v) => pushSustainability("carbonFootprint", v)} />
          <RatingSlider label="Chemical Process." value={draft.sustainability.chemicalProcessing} onChange={(v) => pushSustainability("chemicalProcessing", v)} />
          <RatingSlider label="Circularity" value={draft.sustainability.circularity} onChange={(v) => pushSustainability("circularity", v)} />
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-white/50 cursor-pointer" style={{ fontSize: "11px" }}>
              <input
                type="checkbox"
                checked={draft.sustainability.biodegradable}
                onChange={(e) => pushSustainability("biodegradable", e.target.checked)}
                className="accent-emerald-400"
              />
              Biodegradable
            </label>
            <label className="flex items-center gap-2 text-white/50 cursor-pointer" style={{ fontSize: "11px" }}>
              <input
                type="checkbox"
                checked={draft.sustainability.recyclable}
                onChange={(e) => pushSustainability("recyclable", e.target.checked)}
                className="accent-emerald-400"
              />
              Recyclable
            </label>
          </div>
          <TagEditor
            label="Certifications"
            tags={draft.sustainability.certifications}
            onChange={(v) => pushSustainability("certifications", v)}
          />
        </Section>

        <Section title="See Also" badge={isFieldOverridden("seeAlso") ? 1 : 0} forceOpen={forceOpenSection === "See Also"}>
          <SeeAlsoEditor seeAlso={draft.seeAlso} onChange={(v) => pushUpdate({ seeAlso: v })}
            isOverridden={isFieldOverridden("seeAlso")} onReset={() => resetField("seeAlso")} />
        </Section>

        {/* ── C3: Supplementary Tables ── */}
        <Section title="Process Steps" forceOpen={forceOpenSection === "Process Steps"}>
          <ProcessEditor fiberId={fiberId} />
        </Section>

        <Section title="Anatomy" forceOpen={forceOpenSection === "Anatomy"}>
          <AnatomyEditor fiberId={fiberId} />
        </Section>

        <Section title="Care & Use" forceOpen={forceOpenSection === "Care & Use"}>
          <CareEditor fiberId={fiberId} />
        </Section>

        <Section title="Quotes" forceOpen={forceOpenSection === "Quotes"}>
          <QuoteEditor fiberId={fiberId} />
        </Section>

        <Section title="World Names" forceOpen={forceOpenSection === "World Names"}>
          <WorldNamesEditor fiberId={fiberId} />
        </Section>

        <Section title="Gallery" badge={isFieldOverridden("galleryImages") ? 1 : 0} forceOpen={forceOpenSection === "Gallery"}>
          <GalleryEditor
            images={galleryImagesEffective}
            onChange={(v) => {
              /* Auto-sync hero image from gallery[0] */
              const heroUrl = v.length > 0 ? v[0].url : draft.image;
              pushUpdate({ galleryImages: v, image: heroUrl });
            }}
          />
        </Section>
      </div>
    </div>
  );
}