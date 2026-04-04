/**
 * not-found.tsx — 404 page for unmatched routes.
 */

import { useEffect } from "react";
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";

export function NotFoundPage() {
  useEffect(() => {
    const prev = document.title;
    document.title = "Page not found — Natural Fiber Atlas";
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <div className="min-h-dvh bg-[#111111] text-white flex items-center justify-center">
      <main className="text-center space-y-6 px-6" aria-labelledby="not-found-heading">
        <h1
          id="not-found-heading"
          className="text-white/10 tracking-[0.2em] uppercase"
          style={{ fontSize: "64px", fontWeight: 200, lineHeight: 1 }}
        >
          404
        </h1>
        <p className="text-white/30" style={{ fontSize: "13px" }}>
          We could not find that page in the Atlas.
        </p>
        <p className="text-white/20" style={{ fontSize: "11px" }}>
          Try returning home and using search or category filters.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20 transition-colors"
          style={{ fontSize: "12px" }}
        >
          <ArrowLeft size={13} />
          Return to Atlas
        </Link>
      </main>
    </div>
  );
}
