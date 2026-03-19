/**
 * admin-redirect.tsx — Redirects /admin* requests to canonical external admin.
 *
 * Used when VITE_ADMIN_CANONICAL_EXTERNAL=true. Preserves path and query
 * for deep links. Rollback: set VITE_ADMIN_CANONICAL_EXTERNAL=false.
 */

import { useEffect } from "react";
import { useLocation } from "react-router";

export interface AdminRedirectPageProps {
  baseUrl: string;
}

/** Build redirect target URL for canonical admin. Preserves path and query. */
export function buildCanonicalAdminRedirectUrl(
  baseUrl: string,
  pathname: string,
  search = "",
): string {
  return `${baseUrl.replace(/\/$/, "")}${pathname}${search}`;
}

export function AdminRedirectPage({ baseUrl }: AdminRedirectPageProps) {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const target = buildCanonicalAdminRedirectUrl(baseUrl, pathname, search);
    window.location.href = target;
  }, [baseUrl, pathname, search]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#060606] text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm text-neutral-400">Redirecting to admin...</p>
      </div>
    </div>
  );
}
