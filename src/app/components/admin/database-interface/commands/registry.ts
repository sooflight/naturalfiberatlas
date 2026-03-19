import {
  AlertTriangle,
  ArrowUpDown,
  Brain,
  ChevronRight,
  Database,
  Diff,
  Download,
  FilePlus,
  FolderOpen,
  Grid3X3,
  HeartPulse,
  Image,
  List,
  Monitor,
  Package,
  PanelRightOpen,
  Save,
  Search,
  Settings,
  Upload,
  Wrench,
} from "lucide-react";

import type { CommandContext, WorkbenchCommand } from "./types";

export function createWorkbenchCommands(): WorkbenchCommand[] {
  return [
    {
      id: "nav.imageBase",
      title: "Go to Image Base",
      subtitle: "Browse and organize media",
      icon: Image,
      shortcut: "G",
      group: "navigation",
      modes: ["all"],
      run: (handlers) => handlers.navigate("browse"),
    },
    {
      id: "nav.import",
      title: "Go to Import",
      subtitle: "Ingestion workflow and results",
      icon: Upload,
      shortcut: "I",
      group: "navigation",
      modes: ["all"],
      run: (handlers) => handlers.navigate("import"),
    },
    {
      id: "nav.overview",
      title: "Go to Overview",
      subtitle: "Summary dashboard",
      icon: Monitor,
      shortcut: "O",
      group: "navigation",
      modes: ["all"],
      run: (handlers) => handlers.navigate("overview"),
    },
    {
      id: "nav.batch",
      title: "Go to Batch",
      subtitle: "Bulk field and tag operations",
      icon: Wrench,
      group: "navigation",
      modes: ["all"],
      run: (handlers) => handlers.navigate("batch"),
    },
    {
      id: "nav.health",
      title: "Go to Health",
      subtitle: "Data quality checks",
      icon: HeartPulse,
      group: "navigation",
      modes: ["all"],
      run: (handlers) => handlers.navigate("health"),
    },
    {
      id: "nav.diff",
      title: "Go to Diff",
      subtitle: "Compare profile changes",
      icon: Diff,
      group: "navigation",
      modes: ["all"],
      run: (handlers) => handlers.navigate("diff"),
    },
    {
      id: "nav.changesets",
      title: "Go to Changesets",
      subtitle: "Manage named change bundles",
      icon: Package,
      group: "navigation",
      modes: ["all"],
      run: (handlers) => handlers.navigate("changesets"),
    },
    {
      id: "nav.sequence",
      title: "Go to Sequence",
      subtitle: "Manage fiber ordering",
      icon: ArrowUpDown,
      group: "navigation",
      modes: ["all"],
      run: (handlers) => handlers.navigate("sequence"),
    },
    {
      id: "nav.cards",
      title: "Go to Card Editor",
      subtitle: "Legacy WYSIWYG card editing",
      icon: Settings,
      group: "navigation",
      modes: ["all"],
      run: (handlers) => handlers.navigate("cards"),
    },
    // View switching commands
    {
      id: "view.list",
      title: "List View",
      subtitle: "Dense rows for bulk operations",
      icon: List,
      shortcut: "1",
      group: "view",
      modes: ["all"],
      run: (handlers) => handlers.setViewMode?.("list"),
    },
    {
      id: "view.grid",
      title: "Grid View",
      subtitle: "Visual thumbnails for browsing",
      icon: Grid3X3,
      shortcut: "2",
      group: "view",
      modes: ["all"],
      run: (handlers) => handlers.setViewMode?.("grid"),
    },
    {
      id: "view.knowledge",
      title: "Knowledge View",
      subtitle: "Structured data with completeness scores",
      icon: Brain,
      shortcut: "3",
      group: "view",
      modes: ["all"],
      run: (handlers) => handlers.navigate("edit-knowledge"),
    },
    {
      id: "system.settings",
      title: "Open Settings",
      subtitle: "Workspace preferences",
      icon: Settings,
      shortcut: ",",
      group: "system",
      modes: ["all"],
      run: (handlers) => handlers.navigate("settings"),
    },
    {
      id: "record.new",
      title: "Create New Material Passport",
      subtitle: "Start a new record entry",
      icon: FilePlus,
      shortcut: "N",
      group: "record",
      modes: ["browse", "overview"],
      run: (handlers) => {
        handlers.createPassport?.();
      },
    },
    {
      id: "record.find",
      title: "Search Material Passports",
      subtitle: "Focus search input",
      icon: Search,
      shortcut: "F",
      group: "record",
      modes: ["all"],
      run: (handlers) => handlers.focusSearch(),
    },
    {
      id: "inspect.toggle",
      title: "Toggle Inspector",
      subtitle: "Open or close side inspector",
      icon: FolderOpen,
      shortcut: "T",
      group: "inspect",
      modes: ["all"],
      run: (handlers) => handlers.toggleInspector(),
    },
    {
      id: "inspect.current",
      title: "Inspect Current Selection",
      subtitle: "Open inspector for current record",
      icon: Database,
      shortcut: "Enter",
      group: "inspect",
      modes: ["all"],
      isAvailable: (context) => context.hasSelection,
      run: (handlers) => handlers.openInspector(),
    },
    {
      id: "media.import",
      title: "Import Media",
      subtitle: "Open import workflow",
      icon: Download,
      group: "media",
      modes: ["browse", "import"],
      run: (handlers) => handlers.navigate("import"),
    },
    {
      id: "knowledge.nextSection",
      title: "Knowledge: Next Section",
      subtitle: "Move to next section in knowledge editor",
      icon: ChevronRight,
      group: "workflow",
      modes: ["browse"],
      run: (handlers) => {
        handlers.triggerKnowledgeAction?.("next-section");
      },
    },
    {
      id: "knowledge.nextWeak",
      title: "Knowledge: Next Weak Section",
      subtitle: "Jump to the next section needing improvement",
      icon: AlertTriangle,
      group: "workflow",
      modes: ["browse"],
      run: (handlers) => {
        handlers.triggerKnowledgeAction?.("next-weak");
      },
    },
    {
      id: "knowledge.toggleReference",
      title: "Knowledge: Toggle Reference Pane",
      subtitle: "Show or hide reference context panel",
      icon: PanelRightOpen,
      group: "workflow",
      modes: ["browse"],
      run: (handlers) => {
        handlers.triggerKnowledgeAction?.("toggle-reference");
      },
    },
    {
      id: "knowledge.saveDraft",
      title: "Knowledge: Save Draft",
      subtitle: "Save current knowledge draft snapshot",
      icon: Save,
      shortcut: "S",
      group: "workflow",
      modes: ["browse"],
      run: (handlers) => {
        handlers.triggerKnowledgeAction?.("save-draft");
      },
    },
  ];
}

export function getAvailableCommands(
  commands: WorkbenchCommand[],
  context: CommandContext,
) {
  return commands.filter((command) => {
    const inMode = command.modes.includes("all") || command.modes.includes(context.mode as never);
    if (!inMode) {
      return false;
    }
    if (command.isAvailable && !command.isAvailable(context)) {
      return false;
    }
    return true;
  });
}

export function groupCommandsByBucket(commands: WorkbenchCommand[]) {
  return commands.reduce<Record<string, WorkbenchCommand[]>>((acc, command) => {
    if (!acc[command.group]) {
      acc[command.group] = [];
    }
    acc[command.group].push(command);
    return acc;
  }, {});
}
