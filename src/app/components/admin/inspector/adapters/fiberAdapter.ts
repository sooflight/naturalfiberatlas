import type { FiberProfile } from "../../../../data/fibers";
import type { InspectorContext, InspectorAdapter, QuickAction } from "./types";
import { Pencil, Images, Copy, Download } from "lucide-react";

export class FiberInspectorAdapter implements InspectorAdapter<FiberProfile> {
  constructor(
    private onEdit: (id: string) => void,
    private onScout: (id: string) => void,
    private onDuplicate: (id: string) => void,
    private onExport: (id: string) => void
  ) {}

  getContext(fiber: FiberProfile): InspectorContext {
    const actions: QuickAction[] = [
      {
        id: "edit",
        label: "Edit",
        icon: Pencil,
        onClick: () => this.onEdit(fiber.id),
      },
      {
        id: "scout",
        label: "Scout Images",
        icon: Images,
        onClick: () => this.onScout(fiber.id),
      },
      {
        id: "duplicate",
        label: "Duplicate",
        icon: Copy,
        onClick: () => this.onDuplicate(fiber.id),
      },
      {
        id: "export",
        label: "Export JSON",
        icon: Download,
        onClick: () => this.onExport(fiber.id),
      },
    ];

    return {
      mode: "edit",
      entityType: "fiber",
      entityId: fiber.id,
      entityName: fiber.name,
      version: Date.now(), // TODO: get from data source
      summary: `${fiber.category} fiber with ${fiber.galleryImages?.length || 0} images`,
      health: {
        completenessScore: 85, // TODO: calculate from health view logic
        imageCount: fiber.galleryImages?.length || 0,
        issuesCount: 0,
        warningsCount: 0,
      },
      actions,
      audit: {
        lastModified: Date.now(),
        source: "local",
        changeCount: 0,
      },
    };
  }

  isContextValid(context: InspectorContext): boolean {
    return context.entityType === "fiber" && typeof context.entityId === "string";
  }
}
