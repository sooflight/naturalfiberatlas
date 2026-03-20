/**
 * home.tsx — Index page wrapping the main GridView atlas experience.
 *
 * Integration: TopNav provides navigation chrome + search, GridView handles content.
 */

import { useState, useMemo } from "react";
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

export function HomePage() {
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [previewNodeId, setPreviewNodeId] = useState<string | null>(null);
  const [debouncedPreviewNodeId, setDebouncedPreviewNodeId] = useState<string | null>(null);
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
    <TopNav
      activeNodeId={activeNodeId}
      onNavigate={(id) => {
        setPreviewNodeId(null);
        setDebouncedPreviewNodeId(null);
        setActiveNodeId(id);
      }}
      onPreviewNavigate={setPreviewNodeId}
      externalSearch={search}
      onSearchChange={setSearch}
      visibleProfileCount={visibleProfileCount}
    >
      <GridView
        hideHeader
        externalCategory={gridCategory}
        externalFiberSubcategory={gridFiberSubcategory}
        externalSearch={search}
        onVisibleProfilesChange={setVisibleProfileCount}
        onCategoryChange={(cat) => {
          // GridView category change → update TopNav if needed
          if (cat !== gridCategory) {
            setPreviewNodeId(null);
            setActiveNodeId(cat === "all" ? null : cat);
          }
        }}
        onSearchChange={setSearch}
      />
    </TopNav>
  );
}
