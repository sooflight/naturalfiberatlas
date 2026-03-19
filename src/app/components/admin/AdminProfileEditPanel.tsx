import React, { useState, useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";
import { PlateEditor, type EditorState } from "./node-editor/PlateEditor";
import { MATERIAL_PASSPORTS } from "../../data/material-passports";
import { useNodeData, seedNodes } from "../../hooks/useNodeData";
import { trackEvent } from "../../utils/admin/telemetry";
import { fetchNodeRevision } from "../../utils/admin/nodeSaveTransaction";
import { buildEditorState, type SaveStatus } from "./node-editor/nodeBundleState";
import { saveNodeBundleEditor } from "./node-editor/nodeBundlePersistence";
import { confirmDiscardChanges } from "./hooks/useUnsavedChangesGuard";
import { useAdminSave } from "../../contexts/AdminSaveContext";

const PROFILE_MODAL_AUTOSAVE_DEBOUNCE_MS = 1200;

interface AdminProfileEditPanelProps {
  nodeId: string;
  onClose: () => void;
  onOpenNodeEditor?: (nodeId: string) => void;
}

export function AdminProfileEditPanel({
  nodeId,
  onClose,
  onOpenNodeEditor,
}: AdminProfileEditPanelProps) {
  const adminSave = useAdminSave();
  const { data: kvData, loading: kvLoading, error: kvError } = useNodeData(nodeId);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const initialRef = useRef<string | null>(null);
  const revisionRef = useRef<string | null>(null);
  const kvLoadFailed = !!kvError && !kvLoading && kvData === null;

  useEffect(() => {
    if (!nodeId || kvLoading) return;
    if (kvLoadFailed) {
      setEditorState(null);
      setSaveStatus("error");
      return;
    }
    const passport = MATERIAL_PASSPORTS[nodeId];
    const state = buildEditorState(nodeId, kvData, passport);
    setEditorState(state);
    initialRef.current = JSON.stringify(state);
  }, [nodeId, kvData, kvLoading, kvLoadFailed]);

  useEffect(() => {
    if (!nodeId) return;
    let mounted = true;
    void (async () => {
      try {
        const revision = await fetchNodeRevision(nodeId);
        if (mounted) revisionRef.current = revision;
      } catch {
        // Non-fatal: revision is best-effort and validated server-side.
      }
    })();
    return () => {
      mounted = false;
    };
  }, [nodeId]);

  const handleChange = useCallback((next: EditorState) => {
    setEditorState(next);
    setSaveStatus("idle");
  }, []);

  const handleSave = useCallback(async () => {
    if (!editorState || !nodeId || kvLoadFailed) return;
    setSaveStatus("saving");
    const result = await saveNodeBundleEditor({
      nodeId,
      editorState,
      kvLoadFailed,
      revisionRef,
      initialRef,
      seedNode: async (nextNodeId, nodeData) => {
        await seedNodes({ [`node:${nextNodeId}`]: nodeData });
      },
    });

    if (!result.ok) {
      setSaveStatus("error");
      console.error("[AdminProfileEdit] Save errors:", result.failedTargets);
      trackEvent({
        event: "admin_profile_edit_save_failed",
        level: "error",
        source: "AdminProfileEditPanel",
        data: { nodeId, persisted: result.persistedTargets, errors: result.failedTargets },
      });
      alert(
        [
          "Save failed.",
          result.persistedTargets.length > 0 ? `Persisted: ${result.persistedTargets.join(", ")}` : "Persisted: none",
          `Failed: ${result.failedTargets.join(" | ")}`,
        ].join("\n"),
      );
    } else {
      setSaveStatus("saved");
      initialRef.current = JSON.stringify(editorState);
      trackEvent({
        event: "admin_profile_edit_saved",
        source: "AdminProfileEditPanel",
        data: { nodeId },
      });
    }
  }, [editorState, nodeId, kvLoadFailed]);

  const dirty =
    editorState && JSON.stringify(editorState) !== initialRef.current;

  useEffect(() => {
    return adminSave.registerActiveSurface({
      isDirty: !!dirty,
      saveStatus,
      save: handleSave,
    });
  }, [adminSave.registerActiveSurface, dirty, saveStatus, handleSave]);

  useEffect(() => {
    if (!dirty || saveStatus === "saving" || kvLoadFailed) return;
    const autosaveTimer = setTimeout(() => {
      void handleSave();
    }, PROFILE_MODAL_AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(autosaveTimer);
  }, [dirty, saveStatus, kvLoadFailed, handleSave]);

  const handleClose = useCallback(() => {
    if (dirty) {
      const confirmed = confirmDiscardChanges("You have unsaved changes. Close editor anyway?");
      if (!confirmed) return;
    }
    onClose();
  }, [dirty, onClose]);

  if (kvLoading || (!editorState && !kvLoadFailed)) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#666",
        }}
      >
        Loading…
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        display: "flex",
        flexDirection: "column",
        background: "#0a0a0a",
      }}
    >
      {kvLoadFailed && (
        <div style={{ padding: "10px 20px", borderBottom: "1px solid rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.08)", color: "#fca5a5", fontSize: 11 }}>
          KV data failed to load. Save is disabled to prevent accidental overwrite. {kvError}
        </div>
      )}
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(10,10,10,0.98)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {dirty && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#60a5fa",
              }}
              title="Unsaved changes"
            />
          )}
          <span
            style={{
              fontSize: 12,
              fontFamily: "'Pica', sans-serif",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#60a5fa",
            }}
          >
            Edit content
          </span>
          {saveStatus === "saved" && (
            <span style={{ fontSize: 11, color: "#0F783C" }}>Saved</span>
          )}
          {saveStatus === "error" && (
            <span style={{ fontSize: 11, color: "#f87171" }}>Error</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {onOpenNodeEditor && (
            <button
              onClick={() => onOpenNodeEditor(nodeId)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                background: "rgba(96,165,250,0.16)",
                border: "1px solid rgba(96,165,250,0.35)",
                color: "#93c5fd",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Open Node Editor
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving" || !dirty || kvLoadFailed}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              background: dirty ? "#0F783C" : "rgba(255,255,255,0.08)",
              border: "none",
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              cursor: dirty ? "pointer" : "not-allowed",
              opacity: saveStatus === "saving" ? 0.6 : 1,
            }}
          >
            {saveStatus === "saving" ? "Saving…" : "Save"}
          </button>
          <button
            onClick={handleClose}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "rgba(255,255,255,0.08)",
              border: "none",
              color: "#fff",
              cursor: "pointer",
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Editor */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: 16,
        }}
      >
        {editorState ? (
          <PlateEditor
            nodeId={nodeId}
            state={editorState}
            onChange={handleChange}
          />
        ) : (
          <div style={{ color: "#fca5a5", fontSize: 12 }}>Editor unavailable while KV load is in error state.</div>
        )}
      </div>
    </div>
  );
}
