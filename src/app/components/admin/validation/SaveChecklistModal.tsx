import { useValidation } from "./ValidationProvider";
import { ValidationBadge } from "./ValidationBadge";
import { X } from "lucide-react";

interface SaveChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onForceSave: () => void;
  onFixIssues: () => void;
}

export function SaveChecklistModal({
  isOpen,
  onClose,
  onForceSave,
  onFixIssues,
}: SaveChecklistModalProps) {
  const { result } = useValidation();

  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0d0d0d] border border-white/[0.08] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <span className="text-white/80" style={{ fontSize: "13px", fontWeight: 600 }}>
            Review Issues Before Saving
          </span>
          <button onClick={onClose} className="text-white/40 hover:text-white/70">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ValidationBadge severity="warning" />
                <span className="text-white/60" style={{ fontSize: "11px", fontWeight: 600 }}>
                  Warnings ({result.warnings.length})
                </span>
              </div>
              <ul className="space-y-1 pl-4">
                {result.warnings.map((issue) => (
                  <li key={issue.ruleId} className="text-white/40" style={{ fontSize: "11px" }}>
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Errors */}
          {result.errors.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ValidationBadge severity="error" />
                <span className="text-white/60" style={{ fontSize: "11px", fontWeight: 600 }}>
                  Errors ({result.errors.length}) - Blocking
                </span>
              </div>
              <ul className="space-y-1 pl-4">
                {result.errors.map((issue) => (
                  <li key={issue.ruleId} className="text-white/40" style={{ fontSize: "11px" }}>
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Info */}
          {result.info.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ValidationBadge severity="info" />
                <span className="text-white/60" style={{ fontSize: "11px", fontWeight: 600 }}>
                  Suggestions ({result.info.length})
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-white/[0.06] bg-white/[0.02]">
          <button
            onClick={onFixIssues}
            className="px-3 py-1.5 rounded bg-blue-400/[0.08] border border-blue-400/20 text-blue-300/90 hover:text-blue-200"
            style={{ fontSize: "11px", fontWeight: 600 }}
          >
            Fix Issues
          </button>
          <button
            onClick={onForceSave}
            className="px-3 py-1.5 rounded bg-red-400/[0.08] border border-red-400/18 text-red-300/80 hover:text-red-200"
            style={{ fontSize: "11px" }}
          >
            Save Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
