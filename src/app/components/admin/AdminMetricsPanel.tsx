import { useEffect, useState } from "react";
import { getAdminMetricsSummary } from "./runtime/admin-metrics";

export function AdminMetricsPanel() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 3000);
    return () => window.clearInterval(timer);
  }, []);

  void tick;
  const summary = getAdminMetricsSummary();

  return (
    <aside className="fixed bottom-10 right-3 z-[70] rounded-lg border border-white/[0.08] bg-black/80 px-3 py-2 text-white/70 backdrop-blur-md">
      <div className="mb-1 text-[9px] uppercase tracking-widest text-white/40">Admin Metrics (dev)</div>
      <div className="text-[10px]">events: {summary.totalEvents}</div>
      <div className="text-[10px]">route switches: {summary.routeTransitions}</div>
      <div className="text-[10px]">open/find completions: {summary.taskStats.open_find?.completeCount ?? 0}</div>
      <div className="text-[10px]">save completions: {summary.taskStats.edit_save?.completeCount ?? 0}</div>
      <div className="text-[10px]">save retries: {summary.taskStats.edit_save?.retryCount ?? 0}</div>
    </aside>
  );
}
