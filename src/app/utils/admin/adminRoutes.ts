import { FEATURE_FLAGS } from "@/config/featureFlags";
import { getAuthHeaders } from "./api/client";

const EDGE_ADMIN_PREFIX = "/make-server-4a437a67/admin";

export function adminRoute(path: string): string {
  if (!FEATURE_FLAGS.canonicalAdminApi) return path;
  if (!path.startsWith("/__admin/")) return path;
  return `${EDGE_ADMIN_PREFIX}/${path.replace("/__admin/", "")}`;
}

export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const authHeaders = await getAuthHeaders();
  const targetUrl = adminRoute(url);
  const requestInit: RequestInit = {
    ...options,
    headers: {
      ...options.headers,
      ...authHeaders,
      "Content-Type": "application/json",
    },
  };

  const response = await fetch(targetUrl, requestInit);
  const canFallbackToLegacyAdminRoute =
    FEATURE_FLAGS.canonicalAdminApi &&
    url.startsWith("/__admin/") &&
    targetUrl !== url &&
    response.status === 404;

  if (canFallbackToLegacyAdminRoute) {
    return fetch(url, requestInit);
  }

  return response;
}

