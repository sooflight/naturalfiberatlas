import { apiKey, getApiUrl } from "@/utils/api/info";
import type { IngestionBatchSummary, IngestionDraft } from "@/database-interface/domains/ingestion/types";

export async function submitIngestionDraft(draft: IngestionDraft): Promise<{ batchId: string | null; error: string | null }> {
  const response = await fetch(getApiUrl("ingestion-orchestrator/ingest"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      source: draft.sourceType,
      content: draft.payload,
    }),
  });

  if (!response.ok) {
    return { batchId: null, error: `Ingestion failed (${response.status})` };
  }

  const data = (await response.json()) as { batchId?: unknown };
  return {
    batchId: typeof data.batchId === "string" ? data.batchId : null,
    error: null,
  };
}

export async function listIngestionBatches(): Promise<IngestionBatchSummary[]> {
  const response = await fetch(getApiUrl("admin/read-ingestion-batches"), {
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as { batches?: IngestionBatchSummary[] };
  return Array.isArray(data.batches) ? data.batches : [];
}
