export type AdminMetricEventType =
  | "task_start"
  | "task_complete"
  | "task_error"
  | "retry_action"
  | "route_transition"
  | "rollback_action";

export type AdminTaskName =
  | "open_find"
  | "edit_save"
  | "import_review"
  | "bulk_apply"
  | "changeset_rollback";

export interface AdminMetricEvent {
  id: string;
  event: AdminMetricEventType;
  task?: AdminTaskName;
  route?: string;
  from?: string;
  to?: string;
  reason?: string;
  timestamp: number;
}

const STORAGE_KEY = "atlas:admin-metrics:v1";
const MAX_EVENTS = 1000;

function metricId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readEvents(): AdminMetricEvent[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed as AdminMetricEvent[];
  } catch {
    return [];
  }
}

function writeEvents(events: AdminMetricEvent[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
}

export function trackAdminMetric(event: Omit<AdminMetricEvent, "id" | "timestamp">): void {
  const entry: AdminMetricEvent = {
    id: metricId(),
    timestamp: Date.now(),
    ...event,
  };
  const events = readEvents();
  events.push(entry);
  writeEvents(events);
}

export function markTaskStart(task: AdminTaskName, context?: { route?: string }): void {
  trackAdminMetric({ event: "task_start", task, route: context?.route });
}

export function markTaskComplete(task: AdminTaskName, context?: { route?: string }): void {
  trackAdminMetric({ event: "task_complete", task, route: context?.route });
}

export function markTaskError(task: AdminTaskName, reason: string, context?: { route?: string }): void {
  trackAdminMetric({ event: "task_error", task, reason, route: context?.route });
}

export function markRetryAction(task: AdminTaskName, reason?: string, context?: { route?: string }): void {
  trackAdminMetric({ event: "retry_action", task, reason, route: context?.route });
}

export function markRollbackAction(context?: { route?: string }): void {
  trackAdminMetric({ event: "rollback_action", task: "changeset_rollback", route: context?.route });
}

export function trackAdminRouteTransition(from: string, to: string): void {
  if (from === to) return;
  trackAdminMetric({ event: "route_transition", from, to });
}

export function getAdminMetrics(): AdminMetricEvent[] {
  return readEvents();
}

export function clearAdminMetrics(): void {
  localStorage.removeItem(STORAGE_KEY);
}

interface TaskSummary {
  startCount: number;
  completeCount: number;
  errorCount: number;
  retryCount: number;
}

export function getAdminMetricsSummary(): {
  totalEvents: number;
  taskStats: Partial<Record<AdminTaskName, TaskSummary>>;
  routeTransitions: number;
  crossSurfaceTransitions: number;
  routeTransitionSuccessRate: number;
  crossSurfaceCompletionRate: number;
  rollbackInvocationRate: number;
} {
  const events = readEvents();
  const taskStats: Partial<Record<AdminTaskName, TaskSummary>> = {};
  let routeTransitions = 0;
  let crossSurfaceTransitions = 0;
  let taskStartWithRoute = 0;
  let taskCompleteWithRoute = 0;
  let rollbackCount = 0;
  for (const event of events) {
    if (event.event === "route_transition") {
      routeTransitions += 1;
      const fromRoot = event.from?.split("/")[1] ?? "";
      const toRoot = event.to?.split("/")[1] ?? "";
      if (fromRoot === "admin" && toRoot === "admin" && event.from !== event.to) {
        crossSurfaceTransitions += 1;
      }
      continue;
    }
    if (event.event === "rollback_action") {
      rollbackCount += 1;
    }
    if (!event.task) continue;
    if (!taskStats[event.task]) {
      taskStats[event.task] = {
        startCount: 0,
        completeCount: 0,
        errorCount: 0,
        retryCount: 0,
      };
    }
    const summary = taskStats[event.task]!;
    if (event.event === "task_start") summary.startCount += 1;
    if (event.event === "task_complete") summary.completeCount += 1;
    if (event.event === "task_error") summary.errorCount += 1;
    if (event.event === "retry_action") summary.retryCount += 1;
    if (event.route && event.event === "task_start") taskStartWithRoute += 1;
    if (event.route && event.event === "task_complete") taskCompleteWithRoute += 1;
  }
  const routeTransitionSuccessRate = routeTransitions === 0 ? 1 : (routeTransitions - (taskStats.edit_save?.errorCount ?? 0)) / routeTransitions;
  const crossSurfaceCompletionRate =
    taskStartWithRoute === 0 ? 1 : taskCompleteWithRoute / taskStartWithRoute;
  const rollbackInvocationRate =
    (taskStats.changeset_rollback?.startCount ?? 0) > 0
      ? rollbackCount / (taskStats.changeset_rollback?.startCount ?? 1)
      : rollbackCount / Math.max(1, taskCompleteWithRoute);

  return {
    totalEvents: events.length,
    taskStats,
    routeTransitions,
    crossSurfaceTransitions,
    routeTransitionSuccessRate,
    crossSurfaceCompletionRate,
    rollbackInvocationRate,
  };
}
