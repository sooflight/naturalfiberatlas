export interface IngestionDraft {
  sourceType: "text" | "markdown" | "csv" | "file";
  payload: string;
}

export interface IngestionBatchSummary {
  id: string;
  status: "pending" | "processing" | "review" | "applied" | "failed";
  entityCount: number;
  estimatedCostUsd: number;
  createdAt: string;
}
