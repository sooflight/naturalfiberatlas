import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { dataSource } from "../../../data/data-provider";
import { NODE_SIDEBAR_WIDTH_PX, SIDEBAR_TOKENS } from "../layout-constants";
import { getCategoryTone } from "../../../data/profile-sequencing";
import {
  getCloudinaryConfig,
  uploadImageFilesToCloudinary,
} from "../runtime/cloudinary-upload";
import type { GalleryImageEntry } from "../../../data/fibers";
import {
  NAVIGATION_PARENT_LABEL,
  isNavigationParentProfileId,
  getNavigationNodeDisplayOrder,
  sortProfileIdsByCanonicalOrder,
} from "../../../data/profile-sequencing";
import { toast } from "sonner";
import { MATERIAL_PASSPORTS } from "@/data/material-passports";
import {
  readPassportStatusOverrides,
  subscribePassportStatusOverrides,
  writePassportStatusOverride,
} from "@/utils/passportStatusOverrides";
import { toggleProfilePublishStatus } from "../ImageDatabaseManager";
import { ProfileStatusCircle } from "../ProfileStatusCircle";

interface NodeSidebarProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  knowledgeFibers?: Array<{ id: string; name: string; category: string; image?: string }>;
}

type UnifiedScope = "all" | "category";

const T = SIDEBAR_TOKENS;

export function NodeSidebar({ selectedId, onSelect, knowledgeFibers = [] }: NodeSidebarProps) {
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<UnifiedScope>("all");
  const [activeCategory, setActiveCategory] = useState("");
  const [sequenceDraft, setSequenceDraft] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [uploadingByFiberId, setUploadingByFiberId] = useState<Record<string, boolean>>({});
  const [profileStatusOverrides, setProfileStatusOverrides] = useState<Record<string, string>>(
    () => readPassportStatusOverrides(),
  );
  const [profileStatusSaving, setProfileStatusSaving] = useState<Record<string, boolean>>({});
  const [profileStatusErrors, setProfileStatusErrors] = useState<Record<string, string>>({});
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    fiberId: string;
  } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    live: true,
    archives: false,
    navNodes: true,
  });
  const dragLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileStatusRequestVersionRef = useRef<Record<string, number>>({});
  const knowledgeFiberMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string; category: string; image?: string }>();
    for (const fiber of knowledgeFibers) map.set(fiber.id, fiber);
    return map;
  }, [knowledgeFibers]);

  const categories = useMemo(() => {
    return Array.from(new Set(knowledgeFibers.map((fiber) => fiber.category))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [knowledgeFibers]);
  useEffect(() => {
    if (!activeCategory || !categories.includes(activeCategory)) {
      setActiveCategory(categories[0] ?? "");
    }
  }, [categories, activeCategory]);

  useEffect(() => {
    const unsubscribe = subscribePassportStatusOverrides(() => {
      setProfileStatusOverrides(readPassportStatusOverrides());
    });
    return unsubscribe;
  }, []);

  const idsInScope = useMemo(() => {
    if (scope === "all") return knowledgeFibers.map((fiber) => fiber.id);
    return knowledgeFibers.filter((fiber) => fiber.category === activeCategory).map((fiber) => fiber.id);
  }, [scope, knowledgeFibers, activeCategory]);

  const scopeGroupId = useMemo(() => {
    if (scope === "category" && activeCategory) return `category:${activeCategory}`;
    return null;
  }, [scope, activeCategory]);

  const resolvedScopedOrder = useMemo(() => {
    if (scope === "all") return dataSource.resolveFiberOrder(idsInScope);
    if (!scopeGroupId) return idsInScope;
    return dataSource.resolveFiberOrder(idsInScope, {
      groupId: scopeGroupId,
      groupMemberIds: idsInScope,
    });
  }, [scope, idsInScope, scopeGroupId]);

  const resolvedGlobalOrder = useMemo(
    () => dataSource.resolveFiberOrder(knowledgeFibers.map((fiber) => fiber.id)),
    [knowledgeFibers],
  );

  useEffect(() => {
    setSequenceDraft(resolvedScopedOrder);
  }, [resolvedScopedOrder]);

  const filteredSequenceIds = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sequenceDraft;
    const base = scope === "all" ? sequenceDraft : resolvedGlobalOrder;
    return base.filter((id) => {
      const fiber = knowledgeFiberMap.get(id);
      if (!fiber) return false;
      return (
        fiber.name.toLowerCase().includes(query) ||
        fiber.id.toLowerCase().includes(query) ||
        fiber.category.toLowerCase().includes(query)
      );
    });
  }, [sequenceDraft, search, knowledgeFiberMap, scope, resolvedGlobalOrder]);

  const sectionGroups = useMemo(() => {
    const getStatus = (id: string) =>
      dataSource.getFiberById(id)?.status ??
      profileStatusOverrides[id] ??
      MATERIAL_PASSPORTS[id]?.status ??
      "archived";

    const live: string[] = [];
    const archives: string[] = [];
    const navNodes: string[] = [];

    for (const id of filteredSequenceIds) {
      if (isNavigationParentProfileId(id)) {
        navNodes.push(id);
      } else {
        // Keep status buckets aligned with AtlasData/fiberIndex profiles (same source as frontend).
        // Knowledge-only IDs can exist in passports/navigation but won't have a fiber record.
        if (!dataSource.getFiberById(id)) continue;
        const status = getStatus(id);
        if (status === "published") live.push(id);
        else archives.push(id);
      }
    }

    const navDisplayOrder = getNavigationNodeDisplayOrder();
    const sortedNavNodes = sortProfileIdsByCanonicalOrder(navNodes, navDisplayOrder);

    return { live, archives, navNodes: sortedNavNodes };
  }, [filteredSequenceIds, profileStatusOverrides]);

  const visibleProfileCount = useMemo(() => {
    let total = 0;
    for (const id of filteredSequenceIds) {
      if (isNavigationParentProfileId(id)) continue;
      if (!dataSource.getFiberById(id)) continue;
      total += 1;
    }
    return total;
  }, [filteredSequenceIds]);

  const moveSequenceItem = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setSequenceDraft((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      if (scope === "all") {
        dataSource.setFiberOrder(next);
      } else if (scopeGroupId) {
        dataSource.setFiberOrderForGroup(scopeGroupId, next);
      }
      return next;
    });
  };

  const hasCustomOrder = scope === "all"
    ? dataSource.getFiberOrder() !== null
    : !!scopeGroupId && dataSource.getFiberOrderForGroup(scopeGroupId) !== null;

  const getEffectiveProfileStatus = useCallback(
    (profileId: string): string =>
      dataSource.getFiberById(profileId)?.status ??
      profileStatusOverrides[profileId] ??
      MATERIAL_PASSPORTS[profileId]?.status ??
      "archived",
    [profileStatusOverrides],
  );

  const handleToggleProfileStatus = useCallback(
    (profileId: string) => {
      const nextRequestVersion = (profileStatusRequestVersionRef.current[profileId] ?? 0) + 1;
      profileStatusRequestVersionRef.current[profileId] = nextRequestVersion;
      void toggleProfilePublishStatus({
        profileKey: profileId,
        profileId,
        currentStatus: getEffectiveProfileStatus(profileId),
        previousOverrideStatus: profileStatusOverrides[profileId],
        requestVersion: nextRequestVersion,
        isLatestRequestVersion: (key, version) => profileStatusRequestVersionRef.current[key] === version,
        setStatusOverrides: setProfileStatusOverrides,
        setSavingByKey: setProfileStatusSaving,
        setErrorByKey: setProfileStatusErrors,
        persistStatusOverride: (key, status) => {
          writePassportStatusOverride(key, status);
          dataSource.updateFiber(key, { status });
        },
      });
    },
    [getEffectiveProfileStatus, profileStatusOverrides],
  );

  const handleFileDrop = useCallback(async (fiberId: string, files: File[]) => {
    const imageFiles = files.filter(
      (f) => f.type.startsWith("image/") || !f.type,
    );
    if (imageFiles.length === 0) return;
    if (uploadingByFiberId[fiberId]) return;

    const config = getCloudinaryConfig();
    if (!config) {
      toast.error("Cloudinary settings missing (cloud name or upload preset).");
      return;
    }

    setUploadingByFiberId((prev) => ({ ...prev, [fiberId]: true }));
    try {
      const uploaded = await uploadImageFilesToCloudinary(imageFiles, config);
      if (uploaded.length === 0) return;

      const fiber = dataSource.getFiberById(fiberId);
      if (!fiber) {
        toast.error("Profile not found.");
        return;
      }
      const existing: GalleryImageEntry[] = fiber.galleryImages ?? [];
      const nextGallery: GalleryImageEntry[] = [
        ...existing,
        ...uploaded.map((entry) => ({ url: entry.secureUrl })),
      ];
      dataSource.updateFiber(fiberId, { galleryImages: nextGallery });
      toast.success(
        `Added ${uploaded.length} image${uploaded.length === 1 ? "" : "s"} to ${fiber.name}`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploadingByFiberId((prev) => {
        const { [fiberId]: _removed, ...rest } = prev;
        return rest;
      });
    }
  }, [uploadingByFiberId]);

  useEffect(() => {
    if (!contextMenu) return;
    const handleWindowClick = () => setContextMenu(null);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setContextMenu(null);
    };
    window.addEventListener("click", handleWindowClick);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("click", handleWindowClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [contextMenu]);

  // When the selected profile moves to a different section (e.g. after toggling live/archive),
  // auto-expand that section so the profile stays visible and the user doesn't hit "profile not found"
  useEffect(() => {
    if (!selectedId) return;
    const sectionKey =
      sectionGroups.live.includes(selectedId)
        ? "live"
        : sectionGroups.archives.includes(selectedId)
          ? "archives"
          : sectionGroups.navNodes.includes(selectedId)
            ? "navNodes"
            : null;
    if (sectionKey && expandedSections[sectionKey] === false) {
      setExpandedSections((prev) => ({ ...prev, [sectionKey]: true }));
    }
  }, [
    selectedId,
    sectionGroups.live,
    sectionGroups.archives,
    sectionGroups.navNodes,
    expandedSections,
  ]);

  return (
    <div
      style={{
        width: NODE_SIDEBAR_WIDTH_PX,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: `1px solid ${T.color.border}`,
        height: "100%",
        minHeight: 0,
      }}
    >
      <div
        style={{
          padding: T.space.md,
          borderBottom: `1px solid ${T.color.borderMuted}`,
          display: "flex",
          flexDirection: "column",
          gap: T.space.sm,
        }}
      >
        {/* Primary: search + filters */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search profiles..."
          style={{
            width: "100%",
            padding: `${T.space.xs}px ${T.space.md}px`,
            fontSize: T.font.md,
            color: T.color.text,
            background: T.color.bgInput,
            border: `1px solid ${T.color.border}`,
            borderRadius: T.radius.sm,
            outline: "none",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: T.space.xs }}>
          {(["all", "category"] as UnifiedScope[]).map((nextScope) => (
            <button
              key={nextScope}
              onClick={() => {
                setScope(nextScope);
                if (nextScope === "all") onSelect("image-base");
              }}
              style={{
                padding: `${T.space.xs - 1}px ${T.space.sm}px`,
                borderRadius: T.radius.sm,
                border: `1px solid ${T.color.border}`,
                background: scope === nextScope ? T.color.bgActive : T.color.bgMuted,
                color: scope === nextScope ? T.color.textActive : T.color.textMuted,
                fontSize: T.font.xs,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {nextScope}
            </button>
          ))}
          {scope === "category" && (
            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              style={{
                flex: 1,
                minWidth: 0,
                padding: `${T.space.xs}px ${T.space.md}px`,
                fontSize: T.font.sm,
                color: T.color.text,
                background: T.color.bgInput,
                border: `1px solid ${T.color.border}`,
                borderRadius: T.radius.sm,
                outline: "none",
                textTransform: "capitalize",
              }}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          )}
          {(scope !== "all" || search.trim()) && (
            <button
              onClick={() => {
                setScope("all");
                setSearch("");
                onSelect("image-base");
              }}
              style={{
                padding: `${T.space.xs}px ${T.space.md}px`,
                borderRadius: T.radius.sm,
                border: `1px solid ${T.color.borderStrong}`,
                background: T.color.bgHover,
                color: T.color.textMuted,
                fontSize: T.font.xs,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          )}
        </div>
        {/* Secondary: single status line */}
        <div style={{ fontSize: T.font.xs, color: T.color.textDimmer }}>
          {scope === "all" ? "All" : activeCategory || "—"} • {hasCustomOrder ? "Custom order" : "Default order"}
        </div>
      </div>
      <div
        className="scrollbar-none min-h-0 flex-1"
        style={{ overflow: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div style={{ padding: `${T.space.sm}px ${T.space.sm}px ${T.space.md}px`, display: "flex", flexDirection: "column", gap: T.space.sm }}>
          {[
            { key: "live", label: "Live Profiles", ids: sectionGroups.live, accent: "rgba(34,197,94,0.6)" },
            { key: "archives", label: "Archived Profiles", ids: sectionGroups.archives, accent: "rgba(148,163,184,0.6)" },
            { key: "navNodes", label: NAVIGATION_PARENT_LABEL, ids: sectionGroups.navNodes, accent: "rgba(251,146,60,0.65)" },
          ]
            .filter(({ ids }) => ids.length > 0)
            .map(({ key, label, ids, accent }) => {
            const isExpanded = expandedSections[key] !== false;
            return (
              <div key={key} style={{ display: "flex", flexDirection: "column", gap: T.space.xs }}>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: T.space.xs,
                    padding: `${T.space.xs}px ${T.space.sm}px`,
                    fontSize: T.font.xs,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: accent === "rgba(251,146,60,0.65)" ? "#fdba74" : T.color.textMuted,
                    border: `1px solid ${accent === "rgba(251,146,60,0.65)" ? "rgba(251,146,60,0.25)" : T.color.borderMuted}`,
                    background: accent === "rgba(251,146,60,0.65)" ? "rgba(251,146,60,0.10)" : T.color.bgMuted,
                    borderRadius: T.radius.md,
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown style={{ width: 12, height: 12, flexShrink: 0 }} />
                  ) : (
                    <ChevronRight style={{ width: 12, height: 12, flexShrink: 0 }} />
                  )}
                  <span style={{ flex: 1 }}>{label}</span>
                  <span style={{ fontSize: T.font.xs, color: T.color.textDim }}>{ids.length}</span>
                </button>
                {isExpanded &&
                  ids.map((id, sectionIndex) => {
            const fiber = knowledgeFiberMap.get(id);
            if (!fiber) return null;
            const tone = getCategoryTone(fiber.category);
            const index = sequenceDraft.indexOf(id);
            const dragDisabled = search.trim().length > 0;
            const isSelected = selectedId === fiber.id || selectedId === `knowledge:${fiber.id}`;
            const effectiveStatus = getEffectiveProfileStatus(id);
            const statusSaving = profileStatusSaving[id] === true;
            return (
              <div
                key={id}
                draggable={!dragDisabled}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setContextMenu({ x: event.clientX, y: event.clientY, fiberId: id });
                }}
                onDragStart={() => {
                  if (dragDisabled) return;
                  setDraggingId(id);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (dragLeaveTimerRef.current) clearTimeout(dragLeaveTimerRef.current);
                  if (dragDisabled && event.dataTransfer.files.length === 0) return;
                  setDropTargetId(id);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    dragLeaveTimerRef.current = setTimeout(() => {
                      setDropTargetId((prev) => (prev === id ? null : prev));
                    }, 50);
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDropTargetId(null);

                  const files = Array.from(event.dataTransfer.files ?? []);
                  if (files.length > 0) {
                    // File drop from OS — upload to this profile
                    void handleFileDrop(id, files);
                    setDraggingId(null);
                    return;
                  }

                  // Sequence-reorder drag
                  if (dragDisabled) return;
                  if (!draggingId || draggingId === id) return;
                  const fromIndex = sequenceDraft.indexOf(draggingId);
                  const toIndex = sequenceDraft.indexOf(id);
                  if (fromIndex < 0 || toIndex < 0) return;
                  moveSequenceItem(fromIndex, toIndex);
                  setDraggingId(null);
                }}
                onDragEnd={() => {
                  setDraggingId(null);
                  setDropTargetId(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: T.space.xs + 1,
                  position: "relative",
                  overflow: "hidden",
                  border: isSelected
                    ? "1px solid rgba(147,197,253,0.7)"
                    : dropTargetId === id
                      ? "1px solid rgba(52,211,153,0.6)"
                      : draggingId === id
                        ? "1px solid rgba(96,165,250,0.5)"
                        : `1px solid ${T.color.borderMuted}`,
                  borderRadius: T.radius.md,
                  padding: `${T.space.xs + 1}px ${T.space.sm}px`,
                  background: isSelected
                    ? "rgba(59,130,246,0.16)"
                    : dropTargetId === id
                      ? "rgba(52,211,153,0.10)"
                      : "rgba(255,255,255,0.018)",
                  cursor: dragDisabled ? "default" : "grab",
                  boxShadow: isSelected ? "0 0 0 1px rgba(59,130,246,0.25) inset" : "none",
                  transition: "background 0.12s, border-color 0.12s",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    background: tone.accent,
                    opacity: isSelected ? 1 : 0.75,
                  }}
                />
                <span style={{ fontSize: T.font.sm, color: T.color.textDim, width: 14, textAlign: "right", flexShrink: 0 }}>
                  {key === "live" ? sectionIndex + 1 : ""}
                </span>
                <span style={{ fontSize: T.font.base, color: T.color.textMuted, width: 6, flexShrink: 0, opacity: 0 }}>
                  ⋮⋮
                </span>
                <button
                  onClick={() => onSelect(fiber.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: T.space.sm + 3,
                    flex: 1,
                    minWidth: 0,
                    border: "none",
                    background: "transparent",
                    color: isSelected ? "#e8f1ff" : T.color.text,
                    padding: 0,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  title={`${fiber.name} (${fiber.category})`}
                >
                  <span
                    style={{
                      display: "block",
                      width: 36,
                      aspectRatio: "4 / 3",
                      borderRadius: T.radius.sm + 1,
                      overflow: "hidden",
                      flexShrink: 0,
                      border: `1px solid ${T.color.border}`,
                      background: T.color.bgInput,
                    }}
                  >
                    {fiber.image ? (
                      <img
                        src={fiber.image}
                        alt={fiber.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: T.font.base, fontWeight: 600, letterSpacing: "0.02em" }}>
                      {fiber.name}
                    </span>
                  </span>
                </button>
                <ProfileStatusCircle
                  status={effectiveStatus}
                  onToggle={() => handleToggleProfileStatus(id)}
                  disabled={statusSaving}
                  title={profileStatusErrors[id]}
                  dataTestId={`node-sidebar-status-circle-${id}`}
                />
                {uploadingByFiberId[id] && (
                  <span style={{ fontSize: T.font.xs, color: "#34d399", flexShrink: 0, fontWeight: 700, letterSpacing: "0.04em" }}>
                    Uploading…
                  </span>
                )}
              </div>
            );
                  })}
                </div>
              );
            })}
          {search.trim().length > 0 && (
            <div style={{ fontSize: T.font.sm, color: T.color.textDim, padding: `${T.space.xs}px 2px` }}>
              Drag is disabled while filtering.
            </div>
          )}
          <div style={{ fontSize: T.font.sm, color: T.color.textDimmer, padding: `2px 2px 0` }}>
            {visibleProfileCount} profiles
          </div>
        </div>
      </div>
      {contextMenu && (
        <div
          role="menu"
          style={{
            position: "fixed",
            left: Math.max(T.space.md, Math.min(contextMenu.x, window.innerWidth - 220)),
            top: Math.max(T.space.md, Math.min(contextMenu.y, window.innerHeight - 180)),
            zIndex: 20000,
            minWidth: 210,
            borderRadius: T.radius.lg,
            border: `1px solid ${T.color.borderStrong}`,
            background: "rgba(10,10,12,0.98)",
            boxShadow: "0 16px 42px rgba(0,0,0,0.45)",
            padding: T.space.sm,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              handleToggleProfileStatus(contextMenu.fiberId);
              setContextMenu(null);
            }}
            style={{
              border: "none",
              borderRadius: T.radius.md,
              background: "transparent",
              color: T.color.text,
              textAlign: "left",
              padding: `${T.space.sm}px ${T.space.md}px`,
              fontSize: T.font.base,
              cursor: "pointer",
            }}
            title={profileStatusErrors[contextMenu.fiberId]}
          >
            {profileStatusSaving[contextMenu.fiberId] ? "Toggling Live/Archived..." : "Toggle Live/Archived"}
          </button>
          <button
            type="button"
            onClick={() => {
              onSelect("image-base");
              setContextMenu(null);
            }}
            style={{
              border: "none",
              borderRadius: T.radius.md,
              background: "transparent",
              color: T.color.text,
              textAlign: "left",
              padding: `${T.space.sm}px ${T.space.md}px`,
              fontSize: T.font.base,
              cursor: "pointer",
            }}
          >
            Go to ImageBase
          </button>
          <button
            type="button"
            onClick={() => {
              onSelect(`knowledge:${contextMenu.fiberId}`);
              setContextMenu(null);
            }}
            style={{
              border: "none",
              borderRadius: T.radius.md,
              background: "transparent",
              color: T.color.text,
              textAlign: "left",
              padding: `${T.space.sm}px ${T.space.md}px`,
              fontSize: T.font.base,
              cursor: "pointer",
            }}
          >
            Go to Knowledge Profile
          </button>
          <button
            type="button"
            onClick={() => {
              const targetFiber = knowledgeFiberMap.get(contextMenu.fiberId);
              const confirmed = window.confirm(
                `Delete profile "${targetFiber?.name ?? contextMenu.fiberId}"? This will remove it from the workspace.`,
              );
              if (!confirmed) return;
              dataSource.deleteFiber(contextMenu.fiberId);
              toast.success(`Deleted ${targetFiber?.name ?? contextMenu.fiberId}`);
              if (
                selectedId === contextMenu.fiberId ||
                selectedId === `knowledge:${contextMenu.fiberId}`
              ) {
                onSelect("image-base");
              }
              setContextMenu(null);
            }}
            style={{
              border: "none",
              borderRadius: T.radius.md,
              background: "rgba(239,68,68,0.1)",
              color: "#fca5a5",
              textAlign: "left",
              padding: `${T.space.sm}px ${T.space.md}px`,
              fontSize: T.font.base,
              cursor: "pointer",
              marginTop: 2,
            }}
          >
            Delete Profile
          </button>
        </div>
      )}
    </div>
  );
}
