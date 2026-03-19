type TelemetryLevel = "info" | "warn" | "error";

interface TelemetryPayload {
  event: string;
  level?: TelemetryLevel;
  source?: string;
  message?: string;
  data?: Record<string, unknown>;
}

const RUNTIME = typeof window === "undefined" ? "server" : "browser";

export function trackEvent(payload: TelemetryPayload) {
  const event = {
    timestamp: new Date().toISOString(),
    runtime: RUNTIME,
    level: payload.level ?? "info",
    ...payload,
  };

  if (import.meta.env.DEV) {
    console.debug("[telemetry]", event);
  }

  if (typeof window === "undefined") return;
  if (!("sendBeacon" in navigator)) return;

  try {
    const blob = new Blob([JSON.stringify(event)], {
      type: "application/json",
    });
    navigator.sendBeacon("/__telemetry/client", blob);
  } catch (error) {
    // Never block UX for telemetry failures.
    if (import.meta.env.DEV) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("[telemetry] sendBeacon failed:", message);
    }
  }
}
