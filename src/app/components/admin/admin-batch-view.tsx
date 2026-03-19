/**
 * admin-batch-view.tsx — Batch Patch Operations (C5)
 *
 * Three tools:
 *   1. Find & Replace — across all fibers for any string/array field
 *   2. Tag Manager — global view of all tags with rename/merge/delete
 *   3. SeeAlso Backlinks — shows outgoing + incoming references per fiber
 */

import { useState, useMemo } from "react";
import { useAtlasData, useAdminMode } from "../../context/atlas-data-context";
import { dataSource } from "../../data/data-provider";
import {
  Search,
  Replace,
  Tag,
  Link2,
  ArrowRight,
  Trash2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  buildFindReplacePreflight,
  canUndoFindReplace,
  type FindReplaceUndoOperation,
} from "./batch-operations-utils";
import { markTaskComplete, markTaskError, markTaskStart } from "./runtime/admin-metrics";

/* ══════════════════════════════════════════════════════════
   Tab Components
   ══════════════════════════════════════════════════════════ */

const SEARCHABLE_FIELDS = [
  "name", "subtitle", "about", "regions", "seasonality",
  "priceRange", "typicalMOQ", "leadTime", "tags",
];

function FindReplaceTab() {
  const [field, setField] = useState("tags");
  const [search, setSearch] = useState("");
  const [replace, setReplace] = useState("");
  const [result, setResult] = useState<string[] | null>(null);
  const [showPreflight, setShowPreflight] = useState(false);
  const [lastOperation, setLastOperation] = useState<(FindReplaceUndoOperation & {
    field: string;
    affected: number;
  }) | null>(null);
  const { fibers } = useAtlasData();

  // Preview matches
  const matches = useMemo(() => {
    if (!search) return [];
    return fibers.filter((f) => {
      const val = (f as unknown as Record<string, unknown>)[field];
      if (typeof val === "string") return val.includes(search);
      if (Array.isArray(val)) return val.some((v) => typeof v === "string" && v.includes(search));
      return false;
    });
  }, [fibers, field, search]);

  const handleApply = () => {
    if (!search || !replace || matches.length === 0) return;
    markTaskStart("bulk_apply", { route: window.location.pathname });
    try {
      const affected = dataSource.findAndReplace(field, search, replace);
      setResult(affected);
      setLastOperation({
        at: Date.now(),
        field,
        search,
        replace,
        affected: affected.length,
      });
      setShowPreflight(false);
      setSearch("");
      setReplace("");
      markTaskComplete("bulk_apply", { route: window.location.pathname });
      toast.success(`Updated ${affected.length} fiber${affected.length === 1 ? "" : "s"}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Batch update failed";
      markTaskError("bulk_apply", message, { route: window.location.pathname });
      toast.error(message);
    }
  };

  const handleUndo = () => {
    if (!lastOperation || !canUndoFindReplace(lastOperation)) return;
    markTaskStart("bulk_apply", { route: window.location.pathname });
    try {
      dataSource.findAndReplace(lastOperation.field, lastOperation.replace, lastOperation.search);
      markTaskComplete("bulk_apply", { route: window.location.pathname });
      toast.success("Reverted last batch replace");
      setLastOperation(null);
      setResult(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to undo batch replace";
      markTaskError("bulk_apply", message, { route: window.location.pathname });
      toast.error(message);
    }
  };

  const preflight = buildFindReplacePreflight({
    field,
    search,
    replace,
    matchCount: matches.length,
  });

  return (
    <div className="space-y-3">
      {/* Field selector */}
      <div>
        <span className="block text-white/40 mb-1" style={{ fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Field
        </span>
        <select
          value={field}
          onChange={(e) => setField(e.target.value)}
          className="w-full px-2.5 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-md text-white/80 focus:outline-none focus:border-white/20"
          style={{ fontSize: "12px" }}
        >
          {SEARCHABLE_FIELDS.map((f) => (
            <option key={f} value={f} className="bg-[#1a1a1a]">{f}</option>
          ))}
        </select>
      </div>

      {/* Search / Replace inputs */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <span className="block text-white/40 mb-1" style={{ fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Find</span>
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setResult(null); }}
              placeholder="Search..."
              className="w-full pl-7 pr-2.5 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-md text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20"
              style={{ fontSize: "12px" }}
            />
          </div>
        </div>
        <ArrowRight size={14} className="text-white/15 mt-5 shrink-0" />
        <div className="flex-1">
          <span className="block text-white/40 mb-1" style={{ fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Replace</span>
          <div className="relative">
            <Replace size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
            <input
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
              placeholder="Replace..."
              className="w-full pl-7 pr-2.5 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-md text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20"
              style={{ fontSize: "12px" }}
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      {search && (
        <div className="bg-white/[0.02] rounded-lg border border-white/[0.04] p-2">
          <span className="text-white/30" style={{ fontSize: "10px" }}>
            {matches.length} fiber{matches.length !== 1 ? "s" : ""} match
          </span>
          <div className="max-h-32 overflow-y-auto mt-1 space-y-0.5">
            {matches.slice(0, 20).map((f) => (
              <div key={f.id} className="text-white/50 truncate" style={{ fontSize: "10px" }}>
                {f.name} <span className="text-white/20">({f.id})</span>
              </div>
            ))}
            {matches.length > 20 && (
              <div className="text-white/20" style={{ fontSize: "10px" }}>
                +{matches.length - 20} more…
              </div>
            )}
          </div>
        </div>
      )}

      {/* Apply button */}
      {!showPreflight ? (
        <button
          onClick={() => setShowPreflight(true)}
          disabled={!search || !replace || matches.length === 0}
          className="w-full px-3 py-2 bg-blue-400/[0.08] border border-blue-400/20 rounded-md text-blue-300/85 hover:text-blue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          style={{ fontSize: "11px", fontWeight: 600 }}
        >
          Review {matches.length} change{matches.length === 1 ? "" : "s"}
        </button>
      ) : (
        <button
          onClick={handleApply}
          className="w-full px-3 py-2 bg-amber-400/[0.1] border border-amber-400/25 rounded-md text-amber-200/90 hover:text-amber-100 transition-colors cursor-pointer"
          style={{ fontSize: "11px", fontWeight: 600 }}
        >
          Confirm Apply ({matches.length} fibers)
        </button>
      )}

      {showPreflight && (
        <div className="rounded-md border border-amber-400/20 bg-amber-400/[0.04] px-3 py-2">
          <div className="text-amber-200/80 mb-1" style={{ fontSize: "10px", fontWeight: 600 }}>
            {preflight.title}
          </div>
          <ul className="space-y-0.5">
            {preflight.notes.map((note) => (
              <li key={note} className="text-amber-100/70" style={{ fontSize: "10px" }}>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Result feedback */}
      {result && (
        <div className="text-emerald-400/60 bg-emerald-400/5 rounded-md px-3 py-2 border border-emerald-400/10" style={{ fontSize: "10px" }}>
          <Check size={10} className="inline mr-1" />
          Updated {result.length} fiber{result.length !== 1 ? "s" : ""}
        </div>
      )}

      {lastOperation && canUndoFindReplace(lastOperation) ? (
        <button
          onClick={handleUndo}
          className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-white/70 hover:text-white/90 transition-colors cursor-pointer"
          style={{ fontSize: "11px", fontWeight: 600 }}
        >
          Undo last replace ({lastOperation.affected} fibers)
        </button>
      ) : null}
    </div>
  );
}

/* ── Tag Manager ── */

function TagManagerTab() {
  const { version } = useAtlasData();
  const tagMap = useMemo(() => dataSource.getAllTags(), [version]);
  const sorted = useMemo(() => {
    return [...tagMap.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [tagMap]);

  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    if (!filter) return sorted;
    const q = filter.toLowerCase();
    return sorted.filter(([tag]) => tag.toLowerCase().includes(q));
  }, [sorted, filter]);

  const handleStartRename = (tag: string) => {
    setRenaming(tag);
    setRenameValue(tag);
  };

  const handleConfirmRename = () => {
    if (renaming && renameValue.trim() && renameValue !== renaming) {
      dataSource.renameTag(renaming, renameValue.trim());
    }
    setRenaming(null);
  };

  const handleDelete = (tag: string) => {
    if (window.confirm(`Remove "${tag}" from all fibers?`)) {
      dataSource.deleteTag(tag);
    }
  };

  return (
    <div className="space-y-2">
      {/* Filter */}
      <div className="relative">
        <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter tags..."
          className="w-full pl-7 pr-2.5 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-md text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/20"
          style={{ fontSize: "11px" }}
        />
      </div>

      <div className="text-white/20" style={{ fontSize: "10px" }}>
        {sorted.length} unique tags across all fibers
      </div>

      {/* Tag list */}
      <div className="space-y-0.5 max-h-[50vh] overflow-y-auto">
        {filtered.map(([tag, fiberIds]) => (
          <div key={tag} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/[0.02] group">
            <Tag size={10} className="text-white/20 shrink-0" />
            {renaming === tag ? (
              <div className="flex-1 flex items-center gap-1">
                <input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleConfirmRename(); if (e.key === "Escape") setRenaming(null); }}
                  className="flex-1 px-1.5 py-0.5 bg-white/[0.06] border border-white/[0.15] rounded text-white/80 focus:outline-none"
                  style={{ fontSize: "11px" }}
                  autoFocus
                />
                <button onClick={handleConfirmRename} className="p-0.5 text-emerald-400/50 hover:text-emerald-400 cursor-pointer"><Check size={11} /></button>
                <button onClick={() => setRenaming(null)} className="p-0.5 text-white/30 hover:text-white/60 cursor-pointer"><X size={11} /></button>
              </div>
            ) : (
              <>
                <span className="text-white/70 flex-1 truncate" style={{ fontSize: "11px" }}>{tag}</span>
                <span className="text-white/20 shrink-0" style={{ fontSize: "9px" }}>
                  {fiberIds.length}
                </span>
                <button
                  onClick={() => handleStartRename(tag)}
                  className="p-0.5 text-white/0 group-hover:text-white/30 hover:text-white/60 cursor-pointer transition-colors"
                  title="Rename"
                >
                  <Pencil size={10} />
                </button>
                <button
                  onClick={() => handleDelete(tag)}
                  className="p-0.5 text-white/0 group-hover:text-red-400/30 hover:text-red-400/70 cursor-pointer transition-colors"
                  title="Delete from all fibers"
                >
                  <Trash2 size={10} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── SeeAlso Backlinks ── */

function BacklinksTab() {
  const { fibers } = useAtlasData();
  const { setEditingFiberId, setAdminView } = useAdminMode();

  // Build backlink map: fiberId → fiber IDs that reference it
  const backlinks = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const f of fibers) {
      for (const s of f.seeAlso) {
        const existing = map.get(s.id) ?? [];
        existing.push(f.id);
        map.set(s.id, existing);
      }
    }
    return map;
  }, [fibers]);

  // Find fibers with non-reciprocal links
  const nonReciprocal = useMemo(() => {
    const issues: Array<{ from: string; to: string }> = [];
    for (const f of fibers) {
      for (const s of f.seeAlso) {
        const target = fibers.find((t) => t.id === s.id);
        if (target && !target.seeAlso.some((t) => t.id === f.id)) {
          issues.push({ from: f.id, to: s.id });
        }
      }
    }
    return issues;
  }, [fibers]);

  // Orphaned references (seeAlso IDs that don't exist)
  const orphaned = useMemo(() => {
    const fiberIds = new Set(fibers.map((f) => f.id));
    const issues: Array<{ from: string; to: string }> = [];
    for (const f of fibers) {
      for (const s of f.seeAlso) {
        if (!fiberIds.has(s.id)) {
          issues.push({ from: f.id, to: s.id });
        }
      }
    }
    return issues;
  }, [fibers]);

  const handleEdit = (id: string) => {
    setEditingFiberId(id);
    setAdminView("edit");
  };

  return (
    <div className="space-y-3">
      {/* Orphaned references */}
      {orphaned.length > 0 && (
        <div className="bg-red-400/5 border border-red-400/10 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-red-400/60 mb-1.5" style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            <Trash2 size={10} /> Orphaned References ({orphaned.length})
          </div>
          {orphaned.map(({ from, to }) => (
            <div key={`${from}-${to}`} className="flex items-center gap-1.5 py-0.5" style={{ fontSize: "10px" }}>
              <button onClick={() => handleEdit(from)} className="text-white/60 hover:text-white/90 cursor-pointer underline">{from}</button>
              <ArrowRight size={8} className="text-white/20" />
              <span className="text-red-400/50">{to}</span>
              <span className="text-red-400/30">(missing)</span>
            </div>
          ))}
        </div>
      )}

      {/* Non-reciprocal links */}
      {nonReciprocal.length > 0 && (
        <div className="bg-blue-400/[0.04] border border-blue-400/12 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-blue-300/70 mb-1.5" style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            <Link2 size={10} /> One-Way Links ({nonReciprocal.length})
          </div>
          {nonReciprocal.slice(0, 30).map(({ from, to }) => (
            <div key={`${from}-${to}`} className="flex items-center gap-1.5 py-0.5" style={{ fontSize: "10px" }}>
              <button onClick={() => handleEdit(from)} className="text-white/60 hover:text-white/90 cursor-pointer underline">{from}</button>
              <ArrowRight size={8} className="text-white/20" />
              <button onClick={() => handleEdit(to)} className="text-white/60 hover:text-white/90 cursor-pointer underline">{to}</button>
              <span className="text-blue-300/45">(no backlink)</span>
            </div>
          ))}
          {nonReciprocal.length > 30 && (
            <div className="text-white/20 mt-1" style={{ fontSize: "10px" }}>
              +{nonReciprocal.length - 30} more…
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="bg-white/[0.02] rounded-lg border border-white/[0.04] p-2.5">
        <div className="text-white/40 mb-2" style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Reference Stats
        </div>
        <div className="space-y-1">
          {fibers
            .filter((f) => f.seeAlso.length > 0 || (backlinks.get(f.id)?.length ?? 0) > 0)
            .sort((a, b) => (backlinks.get(b.id)?.length ?? 0) - (backlinks.get(a.id)?.length ?? 0))
            .slice(0, 30)
            .map((f) => (
              <div key={f.id} className="flex items-center gap-2" style={{ fontSize: "10px" }}>
                <button onClick={() => handleEdit(f.id)} className="text-white/60 hover:text-white/80 cursor-pointer truncate flex-1 text-left">
                  {f.name}
                </button>
                <span className="text-emerald-400/40 shrink-0">
                  ↗ {f.seeAlso.length}
                </span>
                <span className="text-blue-400/40 shrink-0">
                  ↙ {backlinks.get(f.id)?.length ?? 0}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Batch View
   ══════════════════════════════════════════════════════════ */

export function AdminBatchView() {
  const [tab, setTab] = useState<"findReplace" | "tags" | "backlinks">("findReplace");

  const tabs = [
    { key: "findReplace" as const, label: "Find & Replace", icon: Search },
    { key: "tags" as const, label: "Tags", icon: Tag },
    { key: "backlinks" as const, label: "Backlinks", icon: Link2 },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-white/[0.06]">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`flex-1 py-2 text-center cursor-pointer transition-colors ${
              tab === key ? "text-blue-300/85 border-b border-blue-400/25 bg-blue-400/[0.03]" : "text-white/30 hover:text-white/50"
            }`}
            onClick={() => setTab(key)}
            style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            <Icon size={10} className="inline mr-1" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {tab === "findReplace" && <FindReplaceTab />}
        {tab === "tags" && <TagManagerTab />}
        {tab === "backlinks" && <BacklinksTab />}
      </div>
    </div>
  );
}