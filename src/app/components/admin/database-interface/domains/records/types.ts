import type { NodeData } from "@/hooks/useNodeData";

export interface RecordSummary {
  id: string;
  label: string;
  type: string;
  status: "draft" | "live";
  updatedAt?: string;
}

export interface RecordDetails {
  node: NodeData | null;
  passport: Record<string, unknown> | null;
  status: string;
  aliases: string[];
}
