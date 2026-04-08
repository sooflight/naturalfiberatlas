import {
  ATLAS_IMAGES,
  ATLAS_TAGS,
  PROFILE_ERA,
  PROFILE_ORIGINS,
  SCIENTIFIC_NAMES,
  ATLAS_VIDEOS,
  ATLAS_EMBEDS,
  ATLAS_LINKS,
  toEntryArray,
} from "@/data/atlas-images";
import type { NodeData } from "@/hooks/useNodeData";
import type { MaterialPassport } from "@/types/material";
import type { EditorState } from "./PlateEditor";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function buildEditorState(
  nodeId: string,
  kvData: NodeData | null,
  passport: MaterialPassport | undefined
): EditorState {
  const images = toEntryArray(ATLAS_IMAGES[nodeId]);
  return {
    nodeData: kvData ?? { id: nodeId, name: "", type: "", category: "", portal: "", summary: "" },
    passport:
      passport ?? {
        materialId: nodeId,
        status: "archived",
        lastUpdated: new Date().toISOString().slice(0, 10),
        performance: {},
        process: {},
        dyeing: {},
        sustainability: {},
        sourcing: {},
        endUse: {},
      },
    images,
    videos: ATLAS_VIDEOS[nodeId] || [],
    embeds: ATLAS_EMBEDS[nodeId] || [],
    links: ATLAS_LINKS[nodeId] || [],
    era: PROFILE_ERA[nodeId] || "",
    origins: PROFILE_ORIGINS[nodeId] || "",
    scientificName: SCIENTIFIC_NAMES[nodeId] || "",
    tags: ATLAS_TAGS[nodeId] || [],
  };
}

export function toAtlasPatch(state: EditorState) {
  return {
    images: state.images.length === 1 ? state.images[0] : state.images.length === 0 ? [] : state.images,
    tags: state.tags,
    era: state.era,
    origins: state.origins,
    scientificName: state.scientificName,
    videos: state.videos,
    embeds: state.embeds,
    links: state.links,
  };
}

export function saveConflictMessage(status: number): string | null {
  if (status === 409) {
    return "This profile changed in another session. Refresh node data and retry.";
  }
  return null;
}
