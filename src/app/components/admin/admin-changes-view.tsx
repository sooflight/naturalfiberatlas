/**
 * admin-changes-view.tsx — Override Translucency (C1)
 *
 * Shows all overrides across all fibers: which fields were changed,
 * their bundled vs current values, with per-field reset capability.
 * Also displays the operation journal timeline (C2).
 */

import { useMemo, useState } from "react";
import { useAtlasData } from "../../context/atlas-data-context";
import { dataSource, type FiberOverrideSummary, type JournalEntry, type TableName } from "../../data/data-provider";
import { useAdminMode } from "../../context/atlas-data-context";
import {
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Clock,
  Layers,
  Trash2,
} from "lucide-react";

/* ── Value display helpers ── */

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "string") return val.length > 60 ? val.slice(0, 57) + "…" : val;
  if (typeof val === "boolean") return val ? "✓" : "✗";
  if (typeof val === "number") return String(val);
  if (Array.isArray(val)) return val.length === 0 ? "[]" : val.join(", ");
  if (typeof val === "object") return JSON.stringify(val).slice(0, 60) + "…";
  return String(val);
}

function ValueDiff({ bundled, current }: { bundled: unknown; current: unknown }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <span className="text-red-400/50 line-through" style={{ fontSize: "10px" }}>
          {formatValue(bundled)}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-emerald-400/70" style={{ fontSize: "10px" }}>
          {formatValue(current)}
        </span>
      </div>
    </div>
  );
}

/* ── Fiber override card ── */

function FiberOverrideCard({
  summary,
  onEditFiber,
}: {
  summary: FiberOverrideSummary;
  onEditFiber: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const handleResetField = (field: string) => {
    dataSource.removeFieldOverride(summary.fiberId, field);
  };

  const handleResetTable = (table: TableName) => {
    dataSource.removeSupplementaryOverride(table, summary.fiberId);
  };

  const handleResetAll = () => {
    dataSource.removeFiberOverride(summary.fiberId);
    for (const table of summary.tables) {
      dataSource.removeSupplementaryOverride(table, summary.fiberId);
    }
  };

  const totalChanges = summary.fields.length + summary.tables.length;

  return (
    <div className="border border-white/[0.06] rounded-lg overflow-hidden bg-white/[0.02]">
      {/* Header */}
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={12} className="text-white/30" /> : <ChevronRight size={12} className="text-white/30" />}
        <span className="text-white/80 flex-1" style={{ fontSize: "12px" }}>
          {summary.fiberName}
        </span>
        <span className="text-blue-400/50 px-1.5 py-0.5 rounded-full bg-blue-400/5 border border-blue-400/10" style={{ fontSize: "9px", fontWeight: 600 }}>
          {totalChanges} {totalChanges === 1 ? "change" : "changes"}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-white/[0.04]">
          {/* Profile field overrides */}
          {summary.fields.map(({ field, bundledValue, currentValue }) => (
            <div key={field} className="flex items-start gap-2 py-1.5 border-b border-white/[0.03] last:border-0">
              <div className="w-2 h-2 rounded-full bg-blue-400/40 mt-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-white/50 uppercase tracking-[0.08em] block" style={{ fontSize: "9px", fontWeight: 600 }}>
                  {field}
                </span>
                <ValueDiff bundled={bundledValue} current={currentValue} />
              </div>
              <button
                onClick={() => handleResetField(field)}
                className="p-1 rounded text-white/20 hover:text-white/60 transition-colors cursor-pointer shrink-0"
                title={`Reset "${field}" to default`}
              >
                <RotateCcw size={10} />
              </button>
            </div>
          ))}

          {/* Supplementary table overrides */}
          {summary.tables.map((table) => (
            <div key={table} className="flex items-center gap-2 py-1.5 border-b border-white/[0.03] last:border-0">
              <div className="w-2 h-2 rounded-full bg-blue-400/40 shrink-0" />
              <Layers size={10} className="text-blue-400/40 shrink-0" />
              <span className="text-white/50 flex-1" style={{ fontSize: "10px" }}>
                {table}
              </span>
              <button
                onClick={() => handleResetTable(table)}
                className="p-1 rounded text-white/20 hover:text-white/60 transition-colors cursor-pointer shrink-0"
                title={`Reset ${table} override`}
              >
                <RotateCcw size={10} />
              </button>
            </div>
          ))}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onEditFiber(summary.fiberId)}
              className="flex-1 px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded-md text-white/50 hover:text-white/80 transition-colors cursor-pointer text-center"
              style={{ fontSize: "10px" }}
            >
              Edit
            </button>
            <button
              onClick={handleResetAll}
              className="px-2 py-1 bg-red-400/5 border border-red-400/10 rounded-md text-red-400/50 hover:text-red-400/80 transition-colors cursor-pointer"
              style={{ fontSize: "10px" }}
            >
              Reset All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Journal timeline ── */

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function JournalTimeline({ entries }: { entries: JournalEntry[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? entries : entries.slice(-20);

  if (entries.length === 0) {
    return (
      <div className="text-white/20 text-center py-4" style={{ fontSize: "11px" }}>
        No operations recorded yet
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {!showAll && entries.length > 20 && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full text-center text-white/30 hover:text-white/50 py-1 cursor-pointer"
          style={{ fontSize: "10px" }}
        >
          Show {entries.length - 20} more…
        </button>
      )}
      {visible.map((entry, i) => (
        <div key={entry.id} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-white/[0.02]">
          <span className="text-white/15 shrink-0 w-14 text-right" style={{ fontSize: "9px", fontFamily: "monospace" }}>
            {formatTime(entry.timestamp)}
          </span>
          <div className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
          <span className="text-white/50 truncate flex-1" style={{ fontSize: "10px" }}>
            <span className="text-white/70">{entry.fiberId}</span>
            {entry.field && entry.field !== "__all__" && entry.field !== "__snapshot__" && (
              <span className="text-white/30">.{entry.field}</span>
            )}
            {entry.field === "__all__" && <span className="text-blue-400/50"> (full reset)</span>}
            {entry.field === "__snapshot__" && <span className="text-blue-400/50"> (snapshot)</span>}
          </span>
          <span className="text-white/20 shrink-0 uppercase tracking-wider" style={{ fontSize: "8px" }}>
            {entry.table}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Changes View
   ══════════════════════════════════════════════════════════ */

export function AdminChangesView() {
  const { overrideSummary, journal, hasOverrides } = useAtlasData();
  const { setEditingFiberId, setAdminView } = useAdminMode();
  const [tab, setTab] = useState<"overrides" | "journal">("overrides");

  const handleEditFiber = (id: string) => {
    setEditingFiberId(id);
    setAdminView("edit");
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-white/[0.06]">
        <button
          className={`flex-1 py-2 text-center cursor-pointer transition-colors ${
            tab === "overrides" ? "text-blue-400/70 border-b border-blue-400/30" : "text-white/30 hover:text-white/50"
          }`}
          onClick={() => setTab("overrides")}
          style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}
        >
          <Layers size={10} className="inline mr-1.5" />
          Overrides ({overrideSummary.length})
        </button>
        <button
          className={`flex-1 py-2 text-center cursor-pointer transition-colors ${
            tab === "journal" ? "text-blue-400/70 border-b border-blue-400/30" : "text-white/30 hover:text-white/50"
          }`}
          onClick={() => setTab("journal")}
          style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}
        >
          <Clock size={10} className="inline mr-1.5" />
          Journal ({journal.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {tab === "overrides" ? (
          hasOverrides ? (
            overrideSummary.map((s) => (
              <FiberOverrideCard key={s.fiberId} summary={s} onEditFiber={handleEditFiber} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-white/20">
              <Layers size={24} className="mb-2 text-white/10" />
              <span style={{ fontSize: "12px" }}>No overrides</span>
              <span style={{ fontSize: "10px" }} className="text-white/15 mt-1">
                All data is using bundled defaults
              </span>
            </div>
          )
        ) : (
          <JournalTimeline entries={journal} />
        )}
      </div>
    </div>
  );
}
