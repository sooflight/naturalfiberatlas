import { useRef } from "react";
import { Download, FileDiff, Layers, Redo2, RotateCcw, Undo2, Upload } from "lucide-react";
import { useAtlasData } from "../../../context/atlas-data-context";

export function KnowledgeHeaderControls() {
  const { canUndo, canRedo, undo, redo, source } = useAtlasData();
  const importRef = useRef<HTMLInputElement | null>(null);

  const downloadJson = (payload: string, filename: string) => {
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const triggerExportStorage = () => {
    downloadJson(source.exportJSON(), `atlas-knowledge-${Date.now()}.json`);
  };

  const triggerExportEffective = () => {
    downloadJson(source.exportEffectiveJSON(), `atlas-effective-${Date.now()}.json`);
  };

  const triggerExportDiff = () => {
    downloadJson(source.exportDiffJSON(), `atlas-diff-${Date.now()}.json`);
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
        onClick={triggerExportStorage}
        className="rounded-md border border-white/[0.1] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-neutral-300"
        title="Export storage overrides only (round-trips with Import)"
      >
        <Download className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={triggerExportDiff}
        className="rounded-md border border-white/[0.1] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300/90"
        title="Export diff vs bundle (for Git — run npm run ops:promote-diff -- this file)"
      >
        <FileDiff className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={triggerExportEffective}
        className="rounded-md border border-white/[0.1] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-neutral-300"
        title="Export merged catalog (bundle + overrides; not for Import — use for repo / tooling)"
      >
        <Layers className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={() => importRef.current?.click()}
        className="rounded-md border border-white/[0.1] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-neutral-300"
        title="Import JSON (storage override format only)"
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
