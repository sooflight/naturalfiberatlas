/**
 * unified-editor.tsx — Single unified editor view for the admin workspace.
 *
 * Merges the WYSIWYG card aesthetic, all supplementary form editors, and the
 * gallery studio into one continuous scrollable view. Every section is
 * editable inline — no mode switching required.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router";
import { useAtlasData } from "../../context/atlas-data-context";
import { type FiberProfile, mergeFiberGalleryWithFallback } from "../../data/atlas-data";
import { dataSource } from "../../data/data-provider";
import {
  Check,
  Layers,
  Globe2,
  Dna,
  Shirt,
  Quote,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

/* ── Validation system ── */
import { ValidationProvider, useValidation } from "./validation";
import { ValidationBadge } from "./validation/ValidationBadge";
import { SaveChecklistModal } from "./validation/SaveChecklistModal";

/* ── Editor mode system (advanced only) ── */
import { EditorModeProvider } from "./editor/EditorModeProvider";

/* ── Reuse card primitives from card-editor ── */
import {
  EditableCardShell,
  CardLabel,
  ProfileHeroCard,
  AboutCard,
  InsightCard,
  TradeCard,
  ProfilePillsCard,
  SeeAlsoCard,
  YouTubeUrlCard,
} from "./card-editor";

/* ── Image preview (match ImageBase) ── */
import {
  buildPreviewImageSrc,
  buildPreviewSrcSet,
  getPreviewPreset,
  getPreviewSizes,
} from "./image-preview-utils";
import { toUrlArray } from "@/utils/imageUrl";

/* ── Supplementary editors (inline) ── */
import {
  ProcessEditor,
  AnatomyEditor,
  CareEditor,
  QuoteEditor,
  WorldNamesEditor,
} from "./supplementary-editors";

/* ═══════════════════════════════════════════════════════════
   Expandable Section — wraps supplementary editors inline
   ═══════════════════════════════════════════════════════════ */

function ExpandableEditorCard({
  fiber,
  icon,
  iconColor,
  label,
  badge,
  badgeColor = "bg-white/[0.04] text-white/30 border-white/[0.06]",
  defaultOpen = true,
  sectionId,
  children,
}: {
  fiber: FiberProfile;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconColor: string;
  label: string;
  badge?: string;
  badgeColor?: string;
  defaultOpen?: boolean;
  sectionId?: string;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const elRef = useRef<HTMLDivElement>(null);

  /* Listen for cross-panel scroll-to-section events */
  useEffect(() => {
    if (!sectionId) return;
    const handler = (e: Event) => {
      const section = (e as CustomEvent<string>).detail;
      if (section === sectionId) {
        setExpanded(true);
        requestAnimationFrame(() => {
          elRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    };
    window.addEventListener("admin:scroll-to-section", handler);
    return () => window.removeEventListener("admin:scroll-to-section", handler);
  }, [sectionId]);

  return (
    <div ref={elRef}>
      <EditableCardShell fiber={fiber} minHeight={0}>
        <div className="p-4">
          {/* Header — clickable to toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center gap-2 cursor-pointer group/exp"
          >
            <span className="text-white/20 group-hover/exp:text-white/40 transition-colors shrink-0">
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
            <CardLabel icon={icon} iconColor={iconColor}>
              {label}
            </CardLabel>
            {badge && (
              <span
                className={`px-1.5 py-0.5 rounded-full border shrink-0 -mt-3 ${badgeColor}`}
                style={{ fontSize: "8px", fontWeight: 600 }}
              >
                {badge}
              </span>
            )}
          </button>

          {/* Inline editor body */}
          {expanded && (
            <div className="mt-2 pt-3 border-t border-white/[0.06]">
              {children}
            </div>
          )}
        </div>
      </EditableCardShell>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Inline Quote Card — full editing instead of read-only
   ═══════════════════════════════════════════════════════════ */

function InlineQuoteCard({ fiber, sectionId }: { fiber: FiberProfile; sectionId?: string }) {
  const quotes = dataSource.getQuoteData()[fiber.id] ?? [];
  const [expanded, setExpanded] = useState(true);
  const elRef = useRef<HTMLDivElement>(null);

  /* Listen for cross-panel scroll-to-section events */
  useEffect(() => {
    if (!sectionId) return;
    const handler = (e: Event) => {
      const section = (e as CustomEvent<string>).detail;
      if (section === sectionId) {
        setExpanded(true);
        requestAnimationFrame(() => {
          elRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    };
    window.addEventListener("admin:scroll-to-section", handler);
    return () => window.removeEventListener("admin:scroll-to-section", handler);
  }, [sectionId]);

  return (
    <div ref={elRef}>
      <EditableCardShell fiber={fiber} minHeight={0}>
        <div className="p-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center gap-2 cursor-pointer group/exp"
          >
            <span className="text-white/20 group-hover/exp:text-white/40 transition-colors">
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
            <CardLabel icon={Quote} iconColor="text-blue-400/40">
              Quotes
            </CardLabel>
            <span
              className={`px-1.5 py-0.5 rounded-full border shrink-0 -mt-3 ${
                quotes.length > 0
                  ? "bg-blue-400/[0.06] text-blue-400/40 border-blue-400/10"
                  : "bg-white/[0.04] text-white/25 border-white/[0.06]"
              }`}
              style={{ fontSize: "8px", fontWeight: 600 }}
            >
              {quotes.length}
            </span>
          </button>

          {expanded && (
            <div className="mt-2 pt-3 border-t border-white/[0.06]">
              {/* Show quote previews */}
              {quotes.length > 0 && (
                <div className="mb-4 space-y-3">
                  {quotes.map((q, i) => (
                    <div key={i} className="border-l-2 border-blue-400/20 pl-3">
                      <p
                        className="text-white/[0.7]"
                        style={{
                          fontSize: "12px",
                          lineHeight: 1.5,
                          fontFamily: "'PICA', 'Pica', serif",
                          letterSpacing: "0.04em",
                        }}
                      >
                        &ldquo;{q.text}&rdquo;
                      </p>
                      <span
                        className="text-blue-400/40 uppercase tracking-[0.1em] mt-1 block"
                        style={{ fontSize: "9px" }}
                      >
                        {q.attribution}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {/* Inline editor */}
              <QuoteEditor fiberId={fiber.id} />
            </div>
          )}
        </div>
      </EditableCardShell>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Inline ImageBase Profile Box — quick profile image context
   ═══════════════════════════════════════════════════════════ */

/* Grid cell size for compact Knowledge panel (ImageBase uses 120px) */
const IMAGEBASE_EMBED_ZOOM = 40;
const ATLAS_IMAGES_STORAGE_KEY = "atlas-images";

function resolveUnifiedImageBaseUrls(fiber: FiberProfile): string[] {
  const fallback = toUrlArray(mergeFiberGalleryWithFallback(fiber.id, fiber))
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(ATLAS_IMAGES_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(parsed, fiber.id)) return fallback;
    return toUrlArray(parsed[fiber.id] as never)
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
  } catch {
    return fallback;
  }
}

function InlineImageBaseProfileBox({
  fiber,
  sectionId,
}: {
  fiber: FiberProfile;
  sectionId?: string;
}) {
  const navigate = useNavigate();
  const urls = useMemo(
    () => resolveUnifiedImageBaseUrls(fiber),
    [fiber],
  );
  const elRef = useRef<HTMLDivElement>(null);
  const preset = getPreviewPreset("list");
  const sizes = getPreviewSizes("list", IMAGEBASE_EMBED_ZOOM);

  /* Listen for cross-panel scroll-to-section events */
  useEffect(() => {
    if (!sectionId) return;
    const handler = (e: Event) => {
      const section = (e as CustomEvent<string>).detail;
      if (section === sectionId) {
        requestAnimationFrame(() => {
          elRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    };
    window.addEventListener("admin:scroll-to-section", handler);
    return () => window.removeEventListener("admin:scroll-to-section", handler);
  }, [sectionId]);

  return (
    <div ref={elRef}>
      {/* Match ImageBase ProfileCard UI exactly */}
      <div
        className="rounded-xl overflow-hidden border border-white/[0.06] transition-all hover:border-white/[0.12]"
        style={{ background: "rgba(20,20,23,0.6)" }}
      >
        {/* Header — same as ImageBase ProfileCard */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.02] transition-colors"
          style={{ background: "rgba(0,0,0,0.2)" }}
          onClick={() => navigate(`/admin/images?fiber=${encodeURIComponent(fiber.id)}`)}
        >
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-white/90 truncate max-w-[200px]">
              {fiber.id}
            </span>
            <span className="text-xs text-neutral-400">
              ({urls.length})
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/admin/images?fiber=${encodeURIComponent(fiber.id)}`);
              }}
              className="px-2.5 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-white/55 hover:text-white/80 transition-colors text-[10px] font-medium"
            >
              Open ImageBase
            </button>
          </div>
        </div>

        {/* Images grid — same layout as ImageBase expanded content, smaller cells */}
        <div className="p-4">
          {urls.length > 0 ? (
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${IMAGEBASE_EMBED_ZOOM}px, 1fr))` }}
            >
              {urls.map((url, i) => (
                <div
                  key={`${url}-${i}`}
                  onClick={() => navigate(`/admin/images?fiber=${encodeURIComponent(fiber.id)}`)}
                  className="relative aspect-[5/7] rounded-lg overflow-hidden bg-black/40 group/image border border-white/[0.06] hover:border-white/[0.15] transition-all cursor-pointer"
                >
                  <img
                    src={buildPreviewImageSrc(url, preset)}
                    srcSet={buildPreviewSrcSet(url, preset)}
                    sizes={sizes}
                    alt={`${fiber.id} ${i + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* Index number on hover — same as ImageBase */}
                  <div className="absolute top-1 right-1 p-0.5 opacity-0 group-hover/image:opacity-100 transition-opacity">
                    <span className="text-[9px] font-medium text-white/90">
                      {i + 1}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-20 flex items-center justify-center text-neutral-600 text-xs rounded-lg border border-dashed border-white/[0.08] bg-black/20">
              No profile images
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN UNIFIED EDITOR
   ═══════════════════════════════════════════════════════════ */

export type UnifiedEditorSaveState = "idle" | "pending" | "saved";

interface UnifiedEditorProps {
  fiberId: string;
  onDirtyChange?: (dirty: boolean) => void;
  onSaveStatusChange?: (state: UnifiedEditorSaveState) => void;
  onRegisterSave?: (save: () => void) => void;
}

export function UnifiedEditor({
  fiberId,
  onDirtyChange,
  onSaveStatusChange,
  onRegisterSave,
}: UnifiedEditorProps) {
  return (
    <UnifiedEditorInner
      fiberId={fiberId}
      onDirtyChange={onDirtyChange}
      onSaveStatusChange={onSaveStatusChange}
      onRegisterSave={onRegisterSave}
    />
  );
}

function UnifiedEditorInner({
  fiberId,
  onDirtyChange,
  onSaveStatusChange,
  onRegisterSave,
}: UnifiedEditorProps) {
  const { getFiberById, updateFiber, version } = useAtlasData();
  const fiber = getFiberById(fiberId);

  /* Draft + debounced save */
  const [draft, setDraft] = useState<FiberProfile | null>(null);
  const lastIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatchRef = useRef<Partial<FiberProfile>>({});
  const [saveState, setSaveState] = useState<UnifiedEditorSaveState>("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const confirmSave = useCallback(() => {
    setSaveState("saved");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaveState("idle"), 1500);
  }, []);

  const flushPending = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const accumulated = pendingPatchRef.current;
    if (Object.keys(accumulated).length === 0) {
      return;
    }
    pendingPatchRef.current = {};
    updateFiber(fiberId, accumulated);
    confirmSave();
  }, [confirmSave, fiberId, updateFiber]);

  /* Sync + flush on fiber switch */
  useEffect(() => {
    if (fiberId !== lastIdRef.current) {
      if (lastIdRef.current && Object.keys(pendingPatchRef.current).length > 0) {
        const prevId = lastIdRef.current;
        const prevPatch = pendingPatchRef.current;
        pendingPatchRef.current = {};
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
        updateFiber(prevId, prevPatch);
      }
      lastIdRef.current = fiberId;
      const f = getFiberById(fiberId);
      if (f) setDraft({ ...f });
      setSaveState("idle");
    }
  }, [fiberId, getFiberById, updateFiber]);

  /* Re-sync draft when version changes (undo/redo) */
  useEffect(() => {
    const f = getFiberById(fiberId);
    if (f && Object.keys(pendingPatchRef.current).length === 0) {
      setDraft({ ...f });
    }
  }, [version, fiberId, getFiberById]);

  /* Flush on unmount */
  useEffect(() => {
    onSaveStatusChange?.(saveState);
    onDirtyChange?.(saveState === "pending" || Object.keys(pendingPatchRef.current).length > 0);
  }, [onDirtyChange, onSaveStatusChange, saveState]);

  useEffect(() => {
    onRegisterSave?.(flushPending);
  }, [flushPending, onRegisterSave]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const accumulated = pendingPatchRef.current;
      if (Object.keys(accumulated).length > 0 && lastIdRef.current) {
        dataSource.updateFiber(lastIdRef.current, accumulated);
      }
    };
  }, []);

  const pushUpdate = useCallback(
    (patch: Partial<FiberProfile>) => {
      setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
      pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };
      setSaveState("pending");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        flushPending();
      }, 300);
    },
    [flushPending],
  );

  if (!draft || !fiber) {
    return (
      <div className="flex items-center justify-center h-40 text-white/20" style={{ fontSize: "12px" }}>
        Select a fiber to edit
      </div>
    );
  }

  return (
    <ValidationProvider fiber={draft}>
      <EditorModeProvider>
        <UnifiedEditorContent
          draft={draft}
          fiber={fiber}
          fiberId={fiberId}
          saveState={saveState}
          onPushUpdate={pushUpdate}
        />
      </EditorModeProvider>
    </ValidationProvider>
  );
}

interface UnifiedEditorContentProps {
  draft: FiberProfile;
  fiber: FiberProfile;
  fiberId: string;
  saveState: UnifiedEditorSaveState;
  onPushUpdate: (patch: Partial<FiberProfile>) => void;
}

function UnifiedEditorContent({
  draft,
  fiber,
  fiberId,
  saveState,
  onPushUpdate: pushUpdate,
}: UnifiedEditorContentProps) {
  const { result } = useValidation();
  const [showValidationModal, setShowValidationModal] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  /* ── Scroll-to-section event listener ── */
  useEffect(() => {
    const handler = (e: Event) => {
      const section = (e as CustomEvent<string>).detail;
      if (!section || !scrollContainerRef.current) return;
      const el = scrollContainerRef.current.querySelector(
        `[data-editor-section="${section}"]`,
      ) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    window.addEventListener("admin:scroll-to-section", handler);
    return () => window.removeEventListener("admin:scroll-to-section", handler);
  }, []);

  /* Supplementary data counts */
  const processSteps = useMemo(
    () => (dataSource.getProcessData()[fiberId] ?? []).length,
    [fiberId],
  );
  const hasAnatomy = useMemo(
    () => !!dataSource.getAnatomyData()[fiberId],
    [fiberId],
  );
  const hasCare = useMemo(
    () => !!dataSource.getCareData()[fiberId],
    [fiberId],
  );
  const worldNames = useMemo(
    () => (dataSource.getWorldNames()[fiberId] ?? []).length,
    [fiberId],
  );
  const sentences = useMemo(
    () => draft?.about?.match(/[^.!?]+[.!?]+/g) ?? [],
    [draft?.about],
  );

  const handleSave = () => {
    if (result && !result.isValid) {
      setShowValidationModal(true);
      return;
    }
    // Trigger save via the existing mechanism
    window.dispatchEvent(new CustomEvent("admin:trigger-save"));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <span
            className="text-white/30"
            style={{ fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}
          >
            Unified Editor
          </span>
          <span className="text-white/15" style={{ fontSize: "9px" }}>
            Click any field to edit inline
          </span>
          {/* Validation badges */}
          {result && (
            <div className="flex items-center gap-1 ml-2">
              {result.errors.length > 0 && (
                <ValidationBadge severity="error" count={result.errors.length} tooltip={`${result.errors.length} errors blocking save`} />
              )}
              {result.warnings.length > 0 && (
                <ValidationBadge severity="warning" count={result.warnings.length} tooltip={`${result.warnings.length} warnings`} />
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saveState === "pending" && (
            <span className="text-white/20 animate-pulse" style={{ fontSize: "9px" }}>saving...</span>
          )}
          {saveState === "saved" && (
            <span className="inline-flex items-center gap-0.5 text-emerald-400/60" style={{ fontSize: "9px" }}>
              <Check size={8} /> saved
            </span>
          )}
          {/* Save button with validation check */}
          <button
            onClick={handleSave}
            className="px-2.5 py-1 rounded bg-blue-400/10 border border-blue-400/20 text-blue-400/70 hover:text-blue-400 transition-colors"
            style={{ fontSize: "10px", fontWeight: 600 }}
          >
            Save
          </button>
        </div>
      </div>

      {/* Validation Modal */}
      <SaveChecklistModal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        onForceSave={() => {
          setShowValidationModal(false);
          window.dispatchEvent(new CustomEvent("admin:trigger-force-save"));
        }}
        onFixIssues={() => setShowValidationModal(false)}
      />

      {/* Scrollable unified view — grid of 5:7 portrait cards like front-end detail view */}
      <div
        className="flex-1 overflow-y-auto p-3"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.06) transparent" }}
        ref={scrollContainerRef}
      >
        {/* ImageBase full-width at top */}
        <div data-editor-section="ImageBase" className="mb-2">
          <InlineImageBaseProfileBox fiber={draft} sectionId="ImageBase" />
        </div>

        {/* Grid of 5:7 portrait cards — more columns = smaller cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {/* ── Hero ── */}
          <div data-editor-section="Hero">
            <ProfileHeroCard fiber={draft} onUpdate={pushUpdate} />
          </div>

          {/* ── About ── */}
          <div data-editor-section="About">
            <AboutCard fiber={draft} onUpdate={pushUpdate} />
          </div>

          {/* ── Insights (auto-generated, read-only) ── */}
          {sentences.length >= 2 && (
            <>
              <div data-editor-section="Insights">
                <InsightCard fiber={draft} half={1} />
              </div>
              <div data-editor-section="Insights">
                <InsightCard fiber={draft} half={2} />
              </div>
              {sentences.length >= 3 && (
                <div data-editor-section="Insights">
                  <InsightCard fiber={draft} half={3} />
                </div>
              )}
            </>
          )}

          {/* ── Profile Pills ── */}
          <div data-editor-section="Profile Pills">
            <ProfilePillsCard fiber={draft} onUpdate={pushUpdate} />
          </div>

          {/* ── Trade ── */}
          <div data-editor-section="Trade Details">
            <TradeCard fiber={draft} onUpdate={pushUpdate} />
          </div>

          {/* ── Quotes (inline editor) ── */}
          <div data-editor-section="Quotes">
            <InlineQuoteCard fiber={draft} sectionId="Quotes" />
          </div>

          {/* ── YouTube (optional embed URL) — Knowledge / unified editor ── */}
          <div data-editor-section="Video (YouTube)">
            <YouTubeUrlCard fiber={draft} onUpdate={pushUpdate} />
          </div>

          {/* ── Process Steps (inline editor) ── */}
          <div data-editor-section="Process Steps">
            <ExpandableEditorCard
              fiber={draft}
              icon={Layers}
              iconColor="text-teal-400/50"
              label="Process Steps"
              badge={processSteps > 0 ? `${processSteps} step${processSteps !== 1 ? "s" : ""}` : "empty"}
              badgeColor={
                processSteps > 0
                  ? "bg-teal-400/[0.06] text-teal-400/40 border-teal-400/10"
                  : "bg-white/[0.04] text-white/25 border-white/[0.06]"
              }
              sectionId="Process Steps"
            >
              <ProcessEditor fiberId={fiberId} />
            </ExpandableEditorCard>
          </div>

          {/* ── Anatomy (inline editor) ── */}
          <div data-editor-section="Anatomy">
          <ExpandableEditorCard
            fiber={draft}
            icon={Dna}
            iconColor="text-cyan-400/50"
            label="Anatomy"
            badge={hasAnatomy ? "defined" : "empty"}
            badgeColor={
              hasAnatomy
                ? "bg-cyan-400/[0.06] text-cyan-400/40 border-cyan-400/10"
                : "bg-white/[0.04] text-white/25 border-white/[0.06]"
            }
            sectionId="Anatomy"
          >
            <AnatomyEditor fiberId={fiberId} />
          </ExpandableEditorCard>
          </div>

          {/* ── Care & Use (inline editor) ── */}
          <div data-editor-section="Care & Use">
          <ExpandableEditorCard
            fiber={draft}
            icon={Shirt}
            iconColor="text-indigo-400/50"
            label="Care & Use"
            badge={hasCare ? "defined" : "empty"}
            badgeColor={
              hasCare
                ? "bg-indigo-400/[0.06] text-indigo-400/40 border-indigo-400/10"
                : "bg-white/[0.04] text-white/25 border-white/[0.06]"
            }
            sectionId="Care & Use"
          >
            <CareEditor fiberId={fiberId} />
          </ExpandableEditorCard>
          </div>

          {/* ── World Names (inline editor) ── */}
          <div data-editor-section="World Names">
          <ExpandableEditorCard
            fiber={draft}
            icon={Globe2}
            iconColor="text-purple-400/50"
            label="World Names"
            badge={worldNames > 0 ? `${worldNames} name${worldNames !== 1 ? "s" : ""}` : "empty"}
            badgeColor={
              worldNames > 0
                ? "bg-purple-400/[0.06] text-purple-400/40 border-purple-400/10"
                : "bg-white/[0.04] text-white/25 border-white/[0.06]"
            }
            sectionId="World Names"
          >
            <WorldNamesEditor fiberId={fiberId} />
          </ExpandableEditorCard>
          </div>

          {/* ── See Also ── */}
          <div data-editor-section="See Also">
            <SeeAlsoCard fiber={draft} onUpdate={pushUpdate} />
          </div>
        </div>
      </div>
    </div>
  );
}