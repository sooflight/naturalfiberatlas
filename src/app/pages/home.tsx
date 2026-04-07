/**
 * home.tsx — Atlas shell: TopNav + GridView, shared across `/` and `/fiber/:id`.
 *
 * A pathless layout route wraps an index + `fiber/:fiberId` so opening a profile
 * does not unmount GridView (avoids full grid remount / scroll jump / CLS spikes).
 */

import { useState, useMemo } from "react";
import { Outlet } from "react-router";
import { GridView } from "../components/grid-view";
import { TopNav } from "../components/top-nav";
import { useEffect } from "react";

export type GridFiberSubcategory =
  | "plant"
  | "animal"
  | "regen"
  | "bast-fiber"
  | "bark-fiber"
  | "seed-fiber"
  | "leaf-fiber"
  | "grass-fiber"
  | "fruit-fiber"
  | "wool-fiber"
  | "silk-fiber"
  | "hair-fiber"
  | "specialty-protein";

export function mapNavToGridFilters(nodeId: string | null): {
  category: string;
  fiberSubcategory: GridFiberSubcategory | null;
} {
  if (!nodeId || nodeId === "home") return { category: "all", fiberSubcategory: null };

  if (["fiber", "textile", "dye"].includes(nodeId)) {
    return { category: nodeId, fiberSubcategory: null };
  }

  if (nodeId === "plant") {
    return { category: "fiber", fiberSubcategory: "plant" };
  }

  if (["bast-fiber", "bark-fiber", "seed-fiber", "leaf-fiber", "grass-fiber", "fruit-fiber"].includes(nodeId)) {
    return { category: "fiber", fiberSubcategory: nodeId as GridFiberSubcategory };
  }

  if (nodeId === "animal") {
    return { category: "fiber", fiberSubcategory: "animal" };
  }

  if (["wool-fiber", "silk-fiber", "hair-fiber", "specialty-protein"].includes(nodeId)) {
    return { category: "fiber", fiberSubcategory: nodeId as GridFiberSubcategory };
  }

  if (nodeId === "regen") {
    return { category: "fiber", fiberSubcategory: "regen" };
  }

  if (["woven", "knit", "nonwoven"].includes(nodeId)) {
    return { category: "textile", fiberSubcategory: null };
  }

  if (["natural-dye", "synthetic-dye", "bio-dye"].includes(nodeId)) {
    return { category: "dye", fiberSubcategory: null };
  }

  return { category: "all", fiberSubcategory: null };
}

export function HomeAtlasLayout() {
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [previewNodeId, setPreviewNodeId] = useState<string | null>(null);
  const [debouncedPreviewNodeId, setDebouncedPreviewNodeId] = useState<string | null>(null);
  /** Bumps on every TopNav commit so GridView can close detail even when `activeNodeId` is unchanged (e.g. re-clicking Plant after hover preview). */
  const [navInteractionEpoch, setNavInteractionEpoch] = useState(0);
  const [search, setSearch] = useState("");
  const [visibleProfileCount, setVisibleProfileCount] = useState(0);

  useEffect(() => {
    if (previewNodeId === null) {
      setDebouncedPreviewNodeId(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setDebouncedPreviewNodeId(previewNodeId);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [previewNodeId]);

  // Map TopNav selection to GridView category
  const effectiveNodeId = debouncedPreviewNodeId ?? activeNodeId;
  const { category: gridCategory, fiberSubcategory: gridFiberSubcategory } = useMemo(
    () => mapNavToGridFilters(effectiveNodeId),
    [effectiveNodeId],
  );

  return (
    <>
      <h1 className="sr-only">Natural Fiber Atlas</h1>
      <TopNav
        activeNodeId={activeNodeId}
        onNavigate={(id) => {
          setPreviewNodeId(null);
          setDebouncedPreviewNodeId(null);
          setActiveNodeId(id);
          setNavInteractionEpoch((e) => e + 1);
        }}
        onPreviewNavigate={setPreviewNodeId}
        externalSearch={search}
        onSearchChange={setSearch}
        visibleProfileCount={visibleProfileCount}
      >
        <GridView
          hideHeader
          navInteractionEpoch={navInteractionEpoch}
          externalCategory={gridCategory}
          externalFiberSubcategory={gridFiberSubcategory}
          externalSearch={search}
          onVisibleProfilesChange={setVisibleProfileCount}
          onCategoryChange={(cat) => {
            if (cat !== gridCategory) {
              setPreviewNodeId(null);
              setActiveNodeId(cat === "all" ? null : cat);
            }
          }}
          onSearchChange={setSearch}
        />
      </TopNav>
      <Outlet />
    </>
  );
}

/** Alias for lazy route / tests that expect the historical name */
export const HomePage = HomeAtlasLayout;
