import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Search } from "lucide-react";
import { cn } from "@/database-interface/lib/utils";
import { executeWorkbenchCommand } from "./commands/executor";
import { createWorkbenchCommands, getAvailableCommands } from "./commands/registry";
import type { CommandContext, CommandHandlers, WorkbenchCommand, WorkbenchMode } from "./commands/types";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (mode: WorkbenchMode) => void;
  onSave: () => void;
  onInspectorToggle?: () => void;
  onInspectorOpen?: () => void;
  onInspectorClose?: () => void;
  onSetViewMode?: (view: "list" | "grid" | "knowledge") => void;
  onKnowledgeAction?: (action: "next-section" | "next-weak" | "toggle-reference" | "save-draft") => void;
  onCreatePassport?: () => void;
  modeContext?: CommandContext;
  commands?: WorkbenchCommand[];
  extraCommands?: WorkbenchCommand[];
}

interface BuildCommandHandlersArgs {
  onNavigate: (mode: WorkbenchMode) => void;
  onSave: () => void;
  onInspectorToggle?: () => void;
  onInspectorOpen?: () => void;
  onInspectorClose?: () => void;
  onSetViewMode?: (view: "list" | "grid" | "knowledge") => void;
  onKnowledgeAction?: (action: "next-section" | "next-weak" | "toggle-reference" | "save-draft") => void;
  onCreatePassport?: () => void;
}

const DEFAULT_CONTEXT: CommandContext = {
  mode: "browse",
  hasSelection: false,
  selectionId: null,
  inspectorOpen: false,
};

export function buildCommandHandlers({
  onNavigate,
  onSave,
  onInspectorToggle,
  onInspectorOpen,
  onInspectorClose,
  onSetViewMode,
  onKnowledgeAction,
  onCreatePassport,
}: BuildCommandHandlersArgs): CommandHandlers {
  return {
    navigate: onNavigate,
    setViewMode: (view) => onSetViewMode?.(view),
    triggerKnowledgeAction: (action) => onKnowledgeAction?.(action),
    createPassport: () => onCreatePassport?.(),
    save: onSave,
    openInspector: () => {
      if (onInspectorOpen) {
        onInspectorOpen();
        return;
      }
      onInspectorToggle?.();
    },
    closeInspector: () => {
      if (onInspectorClose) {
        onInspectorClose();
        return;
      }
      onInspectorToggle?.();
    },
    toggleInspector: () => onInspectorToggle?.(),
    focusSearch: () => {
      const searchInput = document.querySelector('[placeholder*="search" i]') as HTMLInputElement | null;
      searchInput?.focus();
    },
  };
}

function getGroupColor(group: WorkbenchCommand["group"]) {
  switch (group) {
    case "navigation":
      return "bg-blue-500/10 text-blue-400";
    case "inspect":
      return "bg-cyan-500/10 text-cyan-400";
    case "record":
      return "bg-emerald-500/10 text-emerald-400";
    case "media":
      return "bg-purple-500/10 text-purple-400";
    case "workflow":
      return "bg-blue-500/10 text-blue-400";
    case "system":
      return "bg-neutral-500/10 text-neutral-400";
    default:
      return "bg-white/[0.06] text-neutral-400";
  }
}

export function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onSave,
  onInspectorToggle,
  onInspectorOpen,
  onInspectorClose,
  onSetViewMode,
  onKnowledgeAction,
  onCreatePassport,
  modeContext = DEFAULT_CONTEXT,
  commands,
  extraCommands = [],
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handlers: CommandHandlers = useMemo(
    () =>
      buildCommandHandlers({
        onNavigate,
        onSave,
        onInspectorToggle,
        onInspectorOpen,
        onInspectorClose,
        onSetViewMode,
        onKnowledgeAction,
        onCreatePassport,
      }),
    [
      onNavigate,
      onSave,
      onInspectorToggle,
      onInspectorOpen,
      onInspectorClose,
      onSetViewMode,
      onKnowledgeAction,
      onCreatePassport,
    ],
  );

  const baseCommands = useMemo(() => commands ?? createWorkbenchCommands(), [commands]);
  const availableCommands = useMemo(
    () => getAvailableCommands([...baseCommands, ...extraCommands], modeContext),
    [baseCommands, extraCommands, modeContext],
  );

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return availableCommands;
    const q = query.toLowerCase();
    return availableCommands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(q) ||
        cmd.subtitle?.toLowerCase().includes(q) ||
        cmd.group.toLowerCase().includes(q) ||
        cmd.id.toLowerCase().includes(q),
    );
  }, [query, availableCommands]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  const runCommand = useCallback(
    async (command: WorkbenchCommand) => {
      const result = await executeWorkbenchCommand(command, handlers, modeContext);
      if (result.ok) {
        onClose();
      }
    },
    [handlers, modeContext, onClose],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            void runCommand(filteredCommands[selectedIndex]);
          }
          break;
      }
    },
    [filteredCommands, isOpen, onClose, runCommand, selectedIndex],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/60 pt-[15vh] backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-white/[0.08] bg-neutral-900 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
          <Search className="h-5 w-5 text-neutral-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-base text-white placeholder:text-neutral-500 focus:outline-none"
          />
          <kbd className="rounded bg-white/[0.06] px-2 py-1 text-xs text-neutral-500">ESC</kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto py-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-neutral-500">
              <p className="text-sm">No commands found</p>
              <p className="mt-1 text-xs">Try a different search term</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredCommands.map((cmd, index) => {
                const Icon = cmd.icon;
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      void runCommand(cmd);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      isSelected ? "bg-white/[0.08]" : "hover:bg-white/[0.04]",
                    )}
                  >
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", getGroupColor(cmd.group))}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-medium", isSelected ? "text-white" : "text-neutral-200")}>{cmd.title}</p>
                      {cmd.subtitle ? <p className="truncate text-xs text-neutral-500">{cmd.subtitle}</p> : null}
                    </div>
                    {cmd.shortcut ? (
                      <kbd className="rounded bg-white/[0.06] px-2 py-0.5 text-xs text-neutral-400">{cmd.shortcut}</kbd>
                    ) : null}
                    {isSelected ? <ArrowRight className="h-4 w-4 text-neutral-400" /> : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.06] bg-white/[0.02] px-4 py-2 text-xs text-neutral-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-white/[0.06] px-1 py-0.5 text-[10px]">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-white/[0.06] px-1 py-0.5 text-[10px]">↵</kbd>
              Select
            </span>
          </div>
          <span>{filteredCommands.length} commands</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function useCommandPaletteShortcuts({
  onOpen,
  onNavigate,
  onSave,
}: {
  onOpen: () => void;
  onNavigate: (mode: WorkbenchMode) => void;
  onSave: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpen();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && !Number.isNaN(Number(e.key))) {
        const num = Number(e.key);
        if (num >= 1 && num <= 5) {
          e.preventDefault();
          const domains: WorkbenchMode[] = ["browse", "edit-profile", "import", "overview", "settings"];
          onNavigate(domains[num - 1]);
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        onSave();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "i") {
        e.preventDefault();
        onNavigate("import");
        return;
      }

    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpen, onNavigate, onSave]);
}
