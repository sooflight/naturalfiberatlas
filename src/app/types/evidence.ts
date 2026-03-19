export interface EvidenceRecord {
  id: string;
  title: string;
  type: string;
  status: string;
  linkedEntityId: string;
  linkedEntityType: "material" | "supplier" | string;
  url?: string;
  description?: string;
  reviewer?: string;
  verifiedDate?: string;
  [key: string]: any;
}

export type EvidenceRegistry = Record<string, EvidenceRecord>;
