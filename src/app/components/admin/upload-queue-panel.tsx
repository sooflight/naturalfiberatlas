import React from "react";

export type UploadQueueStatus = "queued" | "uploading" | "done" | "failed" | "skipped";

export interface UploadQueueItem {
  id: string;
  label: string;
  status: UploadQueueStatus;
  targetKey?: string;
  error?: string;
}

interface UploadQueuePanelProps {
  title: string;
  items: UploadQueueItem[];
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
  onClearFinished: () => void;
}

function statusLabel(status: UploadQueueStatus): string {
  if (status === "uploading") return "Uploading";
  if (status === "done") return "Done";
  if (status === "failed") return "Failed";
  if (status === "skipped") return "Skipped";
  return "Queued";
}

function statusColor(status: UploadQueueStatus): string {
  if (status === "uploading") return "text-blue-300";
  if (status === "done") return "text-emerald-300";
  if (status === "failed") return "text-red-300";
  if (status === "skipped") return "text-amber-300";
  return "text-neutral-400";
}

export function UploadQueuePanel({
  title,
  items,
  onRetry,
  onDismiss,
  onClearFinished,
}: UploadQueuePanelProps) {
  if (items.length === 0) return null;

  const inFlight = items.filter((item) => item.status === "queued" || item.status === "uploading").length;
  const failed = items.filter((item) => item.status === "failed").length;
  const completed = items.filter((item) => item.status === "done" || item.status === "skipped").length;

  return (
    <div className="fixed bottom-4 right-4 z-[140] w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border border-white/[0.12] bg-neutral-950/95 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.08]">
        <div>
          <div className="text-[11px] uppercase tracking-[0.08em] text-white/80">{title}</div>
          <div className="text-[10px] text-white/45">
            {inFlight} active • {failed} failed • {completed} finished
          </div>
        </div>
        <button
          type="button"
          onClick={onClearFinished}
          className="text-[10px] px-2 py-1 rounded-md border border-white/[0.1] text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
        >
          Clear done
        </button>
      </div>

      <div className="max-h-[280px] overflow-y-auto px-2 py-2 space-y-1.5">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-2">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-white/85 truncate">{item.label}</div>
                <div className={`text-[10px] ${statusColor(item.status)}`}>
                  {statusLabel(item.status)}
                  {item.targetKey ? ` • ${item.targetKey}` : ""}
                </div>
                {item.error ? <div className="text-[10px] text-red-300/80 mt-0.5 truncate">{item.error}</div> : null}
              </div>
              <div className="flex items-center gap-1">
                {item.status === "failed" ? (
                  <button
                    type="button"
                    onClick={() => onRetry(item.id)}
                    className="text-[10px] px-1.5 py-0.5 rounded border border-blue-400/35 text-blue-300 hover:bg-blue-500/15"
                  >
                    Retry
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onDismiss(item.id)}
                  className="text-[10px] px-1.5 py-0.5 rounded border border-white/[0.12] text-white/50 hover:text-white hover:bg-white/[0.08]"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
