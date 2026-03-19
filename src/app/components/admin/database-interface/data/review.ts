import { apiKey, getApiUrl } from "@/utils/api/info";
import type { ReviewQueueItem, ReviewDecision } from "@/database-interface/domains/review/types";

export async function fetchReviewQueue(): Promise<ReviewQueueItem[]> {
  try {
    const response = await fetch(getApiUrl("ingestion-orchestrator/review-queue"), {
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
    });

    if (!response.ok) {
      console.warn("[review] Failed to fetch review queue:", response.status);
      return [];
    }

    const data = (await response.json()) as { items: unknown[] };
    return (data.items || []).map(transformReviewItem);
  } catch (err) {
    console.warn("[review] Error fetching review queue:", err);
    return [];
  }
}

export async function submitReviewDecision(decision: ReviewDecision): Promise<boolean> {
  try {
    const response = await fetch(getApiUrl("ingestion-orchestrator/review-decision"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(decision),
    });

    if (!response.ok) {
      console.warn("[review] Failed to submit decision:", response.status);
      return false;
    }

    return true;
  } catch (err) {
    console.warn("[review] Error submitting decision:", err);
    return false;
  }
}

function transformReviewItem(item: unknown): ReviewQueueItem {
  const raw = item as Record<string, unknown>;

  return {
    reviewId: String(raw.review_id || ""),
    batchId: String(raw.batch_id || ""),
    entityId: String(raw.entity_id || ""),
    fieldName: String(raw.field_name || ""),
    proposedValue: (raw.proposed_value as Record<string, unknown>) || null,
    reason: raw.reason as ReviewQueueItem["reason"],
    reviewerDecision: raw.reviewer_decision as ReviewQueueItem["reviewerDecision"],
    reviewerNotes: raw.reviewer_notes as string | null,
    reviewerId: raw.reviewer_id as string | null,
    reviewedAt: raw.reviewed_at as string | null,
    createdAt: String(raw.created_at || new Date().toISOString()),
    entity: raw.entity
      ? {
          entityId: String((raw.entity as Record<string, unknown>).entity_id || ""),
          entityType: (raw.entity as Record<string, unknown>).entity_type as NonNullable<ReviewQueueItem["entity"]>["entityType"],
          confidenceScore: Number((raw.entity as Record<string, unknown>).confidence_score || 0),
          rawJsonb: ((raw.entity as Record<string, unknown>).raw_jsonb as Record<string, unknown>) || {},
          status: String((raw.entity as Record<string, unknown>).status || ""),
        }
      : undefined,
    batch: raw.batch
      ? {
          batchId: String((raw.batch as Record<string, unknown>).batch_id || ""),
          sourceType: (raw.batch as Record<string, unknown>).source_type as string | null,
          sourceFilename: (raw.batch as Record<string, unknown>).source_filename as string | null,
          modelName: (raw.batch as Record<string, unknown>).model_name as string | null,
          createdAt: String((raw.batch as Record<string, unknown>).created_at || ""),
        }
      : undefined,
  };
}
