/**
 * admin-staging-view.tsx — Staging → Verify → Push pipeline.
 *
 * C12: Three-phase publishing workflow:
 *   Stage — Review all current overrides as a staged set
 *   Verify — Run diagnostics against current changes
 *   Push — Commit as a named changeset with snapshot rollback
 */

import { useState, useMemo, useCallback } from "react";
import { useAtlasData, useAdminMode } from "../../context/atlas-data-context";
import {
  dataSource,
  type FiberOverrideSummary,
  type VerificationResult,
  type SnapshotMeta,
} from "../../data/data-provider";
import { toast } from "sonner";
import {
  GitBranch,
  ShieldCheck,
  Rocket,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Trash2,
  Database,
  Clock,
  ArrowRight,
  Package,
  Info,
  Pencil,
  Image as ImageIcon,
  FileText,
  Link2,
  Leaf,
  BarChart3,
} from "lucide-react";

/* ── Verification engine ── */
function runVerification(
  summaries: FiberOverrideSummary[],
): VerificationResult[] {
  const results: VerificationResult[] = [];

  for (const summary of summaries) {
    const fiber = dataSource.getFiberById(summary.fiberId);
    if (!fiber) continue;

    /* Schema validation */
    for (const { field, currentValue } of summary.fields) {
      if (field === "name" && (!currentValue || String(currentValue).trim().length === 0)) {
        results.push({
          fiberId: summary.fiberId,
          fiberName: summary.fiberName,
          severity: "fail",
          category: "schema",
          message: `Field "name" cannot be empty`,
        });
      }

      if (field === "image" && currentValue) {
        const url = String(currentValue);
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          results.push({
            fiberId: summary.fiberId,
            fiberName: summary.fiberName,
            severity: "fail",
            category: "url",
            message: `Image URL is not a valid HTTP(S) URL`,
          });
        }
      }

      if (field === "about" && currentValue && String(currentValue).trim().length < 20) {
        results.push({
          fiberId: summary.fiberId,
          fiberName: summary.fiberName,
          severity: "warn",
          category: "content",
          message: `About text is very short (< 20 chars)`,
        });
      }

      if (field === "sustainability" && typeof currentValue === "object" && currentValue !== null) {
        const s = currentValue as Record<string, unknown>;
        const ratings = ["environmentalRating", "waterUsage", "carbonFootprint", "chemicalProcessing", "circularity"];
        for (const r of ratings) {
          const val = s[r];
          if (typeof val === "number" && (val < 1 || val > 5)) {
            results.push({
              fiberId: summary.fiberId,
              fiberName: summary.fiberName,
              severity: "fail",
              category: "schema",
              message: `Sustainability rating "${r}" must be 1–5, got ${val}`,
            });
          }
        }
      }

      if (field === "seeAlso" && Array.isArray(currentValue)) {
        for (const s of currentValue as Array<{ id: string; reason?: string }>) {
          if (!dataSource.getFiberById(s.id)) {
            results.push({
              fiberId: summary.fiberId,
              fiberName: summary.fiberName,
              severity: "fail",
              category: "reference",
              message: `seeAlso references non-existent fiber "${s.id}"`,
            });
          }
        }
      }

      if (field === "galleryImages" && Array.isArray(currentValue)) {
        for (const img of currentValue as Array<{ url: string }>) {
          if (!img.url || img.url.trim().length === 0) {
            results.push({
              fiberId: summary.fiberId,
              fiberName: summary.fiberName,
              severity: "warn",
              category: "images",
              message: `Gallery image has empty URL`,
            });
          }
        }
      }
    }

    /* If no issues found for this fiber, mark as pass */
    if (!results.some((r) => r.fiberId === summary.fiberId)) {
      results.push({
        fiberId: summary.fiberId,
        fiberName: summary.fiberName,
        severity: "pass",
        category: "all",
        message: `All changes verified`,
      });
    }
  }

  return results;
}

/* ── Phase pills ── */
type Phase = "stage" | "verify" | "push";

const PHASES: Array<{ key: Phase; label: string; icon: typeof GitBranch }> = [
  { key: "stage", label: "Stage", icon: GitBranch },
  { key: "verify", label: "Verify", icon: ShieldCheck },
  { key: "push", label: "Push", icon: Rocket },
];

const CATEGORY_ICONS: Record<string, typeof AlertTriangle> = {
  schema: FileText,
  url: Link2,
  content: FileText,
  reference: Link2,
  images: ImageIcon,
  sustainability: Leaf,
  tables: BarChart3,
  all: CheckCircle2,
  staging: GitBranch,
};

/* ═══════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════ */

export function AdminStagingView() {
  const { overrideSummary, hasOverrides, overriddenFiberIds, version } = useAtlasData();
  const { setEditingFiberId, setAdminView } = useAdminMode();
  const [phase, setPhase] = useState<Phase>("stage");
  const [verificationResults, setVerificationResults] = useState<VerificationResult[] | null>(null);
  const [commitMessage, setCommitMessage] = useState("");
  const [commitAuthor, setCommitAuthor] = useState("");
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  const snapshots = useMemo(() => dataSource.getSnapshots(), [version]);

  /* Included overrides (not excluded) */
  const includedSummaries = useMemo(
    () => overrideSummary.filter((s) => !excluded.has(s.fiberId)),
    [overrideSummary, excluded],
  );

  const totalChanges = useMemo(
    () => includedSummaries.reduce((sum, s) => sum + s.fields.length + s.tables.length, 0),
    [includedSummaries],
  );

  /* Run verification */
  const handleVerify = useCallback(() => {
    const results = runVerification(includedSummaries);
    setVerificationResults(results);
    const fails = results.filter((r) => r.severity === "fail");
    const warns = results.filter((r) => r.severity === "warn");
    if (fails.length === 0 && warns.length === 0) {
      toast.success("All changes verified — ready to push");
      setPhase("push");
    } else if (fails.length === 0) {
      toast.success(`Verified with ${warns.length} warning${warns.length !== 1 ? "s" : ""}`);
      setPhase("push");
    } else {
      toast.error(`${fails.length} issue${fails.length !== 1 ? "s" : ""} must be resolved`);
    }
  }, [includedSummaries]);

  /* Push as changeset */
  const handlePush = useCallback(() => {
    if (!commitMessage.trim()) {
      toast.error("Please provide a commit message");
      return;
    }

    // Create safety snapshot first
    dataSource.createSnapshot(`Pre-push: ${commitMessage.trim()}`);

    // Create the changeset
    const changeset = dataSource.createChangeset(
      commitMessage.trim(),
      `${includedSummaries.length} fibers, ${totalChanges} changes`,
      commitAuthor.trim() || "Admin",
    );

    toast.success(`Changeset "${changeset.name}" created`);
    setCommitMessage("");
    setPhase("stage");
    setVerificationResults(null);
  }, [commitMessage, commitAuthor, includedSummaries, totalChanges]);

  /* Restore snapshot */
  const handleRestoreSnapshot = (id: string) => {
    if (!window.confirm("Restore this snapshot? Current overrides will be replaced.")) return;
    dataSource.restoreSnapshot(id);
    toast.success("Snapshot restored");
  };

  const handleEditFiber = (id: string) => {
    setEditingFiberId(id);
    setAdminView("edit");
  };

  /* Verification summary */
  const failCount = verificationResults?.filter((r) => r.severity === "fail").length ?? 0;
  const warnCount = verificationResults?.filter((r) => r.severity === "warn").length ?? 0;
  const passCount = verificationResults?.filter((r) => r.severity === "pass").length ?? 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Phase pills */}
      <div className="flex items-center gap-1 px-4 py-2.5 border-b border-white/[0.06]">
        {PHASES.map(({ key, label, icon: Icon }, i) => (
          <div key={key} className="flex items-center">
            {i > 0 && <ArrowRight size={10} className="text-white/10 mx-1" />}
            <button
              onClick={() => setPhase(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer transition-all ${
                phase === key
                  ? key === "push"
                    ? "bg-emerald-400/10 border-emerald-400/20 text-emerald-400/80"
                    : key === "verify"
                      ? "bg-blue-400/10 border-blue-400/20 text-blue-400/80"
                      : "bg-blue-400/10 border-blue-400/20 text-blue-400/80"
                  : "bg-white/[0.02] border-white/[0.06] text-white/30 hover:text-white/50"
              }`}
              style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}
            >
              <Icon size={11} />
              {label}
            </button>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* ── Stage phase ── */}
        {phase === "stage" && (
          <div className="p-4 space-y-3">
            {!hasOverrides ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <GitBranch size={24} className="text-white/10 mb-2" />
                <span className="text-white/30" style={{ fontSize: "12px" }}>
                  No changes to stage
                </span>
                <span className="text-white/15 mt-1" style={{ fontSize: "10px" }}>
                  Edit fibers to create overrides
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-white/40" style={{ fontSize: "10px" }}>
                    {includedSummaries.length} fiber{includedSummaries.length !== 1 ? "s" : ""} staged
                    · {totalChanges} change{totalChanges !== 1 ? "s" : ""}
                  </span>
                  {excluded.size > 0 && (
                    <button
                      onClick={() => setExcluded(new Set())}
                      className="text-white/30 hover:text-white/60 cursor-pointer"
                      style={{ fontSize: "10px" }}
                    >
                      Include all
                    </button>
                  )}
                </div>

                {overrideSummary.map((s) => {
                  const isExcluded = excluded.has(s.fiberId);
                  const total = s.fields.length + s.tables.length;
                  return (
                    <div
                      key={s.fiberId}
                      className={`rounded-lg border overflow-hidden transition-opacity ${
                        isExcluded
                          ? "border-white/[0.04] opacity-40"
                          : "border-white/[0.06] bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-center gap-2 px-3 py-2">
                        <button
                          onClick={() => {
                            setExcluded((prev) => {
                              const next = new Set(prev);
                              if (next.has(s.fiberId)) next.delete(s.fiberId);
                              else next.add(s.fiberId);
                              return next;
                            });
                          }}
                          className="cursor-pointer text-white/40 hover:text-white/70"
                        >
                          {isExcluded ? (
                            <XCircle size={14} className="text-white/20" />
                          ) : (
                            <CheckCircle2 size={14} className="text-emerald-400/50" />
                          )}
                        </button>
                        <span className="text-white/70 flex-1" style={{ fontSize: "12px" }}>
                          {s.fiberName}
                        </span>
                        <span
                          className="text-blue-400/50 px-1.5 py-0.5 rounded-full bg-blue-400/5 border border-blue-400/10"
                          style={{ fontSize: "9px", fontWeight: 600 }}
                        >
                          {total} change{total !== 1 ? "s" : ""}
                        </span>
                        <button
                          onClick={() => handleEditFiber(s.fiberId)}
                          className="p-1 text-white/20 hover:text-white/60 cursor-pointer"
                          title="Edit fiber"
                        >
                          <Pencil size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={handleVerify}
                  disabled={includedSummaries.length === 0}
                  className="w-full px-4 py-2.5 bg-blue-400/10 border border-blue-400/20 rounded-lg text-blue-400/80 hover:text-blue-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  style={{ fontSize: "12px", fontWeight: 600 }}
                >
                  <ShieldCheck size={14} className="inline mr-2" />
                  Verify {includedSummaries.length} fiber{includedSummaries.length !== 1 ? "s" : ""}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Verify phase ── */}
        {phase === "verify" && (
          <div className="p-4 space-y-3">
            {!verificationResults ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ShieldCheck size={24} className="text-white/10 mb-2" />
                <span className="text-white/30" style={{ fontSize: "12px" }}>
                  Run verification from the Stage tab first
                </span>
                <button
                  onClick={() => { setPhase("stage"); handleVerify(); }}
                  className="mt-3 px-4 py-2 bg-blue-400/10 border border-blue-400/20 rounded-lg text-blue-400/70 hover:text-blue-400 cursor-pointer"
                  style={{ fontSize: "11px" }}
                >
                  Run Verification
                </button>
              </div>
            ) : (
              <>
                {/* Summary bar */}
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  {failCount > 0 && (
                    <span className="flex items-center gap-1 text-red-400/70" style={{ fontSize: "11px" }}>
                      <XCircle size={12} /> {failCount} fail{failCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {warnCount > 0 && (
                    <span className="flex items-center gap-1 text-blue-400/70" style={{ fontSize: "11px" }}>
                      <AlertTriangle size={12} /> {warnCount} warning{warnCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {passCount > 0 && (
                    <span className="flex items-center gap-1 text-emerald-400/60" style={{ fontSize: "11px" }}>
                      <CheckCircle2 size={12} /> {passCount} pass
                    </span>
                  )}
                  <span className="ml-auto text-white/20" style={{ fontSize: "10px" }}>
                    {failCount === 0 ? "Ready to push" : "Resolve issues first"}
                  </span>
                </div>

                {/* Results list */}
                {verificationResults
                  .filter((r) => r.severity !== "pass")
                  .map((r, i) => {
                    const Icon = CATEGORY_ICONS[r.category] ?? Info;
                    return (
                      <div
                        key={i}
                        className={`flex items-start gap-2 px-3 py-2 rounded-lg border ${
                          r.severity === "fail"
                            ? "bg-red-400/[0.03] border-red-400/10"
                            : "bg-blue-400/[0.03] border-blue-400/10"
                        }`}
                      >
                        <Icon
                          size={12}
                          className={`mt-0.5 shrink-0 ${
                            r.severity === "fail" ? "text-red-400/60" : "text-blue-400/50"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-white/70 block" style={{ fontSize: "11px" }}>
                            {r.fiberName}
                          </span>
                          <span className="text-white/40 block" style={{ fontSize: "10px" }}>
                            {r.message}
                          </span>
                        </div>
                        <button
                          onClick={() => handleEditFiber(r.fiberId)}
                          className="text-white/20 hover:text-white/60 cursor-pointer shrink-0"
                        >
                          <Pencil size={10} />
                        </button>
                      </div>
                    );
                  })}

                {failCount === 0 && (
                  <button
                    onClick={() => setPhase("push")}
                    className="w-full px-4 py-2.5 bg-emerald-400/10 border border-emerald-400/20 rounded-lg text-emerald-400/80 hover:text-emerald-400 transition-colors cursor-pointer"
                    style={{ fontSize: "12px", fontWeight: 600 }}
                  >
                    <ArrowRight size={14} className="inline mr-2" />
                    Proceed to Push
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Push phase ── */}
        {phase === "push" && (
          <div className="p-4 space-y-4">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
              <span className="text-white/40 uppercase tracking-wider block" style={{ fontSize: "10px", fontWeight: 600 }}>
                Commit Details
              </span>
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Describe these changes..."
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20"
                style={{ fontSize: "13px" }}
              />
              <input
                type="text"
                value={commitAuthor}
                onChange={(e) => setCommitAuthor(e.target.value)}
                placeholder="Author (optional)"
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20"
                style={{ fontSize: "12px" }}
              />

              {/* Change summary */}
              <div className="flex items-center gap-2 text-white/30" style={{ fontSize: "10px" }}>
                <Package size={10} />
                <span>
                  {includedSummaries.length} fiber{includedSummaries.length !== 1 ? "s" : ""}
                  · {totalChanges} change{totalChanges !== 1 ? "s" : ""}
                </span>
                {verificationResults && failCount === 0 && (
                  <span className="flex items-center gap-0.5 text-emerald-400/50 ml-auto">
                    <CheckCircle2 size={9} /> Verified
                  </span>
                )}
              </div>

              <button
                onClick={handlePush}
                disabled={!commitMessage.trim() || !hasOverrides}
                className="w-full px-4 py-3 bg-emerald-400/15 border border-emerald-400/25 rounded-lg text-emerald-400/90 hover:bg-emerald-400/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                style={{ fontSize: "13px", fontWeight: 600 }}
              >
                <Rocket size={14} className="inline mr-2" />
                Push Changeset
              </button>
            </div>

            {/* Snapshots */}
            {snapshots.length > 0 && (
              <div className="space-y-2">
                <span className="text-white/30 uppercase tracking-wider" style={{ fontSize: "10px", fontWeight: 600 }}>
                  Rollback Snapshots
                </span>
                {snapshots.slice().reverse().map((snap) => (
                  <div
                    key={snap.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02]"
                  >
                    <Database size={10} className="text-white/20 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-white/60 block truncate" style={{ fontSize: "11px" }}>
                        {snap.name}
                      </span>
                      <span className="text-white/20 block" style={{ fontSize: "9px" }}>
                        {new Date(snap.timestamp).toLocaleString()} · {snap.overrideCount} overrides
                      </span>
                    </div>
                    <button
                      onClick={() => handleRestoreSnapshot(snap.id)}
                      className="px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded text-white/40 hover:text-white/70 cursor-pointer"
                      style={{ fontSize: "9px" }}
                    >
                      <RotateCcw size={9} className="inline mr-0.5" /> Restore
                    </button>
                    <button
                      onClick={() => dataSource.deleteSnapshot(snap.id)}
                      className="p-1 text-red-400/30 hover:text-red-400/70 cursor-pointer"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
