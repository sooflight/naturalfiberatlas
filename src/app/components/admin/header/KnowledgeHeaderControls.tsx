import { useRef } from "react";
import { Download, Redo2, RotateCcw, Undo2, Upload } from "lucide-react";
import { useAtlasData } from "../../../context/atlas-data-context";

export function KnowledgeHeaderControls() {
  const { canUndo, canRedo, undo, redo, source } = useAtlasData();
  const importRef = useRef<HTMLInputElement | null>(null);

  const triggerExport = () => {
    const payload = source.exportJSON();
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `atlas-knowledge-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const triggerImport = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    source.importJSON(text);
  };

  const triggerReset = () => {
    const confirmed = window.confirm("Reset all knowledge data to defaults?");
    if (!confirmed) return;
    source.resetToDefaults();
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => undo()}
        disabled={!canUndo}
        className="rounded-md border border-white/[0.1] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-neutral-300 disabled:opacity-40"
        title="Undo"
      >
        <Undo2 className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={() => redo()}
        disabled={!canRedo}
        className="rounded-md border border-white/[0.1] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-neutral-300 disabled:opacity-40"
        title="Redo"
      >
        <Redo2 className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={triggerExport}
        className="rounded-md border border-white/[0.1] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-neutral-300"
        title="Export JSON"
      >
        <Download className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={() => importRef.current?.click()}
        className="rounded-md border border-white/[0.1] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-neutral-300"
        title="Import JSON"
      >
        <Upload className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={triggerReset}
        className="rounded-md border border-red-500/30 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-red-300"
        title="Reset to defaults"
      >
        <RotateCcw className="h-3 w-3" />
      </button>
      <input
        ref={importRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          void triggerImport(file);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
}
