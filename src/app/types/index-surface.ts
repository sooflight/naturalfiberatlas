import type { AtlasNode, AtlasSection } from "./atlas-domain";

export interface IndexItem {
  node: AtlasNode;
  sectionId: string;
  parentLabel: string;
  depth: number;
}

export type IndexSection = AtlasSection<IndexItem>;
