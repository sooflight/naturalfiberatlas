const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

function readHostRuntimeBaseUrl(): string {
  if (typeof window === "undefined") return "";
  const config = (window as unknown as {
    __NFA_ADMIN_HOST_CONFIG?: { runtime?: { apiBaseUrl?: string } };
  }).__NFA_ADMIN_HOST_CONFIG;
  return trimTrailingSlash(config?.runtime?.apiBaseUrl || "");
}

export function getApiBaseUrl(): string {
  const hostBaseUrl = readHostRuntimeBaseUrl();
  if (hostBaseUrl) {
    return hostBaseUrl;
  }
  return trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || "");
}

export const apiBaseUrl = getApiBaseUrl();
export const apiKey = import.meta.env.VITE_API_KEY || "";
export const apiBearerToken = import.meta.env.VITE_API_BEARER_TOKEN || "";

export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const resolvedBaseUrl = getApiBaseUrl();
  if (!resolvedBaseUrl) return `/${normalizedPath}`;
  return `${resolvedBaseUrl}/${normalizedPath}`;
}
