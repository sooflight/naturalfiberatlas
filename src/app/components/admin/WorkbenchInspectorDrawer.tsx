import { X } from "lucide-react";
import type { InspectorContext } from "./inspector/types";

interface WorkbenchInspectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  context: InspectorContext;
  onAction?: (commandId: string) => void;
}

export function WorkbenchInspectorDrawer({ isOpen, onClose, context, onAction }: WorkbenchInspectorDrawerProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <aside
      className={[
        "pointer-events-auto absolute right-0 top-0 z-40 h-full w-[360px] border-l border-white/[0.08] bg-[#0a0a0a]/95 backdrop-blur-md transition-transform duration-200",
        "translate-x-0",
      ].join(" ")}
      aria-hidden={false}
    >
      <div className="flex h-full flex-col">
        <header className="flex items-start justify-between border-b border-white/[0.06] px-4 py-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Inspector</div>
            <h2 className="mt-1 text-sm font-semibold text-white">{context.title}</h2>
            <p className="mt-1 text-xs text-neutral-400">{context.description}</p>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            }}
            className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
            title="Close inspector (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-5 overflow-y-auto px-4 py-4">
          <section className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Context</h3>
            <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              {context.stats.map((stat) => (
                <div key={stat.label} className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">{stat.label}</span>
                  <span className="font-medium text-neutral-200">{stat.value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Quick Actions</h3>
            <div className="space-y-2">
              {context.actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => {
                    if (action.commandId) {
                      onAction?.(action.commandId);
                    }
                  }}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs text-neutral-300"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </aside>
  );
}
