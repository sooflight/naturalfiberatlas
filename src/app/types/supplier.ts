export interface SupplierProfile {
  id: string;
  name: string;
  description?: string;
  status?: string;
  website?: string;
  geography: {
    country: string;
    region?: string;
    city?: string;
  };
  capabilities: {
    materialTypes: string[];
    processes: string[];
    certifications: string[];
  };
  trust: {
    verificationStatus: string;
    evidenceIds: string[];
    lastReviewed?: string;
    reviewerNotes?: string;
  };
  [key: string]: any;
}

export interface MaterialSupplierLink {
  materialId: string;
  supplierId: string;
  confidence?: string;
  relationship?: string;
  notes?: string;
  [key: string]: any;
}

export type SupplierDirectory = Record<string, SupplierProfile>;
export type MaterialSupplierLinkRegistry = MaterialSupplierLink[];
