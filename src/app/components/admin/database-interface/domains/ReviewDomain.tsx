import React, { useState } from "react";
import { CheckCircle, Clock, XCircle, AlertTriangle, RefreshCw, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/database-interface/lib/utils";
import { useReview } from "@/hooks/domains/useReview";
import type { ReviewQueueItem } from "@/database-interface/domains/review/types";

function ReviewItemCard({
  item,
  onDecide,
  isSubmitting,
}: {
  item: ReviewQueueItem;
  onDecide: (reviewId: string, decision: "accept" | "reject", notes?: string) => void;
  isSubmitting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState("");

  const confidence = item.entity?.confidenceScore ?? 0;
  const confidenceColor = confidence >= 0.9 ? "text-emerald-400" : confidence >= 0.7 ? "text-blue-400" : "text-red-400";
  const confidenceBg = confidence >= 0.9 ? "bg-emerald-500/10" : confidence >= 0.7 ? "bg-blue-500/10" : "bg-red-500/10";

  const reasonLabels: Record<string, string> = {
    low_confidence: "Low Confidence",
    conflict: "Data Conflict",
    missing_required: "Missing Required Field",
    validation_failed: "Validation Failed",
    ambiguous_reference: "Ambiguous Reference",
  };

  const entityTypeLabels: Record<string, string> = {
    profile: "Profile",
    passport: "Passport",
    media: "Media",
    supplier: "Supplier",
    tag: "Tag",
    relation: "Relation",
  };

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <button className="text-neutral-500">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <div className={cn("px-2 py-1 rounded text-xs font-medium", confidenceBg, confidenceColor)}>
          {Math.round(confidence * 100)}%
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-neutral-400 capitalize">
              {entityTypeLabels[item.entity?.entityType || "profile"]}
            </span>
            <span className="text-sm font-medium text-white">{String(item.entity?.rawJsonb?.profileId || item.entityId.slice(0, 8))}</span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            {reasonLabels[item.reason] || item.reason} • Batch: {item.batch?.sourceFilename || item.batchId.slice(0, 8)}
          </p>
        </div>

        <div className="text-xs text-neutral-500">
          {new Date(item.createdAt).toLocaleDateString()}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-white/[0.04]">
          <div className="pt-4 space-y-4">
            {/* Proposed Value Preview */}
            <div>
              <h4 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">Proposed Data</h4>
              <pre className="bg-black/40 rounded-lg p-3 text-xs text-neutral-300 overflow-x-auto">
                {JSON.stringify(item.entity?.rawJsonb || item.proposedValue, null, 2)}
              </pre>
            </div>

            {/* Evidence */}
            {item.batch?.modelName && (
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <Sparkles className="w-3.5 h-3.5" />
                Extracted by {item.batch.modelName}
              </div>
            )}

            {/* Reviewer Notes */}
            <div>
              <label className="text-xs text-neutral-400 block mb-1.5">Reviewer Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about your decision..."
                className="w-full bg-black/40 text-white px-3 py-2 rounded-lg text-sm border border-white/[0.06] focus:border-blue-500/50 focus:outline-none resize-none h-20"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onDecide(item.reviewId, "accept", notes)}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15 rounded-lg transition-colors border border-emerald-500/20 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                Accept
              </button>
              <button
                onClick={() => onDecide(item.reviewId, "reject", notes)}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/15 rounded-lg transition-colors border border-red-500/20 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReviewDomain() {
  const { pendingItems, resolvedItems, stats, loading, error, lastUpdated, refresh, submitDecision } = useReview();
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  const handleDecide = async (reviewId: string, decision: "accept" | "reject", notes?: string) => {
    setSubmittingId(reviewId);
    await submitDecision({ reviewId, decision, notes });
    setSubmittingId(null);
  };

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Domain Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <h1 className="text-sm font-semibold">Review Queue</h1>
          <p className="text-xs text-neutral-500 ml-2">Human-in-the-loop approval</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-neutral-400">Pending:</span>
              <span className="font-medium text-white">{stats.pending}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-neutral-400">Approved:</span>
              <span className="font-medium text-white">{stats.approved}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-neutral-400">Rejected:</span>
              <span className="font-medium text-white">{stats.rejected}</span>
            </div>
          </div>

          {/* Refresh */}
          <button
            onClick={() => void refresh()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Last Updated */}
      {lastUpdated && (
        <div className="px-4 py-2 text-[10px] text-neutral-500 border-b border-white/[0.04]">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}

      {/* Queue Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && pendingItems.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-neutral-500">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-neutral-600 border-t-transparent rounded-full animate-spin" />
              Loading review queue...
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
            <AlertTriangle className="w-12 h-12 mb-3 text-red-400/50" />
            <p className="text-sm">Failed to load review queue</p>
            <p className="text-xs mt-1 opacity-60">{error}</p>
            <button
              onClick={() => void refresh()}
              className="mt-4 px-4 py-2 text-sm text-white bg-white/[0.08] hover:bg-white/[0.12] rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        ) : pendingItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
            <CheckCircle className="w-12 h-12 mb-3 text-emerald-400/50" />
            <p className="text-sm">Review queue is empty</p>
            <p className="text-xs mt-1 opacity-60">New items will appear here when AI extraction needs verification</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-4xl">
            {pendingItems.map((item) => (
              <ReviewItemCard
                key={item.reviewId}
                item={item}
                onDecide={handleDecide}
                isSubmitting={submittingId === item.reviewId}
              />
            ))}
          </div>
        )}

        {/* Resolved Items Section */}
        {resolvedItems.length > 0 && (
          <div className="mt-8">
            <button
              onClick={() => setShowResolved(!showResolved)}
              className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors mb-3"
            >
              {showResolved ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Recently Resolved ({resolvedItems.length})
            </button>

            {showResolved && (
              <div className="space-y-3 max-w-4xl opacity-60">
                {resolvedItems.slice(0, 10).map((item) => (
                  <div
                    key={item.reviewId}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border",
                      item.reviewerDecision === "accept"
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : "border-red-500/20 bg-red-500/5"
                    )}
                  >
                    {item.reviewerDecision === "accept" ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <div className="flex-1">
                      <span className="text-sm text-white">{String(item.entity?.rawJsonb?.profileId || item.entityId.slice(0, 8))}</span>
                      <p className="text-xs text-neutral-500">
                        {item.reviewerDecision === "accept" ? "Approved" : "Rejected"}
                        {item.reviewerNotes && ` • "${item.reviewerNotes.slice(0, 50)}${item.reviewerNotes.length > 50 ? "..." : ""}"`}
                      </p>
                    </div>
                    <span className="text-xs text-neutral-500">
                      {item.reviewedAt ? new Date(item.reviewedAt).toLocaleDateString() : ""}
                    </span>
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
