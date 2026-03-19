export interface AdminTelemetryAdapter {
  track: (event: string, payload?: Record<string, unknown>) => void;
}

export interface AdminAuthAdapter {
  getAccessToken: () => Promise<string | null> | string | null;
}

export interface AdminRuntimeConfig {
  apiBaseUrl?: string;
}

export interface AdminHostConfig {
  auth: AdminAuthAdapter;
  runtime?: AdminRuntimeConfig;
  featureFlags?: Record<string, boolean>;
  telemetry?: AdminTelemetryAdapter;
}
