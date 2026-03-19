export interface AtlasNode {
  id: string;
  label: string;
  shortLabel?: string;
  description?: string;
  iconName?: string;
  children?: AtlasNode[];
}

export interface AtlasSection<TItem = unknown> {
  sectionId: string;
  label: string;
  items: TItem[];
}

export interface AtlasCardDescriptor {
  id: string;
  templateId: string;
  sectionId: string;
  data: Record<string, unknown>;
  staggerIndex?: number;
  landscape?: boolean;
  portrait?: boolean;
  bleed?: boolean;
  glowSrc?: string;
}

export function isAtlasNode(value: unknown): value is AtlasNode {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AtlasNode>;
  return typeof candidate.id === "string" && typeof candidate.label === "string";
}
