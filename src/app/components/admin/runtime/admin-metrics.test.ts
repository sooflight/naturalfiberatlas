import { describe, expect, it, beforeEach } from "vitest";
import {
  clearAdminMetrics,
  getAdminMetrics,
  getAdminMetricsSummary,
  markRollbackAction,
  markTaskComplete,
  markTaskError,
  markTaskStart,
  trackAdminRouteTransition,
} from "./admin-metrics";

describe("admin-metrics", () => {
  beforeEach(() => {
    clearAdminMetrics();
  });

  it("records task lifecycle events and summaries", () => {
    markTaskStart("open_find", { route: "/admin" });
    markTaskComplete("open_find", { route: "/admin" });

    const events = getAdminMetrics();
    expect(events.length).toBe(2);
    expect(events[0]?.event).toBe("task_start");
    expect(events[1]?.event).toBe("task_complete");

    const summary = getAdminMetricsSummary();
    expect(summary.taskStats.open_find?.startCount).toBe(1);
    expect(summary.taskStats.open_find?.completeCount).toBe(1);
    expect(summary.crossSurfaceCompletionRate).toBeGreaterThan(0);
  });

  it("tracks errors and route transitions", () => {
    markTaskStart("edit_save", { route: "/admin/hemp" });
    markTaskError("edit_save", "network_error", { route: "/admin/hemp" });
    trackAdminRouteTransition("/admin", "/admin/images");
    markRollbackAction({ route: "/admin/changesets" });

    const events = getAdminMetrics();
    expect(events.some((entry) => entry.event === "task_error")).toBe(true);
    expect(events.some((entry) => entry.event === "route_transition")).toBe(true);
    expect(events.some((entry) => entry.event === "rollback_action")).toBe(true);

    const summary = getAdminMetricsSummary();
    expect(summary.crossSurfaceTransitions).toBeGreaterThanOrEqual(0);
    expect(summary.rollbackInvocationRate).toBeGreaterThanOrEqual(0);
  });
});
