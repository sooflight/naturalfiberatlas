export interface ReviewQueueItem {
  reviewId: string;
  batchId: string;
  entityId: string;
  fieldName: string;
  proposedValue: Record<string, unknown> | null;
  reason: "low_confidence" | "conflict" | "missing_required" | "validation_failed" | "ambiguous_reference";
  reviewerDecision: "accept" | "reject" | "modify" | null;
  reviewerNotes: string | null;
  reviewerId: string | null;
  reviewedAt: string | null;
  createdAt: string;
  // Joined data
  entity?: {
    entityId: string;
    entityType: "profile" | "passport" | "media" | "supplier" | "tag" | "relation";
    confidenceScore: number;
    rawJsonb: Record<string, unknown>;
    status: string;
  };
  batch?: {
    batchId: string;
    sourceType: string | null;
    sourceFilename: string | null;
    modelName: string | null;
    createdAt: string;
  };
}

export interface ReviewDecision {
  reviewId: string;
  decision: "accept" | "reject" | "modify";
  notes?: string;
}

export interface ReviewQueueStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}
