import React, { useState, useEffect, useMemo } from "react";
import { BarChart3, Activity, Database, TrendingUp, AlertTriangle, RefreshCw, Zap, HardDrive, Clock, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/database-interface/lib/utils";
import { getDataSourceStats, getCacheHitRate, getRecentEvents, clearTelemetry } from "@/utils/dataSourceTelemetry";
import { getActivityLog, ActivityEvent, ActivityAction, ActivityEntityType } from "@/utils/activityLog";

/**
 * Overview Domain - System health and telemetry dashboard.
 *
 * Enhanced with real telemetry data:
 * - Data source performance metrics (KV vs JSON)
 * - Cache hit rates and performance
 * - Activity log with real user actions
 * - System health monitoring
 * - Error tracking and alerts
 */
export default function OverviewDomain() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activityFilter, setActivityFilter] = useState<{
    action?: ActivityAction;
    entityType?: ActivityEntityType;
  }>({});

  // Get real telemetry data
  const dataSourceStats = useMemo(() => getDataSourceStats(), [refreshTrigger]);
  const cacheHitRate = useMemo(() => getCacheHitRate(), [refreshTrigger]);
  const recentTelemetry = useMemo(() => getRecentEvents(20), [refreshTrigger]);

  // Get activity log data
  const activityLog = useMemo(() => {
    return getActivityLog({
      ...activityFilter,
      limit: 10,
    });
  }, [activityFilter, refreshTrigger]);

  // Calculate derived metrics
  const totalDataOverview = dataSourceStats.kv.reads + dataSourceStats.kv.writes +
                             dataSourceStats.json.reads + dataSourceStats.json.writes;
  const dataSourceHealth = totalDataOverview > 0 ?
    Math.round(((totalDataOverview - (dataSourceStats.kv.errors + dataSourceStats.json.errors)) / totalDataOverview) * 100) : 100;

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleClearTelemetry = () => {
    clearTelemetry();
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Domain Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <h1 className="text-sm font-semibold">Overview</h1>
          <p className="text-xs text-neutral-500 ml-2">System health & telemetry</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClearTelemetry}
            className="px-2.5 py-1.5 text-xs text-neutral-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
          >
            Clear Data
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-neutral-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Real-time Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-neutral-400" />
              <span className="text-xs text-neutral-500">Data Overview</span>
            </div>
            <div className="text-2xl font-semibold text-white">{totalDataOverview.toLocaleString()}</div>
            <div className="text-xs text-neutral-400 mt-1">Total reads/writes</div>
          </div>

          <div className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-neutral-500">Cache Hit Rate</span>
            </div>
            <div className="text-2xl font-semibold text-white">{cacheHitRate}%</div>
            <div className="text-xs text-emerald-400 mt-1">
              {dataSourceStats.cache.hits} hits, {dataSourceStats.cache.misses} misses
            </div>
          </div>

          <div className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-green-400" />
              <span className="text-xs text-neutral-500">System Health</span>
            </div>
            <div className="text-2xl font-semibold text-white">{dataSourceHealth}%</div>
            <div className="text-xs text-neutral-400 mt-1">Success rate</div>
          </div>

          <div className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-neutral-500">Activity Events</span>
            </div>
            <div className="text-2xl font-semibold text-white">{activityLog.length}</div>
            <div className="text-xs text-neutral-400 mt-1">Recent actions</div>
          </div>
        </div>

        {/* Data Source Performance */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-white mb-4">Data Source Performance</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white">KV Store</span>
                <span className={cn(
                  "px-2 py-1 rounded text-xs font-medium",
                  dataSourceStats.kv.errors > 0 ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
                )}>
                  {dataSourceStats.kv.errors > 0 ? "Issues" : "Healthy"}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Reads:</span>
                  <span className="text-white">{dataSourceStats.kv.reads}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Writes:</span>
                  <span className="text-white">{dataSourceStats.kv.writes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Errors:</span>
                  <span className="text-red-400">{dataSourceStats.kv.errors}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white">JSON Files</span>
                <span className={cn(
                  "px-2 py-1 rounded text-xs font-medium",
                  dataSourceStats.json.errors > 0 ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
                )}>
                  {dataSourceStats.json.errors > 0 ? "Issues" : "Healthy"}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Reads:</span>
                  <span className="text-white">{dataSourceStats.json.reads}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Writes:</span>
                  <span className="text-white">{dataSourceStats.json.writes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Errors:</span>
                  <span className="text-red-400">{dataSourceStats.json.errors}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-white">Recent Activity</h2>
            <div className="flex items-center gap-2">
              <select
                value={activityFilter.action || ""}
                onChange={(e) => setActivityFilter(prev => ({
                  ...prev,
                  action: e.target.value as ActivityAction || undefined
                }))}
                className="bg-white/[0.04] text-white px-2 py-1 rounded text-xs border border-white/[0.06] focus:border-blue-500/50 focus:outline-none"
              >
                <option value="">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="import">Import</option>
                <option value="ai-generate">AI Generate</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            {activityLog.map((event) => (
              <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.04] bg-white/[0.01]">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  event.action === "create" ? "bg-emerald-400" :
                  event.action === "update" ? "bg-blue-400" :
                  event.action === "delete" ? "bg-red-400" :
                  event.action === "import" ? "bg-purple-400" :
                  event.action === "ai-generate" ? "bg-orange-400" : "bg-gray-400"
                )} />
                <div className="flex-1">
                  <p className="text-sm text-white">{event.summary}</p>
                  <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1">
                    <span className="capitalize">{event.entityType}</span>
                    <span>•</span>
                    <span>{event.tab}</span>
                    <span>•</span>
                    <span>{new Date(event.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}

            {activityLog.length === 0 && (
              <div className="text-center py-8 text-neutral-500">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No activity recorded yet</p>
                <p className="text-xs mt-1 opacity-60">User actions will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Telemetry Events */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-white mb-4">Data Source Events</h2>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {recentTelemetry.slice(-10).reverse().map((event, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg border border-white/[0.04] bg-white/[0.01] text-xs">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  event.success ? "bg-emerald-400" : "bg-red-400"
                )} />
                <span className="text-neutral-400 uppercase">{event.source}</span>
                <span className="text-white">{event.action}</span>
                {event.slug && <span className="text-neutral-500">({event.slug})</span>}
                <span className="text-neutral-500 ml-auto">
                  {event.duration > 0 ? `${event.duration}ms` : ""}
                </span>
                <span className="text-neutral-600">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}

            {recentTelemetry.length === 0 && (
              <div className="text-center py-4 text-neutral-500">
                <Zap className="w-6 h-6 mx-auto mb-1 opacity-50" />
                <p className="text-xs">No telemetry events recorded</p>
              </div>
            )}
          </div>
        </div>

        {/* System Alerts */}
        {(dataSourceStats.kv.errors > 0 || dataSourceStats.json.errors > 0) && (
          <div className="p-4 rounded-lg border border-red-500/20 bg-red-500/5 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-400">Data Source Errors Detected</p>
              <p className="text-xs text-neutral-400 mt-1">
                {dataSourceStats.kv.errors + dataSourceStats.json.errors} errors occurred recently.
                Check the telemetry events above for details.
              </p>
            </div>
          </div>
        )}

        {cacheHitRate < 50 && totalDataOverview > 10 && (
          <div className="mt-4 p-4 rounded-lg border border-blue-500/20 bg-blue-500/5 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-blue-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-400">Low Cache Performance</p>
              <p className="text-xs text-neutral-400 mt-1">
                Cache hit rate is {cacheHitRate}%. Consider optimizing data access patterns or cache configuration.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
