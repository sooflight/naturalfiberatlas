import React, { lazy, Suspense, useState, useCallback } from "react";
import { Upload, RefreshCw, Clock, CheckCircle, AlertTriangle, XCircle, Filter, Search } from "lucide-react";
import { cn } from "@/database-interface/lib/utils";
import { useImport } from "@/hooks/domains/useImport";
import type { IngestionBatchSummary as ImportBatchSummary } from "@/database-interface/domains/ingestion/types";

const ImportPanel = lazy(() => import("@/components/admin/ingestion"));

function BatchHistoryItem({ batch }: { batch: ImportBatchSummary }) {
  const statusConfig = {
    pending: { icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10", label: "Pending" },
    processing: { icon: RefreshCw, color: "text-blue-400", bg: "bg-blue-500/10", label: "Processing" },
    review: { icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/10", label: "Review" },
    applied: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Applied" },
    failed: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", label: "Failed" },
  };

  const config = statusConfig[batch.status as keyof typeof statusConfig];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
      <div className={cn("p-1.5 rounded-lg", config.bg)}>
        <Icon className={cn("w-3.5 h-3.5", config.color)} />
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-white">{batch.id.slice(0, 8)}</span>
          <span className={cn("px-2 py-0.5 rounded text-xs font-medium", config.bg, config.color)}>
            {config.label}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-neutral-500">
          <span>{batch.entityCount} entities</span>
          <span>${batch.estimatedCostUsd.toFixed(2)}</span>
          <span>{new Date(batch.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

function ImportOverview({ batches, onRefresh, loading, error }: {
  batches: ImportBatchSummary[];
  onRefresh: () => void;
  loading: boolean;
  error: string | null;
}) {
  const totalBatches = batches.length;
  const appliedBatches = batches.filter(b => b.status === 'applied').length;
  const pendingBatches = batches.filter(b => b.status === 'pending').length;
  const failedBatches = batches.filter(b => b.status === 'failed').length;
  const totalEntities = batches.reduce((sum, b) => sum + b.entityCount, 0);
  const totalCost = batches.reduce((sum, b) => sum + b.estimatedCostUsd, 0);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-semibold">Import Overview</h3>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-neutral-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-red-400">Error Loading Batches</span>
          </div>
          <p className="text-xs text-neutral-400">{error}</p>
        </div>
      )}

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-neutral-400">Applied</span>
          </div>
          <div className="text-lg font-semibold text-white">{appliedBatches}</div>
        </div>
        <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-neutral-400">Pending</span>
          </div>
          <div className="text-lg font-semibold text-white">{pendingBatches}</div>
        </div>
        <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-1">
            <Upload className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-neutral-400">Total Entities</span>
          </div>
          <div className="text-lg font-semibold text-white">{totalEntities}</div>
        </div>
        <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-neutral-400">Failed</span>
          </div>
          <div className="text-lg font-semibold text-white">{failedBatches}</div>
        </div>
      </div>

      {/* Cost Summary */}
      <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white">Total Cost</span>
          <span className="text-lg font-semibold text-emerald-400">${totalCost.toFixed(2)}</span>
        </div>
        <div className="text-xs text-neutral-500">
          Across {totalBatches} ingestion batches
        </div>
      </div>

      {/* Recent Batches */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3">Recent Batches</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {batches.slice(0, 5).map((batch) => (
            <BatchHistoryItem key={batch.id} batch={batch} />
          ))}
          {batches.length === 0 && !loading && (
            <div className="text-center py-4 text-neutral-500">
              <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No ingestion batches yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Import Domain - AI-powered data import interface.
 *
 * Enhanced with:
 * - Batch history and workflow management
 * - Real-time ingestion statistics
 * - Cost tracking and monitoring
 * - Pipeline status visualization
 * - Advanced filtering and search
 *
 * This component provides the data ingestion capabilities:
 * - Paste text input (text/markdown/CSV)
 * - File drop zone
 * - Real-time processing feedback
 * - Multi-stage pipeline (extract → structure → validate → map)
 * - LLM provider selection
 * - Cost tracking
 * - Results display
 */
export default function ImportDomain() {
  const [, setShowImport] = useState(true);
  const [flashMsg, setFlashMsg] = useState<string | null>(null);
  const [showOverview, setShowOverview] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const flash = useCallback((msg: string) => {
    setFlashMsg(msg);
    setTimeout(() => setFlashMsg(null), 2000);
  }, []);

  // Use the ingestion hook for batch data
  const { batches, loading, error, refresh } = useImport();

  // Filter batches based on search and status
  const filteredBatches = batches.filter(batch => {
    const matchesSearch = searchQuery === "" ||
      batch.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || batch.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="h-full flex bg-black">
      {/* Overview Sidebar */}
      {showOverview && (
        <aside className="w-80 flex-shrink-0 border-r border-white/[0.06] bg-[rgba(10,10,10,0.5)]">
          <ImportOverview
            batches={filteredBatches}
            onRefresh={refresh}
            loading={loading}
            error={error}
          />
        </aside>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-[rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-medium">Import Pipeline</span>
            </div>

            <div className="w-px h-4 bg-white/[0.08]" />

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search batches..."
                className="w-40 bg-white/[0.04] text-white pl-8 pr-3 py-1.5 rounded-lg text-xs border border-white/[0.06] focus:border-blue-500/50 focus:outline-none placeholder:text-neutral-600"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white/[0.04] text-white px-3 py-1.5 rounded-lg text-xs border border-white/[0.06] focus:border-blue-500/50 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="review">Review</option>
              <option value="applied">Applied</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <button
            onClick={() => setShowOverview(!showOverview)}
            className={cn(
              "text-xs px-2.5 py-1.5 rounded-lg transition-all",
              showOverview
                ? "text-white bg-white/[0.08]"
                : "text-neutral-500 hover:text-neutral-300"
            )}
          >
            Overview
          </button>
        </div>

        {/* Import Panel */}
        <div className="flex-1 overflow-hidden">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full text-neutral-500">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-neutral-600 border-t-transparent rounded-full animate-spin" />
                  Loading ingestion panel...
                </div>
              </div>
            }
          >
            <ImportPanel onClose={() => setShowImport(false)} onFlash={flash} />
          </Suspense>
        </div>
      </div>

      {/* Toast */}
      {flashMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 bg-white text-black text-sm font-medium rounded-full shadow-lg animate-toast">
          {flashMsg}
        </div>
      )}
    </div>
  );
}
