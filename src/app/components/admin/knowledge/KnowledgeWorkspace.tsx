import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { ContentItem } from "@/types/content";
import { saveNodeBundle } from "@/utils/nodeSaveTransaction";

type KnowledgeSectionId =
  | "summary"
  | "performance"
  | "sourcing"
  | "applications"
  | "certifications";

type WorkflowStatus = "draft" | "ready-review" | "published";
type Priority = "low" | "medium" | "high";

interface SectionSchema {
  id: KnowledgeSectionId;
  label: string;
  required: boolean;
  minLength: number;
  helper: string;
  placeholder: string;
}

interface SectionDraft {
  text: string;
  priority: Priority;
  rationale: string;
}

interface ProfileDraftState {
  id: string;
  workflowStatus: WorkflowStatus;
  sections: Record<KnowledgeSectionId, SectionDraft>;
  lastSavedAt: number | null;
  history: Array<{ at: number; note: string }>;
}

interface KnowledgeWorkspaceProps {
  items: ContentItem[];
  selectedId: string | null;
  searchQuery: string;
  onSelect: (id: string) => void;
  embedded?: boolean;
  knowledgeAction?: {
    action: "next-section" | "next-weak" | "toggle-reference" | "save-draft";
    at: number;
  } | null;
}

const SECTION_SCHEMA: SectionSchema[] = [
  {
    id: "summary",
    label: "Summary",
    required: true,
    minLength: 80,
    helper: "Concise and accurate profile summary.",
    placeholder: "Describe the material in 2-4 strong sentences...",
  },
  {
    id: "performance",
    label: "Performance",
    required: true,
    minLength: 60,
    helper: "Mechanical/thermal/moisture behavior and tradeoffs.",
    placeholder: "Capture measurable performance attributes...",
  },
  {
    id: "sourcing",
    label: "Sourcing",
    required: true,
    minLength: 40,
    helper: "Origin, supply characteristics, and constraints.",
    placeholder: "Describe sourcing and provenance details...",
  },
  {
    id: "applications",
    label: "Applications",
    required: false,
    minLength: 30,
    helper: "Where this material is best used.",
    placeholder: "Typical use cases and context...",
  },
  {
    id: "certifications",
    label: "Certifications",
    required: false,
    minLength: 20,
    helper: "Standards and certifications.",
    placeholder: "Relevant certifications and compliance marks...",
  },
];

const STORAGE_KEY = "atlas-knowledge-workspace-drafts";

function getText(passport: ContentItem["passport"], key: KnowledgeSectionId): string {
  if (!passport) return "";
  const value = (passport as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function buildProfileState(item: ContentItem): ProfileDraftState {
  const baseSections = SECTION_SCHEMA.reduce((acc, section) => {
    acc[section.id] = {
      text: getText(item.passport, section.id),
      priority: "medium" as Priority,
      rationale: "",
    };
    return acc;
  }, {} as Record<KnowledgeSectionId, SectionDraft>);

  return {
    id: item.id,
    workflowStatus: item.status === "published" ? "published" : "draft",
    sections: baseSections,
    lastSavedAt: null,
    history: [],
  };
}

function computeQuality(state: ProfileDraftState): { score: number; weakSections: KnowledgeSectionId[] } {
  let score = 0;
  const weakSections: KnowledgeSectionId[] = [];

  for (const section of SECTION_SCHEMA) {
    const text = state.sections[section.id].text.trim();
    if (!text) {
      if (section.required) weakSections.push(section.id);
      continue;
    }
    if (text.length < section.minLength) {
      weakSections.push(section.id);
      score += 8;
    } else {
      score += 20;
    }
  }

  return { score: Math.min(100, score), weakSections };
}

export function KnowledgeWorkspace({
  items,
  selectedId,
  searchQuery,
  onSelect,
  embedded = false,
  knowledgeAction = null,
}: KnowledgeWorkspaceProps) {
  const [activeSection, setActiveSection] = useState<KnowledgeSectionId>("summary");
  const [showReferencePane, setShowReferencePane] = useState(!embedded);
  const [profileState, setProfileState] = useState<Record<string, ProfileDraftState>>({});
  const [baselineState, setBaselineState] = useState<Record<string, ProfileDraftState>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => item.id.toLowerCase().includes(query));
  }, [items, searchQuery]);

  const activeId = useMemo(() => {
    if (selectedId && filtered.some((item) => item.id === selectedId)) return selectedId;
    return filtered[0]?.id ?? null;
  }, [filtered, selectedId]);

  useEffect(() => {
    setProfileState((prev) => {
      const next = { ...prev };
      for (const item of items) {
        if (!next[item.id]) {
          next[item.id] = buildProfileState(item);
        }
      }
      return next;
    });
    setBaselineState((prev) => {
      const next = { ...prev };
      for (const item of items) {
        if (!next[item.id]) {
          next[item.id] = buildProfileState(item);
        }
      }
      return next;
    });
  }, [items]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, ProfileDraftState>;
      if (!parsed || typeof parsed !== "object") return;

      // Merge persisted drafts with current item-derived defaults so we never
      // lose profile rows when storage is stale or partially populated.
      setProfileState((prev) => {
        const next = { ...prev };
        for (const item of items) {
          next[item.id] = {
            ...(next[item.id] ?? buildProfileState(item)),
            ...(parsed[item.id] ?? {}),
            id: item.id,
          } as ProfileDraftState;
        }
        return next;
      });
    } catch {
      // no-op
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profileState));
    } catch {
      // no-op
    }
  }, [profileState]);

  useEffect(() => {
    if (activeId) onSelect(activeId);
  }, [activeId, onSelect]);

  const current = activeId ? profileState[activeId] : null;
  const baseline = activeId ? baselineState[activeId] : null;
  const quality = current ? computeQuality(current) : { score: 0, weakSections: [] as KnowledgeSectionId[] };

  const updateSection = useCallback(
    (sectionId: KnowledgeSectionId, patch: Partial<SectionDraft>) => {
      if (!activeId) return;
      setProfileState((prev) => ({
        ...prev,
        [activeId]: {
          ...prev[activeId],
          sections: {
            ...prev[activeId].sections,
            [sectionId]: { ...prev[activeId].sections[sectionId], ...patch },
          },
        },
      }));
    },
    [activeId]
  );

  const setWorkflowStatus = useCallback(
    (status: WorkflowStatus) => {
      if (!activeId || !current) return;
      if (status === "published" && quality.score < 75) return;
      setProfileState((prev) => ({
        ...prev,
        [activeId]: {
          ...prev[activeId],
          workflowStatus: status,
          history: [
            { at: Date.now(), note: `Status changed to ${status}` },
            ...prev[activeId].history,
          ].slice(0, 20),
        },
      }));
    },
    [activeId, current, quality.score]
  );

  const saveDraft = useCallback(async () => {
    if (!activeId || !current) return;
    const sourceItem = items.find((item) => item.id === activeId);
    const sourcePassport = ((sourceItem?.passport ?? {}) as Record<string, unknown>) || {};
    const nextPassport: Record<string, unknown> = {
      ...sourcePassport,
      summary: current.sections.summary.text,
      performance: current.sections.performance.text,
      sourcing: current.sections.sourcing.text,
      applications: current.sections.applications.text,
      certifications: current.sections.certifications.text,
      status: current.workflowStatus,
      lastUpdated: new Date().toISOString().slice(0, 10),
    };

    setSaveError(null);
    setIsSaving(true);
    try {
      const result = await saveNodeBundle({
        nodeId: activeId,
        expectedRevision: null,
        passport: nextPassport,
        atlasPatch: {},
      });
      if (!result.ok) {
        throw new Error(result.error || `Save failed (HTTP ${result.status})`);
      }
      const at = Date.now();
      setProfileState((prev) => ({
        ...prev,
        [activeId]: {
          ...prev[activeId],
          lastSavedAt: at,
          history: [{ at, note: "Draft saved" }, ...prev[activeId].history].slice(0, 20),
        },
      }));
      setBaselineState((prev) => ({
        ...prev,
        [activeId]: {
          ...prev[activeId],
          sections: current.sections,
          workflowStatus: current.workflowStatus,
          lastSavedAt: at,
          history: prev[activeId]?.history ?? [],
          id: activeId,
        },
      }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save draft");
    } finally {
      setIsSaving(false);
    }
  }, [activeId, current, items]);

  const gotoNextWeak = useCallback(() => {
    if (!quality.weakSections.length) return;
    const currentIdx = quality.weakSections.indexOf(activeSection);
    const next = quality.weakSections[(currentIdx + 1) % quality.weakSections.length];
    setActiveSection(next);
  }, [quality.weakSections, activeSection]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (!current) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveDraft();
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "\\") {
        event.preventDefault();
        setShowReferencePane((prev) => !prev);
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "]") {
        event.preventDefault();
        const idx = SECTION_SCHEMA.findIndex((section) => section.id === activeSection);
        setActiveSection(SECTION_SCHEMA[(idx + 1) % SECTION_SCHEMA.length].id);
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "[") {
        event.preventDefault();
        const idx = SECTION_SCHEMA.findIndex((section) => section.id === activeSection);
        setActiveSection(SECTION_SCHEMA[(idx - 1 + SECTION_SCHEMA.length) % SECTION_SCHEMA.length].id);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") {
        event.preventDefault();
        gotoNextWeak();
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
    };
  }, [current, activeSection, gotoNextWeak, saveDraft]);

  useEffect(() => {
    if (!knowledgeAction) return;
    if (knowledgeAction.action === "next-section") {
      const idx = SECTION_SCHEMA.findIndex((section) => section.id === activeSection);
      setActiveSection(SECTION_SCHEMA[(idx + 1) % SECTION_SCHEMA.length].id);
      return;
    }
    if (knowledgeAction.action === "next-weak") {
      gotoNextWeak();
      return;
    }
    if (knowledgeAction.action === "toggle-reference") {
      setShowReferencePane((prev) => !prev);
      return;
    }
    if (knowledgeAction.action === "save-draft") {
      void saveDraft();
    }
  }, [activeSection, gotoNextWeak, knowledgeAction, saveDraft]);

  const diffEntries = useMemo(() => {
    if (!current || !baseline) return [];
    return SECTION_SCHEMA.filter((section) => {
      const before = baseline.sections[section.id].text.trim();
      const after = current.sections[section.id].text.trim();
      return before !== after;
    }).map((section) => ({
      sectionId: section.id,
      before: baseline.sections[section.id].text.trim(),
      after: current.sections[section.id].text.trim(),
      rationale: current.sections[section.id].rationale,
    }));
  }, [current, baseline]);

  if (!activeId || !current) {
    return (
      <div data-testid="knowledge-view" className="h-full grid place-items-center text-neutral-500">
        No profile selected.
      </div>
    );
  }

  const activeSectionSchema = SECTION_SCHEMA.find((section) => section.id === activeSection)!;
  const activeSectionDraft = current.sections[activeSection];

  return (
    <div
      data-testid="knowledge-view"
      className={`h-full min-h-0 grid gap-3 ${embedded ? "grid-cols-[1fr_320px]" : "grid-cols-[260px_1fr_320px] gap-4"}`}
    >
      {/* Profile rail */}
      {!embedded && (
        <aside className="rounded-xl border border-white/10 bg-white/[0.02] p-3 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">Profiles</div>
          <div className="space-y-2">
            {filtered.map((item) => {
              const itemState = profileState[item.id];
              const itemQuality = itemState ? computeQuality(itemState).score : 0;
              const active = item.id === activeId;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                    active
                      ? "border-blue-400/25 bg-blue-400/[0.07] text-blue-100"
                      : "border-white/10 bg-transparent text-neutral-300 hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="text-xs font-semibold truncate">{item.id}</div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-neutral-500">
                    <span>{itemState?.workflowStatus ?? "draft"}</span>
                    <span>{itemQuality}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      )}

      {/* Editor core */}
      <main className="rounded-xl border border-white/10 bg-[#0d0d0f] flex flex-col overflow-hidden">
        <div className="border-b border-white/10 p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {SECTION_SCHEMA.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`px-2.5 py-1 rounded text-[11px] border ${
                  section.id === activeSection
                    ? "border-blue-400/25 bg-blue-400/[0.09] text-blue-100"
                    : "border-white/10 text-neutral-400 hover:bg-white/[0.04]"
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={gotoNextWeak}
              className="px-2 py-1 rounded border border-red-400/25 text-red-300/85 bg-red-400/[0.04] text-[10px] uppercase tracking-wide"
            >
              Next weak
            </button>
            <button
              onClick={() => void saveDraft()}
              disabled={isSaving}
              className="px-2 py-1 rounded border border-blue-400/25 text-blue-300/90 bg-blue-400/[0.04] text-[10px] uppercase tracking-wide"
            >
              {isSaving ? "Saving..." : "Save draft"}
            </button>
          </div>
        </div>
        {saveError ? (
          <div className="px-4 py-2 text-[11px] text-red-300 border-b border-red-400/20 bg-red-400/[0.05]">
            {saveError}
          </div>
        ) : null}

        <div className="p-4 overflow-y-auto space-y-4">
          <div>
            <div className="text-sm text-white font-semibold">{activeSectionSchema.label}</div>
            <div className="text-[11px] text-neutral-500 mt-1">{activeSectionSchema.helper}</div>
          </div>

          {/* Structured + narrative hybrid */}
          <div className="grid grid-cols-2 gap-3">
            <label className="text-[11px] text-neutral-400">
              Quality priority
              <select
                value={activeSectionDraft.priority}
                onChange={(event) => updateSection(activeSection, { priority: event.target.value as Priority })}
                className="mt-1 w-full rounded border border-white/10 bg-black/30 p-2 text-xs text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="text-[11px] text-neutral-400">
              Rationale (for major changes)
              <input
                value={activeSectionDraft.rationale}
                onChange={(event) => updateSection(activeSection, { rationale: event.target.value })}
                className="mt-1 w-full rounded border border-white/10 bg-black/30 p-2 text-xs text-white"
                placeholder="Why this edit?"
              />
            </label>
          </div>

          <label className="block text-[11px] text-neutral-400">
            Narrative text
            <textarea
              value={activeSectionDraft.text}
              onChange={(event) => updateSection(activeSection, { text: event.target.value })}
              placeholder={activeSectionSchema.placeholder}
              className="mt-1 min-h-[180px] w-full rounded border border-white/10 bg-black/30 p-3 text-sm text-white"
            />
          </label>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-neutral-500">
              {activeSectionDraft.text.trim().length} chars (target {activeSectionSchema.minLength}+)
            </span>
            {activeSectionSchema.required && activeSectionDraft.text.trim().length < activeSectionSchema.minLength ? (
              <span className="text-red-300/85">Needs expansion</span>
            ) : (
              <span className="text-emerald-300/90">Looks good</span>
            )}
          </div>
        </div>

        {/* Workflow status row */}
        <div className="border-t border-white/10 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-neutral-500">
            <span>Status:</span>
            <span className="text-white">{current.workflowStatus}</span>
            <span>Quality: {quality.score}%</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWorkflowStatus("draft")}
              className="px-2 py-1 rounded border border-white/20 text-[10px] text-neutral-300"
            >
              Draft
            </button>
            <button
              onClick={() => setWorkflowStatus("ready-review")}
              className="px-2 py-1 rounded border border-blue-400/25 bg-blue-400/[0.04] text-[10px] text-blue-300/90"
            >
              Ready
            </button>
            <button
              onClick={() => setWorkflowStatus("published")}
              disabled={quality.score < 75}
              className="px-2 py-1 rounded border border-emerald-400/25 bg-emerald-400/[0.04] text-[10px] text-emerald-300/90 disabled:opacity-40"
            >
              Publish
            </button>
          </div>
        </div>
      </main>

      {/* Reference + change intelligence pane */}
      <aside
        className={`rounded-xl border border-white/10 bg-white/[0.02] p-3 overflow-y-auto ${
          showReferencePane ? "block" : "hidden"
        }`}
      >
        <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">Reference</div>
        <div className="space-y-2 text-xs">
          <div className="rounded border border-white/10 p-2">
            <div className="text-neutral-500 mb-1">Profile</div>
            <div className="text-white">{activeId}</div>
          </div>
          <div className="rounded border border-white/10 p-2">
            <div className="text-neutral-500 mb-1">Image count</div>
            <div className="text-white">{items.find((item) => item.id === activeId)?.imageCount ?? 0}</div>
          </div>
        </div>

        <div className="text-[10px] uppercase tracking-widest text-neutral-500 mt-5 mb-2">Field diff</div>
        <div className="space-y-2">
          {diffEntries.length === 0 && <div className="text-xs text-neutral-500">No unsaved text diffs.</div>}
          {diffEntries.map((entry) => (
            <div key={entry.sectionId} className="rounded border border-white/10 p-2">
              <div className="text-[11px] text-white mb-1 capitalize">{entry.sectionId}</div>
              <div className="text-[10px] text-neutral-500 line-clamp-2">Before: {entry.before || "—"}</div>
              <div className="text-[10px] text-neutral-300 line-clamp-2 mt-1">After: {entry.after || "—"}</div>
              {entry.rationale && (
                <div className="text-[10px] text-blue-300/90 mt-1">Rationale: {entry.rationale}</div>
              )}
            </div>
          ))}
        </div>

        <div className="text-[10px] uppercase tracking-widest text-neutral-500 mt-5 mb-2">Recent edits</div>
        <div className="space-y-1">
          {current.history.slice(0, 8).map((h, index) => (
            <div key={`${h.at}-${index}`} className="text-[10px] text-neutral-400">
              {new Date(h.at).toLocaleTimeString()} - {h.note}
            </div>
          ))}
          {current.history.length === 0 && <div className="text-[10px] text-neutral-500">No edit events yet.</div>}
        </div>
      </aside>
    </div>
  );
}

