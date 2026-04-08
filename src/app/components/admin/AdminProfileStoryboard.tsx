import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, SlidersHorizontal, Columns, Crop, BarChart3 } from "lucide-react";
import { toUrlArray } from "../../utils/admin/imageUrl";
import { TRANSFORM_PRESETS, type TransformRecipe } from "../../types/cloudinary-transform";
import { buildOptimizedUrl, buildTransformUrl } from "../../utils/admin/cloudinary";
import { getMonthlySummary, recordTransformEvent } from "../../utils/admin/cloudinary-telemetry";
import ImageContextMenu, { type ContextMenuState } from "./ImageContextMenu";
import { TransformPreviewPanel } from "./TransformPreviewPanel";
import { useAtlasImageMutations } from "./hooks/useAtlasImageMutations";

interface AdminProfileStoryboardProps {
  nodeId: string;
  nodeLabel: string;
  initialImages: string[];
  onClose: () => void;
}

const MIN_TILE_WIDTH = 120;
const MAX_TILE_WIDTH = 360;
const TILE_STEP = 20;

export function reorderStoryboardUrls(urls: string[], fromIdx: number, toIdx: number): string[] {
  if (fromIdx === toIdx) return urls;
  const next = [...urls];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return next;
}

export function clampStoryboardTileWidth(width: number): number {
  return Math.max(MIN_TILE_WIDTH, Math.min(MAX_TILE_WIDTH, width));
}

export function AdminProfileStoryboard({
  nodeId,
  nodeLabel,
  initialImages,
  onClose,
}: AdminProfileStoryboardProps) {
  const { images, addImages, reorderImages, removeImage } = useAtlasImageMutations(
    { [nodeId]: initialImages },
    { preferredOverlay: { [nodeId]: initialImages } }
  );
  const persistedUrls = useMemo(() => toUrlArray(images[nodeId]), [images, nodeId]);
  const [localUrls, setLocalUrls] = useState<string[]>(persistedUrls);
  const [tileWidth, setTileWidth] = useState(MAX_TILE_WIDTH - TILE_STEP); // default: second-highest zoom interval

  // Generate optimized URLs for grid thumbnails (eco quality + webp)
  const optimizedTileUrls = useMemo(() => {
    return localUrls.map((url) =>
      buildOptimizedUrl(url, {
        quality: "auto:eco",
        format: "webp",
        width: Math.max(400, tileWidth * 2), // 2x for retina displays
      })
    );
  }, [localUrls, tileWidth]);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<TransformRecipe | null>(null);
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [splitPosition, setSplitPosition] = useState(50); // 0-100 percentage
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [showTransformPanel, setShowTransformPanel] = useState(false);
  const [transformTargetIndex, setTransformTargetIndex] = useState<number | null>(null);
  const dragIdxRef = useRef<number | null>(null);
  const presetDropdownRef = useRef<HTMLDivElement>(null);
  const lightboxContainerRef = useRef<HTMLDivElement>(null);

  // Variant role state (Step 8)
  const [variantRoles, setVariantRoles] = useState<Record<number, "original" | "hero" | "thumb" | "detail" | "zoom">>({});

  // Multi-select state (Step 9)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [batchJob, setBatchJob] = useState<{
    status: "idle" | "running" | "completed" | "failed";
    progress: number;
    total: number;
    current: number;
  } | null>(null);

  // Active URL for lightbox
  const activeUrl =
    lightboxIndex != null && localUrls[lightboxIndex] ? localUrls[lightboxIndex] : null;

  // Generate comparison URL when preset is selected and compare mode is on
  const comparisonUrl = useMemo(() => {
    if (!activeUrl || !selectedPreset || !compareMode) return null;
    return buildTransformUrl(activeUrl, {
      crop: selectedPreset.crop,
      effects: selectedPreset.effects,
      optimize: selectedPreset.optimize,
    });
  }, [activeUrl, selectedPreset, compareMode]);

  useEffect(() => {
    setLocalUrls(persistedUrls);
  }, [persistedUrls]);

  // Close preset dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        presetDropdownRef.current &&
        !presetDropdownRef.current.contains(event.target as Node)
      ) {
        setShowPresetDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const clampTileWidth = useCallback((width: number) => clampStoryboardTileWidth(width), []);

  const zoomIn = useCallback(
    () => setTileWidth((w) => clampTileWidth(w + TILE_STEP)),
    [clampTileWidth],
  );
  const zoomOut = useCallback(
    () => setTileWidth((w) => clampTileWidth(w - TILE_STEP)),
    [clampTileWidth],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + A to select all
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        if (lightboxIndex == null) {
          setSelectedIndices(new Set(localUrls.map((_, i) => i)));
        }
        return;
      }

      if (event.key === "Escape") {
        if (lightboxIndex != null) {
          setLightboxIndex(null);
          return;
        }
        if (showPresetDropdown) {
          setShowPresetDropdown(false);
          return;
        }
        if (selectedIndices.size > 0) {
          setSelectedIndices(new Set());
          setLastSelectedIndex(null);
          return;
        }
        onClose();
      }
      if (event.key === "+" || event.key === "=") zoomIn();
      if (event.key === "-") zoomOut();
      if (event.key.toLowerCase() === "b" && lightboxIndex != null) {
        setCompareMode((prev) => !prev);
      }
      if (lightboxIndex == null) return;
      if (event.key === "ArrowRight") {
        setLightboxIndex((idx) => {
          if (idx == null || localUrls.length === 0) return idx;
          return (idx + 1) % localUrls.length;
        });
      }
      if (event.key === "ArrowLeft") {
        setLightboxIndex((idx) => {
          if (idx == null || localUrls.length === 0) return idx;
          return (idx - 1 + localUrls.length) % localUrls.length;
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxIndex, localUrls, onClose, showPresetDropdown, zoomIn, zoomOut, selectedIndices.size]);

  const openMenu = useCallback(
    (event: React.MouseEvent, imageUrl: string, index: number) => {
      event.preventDefault();
      setMenu({
        x: event.clientX,
        y: event.clientY,
        imageUrl,
        sourceProfile: nodeId,
        sourceIndex: index,
        sourceCount: localUrls.length,
      });
    },
    [localUrls.length, nodeId],
  );

  const handleSend = useCallback(
    (targetProfile: string) => {
      if (!menu || menu.sourceIndex == null || targetProfile === nodeId) return;
      const url = localUrls[menu.sourceIndex];
      if (!url) return;
      setLocalUrls((prev) => prev.filter((_, idx) => idx !== menu.sourceIndex));
      void addImages(targetProfile, [url]);
      void removeImage(nodeId, menu.sourceIndex);
    },
    [addImages, localUrls, menu, nodeId, removeImage],
  );

  const handleSendToFront = useCallback(
    (profile: string, index: number) => {
      if (profile !== nodeId) return;
      setLocalUrls((prev) => reorderStoryboardUrls(prev, index, 0));
      void reorderImages(nodeId, index, 0);
    },
    [nodeId, reorderImages],
  );

  const handleSendToBack = useCallback(
    (profile: string, index: number) => {
      if (profile !== nodeId || localUrls.length < 2) return;
      const targetIndex = localUrls.length - 1;
      setLocalUrls((prev) => reorderStoryboardUrls(prev, index, targetIndex));
      void reorderImages(nodeId, index, targetIndex);
    },
    [localUrls.length, nodeId, reorderImages],
  );

  const handleDelete = useCallback(
    (profile: string, index: number) => {
      if (profile !== nodeId) return;
      setLocalUrls((prev) => prev.filter((_, idx) => idx !== index));
      void removeImage(nodeId, index);
    },
    [nodeId, removeImage],
  );

  const onDragStart = useCallback((event: React.DragEvent, index: number) => {
    dragIdxRef.current = index;
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent, targetIndex: number) => {
      event.preventDefault();
      const sourceIndex = dragIdxRef.current;
      dragIdxRef.current = null;
      if (sourceIndex == null || sourceIndex === targetIndex) return;
      setLocalUrls((prev) => reorderStoryboardUrls(prev, sourceIndex, targetIndex));
      void reorderImages(nodeId, sourceIndex, targetIndex);
    },
    [nodeId, reorderImages],
  );

  // Split view drag handlers
  const handleSplitDragStart = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setIsDraggingSplit(true);
  }, []);

  const handleSplitDragMove = useCallback(
    (event: MouseEvent) => {
      if (!isDraggingSplit || !lightboxContainerRef.current) return;

      const rect = lightboxContainerRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const percentage = Math.max(10, Math.min(90, (x / rect.width) * 100));
      setSplitPosition(percentage);
    },
    [isDraggingSplit],
  );

  const handleSplitDragEnd = useCallback(() => {
    setIsDraggingSplit(false);
  }, []);

  // Add/remove global mouse listeners for split dragging
  useEffect(() => {
    if (isDraggingSplit) {
      document.addEventListener("mousemove", handleSplitDragMove);
      document.addEventListener("mouseup", handleSplitDragEnd);
      return () => {
        document.removeEventListener("mousemove", handleSplitDragMove);
        document.removeEventListener("mouseup", handleSplitDragEnd);
      };
    }
  }, [isDraggingSplit, handleSplitDragMove, handleSplitDragEnd]);

  // Step 11: Transform History
  const [transformHistory, setTransformHistory] = useState<
    Array<{
      id: string;
      index: number;
      originalUrl: string;
      transformedUrl: string;
      recipe: TransformRecipe;
      appliedAt: string;
    }>
  >([]);
  const [showHistory, setShowHistory] = useState(false);

  // Step 12: Cost Telemetry Dashboard
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [telemetrySummary, setTelemetrySummary] = useState({
    totalTransforms: 0,
    totalCredits: 0,
    savingsPercent: 0,
    recommendations: [] as string[],
  });

  // Update telemetry summary periodically
  useEffect(() => {
    const updateSummary = () => {
      setTelemetrySummary(getMonthlySummary());
    };
    updateSummary();
    const interval = setInterval(updateSummary, 30000);
    return () => clearInterval(interval);
  }, []);

  // Record transform in history
  const recordTransform = useCallback((index: number, originalUrl: string, transformedUrl: string, recipe: TransformRecipe) => {
    setTransformHistory((prev) => [
      {
        id: `hist-${Date.now()}-${index}`,
        index,
        originalUrl,
        transformedUrl,
        recipe,
        appliedAt: new Date().toISOString(),
      },
      ...prev,
    ].slice(0, 50));
  }, []);

  // Rollback to original
  const handleRollback = useCallback((historyEntryId: string) => {
    const entry = transformHistory.find((h) => h.id === historyEntryId);
    if (!entry) return;
    setLocalUrls((prev) => {
      const next = [...prev];
      next[entry.index] = entry.originalUrl;
      return next;
    });
    setTransformHistory((prev) => prev.filter((h) => h.id !== historyEntryId));
  }, [transformHistory]);

  // Clear all history
  const handleClearHistory = useCallback(() => {
    setTransformHistory([]);
  }, []);

  // Handle applying a transform from the preview panel
  const handleApplyTransform = useCallback((recipe: TransformRecipe) => {
    if (transformTargetIndex == null) return;
    
    // Build the transformed URL
    const originalUrl = localUrls[transformTargetIndex];
    if (!originalUrl) return;

    const transformedUrl = buildTransformUrl(originalUrl, {
      crop: recipe.crop,
      effects: recipe.effects,
      optimize: recipe.optimize,
    });

    // Record in history (Step 11)
    recordTransform(transformTargetIndex, originalUrl, transformedUrl, recipe);

    // Record telemetry (Step 12)
    recordTransformEvent(recipe, 1);
    setTelemetrySummary(getMonthlySummary());

    // Update the URL at the target index
    setLocalUrls((prev) => {
      const next = [...prev];
      next[transformTargetIndex] = transformedUrl;
      return next;
    });

    // Close the panel
    setShowTransformPanel(false);
    setTransformTargetIndex(null);
  }, [transformTargetIndex, localUrls, recordTransform]);

  // Open transform panel for an image
  const handleOpenTransform = useCallback((index: number) => {
    setTransformTargetIndex(index);
    setShowTransformPanel(true);
    setMenu(null); // Close context menu if open
  }, []);

  // Step 8: Variant role management
  const handleSetRole = useCallback((index: number, role: "original" | "hero" | "thumb" | "detail" | "zoom") => {
    setVariantRoles((prev) => ({
      ...prev,
      [index]: role,
    }));
  }, []);

  const handlePromoteToHero = useCallback((index: number) => {
    handleSetRole(index, "hero");
    // Also clear any previous hero
    setVariantRoles((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (next[Number(key)] === "hero" && Number(key) !== index) {
          next[Number(key)] = "original";
        }
      });
      next[index] = "hero";
      return next;
    });
  }, [handleSetRole]);

  // Get role badge for an index
  const getRoleBadge = (index: number) => {
    const role = variantRoles[index];
    if (!role || role === "original") return null;

    const badges: Record<string, { icon: string; color: string; label: string }> = {
      hero: { icon: "★", color: "#60a5fa", label: "Hero" },
      thumb: { icon: "🖼", color: "#60a5fa", label: "Thumb" },
      detail: { icon: "🔍", color: "#a78bfa", label: "Detail" },
      zoom: { icon: "⚡", color: "#f472b6", label: "Zoom" },
    };

    const badge = badges[role];
    if (!badge) return null;

    return (
      <div
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          padding: "3px 8px",
          borderRadius: 4,
          background: "rgba(0,0,0,0.7)",
          color: badge.color,
          fontSize: 10,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 4,
          border: `1px solid ${badge.color}40`,
        }}
      >
        <span>{badge.icon}</span>
        <span>{badge.label}</span>
      </div>
    );
  };

  // Step 9: Multi-select handlers
  const handleTileClick = useCallback((event: React.MouseEvent, index: number) => {
    // Cmd/Ctrl click for toggle selection
    if (event.metaKey || event.ctrlKey) {
      event.preventDefault();
      setSelectedIndices((prev) => {
        const next = new Set(prev);
        if (next.has(index)) {
          next.delete(index);
        } else {
          next.add(index);
        }
        return next;
      });
      setLastSelectedIndex(index);
      return;
    }

    // Shift click for range selection
    if (event.shiftKey && lastSelectedIndex !== null) {
      event.preventDefault();
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      setSelectedIndices((prev) => {
        const next = new Set(prev);
        for (let i = start; i <= end; i++) {
          next.add(i);
        }
        return next;
      });
      setLastSelectedIndex(index);
      return;
    }

    // Regular click - open lightbox (clear selection if clicking non-selected)
    if (!selectedIndices.has(index)) {
      setSelectedIndices(new Set());
    }
    setLightboxIndex(index);
  }, [lastSelectedIndex, selectedIndices]);

  const handleSelectAll = useCallback(() => {
    setSelectedIndices(new Set(localUrls.map((_, i) => i)));
  }, [localUrls]);

  const handleClearSelection = useCallback(() => {
    setSelectedIndices(new Set());
    setLastSelectedIndex(null);
  }, []);

  const handleBatchTransform = useCallback(async (recipe: TransformRecipe) => {
    if (selectedIndices.size === 0) return;

    const indices = Array.from(selectedIndices).sort((a, b) => a - b);
    setBatchJob({
      status: "running",
      progress: 0,
      total: indices.length,
      current: 0,
    });

    // Process each image
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      const url = localUrls[idx];
      if (!url) continue;

      const transformedUrl = buildTransformUrl(url, {
        crop: recipe.crop,
        effects: recipe.effects,
        optimize: recipe.optimize,
      });

      // Update URL
      setLocalUrls((prev) => {
        const next = [...prev];
        next[idx] = transformedUrl;
        return next;
      });

      // Update progress
      setBatchJob((prev) =>
        prev ? { ...prev, current: i + 1, progress: ((i + 1) / indices.length) * 100 } : null
      );

      // Small delay for visual feedback
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    setBatchJob((prev) => (prev ? { ...prev, status: "completed" } : null));
    setTimeout(() => setBatchJob(null), 2000);
    setSelectedIndices(new Set());
  }, [selectedIndices, localUrls]);

  const selectionCount = selectedIndices.size;

  // Step 10: Quick enhance handler
  const handleQuickEnhance = useCallback((index: number, effect: "sharpen" | "improve" | "vibrance") => {
    const url = localUrls[index];
    if (!url) return;

    const effects: Record<string, { sharpen?: boolean; improve?: boolean; vibrance?: boolean }> = {
      sharpen: { sharpen: true },
      improve: { improve: true },
      vibrance: { vibrance: true },
    };

    const transformedUrl = buildTransformUrl(url, {
      effects: effects[effect],
      optimize: { quality: "auto:best" },
    });

    setLocalUrls((prev) => {
      const next = [...prev];
      next[index] = transformedUrl;
      return next;
    });
  }, [localUrls]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 220,
        background: "rgba(6,6,6,0.96)",
        backdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <h2
          style={{
            margin: 0,
            color: "#f6f3ef",
            fontSize: 13,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontFamily: "'Pica', sans-serif",
          }}
        >
          {nodeLabel} Storyboard
        </h2>

        {/* Selection controls (Step 9) */}
        {selectionCount > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 12px",
              borderRadius: 6,
              background: "rgba(96,165,250,0.15)",
              border: "1px solid rgba(96,165,250,0.3)",
            }}
          >
            <span style={{ fontSize: 11, color: "#60a5fa" }}>
              {selectionCount} selected
            </span>
            {batchJob?.status === "running" && (
              <div
                style={{
                  width: 60,
                  height: 4,
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${batchJob.progress}%`,
                    height: "100%",
                    background: "#60a5fa",
                    transition: "width 0.1s ease",
                  }}
                />
              </div>
            )}
            <button
              onClick={handleClearSelection}
              style={{
                padding: "2px 8px",
                borderRadius: 4,
                border: "none",
                background: "rgba(255,255,255,0.1)",
                color: "#f0ebe4",
                fontSize: 10,
                cursor: "pointer",
              }}
            >
              Clear
            </button>
            {selectedPreset && (
              <button
                onClick={() => handleBatchTransform(selectedPreset)}
                disabled={batchJob?.status === "running"}
                style={{
                  padding: "2px 10px",
                  borderRadius: 4,
                  border: "none",
                  background: batchJob?.status === "running" ? "rgba(255,255,255,0.05)" : "#60a5fa",
                  color: batchJob?.status === "running" ? "#999" : "#0b1220",
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: batchJob?.status === "running" ? "not-allowed" : "pointer",
                }}
              >
                {batchJob?.status === "running" ? "Processing..." : "Batch Apply"}
              </button>
            )}
          </div>
        )}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {/* Telemetry Dashboard button (Step 12) */}
          <button
            type="button"
            onClick={() => setShowTelemetry((prev) => !prev)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.15)",
              background: showTelemetry ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.05)",
              backdropFilter: "blur(6px)",
              color: showTelemetry ? "#4ade80" : "#f0ebe4",
              fontSize: 11,
              letterSpacing: "0.05em",
              cursor: "pointer",
            }}
          >
            <BarChart3 size={14} />
            <span>Usage</span>
          </button>

          {/* History button (Step 11) */}
          {transformHistory.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory((prev) => !prev)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                background: showHistory ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.05)",
                backdropFilter: "blur(6px)",
                color: showHistory ? "#a78bfa" : "#f0ebe4",
                fontSize: 11,
                letterSpacing: "0.05em",
                cursor: "pointer",
              }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>History ({transformHistory.length})</span>
            </button>
          )}

          {/* Transform Preset Dropdown */}
          <div ref={presetDropdownRef} style={{ position: "relative" }}>
            <button
              type="button"
              aria-label="Transform presets"
              aria-expanded={showPresetDropdown}
              onClick={() => setShowPresetDropdown((prev) => !prev)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                background: selectedPreset ? "rgba(240,235,228,0.15)" : "rgba(255,255,255,0.05)",
                backdropFilter: "blur(6px)",
                color: "#f0ebe4",
                fontSize: 11,
                letterSpacing: "0.05em",
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
            >
              <SlidersHorizontal size={14} />
              <span>{selectedPreset ? selectedPreset.name : "Transform"}</span>
            </button>

            {showPresetDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  minWidth: 220,
                  maxHeight: 320,
                  overflow: "auto",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(20,20,20,0.95)",
                  backdropFilter: "blur(12px)",
                  zIndex: 240,
                  padding: "8px 0",
                }}
              >
                {TRANSFORM_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(preset.id === selectedPreset?.id ? null : preset);
                      setShowPresetDropdown(false);
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      width: "100%",
                      padding: "10px 14px",
                      border: "none",
                      background:
                        selectedPreset?.id === preset.id
                          ? "rgba(240,235,228,0.12)"
                          : "transparent",
                      color: "#f0ebe4",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.1s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (selectedPreset?.id !== preset.id) {
                        e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedPreset?.id !== preset.id) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{preset.name}</span>
                    <span style={{ fontSize: 10, color: "rgba(240,235,228,0.6)", marginTop: 2 }}>
                      {preset.description}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Compare Mode Toggle (visible when lightbox is active) */}
          {lightboxIndex != null && (
            <button
              type="button"
              aria-label={compareMode ? "Exit compare mode" : "Enter compare mode"}
              onClick={() => setCompareMode((prev) => !prev)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                background: compareMode ? "rgba(240,235,228,0.15)" : "rgba(255,255,255,0.05)",
                backdropFilter: "blur(6px)",
                color: "#f0ebe4",
                fontSize: 11,
                letterSpacing: "0.05em",
                cursor: "pointer",
              }}
            >
              <Columns size={14} />
              <span>Compare</span>
            </button>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              minWidth: 168,
              padding: "5px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(6px)",
            }}
          >
            <span style={{ fontSize: 10, color: "rgba(240,235,228,0.72)", letterSpacing: "0.08em" }}>
              Zoom
            </span>
            <input
              type="range"
              min={MIN_TILE_WIDTH}
              max={MAX_TILE_WIDTH}
              step={TILE_STEP}
              value={tileWidth}
              onChange={(event) => setTileWidth(clampTileWidth(Number(event.target.value)))}
              aria-label="Zoom density"
              style={{
                width: 110,
                accentColor: "rgba(240,235,228,0.9)",
                background: "transparent",
              }}
            />
          </div>
          <button
            type="button"
            aria-label="Close storyboard"
            onClick={onClose}
            style={{
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.04)",
              color: "#f0ebe4",
              padding: 6,
              cursor: "pointer",
            }}
          >
            <X size={15} />
          </button>
        </div>
      </header>

      <div style={{ padding: 16, overflow: "auto", flex: 1 }}>
        {localUrls.length === 0 ? (
          <div
            style={{
              height: "100%",
              display: "grid",
              placeItems: "center",
              color: "rgba(240,235,228,0.62)",
              fontSize: 13,
            }}
          >
            No media available for this profile yet.
          </div>
        ) : (
          <div
            data-testid="storyboard-grid"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(auto-fill, minmax(${tileWidth}px, 1fr))`,
              gap: 14,
            }}
          >
            {localUrls.map((url, index) => {
              const isSelected = selectedIndices.has(index);
              return (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  aria-label={`Open image ${index + 1}${isSelected ? " (selected)" : ""}`}
                  aria-selected={isSelected}
                  draggable
                  onDragStart={(event) => onDragStart(event, index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => onDrop(event, index)}
                  onContextMenu={(event) => openMenu(event, url, index)}
                  onClick={(event) => handleTileClick(event, index)}
                  style={{
                    width: "100%",
                    aspectRatio: "4 / 3",
                    overflow: "hidden",
                    borderRadius: 14,
                    border: isSelected
                      ? "2px solid #60a5fa"
                      : variantRoles[index] === "hero"
                        ? "2px solid rgba(96,165,250,0.6)"
                        : "1px solid rgba(255,255,255,0.1)",
                    background: isSelected ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.03)",
                    cursor: "pointer",
                    padding: 0,
                    position: "relative",
                  }}
                >
                  {/* Selection checkbox indicator */}
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      left: 8,
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: isSelected ? "none" : "2px solid rgba(255,255,255,0.5)",
                      background: isSelected ? "#60a5fa" : "transparent",
                      display: "grid",
                      placeItems: "center",
                      zIndex: 5,
                    }}
                  >
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                    )}
                  </div>
                  <img
                    src={optimizedTileUrls[index] || url}
                    alt={`${nodeLabel} media ${index + 1}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  {getRoleBadge(index)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {activeUrl && (
        <div
          ref={lightboxContainerRef}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 230,
            background: "rgba(0,0,0,0.86)",
            display: "grid",
            placeItems: "center",
            padding: 24,
          }}
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            aria-label="Previous image"
            onClick={(event) => {
              event.stopPropagation();
              setLightboxIndex((idx) => {
                if (idx == null || localUrls.length === 0) return idx;
                return (idx - 1 + localUrls.length) % localUrls.length;
              });
            }}
            style={{
              position: "absolute",
              left: 18,
              top: "50%",
              transform: "translateY(-50%)",
              border: "1px solid rgba(255,255,255,0.22)",
              borderRadius: 999,
              background: "rgba(0,0,0,0.45)",
              color: "#fff",
              padding: 8,
              cursor: "pointer",
            }}
          >
            <ChevronLeft size={16} />
          </button>

          {compareMode && comparisonUrl ? (
            // Split view comparison mode
            <div
              onClick={(event) => event.stopPropagation()}
              style={{
                position: "relative",
                width: "min(92vw, 1200px)",
                maxHeight: "88vh",
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 30px 70px rgba(0,0,0,0.6)",
                cursor: isDraggingSplit ? "col-resize" : "default",
              }}
            >
              {/* Transformed image (full width, shown through clip) */}
              <img
                src={comparisonUrl}
                alt={`${nodeLabel} transformed`}
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  objectFit: "contain",
                }}
              />
              {/* Original image (clipped to show left side) */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: `${splitPosition}%`,
                  overflow: "hidden",
                }}
              >
                <img
                  src={activeUrl}
                  alt={`${nodeLabel} original`}
                  style={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                    objectFit: "contain",
                  }}
                />
              </div>
              {/* Split divider handle */}
              <div
                onMouseDown={handleSplitDragStart}
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: `${splitPosition}%`,
                  width: 4,
                  background: "rgba(255,255,255,0.8)",
                  cursor: "col-resize",
                  transform: "translateX(-50%)",
                  boxShadow: "0 0 10px rgba(0,0,0,0.5)",
                }}
              >
                {/* Drag handle indicator */}
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.95)",
                    display: "grid",
                    placeItems: "center",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                  }}
                >
                  <Columns size={14} color="#333" />
                </div>
              </div>
              {/* Labels */}
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 12,
                  padding: "4px 10px",
                  borderRadius: 4,
                  background: "rgba(0,0,0,0.6)",
                  color: "#fff",
                  fontSize: 11,
                  letterSpacing: "0.05em",
                }}
              >
                Original
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  right: 12,
                  padding: "4px 10px",
                  borderRadius: 4,
                  background: "rgba(0,0,0,0.6)",
                  color: "#fff",
                  fontSize: 11,
                  letterSpacing: "0.05em",
                }}
              >
                {selectedPreset?.name || "Transformed"}
              </div>
            </div>
          ) : (
            // Standard single image view
            <img
              src={activeUrl}
              alt={`${nodeLabel} lightbox`}
              onClick={(event) => event.stopPropagation()}
              style={{
                width: "min(92vw, 1200px)",
                maxHeight: "88vh",
                borderRadius: 16,
                objectFit: "contain",
                boxShadow: "0 30px 70px rgba(0,0,0,0.6)",
              }}
            />
          )}

          <button
            type="button"
            aria-label="Next image"
            onClick={(event) => {
              event.stopPropagation();
              setLightboxIndex((idx) => {
                if (idx == null || localUrls.length === 0) return idx;
                return (idx + 1) % localUrls.length;
              });
            }}
            style={{
              position: "absolute",
              right: 18,
              top: "50%",
              transform: "translateY(-50%)",
              border: "1px solid rgba(255,255,255,0.22)",
              borderRadius: 999,
              background: "rgba(0,0,0,0.45)",
              color: "#fff",
              padding: 8,
              cursor: "pointer",
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {menu && (
        <ImageContextMenu
          menu={menu}
          allProfiles={Object.keys(images).sort()}
          onSend={handleSend}
          onSendToFront={handleSendToFront}
          onSendToBack={handleSendToBack}
          onDeleteImage={handleDelete}
          onTransform={handleOpenTransform}
          onPromoteToHero={handlePromoteToHero}
          onQuickEnhance={handleQuickEnhance}
          onClose={() => setMenu(null)}
        />
      )}

      {showTransformPanel && transformTargetIndex != null && (
        <TransformPreviewPanel
          imageUrl={localUrls[transformTargetIndex] || ""}
          initialRecipe={selectedPreset || undefined}
          onApply={handleApplyTransform}
          onCancel={() => {
            setShowTransformPanel(false);
            setTransformTargetIndex(null);
          }}
        />
      )}

      {/* Telemetry Dashboard Panel (Step 12) */}
      {showTelemetry && (
        <div
          style={{
            position: "fixed",
            top: 60,
            right: 20,
            width: 280,
            background: "rgba(20,20,20,0.95)",
            backdropFilter: "blur(12px)",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.1)",
            zIndex: 240,
            overflow: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 500, color: "#f0ebe4" }}>
              Usage Dashboard
            </span>
            <button
              onClick={() => setShowTelemetry(false)}
              style={{
                padding: 4,
                borderRadius: 4,
                border: "none",
                background: "transparent",
                color: "#999",
                cursor: "pointer",
              }}
            >
              <X size={16} />
            </button>
          </div>
          <div style={{ padding: 16 }}>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "rgba(34,197,94,0.1)",
                  border: "1px solid rgba(34,197,94,0.2)",
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 600, color: "#4ade80" }}>
                  {telemetrySummary.totalTransforms}
                </div>
                <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>Transforms</div>
              </div>
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "rgba(96,165,250,0.1)",
                  border: "1px solid rgba(96,165,250,0.2)",
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 600, color: "#60a5fa" }}>
                  {telemetrySummary.totalCredits.toFixed(1)}
                </div>
                <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>Credits</div>
              </div>
            </div>

            {/* Savings */}
            {telemetrySummary.savingsPercent > 0 && (
              <div
                style={{
                  padding: 10,
                  borderRadius: 6,
                  background: "rgba(96,165,250,0.1)",
                  border: "1px solid rgba(96,165,250,0.2)",
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <svg width="16" height="16" fill="none" stroke="#60a5fa" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span style={{ fontSize: 12, color: "#60a5fa" }}>
                  {telemetrySummary.savingsPercent}% bandwidth saved
                </span>
              </div>
            )}

            {/* Recommendations */}
            {telemetrySummary.recommendations.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: "#999", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Suggestions
                </div>
                {telemetrySummary.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 8,
                      borderRadius: 6,
                      background: "rgba(96,165,250,0.08)",
                      border: "1px solid rgba(96,165,250,0.15)",
                      marginBottom: 6,
                      fontSize: 11,
                      color: "#60a5fa",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 6,
                    }}
                  >
                    <span>💡</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            )}

            {telemetrySummary.totalTransforms === 0 && (
              <div style={{ fontSize: 12, color: "#666", textAlign: "center", padding: 20 }}>
                No transforms yet this month.
                <br />
                Apply some transforms to see usage data.
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Panel (Step 11) */}
      {showHistory && transformHistory.length > 0 && (
        <div
          style={{
            position: "fixed",
            top: 60,
            right: 20,
            width: 320,
            maxHeight: "calc(100dvh - 100px)",
            background: "rgba(20,20,20,0.95)",
            backdropFilter: "blur(12px)",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.1)",
            zIndex: 240,
            overflow: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 500, color: "#f0ebe4" }}>
              Transform History
            </span>
            <button
              onClick={() => setShowHistory(false)}
              style={{
                padding: 4,
                borderRadius: 4,
                border: "none",
                background: "transparent",
                color: "#999",
                cursor: "pointer",
              }}
            >
              <X size={16} />
            </button>
          </div>
          <div style={{ padding: "8px 0" }}>
            {transformHistory.map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: "10px 16px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "#a78bfa" }}>Image #{entry.index + 1}</span>
                  <span style={{ fontSize: 10, color: "#666" }}>
                    {new Date(entry.appliedAt).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
                  {entry.recipe.name}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleRollback(entry.id)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 4,
                      border: "1px solid rgba(167,139,250,0.3)",
                      background: "rgba(167,139,250,0.1)",
                      color: "#a78bfa",
                      fontSize: 10,
                      cursor: "pointer",
                    }}
                  >
                    Rollback
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              padding: "12px 16px",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 11, color: "#666" }}>
              {transformHistory.length} entries
            </span>
            <button
              onClick={handleClearHistory}
              style={{
                padding: "4px 10px",
                borderRadius: 4,
                border: "none",
                background: "transparent",
                color: "#999",
                fontSize: 10,
                cursor: "pointer",
              }}
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
