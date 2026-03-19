/**
 * admin-sequence-view.tsx — Drag-to-reorder fiber sequence editor.
 *
 * C12: Lets admins define a custom display order for fiber profiles
 * in the main grid. Persisted via dataSource localStorage overlay.
 * Supports drag-and-drop reordering, category grouping presets,
 * alphabetical sort, and reset to bundled default order.
 */

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useDrag, useDrop, DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useAtlasData } from "../../context/atlas-data-context";
import { dataSource } from "../../data/data-provider";
import { toast } from "sonner";
import { getCategoryColorClasses } from "../../data/profile-sequencing";
import {
  GripVertical,
  ArrowUpDown,
  SortAsc,
  RotateCcw,
  Layers,
  Search,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  Save,
  Check,
  Info,
} from "lucide-react";

/* ── Drag item type ── */
const FIBER_ITEM = "FIBER_SEQUENCE_ITEM";

interface DragItem {
  index: number;
  type: string;
  id: string;
}

/* ═══════════════════════════════════════════════════════════
   Draggable Row
   ═══════════════════════════════════════════════════════════ */

function SequenceRow({
  fiber,
  index,
  total,
  onMove,
  onMoveToPosition,
  overriddenSet,
}: {
  fiber: { id: string; name: string; image: string; category: string };
  index: number;
  total: number;
  onMove: (fromIndex: number, toIndex: number) => void;
  onMoveToPosition: (fromIndex: number, position: "first" | "last") => void;
  overriddenSet: Set<string>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: FIBER_ITEM,
    item: (): DragItem => ({ index, type: FIBER_ITEM, id: fiber.id }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: FIBER_ITEM,
    hover(item: DragItem) {
      if (item.index === index) return;
      onMove(item.index, index);
      item.index = index;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-all group ${
        isDragging
          ? "opacity-30 scale-[0.98] border-white/[0.04]"
          : isOver
            ? "border-blue-400/30 bg-blue-400/[0.03]"
            : "border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.02]"
      }`}
      style={{ cursor: "grab" }}
    >
      {/* Position number */}
      <span
        className="text-white/20 shrink-0 tabular-nums"
        style={{ fontSize: "10px", width: 24, textAlign: "right" }}
      >
        {index + 1}
      </span>

      {/* Drag handle */}
      <GripVertical size={12} className="text-white/15 group-hover:text-white/30 shrink-0 transition-colors" />

      {/* Thumbnail */}
      <div className="relative shrink-0">
        <img
          src={fiber.image}
          alt={fiber.name}
          className="w-8 h-8 rounded-md object-cover bg-white/[0.04]"
          draggable={false}
        />
        {overriddenSet.has(fiber.id) && (
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-400/70 border border-[#0b0b0b]" />
        )}
      </div>

      {/* Name + ID */}
      <div className="flex-1 min-w-0">
        <div className="text-white/80 truncate" style={{ fontSize: "12px" }}>
          {fiber.name}
        </div>
        <div className="text-white/25 truncate" style={{ fontSize: "9px" }}>
          {fiber.id}
        </div>
      </div>

      {/* Category pill */}
      <span
        className={`px-2 py-0.5 rounded-full border shrink-0 ${getCategoryColorClasses(fiber.category)}`}
        style={{ fontSize: "8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}
      >
        {fiber.category}
      </span>

      {/* Quick move buttons */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {index > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onMoveToPosition(index, "first"); }}
            className="p-0.5 rounded text-white/20 hover:text-white/50 cursor-pointer"
            title="Move to top"
          >
            <ChevronsUp size={10} />
          </button>
        )}
        {index > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onMove(index, index - 1); }}
            className="p-0.5 rounded text-white/20 hover:text-white/50 cursor-pointer"
            title="Move up"
          >
            <ArrowUp size={10} />
          </button>
        )}
        {index < total - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onMove(index, index + 1); }}
            className="p-0.5 rounded text-white/20 hover:text-white/50 cursor-pointer"
            title="Move down"
          >
            <ArrowDown size={10} />
          </button>
        )}
        {index < total - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onMoveToPosition(index, "last"); }}
            className="p-0.5 rounded text-white/20 hover:text-white/50 cursor-pointer"
            title="Move to bottom"
          >
            <ChevronsDown size={10} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main Sequence View
   ═══════════════════════════════════════════════════════════ */

export function AdminSequenceView() {
  const { fiberIndex, version } = useAtlasData();
  const overriddenIds = useMemo(() => new Set(dataSource.getOverriddenFiberIds()), [version]);

  /* Draft order — initialize from current fiberIndex (which already reflects any stored order) */
  const [draft, setDraft] = useState(() => fiberIndex.map((f) => f.id));
  const [isDirty, setIsDirty] = useState(false);
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Sync draft when fiber list changes externally (fiber added/removed) */
  useEffect(() => {
    const stored = dataSource.getFiberOrder();
    if (stored) {
      // Reconcile: include any new fibers not in stored order
      const storedSet = new Set(stored);
      const allIds = fiberIndex.map((f) => f.id);
      const newIds = allIds.filter((id) => !storedSet.has(id));
      const validStored = stored.filter((id) => allIds.includes(id));
      setDraft([...validStored, ...newIds]);
    } else {
      setDraft(fiberIndex.map((f) => f.id));
    }
    setIsDirty(false);
  }, [fiberIndex]);

  /* Build fiber lookup */
  const fiberMap = useMemo(() => {
    const m = new Map<string, typeof fiberIndex[0]>();
    for (const f of fiberIndex) m.set(f.id, f);
    return m;
  }, [fiberIndex]);

  /* Filtered view (search doesn't change order, just highlights) */
  const filteredDraft = useMemo(() => {
    if (!search) return draft;
    const q = search.toLowerCase();
    return draft.filter((id) => {
      const f = fiberMap.get(id);
      return f && (f.name.toLowerCase().includes(q) || f.id.includes(q) || f.category.includes(q));
    });
  }, [draft, search, fiberMap]);

  const isFiltered = search.length > 0;

  /* Move handler */
  const handleMove = useCallback((fromIndex: number, toIndex: number) => {
    setDraft((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
    setIsDirty(true);
  }, []);

  /* Move to first/last */
  const handleMoveToPosition = useCallback((fromIndex: number, position: "first" | "last") => {
    setDraft((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      if (position === "first") next.unshift(item);
      else next.push(item);
      return next;
    });
    setIsDirty(true);
  }, []);

  /* Save */
  const handleSave = useCallback(() => {
    dataSource.setFiberOrder(draft);
    setIsDirty(false);
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 2000);
    toast.success("Fiber sequence saved");
  }, [draft]);

  /* Sort presets */
  const sortAlphabetical = useCallback(() => {
    setDraft((prev) => {
      const sorted = [...prev].sort((a, b) => {
        const fa = fiberMap.get(a);
        const fb = fiberMap.get(b);
        return (fa?.name ?? a).localeCompare(fb?.name ?? b);
      });
      return sorted;
    });
    setIsDirty(true);
  }, [fiberMap]);

  const sortByCategory = useCallback(() => {
    const order: Record<string, number> = { fiber: 0, textile: 1, dye: 2 };
    setDraft((prev) => {
      const sorted = [...prev].sort((a, b) => {
        const fa = fiberMap.get(a);
        const fb = fiberMap.get(b);
        const catA = order[fa?.category ?? "fiber"] ?? 99;
        const catB = order[fb?.category ?? "fiber"] ?? 99;
        if (catA !== catB) return catA - catB;
        return (fa?.name ?? a).localeCompare(fb?.name ?? b);
      });
      return sorted;
    });
    setIsDirty(true);
  }, [fiberMap]);

  const resetToDefault = useCallback(() => {
    dataSource.clearFiberOrder();
    setDraft(fiberIndex.map((f) => f.id));
    setIsDirty(false);
    toast.success("Sequence reset to bundled default");
  }, [fiberIndex]);

  const hasCustomOrder = dataSource.getFiberOrder() !== null;

  /* Category stats */
  const categoryStats = useMemo(() => {
    const stats = { fiber: 0, textile: 0, dye: 0 };
    for (const id of draft) {
      const f = fiberMap.get(id);
      if (f && f.category in stats) stats[f.category as keyof typeof stats]++;
    }
    return stats;
  }, [draft, fiberMap]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <ArrowUpDown size={13} className="text-blue-400/60" />
              <span
                className="text-white/50 uppercase tracking-wider"
                style={{ fontSize: "11px", fontWeight: 600 }}
              >
                Profile Sequence
              </span>
              {hasCustomOrder && (
                <span
                  className="px-1.5 py-0.5 rounded-full bg-blue-400/10 border border-blue-400/15 text-blue-400/50"
                  style={{ fontSize: "8px", fontWeight: 600, textTransform: "uppercase" }}
                >
                  Custom
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {isDirty && (
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-400/10 border border-blue-400/20 text-blue-400/70 hover:text-blue-400 transition-colors cursor-pointer"
                  style={{ fontSize: "10px", fontWeight: 600 }}
                >
                  <Save size={10} /> Save Order
                </button>
              )}
              {saved && (
                <span className="inline-flex items-center gap-0.5 text-emerald-400/60" style={{ fontSize: "10px" }}>
                  <Check size={10} /> Saved
                </span>
              )}
            </div>
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04] mb-2.5">
            <Info size={11} className="text-white/20 shrink-0 mt-0.5" />
            <span className="text-white/25" style={{ fontSize: "10px", lineHeight: 1.5 }}>
              Drag rows or use arrow buttons to reorder how profiles appear in the main grid.
              Changes are applied to the homepage after saving.
            </span>
          </div>

          {/* Toolbar row */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search
                size={11}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Filter fibers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-md text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/20"
                style={{ fontSize: "11px" }}
              />
            </div>

            {/* Sort buttons */}
            <button
              onClick={sortAlphabetical}
              className="flex items-center gap-1 px-2 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-md text-white/35 hover:text-white/60 transition-colors cursor-pointer"
              style={{ fontSize: "10px" }}
              title="Sort A-Z"
            >
              <SortAsc size={11} /> A-Z
            </button>
            <button
              onClick={sortByCategory}
              className="flex items-center gap-1 px-2 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-md text-white/35 hover:text-white/60 transition-colors cursor-pointer"
              style={{ fontSize: "10px" }}
              title="Group by category"
            >
              <Layers size={11} /> Category
            </button>
            {hasCustomOrder && (
              <button
                onClick={resetToDefault}
                className="flex items-center gap-1 px-2 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-md text-red-400/40 hover:text-red-400/70 transition-colors cursor-pointer"
                style={{ fontSize: "10px" }}
                title="Reset to bundled order"
              >
                <RotateCcw size={11} /> Reset
              </button>
            )}
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-white/20" style={{ fontSize: "9px" }}>
              {draft.length} profiles
            </span>
            <span className="text-emerald-400/30" style={{ fontSize: "9px" }}>
              {categoryStats.fiber} fiber
            </span>
            <span className="text-blue-400/30" style={{ fontSize: "9px" }}>
              {categoryStats.textile} textile
            </span>
            <span className="text-purple-400/30" style={{ fontSize: "9px" }}>
              {categoryStats.dye} dye
            </span>
            {isDirty && (
              <span className="text-blue-400/40 ml-auto" style={{ fontSize: "9px" }}>
                Unsaved changes
              </span>
            )}
          </div>
        </div>

        {/* Scrollable list */}
        <div
          className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.06) transparent" }}
        >
          {isFiltered ? (
            /* When filtering, show filtered results without drag (order preserved in full draft) */
            <>
              <div className="text-white/20 px-2 py-1" style={{ fontSize: "10px" }}>
                {filteredDraft.length} of {draft.length} profiles matching &ldquo;{search}&rdquo;
              </div>
              {filteredDraft.map((id) => {
                const fiber = fiberMap.get(id);
                if (!fiber) return null;
                const realIndex = draft.indexOf(id);
                return (
                  <SequenceRow
                    key={id}
                    fiber={fiber}
                    index={realIndex}
                    total={draft.length}
                    onMove={handleMove}
                    onMoveToPosition={handleMoveToPosition}
                    overriddenSet={overriddenIds}
                  />
                );
              })}
            </>
          ) : (
            /* Full drag-reorder list */
            draft.map((id, i) => {
              const fiber = fiberMap.get(id);
              if (!fiber) return null;
              return (
                <SequenceRow
                  key={id}
                  fiber={fiber}
                  index={i}
                  total={draft.length}
                  onMove={handleMove}
                  onMoveToPosition={handleMoveToPosition}
                  overriddenSet={overriddenIds}
                />
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-white/[0.06] shrink-0 flex items-center justify-between">
          <span className="text-white/15" style={{ fontSize: "9px" }}>
            {hasCustomOrder ? (
              <span className="text-blue-400/40">Custom sequence active</span>
            ) : (
              "Using bundled default order"
            )}
          </span>
          {isDirty && (
            <button
              onClick={handleSave}
              className="text-blue-400/60 hover:text-blue-400 transition-colors cursor-pointer"
              style={{ fontSize: "9px", fontWeight: 600 }}
            >
              Save changes
            </button>
          )}
        </div>
      </div>
    </DndProvider>
  );
}
