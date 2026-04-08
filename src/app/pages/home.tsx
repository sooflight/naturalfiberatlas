/**
 * home.tsx — Atlas shell: TopNav + GridView, shared across `/` and `/fiber/:id`.
 *
 * A pathless layout route wraps an index + `fiber/:fiberId` so opening a profile
 * does not unmount GridView (avoids full grid remount / scroll jump / CLS spikes).
 */

import { useState, useMemo } from "react";
import { Outlet, useNavigate } from "react-router";
import { AtlasSiteFooter } from "../components/atlas-site-footer";
import { GridView } from "../components/grid-view";
import { TopNav } from "../components/top-nav";
import { useColumnCount } from "../hooks/use-column-count";
import { useEffect } from "react";
import { mapNavToGridFilters, type GridFiberSubcategory } from "../data/map-nav-to-grid-filters";

export type { GridFiberSubcategory };
export { mapNavToGridFilters };

export function HomeAtlasLayout() {
  const navigate = useNavigate();
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [previewNodeId, setPreviewNodeId] = useState<string | null>(null);
  const [debouncedPreviewNodeId, setDebouncedPreviewNodeId] = useState<string | null>(null);
  /** Bumps on every TopNav commit so GridView can close detail even when `activeNodeId` is unchanged (e.g. re-clicking Plant after hover preview). */
  const [navInteractionEpoch, setNavInteractionEpoch] = useState(0);
  const [search, setSearch] = useState("");
  const [visibleProfileCount, setVisibleProfileCount] = useState(0);
  const [profileDetailOpen, setProfileDetailOpen] = useState(false);

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

  const { cols, gridGap } = useColumnCount();
  const columnGap = cols <= 2 ? "0.875rem" : gridGap;

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
          if (id === "home") {
            navigate({ pathname: "/", search: "", hash: "" }, { replace: true });
          }
        }}
        onBackToBrowse={() => {
          setPreviewNodeId(null);
          setDebouncedPreviewNodeId(null);
          setActiveNodeId(null);
          setNavInteractionEpoch((e) => e + 1);
          if (window.history.length > 1) {
            navigate(-1);
            return;
          }
          navigate({ pathname: "/", search: "", hash: "" }, { replace: true });
        }}
        onPreviewNavigate={setPreviewNodeId}
        externalSearch={search}
        onSearchChange={setSearch}
        visibleProfileCount={visibleProfileCount}
        hideCategoryNavStrip={profileDetailOpen}
      >
        <div className="flex min-h-[min-content] w-full flex-1 flex-col">
          <GridView
            includeSiteFooter={false}
            hideHeader
            navInteractionEpoch={navInteractionEpoch}
            externalCategory={gridCategory}
            externalFiberSubcategory={gridFiberSubcategory}
            externalSearch={search}
            onVisibleProfilesChange={setVisibleProfileCount}
            onProfileDetailOpenChange={setProfileDetailOpen}
            onCategoryChange={(cat) => {
              if (cat !== gridCategory) {
                setPreviewNodeId(null);
                setActiveNodeId(cat === "all" ? null : cat);
              }
            }}
            onSearchChange={setSearch}
          />
          <div className="min-h-0 min-w-0 flex-1 basis-0" aria-hidden />
          <AtlasSiteFooter
            cols={cols}
            columnGap={columnGap}
            className="shrink-0 px-4 sm:px-[3%]"
          />
        </div>
      </TopNav>
      <Outlet />
    </>
  );
}

/** Alias for lazy route / tests that expect the historical name */
export const HomePage = HomeAtlasLayout;
