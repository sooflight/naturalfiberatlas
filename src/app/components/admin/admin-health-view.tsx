/**
 * admin-health-view.tsx — Data Health Dashboard
 *
 * Scans all fibers and surfaces diagnostic warnings:
 *   - Missing/empty required fields (about, image, subtitle, etc.)
 *   - Gallery issues (0 images, broken URLs, missing orientations)
 *   - Orphaned seeAlso references (pointing to non-existent fibers)
 *   - Sustainability data gaps (uncertified, default ratings)
 *   - Supplementary table coverage (process, anatomy, care, quotes)
 *   - Category breakdown & overall data completeness score
 */

import { useMemo, useState } from "react";
import { useAtlasData, useAdminMode } from "../../context/atlas-data-context";
import { dataSource } from "../../data/data-provider";
import type { FiberProfile } from "../../data/fibers";
import {
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  FileText,
  Link2,
  Leaf,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Pencil,
  Info,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════════ */

type Severity = "error" | "warning" | "info";

interface Diagnostic {
  fiberId: string;
  fiberName: string;
  severity: Severity;
  category: string;
  message: string;
}

/* ══════════════════════════════════════════════════════════
   Diagnostic Engine
   ══════════════════════════════════════════════════════════ */

function runDiagnostics(fibers: FiberProfile[]): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const fiberIds = new Set(fibers.map((f) => f.id));

  const worldNames = dataSource.getWorldNames();
  const processData = dataSource.getProcessData();
  const anatomyData = dataSource.getAnatomyData();
  const careData = dataSource.getCareData();
  const quoteData = dataSource.getQuoteData();

  for (const fiber of fibers) {
    const add = (severity: Severity, category: string, message: string) => {
      diagnostics.push({ fiberId: fiber.id, fiberName: fiber.name, severity, category, message });
    };

    /* ── Required fields ── */
    if (!fiber.about || fiber.about.trim().length < 20) {
      add("warning", "content", "About text is missing or very short");
    }
    if (!fiber.subtitle || fiber.subtitle.trim().length === 0) {
      add("warning", "content", "Subtitle is empty");
    }
    if (!fiber.image) {
      add("error", "images", "No hero image set");
    }
    if (!fiber.regions || fiber.regions.length === 0) {
      add("info", "content", "Regions field is empty");
    }

    /* ── Gallery ── */
    const gallery = fiber.galleryImages ?? [];
    if (gallery.length === 0) {
      add("error", "images", "No gallery images — detail view will have no contact sheet");
    } else if (gallery.length < 3) {
      add("info", "images", `Only ${gallery.length} gallery image${gallery.length === 1 ? "" : "s"} — consider adding more`);
    }
    const missingOrientation = gallery.filter((img) => !img.orientation).length;
    if (missingOrientation > 0 && gallery.length > 0) {
      add("info", "images", `${missingOrientation}/${gallery.length} gallery images missing orientation metadata`);
    }

    /* ── SeeAlso ── */
    for (const s of fiber.seeAlso) {
      if (!fiberIds.has(s.id)) {
        add("error", "references", `seeAlso references non-existent fiber "${s.id}"`);
      }
    }
    if (fiber.seeAlso.length === 0) {
      add("info", "references", "No seeAlso cross-references");
    }

    /* ── Sustainability ── */
    if (fiber.sustainability.certifications.length === 0) {
      add("info", "sustainability", "No certifications listed");
    }
    const ratings = [
      fiber.sustainability.environmentalRating,
      fiber.sustainability.waterUsage,
      fiber.sustainability.carbonFootprint,
      fiber.sustainability.chemicalProcessing,
      fiber.sustainability.circularity,
    ];
    const allDefault = ratings.every((r) => r === 3);
    if (allDefault) {
      add("warning", "sustainability", "All sustainability ratings are default (3) — may need review");
    }

    /* ── Supplementary tables ── */
    if (!processData[fiber.id] || processData[fiber.id].length === 0) {
      add("info", "tables", "No process steps defined");
    }
    if (!anatomyData[fiber.id]) {
      add("info", "tables", "No anatomy data defined");
    }
    if (!careData[fiber.id]) {
      add("info", "tables", "No care data defined");
    }
    if (!quoteData[fiber.id] || quoteData[fiber.id].length === 0) {
      add("info", "tables", "No quotes defined");
    }
    if (!worldNames[fiber.id] || worldNames[fiber.id].length === 0) {
      add("info", "tables", "No world names defined");
    }

    /* ── Tags ── */
    if (fiber.tags.length === 0) {
      add("warning", "content", "No tags assigned");
    }
  }

  return diagnostics;
}

/* ══════════════════════════════════════════════════════════
   Stats computation
   ══════════════════════════════════════════════════════════ */

interface AtlasStats {
  totalFibers: number;
  categoryBreakdown: Record<string, number>;
  totalGalleryImages: number;
  avgGallerySize: number;
  fibersWithGallery: number;
  fibersWithAbout: number;
  fibersWithProcess: number;
  fibersWithAnatomy: number;
  fibersWithCare: number;
  fibersWithQuotes: number;
  fibersWithWorldNames: number;
  overrideCount: number;
  completenessScore: number; // 0–100
}

function computeStats(fibers: FiberProfile[]): AtlasStats {
  const processData = dataSource.getProcessData();
  const anatomyData = dataSource.getAnatomyData();
  const careData = dataSource.getCareData();
  const quoteData = dataSource.getQuoteData();
  const worldNames = dataSource.getWorldNames();

  const categoryBreakdown: Record<string, number> = {};
  let totalGalleryImages = 0;
  let fibersWithGallery = 0;
  let fibersWithAbout = 0;

  for (const f of fibers) {
    categoryBreakdown[f.category] = (categoryBreakdown[f.category] || 0) + 1;
    const gLen = f.galleryImages?.length ?? 0;
    totalGalleryImages += gLen;
    if (gLen > 0) fibersWithGallery++;
    if (f.about && f.about.trim().length >= 20) fibersWithAbout++;
  }

  const fibersWithProcess = fibers.filter((f) => processData[f.id]?.length > 0).length;
  const fibersWithAnatomy = fibers.filter((f) => !!anatomyData[f.id]).length;
  const fibersWithCare = fibers.filter((f) => !!careData[f.id]).length;
  const fibersWithQuotes = fibers.filter((f) => quoteData[f.id]?.length > 0).length;
  const fibersWithWorldNames = fibers.filter((f) => worldNames[f.id]?.length > 0).length;
  const overrideCount = dataSource.getOverriddenFiberIds().length;

  // Completeness = weighted average of coverage metrics
  const total = fibers.length || 1;
  const scores = [
    (fibersWithAbout / total) * 25,        // About text: 25%
    (fibersWithGallery / total) * 25,       // Gallery: 25%
    (fibersWithProcess / total) * 10,       // Process steps: 10%
    (fibersWithAnatomy / total) * 10,       // Anatomy: 10%
    (fibersWithCare / total) * 10,          // Care: 10%
    (fibersWithQuotes / total) * 10,        // Quotes: 10%
    (fibersWithWorldNames / total) * 10,    // World Names: 10%
  ];
  const completenessScore = Math.round(scores.reduce((a, b) => a + b, 0));

  return {
    totalFibers: fibers.length,
    categoryBreakdown,
    totalGalleryImages,
    avgGallerySize: fibers.length > 0 ? Math.round((totalGalleryImages / fibers.length) * 10) / 10 : 0,
    fibersWithGallery,
    fibersWithAbout,
    fibersWithProcess,
    fibersWithAnatomy,
    fibersWithCare,
    fibersWithQuotes,
    fibersWithWorldNames,
    overrideCount,
    completenessScore,
  };
}

/* ══════════════════════════════════════════════════════════
   UI Components
   ══════════════════════════════════════════════════════════ */

const SEVERITY_STYLES: Record<Severity, { bg: string; text: string; border: string }> = {
  error: { bg: "bg-red-400/5", text: "text-red-400/70", border: "border-red-400/15" },
  warning: { bg: "bg-blue-400/5", text: "text-blue-400/70", border: "border-blue-400/15" },
  info: { bg: "bg-blue-400/5", text: "text-blue-400/50", border: "border-blue-400/15" },
};

const CATEGORY_ICONS: Record<string, typeof AlertTriangle> = {
  content: FileText,
  images: ImageIcon,
  references: Link2,
  sustainability: Leaf,
  tables: BarChart3,
};

function SeverityBadge({ severity }: { severity: Severity }) {
  const s = SEVERITY_STYLES[severity];
  return (
    <span
      className={`px-1.5 py-0.5 rounded-full border ${s.bg} ${s.text} ${s.border}`}
      style={{ fontSize: "8px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}
    >
      {severity}
    </span>
  );
}

function StatBar({ label, value, total, color = "emerald" }: { label: string; value: number; total: number; color?: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-white/40" style={{ fontSize: "10px" }}>{label}</span>
        <span className="text-white/60" style={{ fontSize: "10px" }}>
          {value}/{total}
          <span className="text-white/25 ml-1">({Math.round(pct)}%)</span>
        </span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            pct >= 80 ? `bg-${color}-400/50` : pct >= 50 ? "bg-blue-400/40" : "bg-red-400/40"
          }`}
          style={{
            width: `${pct}%`,
            backgroundColor:
              pct >= 80
                ? "rgba(52,211,153,0.5)"
                : pct >= 50
                  ? "rgba(96,165,250,0.4)"
                  : "rgba(248,113,113,0.4)",
          }}
        />
      </div>
    </div>
  );
}

function DiagnosticGroup({
  fiberName,
  fiberId,
  items,
  onEdit,
}: {
  fiberName: string;
  fiberId: string;
  items: Diagnostic[];
  onEdit: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const errorCount = items.filter((d) => d.severity === "error").length;
  const warnCount = items.filter((d) => d.severity === "warning").length;

  return (
    <div className="border border-white/[0.06] rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.02] transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={11} className="text-white/30" /> : <ChevronRight size={11} className="text-white/30" />}
        <span className="text-white/70 flex-1 text-left truncate" style={{ fontSize: "11px" }}>
          {fiberName}
        </span>
        {errorCount > 0 && (
          <span className="px-1 py-0 rounded-full bg-red-400/10 text-red-400/60 border border-red-400/15" style={{ fontSize: "8px", fontWeight: 700 }}>
            {errorCount}
          </span>
        )}
        {warnCount > 0 && (
          <span className="px-1 py-0 rounded-full bg-blue-400/10 text-blue-400/50 border border-blue-400/15" style={{ fontSize: "8px", fontWeight: 700 }}>
            {warnCount}
          </span>
        )}
        <span className="text-white/15" style={{ fontSize: "9px" }}>{items.length}</span>
      </button>
      {expanded && (
        <div className="border-t border-white/[0.04] px-3 py-2 space-y-1.5">
          {items.map((d, i) => {
            const Icon = CATEGORY_ICONS[d.category] ?? Info;
            return (
              <div key={i} className="flex items-start gap-2">
                <Icon size={10} className={SEVERITY_STYLES[d.severity].text + " mt-0.5 shrink-0"} />
                <span className="text-white/50 flex-1" style={{ fontSize: "10px" }}>
                  {d.message}
                </span>
                <SeverityBadge severity={d.severity} />
              </div>
            );
          })}
          <button
            onClick={() => onEdit(fiberId)}
            className="mt-1 flex items-center gap-1 text-blue-400/40 hover:text-blue-400/70 transition-colors cursor-pointer"
            style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}
          >
            <Pencil size={9} /> Edit fiber
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */

type FilterSeverity = "all" | Severity;

export function AdminHealthView() {
  const { fibers, version } = useAtlasData();
  const { setEditingFiberId, setAdminView } = useAdminMode();
  const [severityFilter, setSeverityFilter] = useState<FilterSeverity>("all");
  const [showClean, setShowClean] = useState(false);

  const diagnostics = useMemo(() => runDiagnostics(fibers), [fibers, version]);
  const stats = useMemo(() => computeStats(fibers), [fibers, version]);

  /* Group diagnostics by fiber */
  const grouped = useMemo(() => {
    const map = new Map<string, Diagnostic[]>();
    for (const d of diagnostics) {
      if (severityFilter !== "all" && d.severity !== severityFilter) continue;
      const existing = map.get(d.fiberId) ?? [];
      existing.push(d);
      map.set(d.fiberId, existing);
    }
    // Sort: most errors first
    return [...map.entries()].sort((a, b) => {
      const aErr = a[1].filter((d) => d.severity === "error").length;
      const bErr = b[1].filter((d) => d.severity === "error").length;
      if (aErr !== bErr) return bErr - aErr;
      const aWarn = a[1].filter((d) => d.severity === "warning").length;
      const bWarn = b[1].filter((d) => d.severity === "warning").length;
      return bWarn - aWarn;
    });
  }, [diagnostics, severityFilter]);

  const errorCount = diagnostics.filter((d) => d.severity === "error").length;
  const warnCount = diagnostics.filter((d) => d.severity === "warning").length;
  const infoCount = diagnostics.filter((d) => d.severity === "info").length;

  /* Fibers with zero diagnostics at current filter */
  const affectedIds = new Set(grouped.map(([id]) => id));
  const cleanFibers = fibers.filter((f) => !affectedIds.has(f.id));

  const handleEdit = (id: string) => {
    setEditingFiberId(id);
    setAdminView("edit");
  };

  /* Completeness ring */
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c - (stats.completenessScore / 100) * c;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Stats overview ── */}
      <div className="px-4 py-3 border-b border-white/[0.06] space-y-3">
        {/* Completeness ring + headline */}
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center" style={{ width: 52, height: 52 }}>
            <svg width={52} height={52} viewBox="0 0 52 52" className="-rotate-90">
              <circle cx={26} cy={26} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
              <circle
                cx={26} cy={26} r={r} fill="none"
                stroke={
                  stats.completenessScore >= 80
                    ? "rgba(52,211,153,0.6)"
                    : stats.completenessScore >= 50
                      ? "rgba(96,165,250,0.5)"
                      : "rgba(248,113,113,0.5)"
                }
                strokeWidth={3}
                strokeDasharray={c}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.6s ease" }}
              />
            </svg>
            <span
              className="absolute text-white/60"
              style={{ fontSize: "12px", fontWeight: 700 }}
            >
              {stats.completenessScore}%
            </span>
          </div>
          <div className="flex-1">
            <div className="text-white/70" style={{ fontSize: "13px", fontWeight: 600 }}>
              Data Completeness
            </div>
            <div className="text-white/30" style={{ fontSize: "10px" }}>
              {stats.totalFibers} fibers · {stats.totalGalleryImages} gallery images · {stats.avgGallerySize} avg/fiber
            </div>
            <div className="flex gap-2 mt-1">
              {Object.entries(stats.categoryBreakdown).map(([cat, count]) => (
                <span
                  key={cat}
                  className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-white/40"
                  style={{ fontSize: "9px", textTransform: "capitalize" }}
                >
                  {cat}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Coverage bars */}
        <div className="space-y-2">
          <StatBar label="About text" value={stats.fibersWithAbout} total={stats.totalFibers} />
          <StatBar label="Gallery images" value={stats.fibersWithGallery} total={stats.totalFibers} />
          <StatBar label="Process steps" value={stats.fibersWithProcess} total={stats.totalFibers} />
          <StatBar label="Anatomy data" value={stats.fibersWithAnatomy} total={stats.totalFibers} />
          <StatBar label="Care data" value={stats.fibersWithCare} total={stats.totalFibers} />
          <StatBar label="Quotes" value={stats.fibersWithQuotes} total={stats.totalFibers} />
          <StatBar label="World names" value={stats.fibersWithWorldNames} total={stats.totalFibers} />
        </div>

        {stats.overrideCount > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-blue-400/[0.04] border border-blue-400/10">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/50" />
            <span className="text-blue-400/50" style={{ fontSize: "10px" }}>
              {stats.overrideCount} fiber{stats.overrideCount !== 1 ? "s" : ""} with local overrides
            </span>
          </div>
        )}
      </div>

      {/* ── Severity filter ── */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-white/[0.06]">
        <span className="text-white/25 mr-1" style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Filter:
        </span>
        {(["all", "error", "warning", "info"] as FilterSeverity[]).map((s) => {
          const count = s === "all" ? diagnostics.length : diagnostics.filter((d) => d.severity === s).length;
          return (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-2 py-0.5 rounded-full border cursor-pointer transition-colors ${
                severityFilter === s
                  ? s === "error"
                    ? "bg-red-400/10 border-red-400/20 text-red-400/70"
                    : s === "warning"
                      ? "bg-blue-400/10 border-blue-400/20 text-blue-400/70"
                      : s === "info"
                        ? "bg-blue-400/10 border-blue-400/20 text-blue-400/60"
                        : "bg-white/[0.08] border-white/[0.15] text-white/60"
                  : "bg-white/[0.02] border-white/[0.06] text-white/25 hover:text-white/40"
              }`}
              style={{ fontSize: "9px", fontWeight: 600, textTransform: "capitalize" }}
            >
              {s} ({count})
            </button>
          );
        })}
      </div>

      {/* ── Diagnostic list ── */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 size={24} className="text-emerald-400/40 mb-2" />
            <span className="text-white/40" style={{ fontSize: "12px" }}>
              {severityFilter === "all" ? "All fibers look healthy!" : `No ${severityFilter}-level issues found`}
            </span>
          </div>
        ) : (
          <>
            {grouped.map(([fiberId, items]) => (
              <DiagnosticGroup
                key={fiberId}
                fiberId={fiberId}
                fiberName={items[0].fiberName}
                items={items}
                onEdit={handleEdit}
              />
            ))}

            {/* Clean fibers toggle */}
            {cleanFibers.length > 0 && (
              <div className="mt-3 border-t border-white/[0.04] pt-2">
                <button
                  onClick={() => setShowClean(!showClean)}
                  className="flex items-center gap-1.5 text-white/20 hover:text-white/40 transition-colors cursor-pointer"
                  style={{ fontSize: "10px" }}
                >
                  <CheckCircle2 size={10} />
                  {cleanFibers.length} fiber{cleanFibers.length !== 1 ? "s" : ""} with no issues
                  {showClean ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                </button>
                {showClean && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {cleanFibers.map((f) => (
                      <span
                        key={f.id}
                        className="px-1.5 py-0.5 rounded bg-emerald-400/[0.04] border border-emerald-400/10 text-emerald-400/40"
                        style={{ fontSize: "9px" }}
                      >
                        {f.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Summary footer ── */}
      <div className="px-4 py-2 border-t border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-red-400/60" style={{ fontSize: "9px" }}>
              <AlertTriangle size={9} /> {errorCount} error{errorCount !== 1 ? "s" : ""}
            </span>
          )}
          {warnCount > 0 && (
            <span className="flex items-center gap-1 text-blue-400/50" style={{ fontSize: "9px" }}>
              <AlertTriangle size={9} /> {warnCount} warning{warnCount !== 1 ? "s" : ""}
            </span>
          )}
          {infoCount > 0 && (
            <span className="flex items-center gap-1 text-blue-400/40" style={{ fontSize: "9px" }}>
              <Info size={9} /> {infoCount} info
            </span>
          )}
        </div>
        <span className="text-white/15" style={{ fontSize: "9px" }}>
          {grouped.length}/{fibers.length} fibers affected
        </span>
      </div>
    </div>
  );
}
