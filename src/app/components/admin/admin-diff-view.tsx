/**
 * admin-diff-view.tsx — Split-screen diff reviewer.
 *
 * C13: Side-by-side comparison of bundled defaults vs current overrides
 * with inline diff highlighting and per-field accept/reject controls.
 */

import { useState, useMemo } from "react";
import { useAtlasData, useAdminMode } from "../../context/atlas-data-context";
import { dataSource, type FiberOverrideSummary } from "../../data/data-provider";
import {
  Diff,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Check,
  X,
  Pencil,
  ArrowRight,
  FileText,
  Image as ImageIcon,
  Layers,
  Download,
} from "lucide-react";
import { toast } from "sonner";

/* ── Diff highlighting ── */
function highlightDiff(oldStr: string, newStr: string): { old: React.ReactNode; new: React.ReactNode } {
  if (oldStr === newStr) {
    return { old: <span className="text-white/50">{oldStr}</span>, new: <span className="text-white/50">{newStr}</span> };
  }

  // Simple word-level diff
  const oldWords = oldStr.split(/(\s+)/);
  const newWords = newStr.split(/(\s+)/);

  const maxLen = Math.max(oldWords.length, newWords.length);
  const oldNodes: React.ReactNode[] = [];
  const newNodes: React.ReactNode[] = [];

  for (let i = 0; i < maxLen; i++) {
    const ow = oldWords[i] ?? "";
    const nw = newWords[i] ?? "";

    if (ow === nw) {
      oldNodes.push(<span key={i} className="text-white/40">{ow}</span>);
      newNodes.push(<span key={i} className="text-white/40">{nw}</span>);
    } else {
      if (ow) oldNodes.push(<span key={i} className="bg-red-400/15 text-red-400/70 px-0.5 rounded">{ow}</span>);
      if (nw) newNodes.push(<span key={i} className="bg-emerald-400/15 text-emerald-400/70 px-0.5 rounded">{nw}</span>);
    }
  }

  return { old: <>{oldNodes}</>, new: <>{newNodes}</> };
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "number") return String(val);
  if (Array.isArray(val)) return val.length === 0 ? "[]" : JSON.stringify(val, null, 2);
  if (typeof val === "object") return JSON.stringify(val, null, 2);
  return String(val);
}

function isTextLike(val: unknown): boolean {
  return typeof val === "string" && String(val).length > 30;
}

/* ── Field diff row ── */
function FieldDiffRow({
  field,
  bundledValue,
  currentValue,
  onReset,
}: {
  field: string;
  bundledValue: unknown;
  currentValue: unknown;
  onReset: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const oldStr = formatValue(bundledValue);
  const newStr = formatValue(currentValue);
  const isLong = isTextLike(bundledValue) || isTextLike(currentValue) || oldStr.length > 80 || newStr.length > 80;
  const diff = useMemo(() => highlightDiff(oldStr, newStr), [oldStr, newStr]);

  return (
    <div className="border-b border-white/[0.03] last:border-0 py-2">
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-white/30 cursor-pointer"
        >
          {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </button>
        <span
          className="text-white/50 uppercase tracking-wider flex-1"
          style={{ fontSize: "9px", fontWeight: 600 }}
        >
          {field}
        </span>
        <button
          onClick={onReset}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-white/60 cursor-pointer"
          style={{ fontSize: "9px" }}
          title="Revert to default"
        >
          <RotateCcw size={8} /> Revert
        </button>
      </div>

      {expanded || !isLong ? (
        <div className="grid grid-cols-2 gap-2 ml-5">
          {/* Bundled (old) */}
          <div className="p-2 rounded bg-red-400/[0.03] border border-red-400/[0.06]">
            <span className="text-red-400/40 uppercase tracking-wider block mb-1" style={{ fontSize: "8px", fontWeight: 600 }}>
              Default
            </span>
            <div className="break-words" style={{ fontSize: "10px", lineHeight: 1.5 }}>
              {diff.old || <span className="text-white/15 italic">empty</span>}
            </div>
          </div>

          {/* Current (new) */}
          <div className="p-2 rounded bg-emerald-400/[0.03] border border-emerald-400/[0.06]">
            <span className="text-emerald-400/40 uppercase tracking-wider block mb-1" style={{ fontSize: "8px", fontWeight: 600 }}>
              Current
            </span>
            <div className="break-words" style={{ fontSize: "10px", lineHeight: 1.5 }}>
              {diff.new || <span className="text-white/15 italic">empty</span>}
            </div>
          </div>
        </div>
      ) : (
        <div className="ml-5 flex items-center gap-2">
          <span className="text-red-400/40 truncate flex-1" style={{ fontSize: "10px" }}>
            {oldStr.slice(0, 50)}...
          </span>
          <ArrowRight size={10} className="text-white/15 shrink-0" />
          <span className="text-emerald-400/50 truncate flex-1" style={{ fontSize: "10px" }}>
            {newStr.slice(0, 50)}...
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Fiber diff card ── */
function FiberDiffCard({
  summary,
  onEdit,
}: {
  summary: FiberOverrideSummary;
  onEdit: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const totalChanges = summary.fields.length + summary.tables.length;

  const handleResetField = (field: string) => {
    dataSource.removeFieldOverride(summary.fiberId, field);
    toast.success(`Field "${field}" reverted to default`);
  };

  const handleResetAll = () => {
    if (!window.confirm(`Revert all changes to ${summary.fiberName}?`)) return;
    dataSource.removeFiberOverride(summary.fiberId);
    for (const table of summary.tables) {
      dataSource.removeSupplementaryOverride(table, summary.fiberId);
    }
    toast.success(`${summary.fiberName} reverted to defaults`);
  };

  const fiber = dataSource.getFiberById(summary.fiberId);

  return (
    <div className="rounded-lg border border-white/[0.06] overflow-hidden bg-white/[0.015]">
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {fiber?.image && (
          <img src={fiber.image} alt="" className="w-8 h-8 rounded-md object-cover bg-white/[0.04] shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <span className="text-white/80 block" style={{ fontSize: "12px" }}>
            {summary.fiberName}
          </span>
          <span className="text-white/25 block" style={{ fontSize: "10px" }}>
            {summary.fiberId}
          </span>
        </div>
        <span
          className="text-blue-400/50 px-2 py-0.5 rounded-full bg-blue-400/5 border border-blue-400/10"
          style={{ fontSize: "9px", fontWeight: 600 }}
        >
          {totalChanges} change{totalChanges !== 1 ? "s" : ""}
        </span>
        {expanded ? (
          <ChevronDown size={14} className="text-white/25" />
        ) : (
          <ChevronRight size={14} className="text-white/25" />
        )}
      </button>

      {/* Expanded diff view */}
      {expanded && (
        <div className="border-t border-white/[0.04] px-4 py-3">
          {/* Field diffs */}
          {summary.fields.map(({ field, bundledValue, currentValue }) => (
            <FieldDiffRow
              key={field}
              field={field}
              bundledValue={bundledValue}
              currentValue={currentValue}
              onReset={() => handleResetField(field)}
            />
          ))}

          {/* Table diffs */}
          {summary.tables.map((table) => (
            <div key={table} className="flex items-center gap-2 py-2 border-b border-white/[0.03] last:border-0">
              <Layers size={10} className="text-blue-400/40 ml-5 shrink-0" />
              <span className="text-white/50 flex-1" style={{ fontSize: "10px" }}>
                {table} (supplementary table)
              </span>
              <button
                onClick={() => {
                  dataSource.removeSupplementaryOverride(table, summary.fiberId);
                  toast.success(`${table} reverted`);
                }}
                className="text-white/20 hover:text-white/60 cursor-pointer"
              >
                <RotateCcw size={10} />
              </button>
            </div>
          ))}

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onEdit(summary.fiberId)}
              className="flex-1 px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-md text-white/50 hover:text-white/80 transition-colors cursor-pointer text-center"
              style={{ fontSize: "10px" }}
            >
              <Pencil size={10} className="inline mr-1" />
              Edit
            </button>
            <button
              onClick={handleResetAll}
              className="px-3 py-1.5 bg-red-400/5 border border-red-400/10 rounded-md text-red-400/50 hover:text-red-400/80 transition-colors cursor-pointer"
              style={{ fontSize: "10px" }}
            >
              Revert All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════ */

export function AdminDiffView() {
  const { overrideSummary, hasOverrides } = useAtlasData();
  const { setEditingFiberId, setAdminView } = useAdminMode();

  const totalChanges = useMemo(
    () => overrideSummary.reduce((sum, s) => sum + s.fields.length + s.tables.length, 0),
    [overrideSummary],
  );

  const handleEdit = (id: string) => {
    setEditingFiberId(id);
    setAdminView("edit");
  };

  const handleExportReview = () => {
    const lines: string[] = [
      "# Atlas Data Diff Review",
      `Generated: ${new Date().toISOString()}`,
      `Fibers changed: ${overrideSummary.length}`,
      `Total field changes: ${totalChanges}`,
      "",
    ];

    for (const summary of overrideSummary) {
      lines.push(`## ${summary.fiberName} (${summary.fiberId})`);
      for (const { field, bundledValue, currentValue } of summary.fields) {
        lines.push(`  ${field}:`);
        lines.push(`    - ${formatValue(bundledValue)}`);
        lines.push(`    + ${formatValue(currentValue)}`);
      }
      for (const table of summary.tables) {
        lines.push(`  [table] ${table}: modified`);
      }
      lines.push("");
    }

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atlas-diff-review-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Diff review exported");
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Diff size={12} className="text-white/30" />
          <span className="text-white/40" style={{ fontSize: "10px" }}>
            {overrideSummary.length} fiber{overrideSummary.length !== 1 ? "s" : ""} changed
            · {totalChanges} field{totalChanges !== 1 ? "s" : ""}
          </span>
        </div>
        {hasOverrides && (
          <button
            onClick={handleExportReview}
            className="flex items-center gap-1 px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded text-white/40 hover:text-white/70 cursor-pointer"
            style={{ fontSize: "10px" }}
          >
            <Download size={10} /> Export Review
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {!hasOverrides ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Diff size={24} className="text-white/10 mb-2" />
            <span className="text-white/30" style={{ fontSize: "12px" }}>
              No differences to review
            </span>
            <span className="text-white/15 mt-1" style={{ fontSize: "10px" }}>
              All data matches bundled defaults
            </span>
          </div>
        ) : (
          overrideSummary.map((s) => (
            <FiberDiffCard key={s.fiberId} summary={s} onEdit={handleEdit} />
          ))
        )}
      </div>
    </div>
  );
}
