/**
 * useColumnCount — responsive grid column count + gap.
 *
 * Breakpoints:
 *   < 640px   → 2 cols  (mobile phones)
 *   < 960px   → 3 cols  (tablets / small laptops)
 *   < 1360px  → 4 cols  (standard desktops)
 *   ≥ 1360px  → 5 cols  (large monitors — cards grow unbounded)
 *
 * Gap syncs with Tailwind's gap-2.5 (< 640) / sm:gap-3 (≥ 640).
 */

import { useState, useEffect } from "react";

interface ColumnConfig {
  cols: number;
  gridGap: string;
}

function getColumnConfig(width: number): ColumnConfig {
  if (width < 640) return { cols: 2, gridGap: "0.625rem" };
  if (width < 960) return { cols: 3, gridGap: "0.75rem" };
  if (width < 1360) return { cols: 4, gridGap: "0.75rem" };
  return { cols: 5, gridGap: "0.75rem" };
}

export function useColumnCount() {
  const [config, setConfig] = useState<ColumnConfig>(() => {
    if (typeof window === "undefined") {
      return { cols: 4, gridGap: "0.75rem" };
    }
    return getColumnConfig(window.innerWidth);
  });

  useEffect(() => {
    let rafId = 0;

    const update = () => {
      const next = getColumnConfig(window.innerWidth);
      setConfig((prev) =>
        prev.cols === next.cols && prev.gridGap === next.gridGap ? prev : next,
      );
    };

    const onResize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return config;
}