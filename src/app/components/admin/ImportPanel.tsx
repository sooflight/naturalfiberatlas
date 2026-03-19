import React, { useState } from "react";
import type { MergedAtlasState } from "@/types/atlas-import";
import { validateImport, computeDiff, applyImport } from "@/utils/atlasImport";

interface ImportPanelProps {
  currentState: MergedAtlasState;
  onApply: (merged: MergedAtlasState) => void;
  onClose: () => void;
  onFlash?: (message: string) => void;
}

export default function ImportPanel({
  currentState,
  onApply,
  onClose,
  onFlash,
}: ImportPanelProps) {
  const [value, setValue] = useState(JSON.stringify(currentState, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const apply = () => {
    try {
      const validation = validateImport(value);
      if (!validation.payload || !validation.valid) {
        setWarnings(validation.warnings);
        setError(validation.errors.join(" | ") || "Import validation failed");
        return;
      }

      const diff = computeDiff(validation.payload, currentState);
      const merged = applyImport(diff, currentState);
      onApply(merged);
      setWarnings(validation.warnings);
      setError(null);
      onFlash?.(
        `Import applied: ${diff.stats.newNodes} new, ${diff.stats.updatedNodes} updated, ${diff.stats.newImages} new images`,
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "grid",
        placeItems: "center",
        zIndex: 2000,
      }}
    >
      <div
        style={{
          width: "min(960px, 92vw)",
          maxHeight: "86vh",
          background: "#0d0d0d",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ color: "#ddd", fontSize: 13, fontWeight: 600 }}>
          Import Atlas JSON
        </div>
        <textarea
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
            if (warnings.length > 0) setWarnings([]);
          }}
          style={{
            minHeight: "56vh",
            resize: "vertical",
            background: "#080808",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            color: "#ccc",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 12,
            padding: 10,
          }}
        />
        {error && <div style={{ color: "#f87171", fontSize: 11 }}>{error}</div>}
        {warnings.length > 0 && (
          <div style={{ color: "#60a5fa", fontSize: 11 }}>
            {warnings.slice(0, 3).join(" | ")}
            {warnings.length > 3 ? ` (+${warnings.length - 3} more)` : ""}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={apply}>Apply</button>
        </div>
      </div>
    </div>
  );
}
