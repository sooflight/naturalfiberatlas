import React, { useState, useEffect, useCallback, useRef } from "react";
import { PlateEditor, type EditorState } from "./node-editor/PlateEditor";
import { PlatePreview } from "./node-editor/PlatePreview";
import { AiAssistPanel } from "./node-editor/AiAssistPanel";
import ImageScoutPanel from "./ImageScoutPanel";
import { buildScoutQuery } from "../../utils/admin/imageSearch";
import type { SectionId } from "../../utils/admin/aiGenerate";
import { logActivity } from "../../utils/admin/activityLog";
import {
  ATLAS_TAGS, PROFILE_ERA, PROFILE_ORIGINS, SCIENTIFIC_NAMES,
} from "../../data/admin/atlas-images";
import { MATERIAL_PASSPORTS } from "../../data/admin/material-passports";
import { useNodeData, seedNodes, invalidateNodeCache } from "../../hooks/admin/useNodeData";
import type { AtlasMedia, ImageEntry } from "../../types/atlas-media";
import { fetchNodeRevision } from "../../utils/admin/nodeSaveTransaction";
import { buildEditorState, type SaveStatus } from "./node-editor/nodeBundleState";
import { saveNodeBundleEditor } from "./node-editor/nodeBundlePersistence";
import { useBeforeUnloadGuard } from "./hooks/useUnsavedChangesGuard";
import { useAdminSave } from "./runtime/AdminSaveContext";

export function shouldPromptNodeSwitch(dirty: boolean, nextId: string, selectedId: string | null): boolean {
  return !!selectedId && dirty && nextId !== selectedId;
}

export function saveConflictMessage(status: number): string | null {
  if (status === 409) {
    return "This profile changed in another session. Refresh node data and retry.";
  }
  return null;
}

export function shouldAutoSaveNodeEditor(
  dirty: boolean,
  saveStatus: SaveStatus,
  kvLoadFailed: boolean
): boolean {
  return dirty && saveStatus !== "saving" && !kvLoadFailed;
}

const NODE_EDITOR_AUTOSAVE_DEBOUNCE_MS = 1200;

interface NodeEditorTabProps {
  initialNodeId?: string;
  onDirtyChange?: (dirty: boolean) => void;
}

export default function NodeEditorTab({ initialNodeId, onDirtyChange }: NodeEditorTabProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const initialRef = useRef<string | null>(null);
  const revisionRef = useRef<string | null>(null);

  // AI panel state
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiTargetSection, setAiTargetSection] = useState<SectionId | null>(null);

  // Scout panel state
  const [scoutOpen, setScoutOpen] = useState(false);
  const [flashMsg, setFlashMsg] = useState<string | null>(null);
  const adminSave = useAdminSave();

  const { data: kvData, loading: kvLoading, error: kvError } = useNodeData(selectedId ?? undefined);
  const kvLoadFailed = !!selectedId && !!kvError && !kvLoading && kvData === null;

  useEffect(() => {
    if (initialNodeId) setSelectedId(initialNodeId);
  }, [initialNodeId]);

  useEffect(() => {
    if (!selectedId) {
      setEditorState(null);
      setDirty(false);
      revisionRef.current = null;
      return;
    }
    if (kvLoading) return;
    if (kvLoadFailed) {
      setEditorState(null);
      setDirty(false);
      setSaveStatus("error");
      return;
    }
    const passport = MATERIAL_PASSPORTS[selectedId];
    const state = buildEditorState(selectedId, kvData, passport);
    setEditorState(state);
    initialRef.current = JSON.stringify(state);
    setDirty(false);
    setSaveStatus("idle");
  }, [selectedId, kvData, kvLoading, kvLoadFailed]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useBeforeUnloadGuard(dirty);

  useEffect(() => {
    if (!selectedId) return;
    let mounted = true;
    void (async () => {
      try {
        const revision = await fetchNodeRevision(selectedId);
        if (mounted) revisionRef.current = revision;
      } catch {
        // Non-fatal: save endpoint will still validate using current server revision.
      }
    })();
    return () => { mounted = false; };
  }, [selectedId]);

  const handleChange = useCallback((next: EditorState) => {
    setEditorState(next);
    setDirty(JSON.stringify(next) !== initialRef.current);
    setSaveStatus("idle");
  }, []);

  const handleAiRequest = useCallback((sectionId: SectionId) => {
    setAiTargetSection(sectionId);
    setAiPanelOpen(true);
  }, []);

  const handleOpenScout = useCallback(() => {
    if (!selectedId) return;
    setScoutOpen(true);
  }, [selectedId]);

  const handleAddScoutImages = useCallback((_profileKey: string, urls: string[], media?: AtlasMedia[]) => {
    if (!editorState || !urls.length) return;
    const entries: ImageEntry[] = media && media.length === urls.length
      ? media
      : urls;
    const next: EditorState = { ...editorState, images: [...editorState.images, ...entries] };
    handleChange(next);
    setScoutOpen(false);
  }, [editorState, handleChange]);

  const flash = useCallback((msg: string) => {
    setFlashMsg(msg);
    setTimeout(() => setFlashMsg(null), 2500);
  }, []);

  const handleAiPatch = useCallback((patch: Partial<EditorState>) => {
    if (!editorState) return;
    const next: EditorState = { ...editorState, ...patch };
    if (patch.nodeData) next.nodeData = { ...editorState.nodeData, ...patch.nodeData };
    if (patch.passport) next.passport = { ...editorState.passport, ...patch.passport } as any;
    handleChange(next);
  }, [editorState, handleChange]);

  const handleSave = useCallback(async () => {
    if (!editorState || !selectedId || kvLoadFailed) return;
    setSaveStatus("saving");
    const result = await saveNodeBundleEditor({
      nodeId: selectedId,
      editorState,
      kvLoadFailed,
      revisionRef,
      initialRef,
      seedNode: async (nodeId, nodeData) => {
        await seedNodes({ [`node:${nodeId}`]: nodeData });
      },
    });
    const nodeName = editorState.nodeData.name || selectedId;
    if (!result.ok) {
      setSaveStatus("error");
      console.error("[NodeEditor] Save errors:", result.failedTargets);
      alert(
        [
          `Save failed for "${nodeName}".`,
          result.persistedTargets.length > 0 ? `Persisted: ${result.persistedTargets.join(", ")}` : "Persisted: none",
          `Failed: ${result.failedTargets.join(" | ")}`,
        ].join("\n"),
      );
    } else {
      invalidateNodeCache(selectedId);
      setSaveStatus("saved");
      initialRef.current = JSON.stringify(editorState);
      setDirty(false);
      logActivity({ tab: "editor", action: "update", entityType: "node", entityId: selectedId, summary: `Saved node "${nodeName}" (${result.persistedTargets.join(", ")})` });
    }
  }, [editorState, selectedId, kvLoadFailed]);

  useEffect(() => {
    return adminSave.registerActiveSurface({
      isDirty: dirty,
      saveStatus,
      save: handleSave,
    });
  }, [adminSave.registerActiveSurface, dirty, saveStatus, handleSave]);

  useEffect(() => {
    if (!shouldAutoSaveNodeEditor(dirty, saveStatus, kvLoadFailed)) return;
    const autosaveTimer = setTimeout(() => {
      void handleSave();
    }, NODE_EDITOR_AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(autosaveTimer);
  }, [dirty, saveStatus, kvLoadFailed, handleSave]);

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Center: Form editor */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Header bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {dirty && (
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#60a5fa" }} title="Unsaved changes" />
            )}
            <span style={{ fontSize: 10, color: "#666" }}>
              {selectedId ? `node:${selectedId}` : "No node selected"}
            </span>
            {saveStatus === "saved" && <span style={{ fontSize: 10, color: "#0F783C" }}>Saved</span>}
            {saveStatus === "error" && <span style={{ fontSize: 10, color: "#f87171" }}>Error</span>}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {selectedId && (
              <>
                <button
                  onClick={handleOpenScout}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 4,
                    border: "1px solid rgba(96,165,250,0.15)",
                    background: "transparent",
                    color: "#60a5fa",
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                  Scout
                </button>
                <button
                  onClick={() => { setAiTargetSection(null); setAiPanelOpen(!aiPanelOpen); }}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 4,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: aiPanelOpen ? "rgba(96,165,250,0.12)" : "transparent",
                    color: aiPanelOpen ? "#60a5fa" : "#888",
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 13 }}>✦</span> AI Assist
                </button>
              </>
            )}
            <button
              onClick={handleSave}
              disabled={!dirty || saveStatus === "saving" || kvLoadFailed}
              style={{
                padding: "5px 14px",
                borderRadius: 4,
                border: "none",
                background: dirty ? "#60a5fa" : "rgba(255,255,255,0.06)",
                color: dirty ? "#000" : "#555",
                fontSize: 11,
                fontWeight: 600,
                cursor: dirty ? "pointer" : "default",
                opacity: saveStatus === "saving" ? 0.6 : 1,
              }}
            >
              {saveStatus === "saving" ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* Form */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {!selectedId ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#555", fontSize: 13 }}>
              Select a node from the sidebar to begin editing.
            </div>
          ) : kvLoading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#555", fontSize: 12 }}>
              Loading node data...
            </div>
          ) : kvLoadFailed ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#f87171", fontSize: 12, textAlign: "center", padding: 16 }}>
              Failed to load node data from KV. Save is disabled to prevent accidental overwrite.
              <br />
              {kvError}
            </div>
          ) : editorState ? (
            <PlateEditor nodeId={selectedId} state={editorState} onChange={handleChange} onAiRequest={handleAiRequest} onOpenScout={handleOpenScout} />
          ) : null}
        </div>
      </div>

      {/* Right: Preview pane OR AI panel */}
      {aiPanelOpen && editorState && selectedId ? (
        <AiAssistPanel
          nodeId={selectedId}
          state={editorState}
          targetSection={aiTargetSection}
          onApplyPatch={handleAiPatch}
          onClose={() => setAiPanelOpen(false)}
        />
      ) : editorState && selectedId ? (
        <PlatePreview nodeId={selectedId} state={editorState} />
      ) : null}

      {/* Scout modal */}
      {scoutOpen && selectedId && (
        <ImageScoutPanel
          allProfileKeys={[selectedId]}
          onAddImages={handleAddScoutImages}
          onClose={() => setScoutOpen(false)}
          onFlash={flash}
          initialQuery={buildScoutQuery(selectedId, ATLAS_TAGS[selectedId])}
          initialProfile={selectedId}
          tags={ATLAS_TAGS}
          era={PROFILE_ERA}
          origins={PROFILE_ORIGINS}
          scientific={SCIENTIFIC_NAMES}
        />
      )}

      {/* Toast */}
      {flashMsg && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          padding: "8px 20px", borderRadius: 8, background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.1)",
          color: "#fff", fontSize: 12, zIndex: 999, animation: "atlasFadeIn 0.2s ease-out",
        }}>
          {flashMsg}
        </div>
      )}
    </div>
  );
}
