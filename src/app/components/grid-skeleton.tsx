/**
 * GridSkeleton — lightweight placeholder for virtualized-out grid cells.
 *
 * Renders a minimal DOM footprint with `contain: content` so the compositor
 * can skip layout/paint entirely for off-screen placeholders. Matches the
 * 3:4 aspect ratio of real ProfileCards.
 *
 * The shimmer animation is pure CSS (no JS timers) and uses a single
 * pseudo-element gradient sweep for minimal compositing cost.
 */

import { memo } from "react";

export const GridSkeleton = memo(function GridSkeleton() {
  return (
    <div
      className="grid-skeleton absolute inset-0 rounded-[clamp(16px,3.5cqi,28px)] overflow-hidden"
      aria-hidden
    >
      {/* Inner content hint — mimics card structure at zero cost */}
      <div className="absolute inset-0 flex flex-col justify-end p-[clamp(10px,5cqi,22px)]">
        {/* Title bar skeleton */}
        <div
          className="skeleton-bar rounded-full mb-[clamp(4px,1.5cqi,8px)]"
          style={{ width: "65%", height: "clamp(8px, 3cqi, 14px)" }}
        />
        {/* Subtitle bar skeleton */}
        <div
          className="skeleton-bar rounded-full"
          style={{ width: "40%", height: "clamp(6px, 2cqi, 10px)" }}
        />
      </div>
    </div>
  );
});
