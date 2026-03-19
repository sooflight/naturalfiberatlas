/**
 * admin-changesets-view.tsx — Named changesets with collaborative review.
 *
 * C14: Lightweight version control with named changesets, import/export,
 * merge conflict resolution, and full history.
 */

import { useState, useMemo, useCallback } from "react";
import { useAtlasData, useAdminMode } from "../../context/atlas-data-context";
import {
  dataSource,
  type ChangesetEnvelope,
  type MergeConflict,
  type MergeStrategy,
} from "../../data/data-provider";
import { toast } from "sonner";
import {
  normalizeAdminSaveIntent,
  type AdminSaveIntent,
  type NormalizedAdminSaveIntent,
} from "./runtime/admin-save-context";
import { markRollbackAction } from "./runtime/admin-metrics";
import {
  Package,
  Plus,
  Download,
  Upload,
  Trash2,
  ChevronDown,
  ChevronRight,
  Clock,
  User,
  FileText,
  Layers,
  GitMerge,
  AlertTriangle,
  Check,
  X,
  ArrowRight,
  Copy,
  BarChart3,
  RotateCcw,
} from "lucide-react";

interface ChangesetLifecycleDetails {
  description: string;
  intent: NormalizedAdminSaveIntent;
}

const LIFECYCLE_TAG = "[save-intent]";

function encodeDescriptionWithIntent(description: string, intent: AdminSaveIntent): string {
  const normalized = normalizeAdminSaveIntent(intent);
  return `${description.trim()}\n\n${LIFECYCLE_TAG}${JSON.stringify(normalized)}`;
}

function decodeDescriptionIntent(rawDescription: string): ChangesetLifecycleDetails {
  const index = rawDescription.lastIndexOf(LIFECYCLE_TAG);
  if (index < 0) {
    return {
      description: rawDescription,
      intent: normalizeAdminSaveIntent(),
    };
  }

  const description = rawDescription.slice(0, index).trim();
  const rawJson = rawDescription.slice(index + LIFECYCLE_TAG.length).trim();

  try {
    const parsed = JSON.parse(rawJson) as AdminSaveIntent;
    return {
      description,
      intent: normalizeAdminSaveIntent(parsed),
    };
  } catch {
    return {
      description,
      intent: normalizeAdminSaveIntent(),
    };
  }
}

/* ── Changeset card ── */
function ChangesetCard({
  changeset,
  onDelete,
  onExport,
  onRollback,
}: {
  changeset: ChangesetEnvelope;
  onDelete: () => void;
  onExport: () => void;
  onRollback: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const lifecycle = useMemo(
    () => decodeDescriptionIntent(changeset.description),
    [changeset.description],
  );

  return (
    <div className="rounded-lg border border-white/[0.06] overflow-hidden bg-white/[0.015]">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <Package size={14} className="text-white/25 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-white/80 block truncate" style={{ fontSize: "12px" }}>
            {changeset.name}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-0.5 text-white/25" style={{ fontSize: "9px" }}>
              <User size={8} /> {changeset.author}
            </span>
            <span className="flex items-center gap-0.5 text-white/25" style={{ fontSize: "9px" }}>
              <Clock size={8} /> {new Date(changeset.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-white/30 px-1.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]"
            style={{ fontSize: "9px" }}
          >
            {changeset.stats.fibers} fiber{changeset.stats.fibers !== 1 ? "s" : ""}
          </span>
          <span
            className="text-white/30 px-1.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]"
            style={{ fontSize: "9px" }}
          >
            {changeset.stats.fields} field{changeset.stats.fields !== 1 ? "s" : ""}
          </span>
        </div>
        {expanded ? (
          <ChevronDown size={12} className="text-white/20" />
        ) : (
          <ChevronRight size={12} className="text-white/20" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-white/[0.04] px-4 py-3 space-y-3">
          {/* Description */}
          <div>
            <span className="text-white/30 uppercase tracking-wider block mb-1" style={{ fontSize: "9px", fontWeight: 600 }}>
              Description
            </span>
            <span className="text-white/50" style={{ fontSize: "11px" }}>
              {lifecycle.description || "No description"}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span
              className="text-white/30 px-1.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]"
              style={{ fontSize: "9px" }}
            >
              Scope: {lifecycle.intent.scope}
            </span>
            <span
              className="text-white/30 px-1.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]"
              style={{ fontSize: "9px" }}
            >
              Risk: {lifecycle.intent.riskLevel}
            </span>
            <span
              className="text-white/30 px-1.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]"
              style={{ fontSize: "9px" }}
            >
              Reason: {lifecycle.intent.reason}
            </span>
          </div>

          {/* Affected fibers */}
          <div>
            <span className="text-white/30 uppercase tracking-wider block mb-1" style={{ fontSize: "9px", fontWeight: 600 }}>
              Affected Fibers
            </span>
            <div className="flex flex-wrap gap-1">
              {changeset.fiberIds.map((id) => (
                <span
                  key={id}
                  className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-white/40"
                  style={{ fontSize: "9px" }}
                >
                  {id}
                </span>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-white/25" style={{ fontSize: "10px" }}>
            <span className="flex items-center gap-1">
              <BarChart3 size={10} />
              {changeset.stats.fibers} fibers
            </span>
            <span className="flex items-center gap-1">
              <FileText size={10} />
              {changeset.stats.fields} fields
            </span>
            {changeset.stats.tables > 0 && (
              <span className="flex items-center gap-1">
                <Layers size={10} />
                {changeset.stats.tables} tables
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onExport}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-md text-white/50 hover:text-white/80 transition-colors cursor-pointer"
              style={{ fontSize: "10px" }}
            >
              <Download size={10} /> Export
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(changeset, null, 2));
                toast.success("Changeset copied to clipboard");
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-md text-white/50 hover:text-white/80 transition-colors cursor-pointer"
              style={{ fontSize: "10px" }}
            >
              <Copy size={10} />
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-400/5 border border-red-400/10 rounded-md text-red-400/50 hover:text-red-400/80 transition-colors cursor-pointer"
              style={{ fontSize: "10px" }}
            >
              <Trash2 size={10} />
            </button>
            <button
              onClick={onRollback}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-400/5 border border-amber-400/15 rounded-md text-amber-300/60 hover:text-amber-200/90 transition-colors cursor-pointer"
              style={{ fontSize: "10px" }}
            >
              <RotateCcw size={10} /> Rollback
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Merge conflict resolver ── */
function ConflictResolver({
  conflicts,
  onResolve,
  onCancel,
}: {
  conflicts: MergeConflict[];
  onResolve: (resolutions: Map<number, "local" | "remote">) => void;
  onCancel: () => void;
}) {
  const [resolutions, setResolutions] = useState<Map<number, "local" | "remote">>(
    () => new Map(conflicts.map((_, i) => [i, "local"])),
  );

  const setResolution = (index: number, choice: "local" | "remote") => {
    setResolutions((prev) => new Map(prev).set(index, choice));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-400/[0.04] border border-blue-400/10 rounded-lg">
        <AlertTriangle size={14} className="text-blue-400/60 shrink-0" />
        <span className="text-blue-400/70" style={{ fontSize: "11px" }}>
          {conflicts.length} conflict{conflicts.length !== 1 ? "s" : ""} found — resolve each before merging
        </span>
      </div>

      {conflicts.map((c, i) => (
        <div key={i} className="rounded-lg border border-white/[0.06] overflow-hidden bg-white/[0.015] p-3">
          <div className="flex items-center gap-2 mb-2">
            <GitMerge size={10} className="text-blue-400/50" />
            <span className="text-white/60" style={{ fontSize: "11px" }}>
              {c.fiberId}
              {c.field && <span className="text-white/30">.{c.field}</span>}
            </span>
            <span className="text-white/20 ml-auto" style={{ fontSize: "9px" }}>
              {c.table}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Local */}
            <button
              onClick={() => setResolution(i, "local")}
              className={`p-2 rounded border cursor-pointer transition-all ${
                resolutions.get(i) === "local"
                  ? "bg-blue-400/10 border-blue-400/20"
                  : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]"
              }`}
            >
              <span
                className={`block mb-1 uppercase tracking-wider ${
                  resolutions.get(i) === "local" ? "text-blue-400/60" : "text-white/30"
                }`}
                style={{ fontSize: "8px", fontWeight: 700 }}
              >
                Keep Mine
              </span>
              <span className="text-white/40 block truncate" style={{ fontSize: "10px" }}>
                {JSON.stringify(c.localValue)?.slice(0, 50)}
              </span>
            </button>

            {/* Remote */}
            <button
              onClick={() => setResolution(i, "remote")}
              className={`p-2 rounded border cursor-pointer transition-all ${
                resolutions.get(i) === "remote"
                  ? "bg-emerald-400/10 border-emerald-400/20"
                  : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]"
              }`}
            >
              <span
                className={`block mb-1 uppercase tracking-wider ${
                  resolutions.get(i) === "remote" ? "text-emerald-400/60" : "text-white/30"
                }`}
                style={{ fontSize: "8px", fontWeight: 700 }}
              >
                Take Theirs
              </span>
              <span className="text-white/40 block truncate" style={{ fontSize: "10px" }}>
                {JSON.stringify(c.remoteValue)?.slice(0, 50)}
              </span>
            </button>
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <button
          onClick={() => onResolve(resolutions)}
          className="flex-1 px-4 py-2 bg-emerald-400/10 border border-emerald-400/20 rounded-lg text-emerald-400/80 hover:text-emerald-400 transition-colors cursor-pointer"
          style={{ fontSize: "11px", fontWeight: 600 }}
        >
          <Check size={12} className="inline mr-1" /> Apply Resolutions
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white/50 hover:text-white/80 transition-colors cursor-pointer"
          style={{ fontSize: "11px" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════ */

export function AdminChangesetsView() {
  const { version, hasOverrides, overriddenFiberIds } = useAtlasData();
  const { setAdminView } = useAdminMode();
  const [conflicts, setConflicts] = useState<MergeConflict[] | null>(null);
  const [importedJson, setImportedJson] = useState<string | null>(null);

  const changesets = useMemo(() => dataSource.getChangesets(), [version]);

  /* Create new changeset from current overrides */
  const handleCreate = () => {
    const name = window.prompt("Changeset name:");
    if (!name) return;
    const desc = window.prompt("Description (optional):", "");
    const author = window.prompt("Author:", "Admin");
    const reason = window.prompt("Reason for this save:", "Routine admin update") ?? undefined;
    const scopeInput = window.prompt("Scope (workspace/images/fiber/batch):", "workspace") ?? undefined;
    const riskInput = window.prompt("Risk (low/medium/high):", "medium") ?? undefined;
    const descriptionWithIntent = encodeDescriptionWithIntent(desc ?? "", {
      reason,
      scope: scopeInput as AdminSaveIntent["scope"],
      riskLevel: riskInput as AdminSaveIntent["riskLevel"],
      affectedEntities: overriddenFiberIds,
    });
    dataSource.createChangeset(name, descriptionWithIntent, author ?? "Admin");
    toast.success(`Changeset "${name}" created`);
  };

  /* Export changeset as JSON file */
  const handleExport = (changeset: ChangesetEnvelope) => {
    const blob = new Blob([JSON.stringify(changeset, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `changeset-${changeset.name.replace(/\s+/g, "-").toLowerCase()}-${changeset.createdAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Changeset exported");
  };

  /* Import changeset */
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const json = reader.result as string;
        try {
          // First try manual merge to detect conflicts
          const changeset = JSON.parse(json) as ChangesetEnvelope;
          const testConflicts = dataSource.merge(changeset.data, "manual");
          if (testConflicts.length > 0) {
            setConflicts(testConflicts);
            setImportedJson(json);
          } else {
            // No conflicts — merge directly
            dataSource.importChangeset(json, "remote-wins");
            toast.success(`Changeset "${changeset.name}" imported successfully`);
          }
        } catch (e) {
          toast.error("Invalid changeset file");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  /* Resolve conflicts */
  const handleResolveConflicts = useCallback(
    (resolutions: Map<number, "local" | "remote">) => {
      if (!importedJson || !conflicts) return;

      // Apply the imported changeset with appropriate strategy per conflict
      // For simplicity, we determine the dominant strategy
      const remoteCount = [...resolutions.values()].filter((v) => v === "remote").length;
      const strategy: MergeStrategy = remoteCount > conflicts.length / 2 ? "remote-wins" : "local-wins";

      const changeset = JSON.parse(importedJson) as ChangesetEnvelope;
      dataSource.merge(changeset.data, strategy);

      toast.success("Conflicts resolved and changeset merged");
      setConflicts(null);
      setImportedJson(null);
    },
    [conflicts, importedJson],
  );

  const handleDelete = (id: string) => {
    if (!window.confirm("Delete this changeset? This cannot be undone.")) return;
    dataSource.deleteChangeset(id);
    toast.success("Changeset deleted");
  };

  const handleRollback = (changeset: ChangesetEnvelope) => {
    if (!window.confirm("Rollback all current overrides for fibers in this changeset?")) return;
    for (const fiberId of changeset.fiberIds) {
      dataSource.removeFiberOverride(fiberId);
    }
    markRollbackAction({ route: window.location.pathname });
    setAdminView("changes");
    toast.success(`Rollback applied for ${changeset.fiberIds.length} fiber(s)`);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Package size={12} className="text-white/30" />
          <span className="text-white/40" style={{ fontSize: "10px" }}>
            {changesets.length} changeset{changesets.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {hasOverrides && (
            <button
              onClick={handleCreate}
              className="flex items-center gap-1 px-2 py-1 bg-emerald-400/10 border border-emerald-400/15 rounded text-emerald-400/60 hover:text-emerald-400 transition-colors cursor-pointer"
              style={{ fontSize: "10px" }}
            >
              <Plus size={10} /> New
            </button>
          )}
          <button
            onClick={handleImport}
            className="flex items-center gap-1 px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded text-white/40 hover:text-white/70 transition-colors cursor-pointer"
            style={{ fontSize: "10px" }}
          >
            <Upload size={10} /> Import
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {/* Conflict resolution */}
        {conflicts && (
          <ConflictResolver
            conflicts={conflicts}
            onResolve={handleResolveConflicts}
            onCancel={() => { setConflicts(null); setImportedJson(null); }}
          />
        )}

        {/* Changeset list */}
        {changesets.length === 0 && !conflicts ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package size={24} className="text-white/10 mb-2" />
            <span className="text-white/30" style={{ fontSize: "12px" }}>
              No changesets yet
            </span>
            <span className="text-white/15 mt-1" style={{ fontSize: "10px" }}>
              Create a changeset from your current overrides to start tracking changes
            </span>
          </div>
        ) : (
          changesets
            .slice()
            .reverse()
            .map((c) => (
              <ChangesetCard
                key={c.id}
                changeset={c}
                onDelete={() => handleDelete(c.id)}
                onExport={() => handleExport(c)}
                onRollback={() => handleRollback(c)}
              />
            ))
        )}
      </div>
    </div>
  );
}
