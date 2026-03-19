import { useState, useEffect, useCallback } from "react";
import { fetchReviewQueue, submitReviewDecision } from "@/database-interface/data/review";
import type { ReviewQueueItem, ReviewDecision, ReviewQueueStats } from "@/database-interface/domains/review/types";

export function useReview() {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchReviewQueue();
      setItems(next);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const submitDecision = useCallback(async (decision: ReviewDecision) => {
    const success = await submitReviewDecision(decision);
    if (success) {
      // Optimistically update local state
      setItems((prev) =>
        prev.map((item) =>
          item.reviewId === decision.reviewId
            ? {
                ...item,
                reviewerDecision: decision.decision,
                reviewerNotes: decision.notes || null,
                reviewedAt: new Date().toISOString(),
              }
            : item
        )
      );
      // Refresh to get updated state
      void refresh();
    }
    return success;
  }, [refresh]);

  const stats: ReviewQueueStats = {
    pending: items.filter((i) => !i.reviewerDecision).length,
    approved: items.filter((i) => i.reviewerDecision === "accept").length,
    rejected: items.filter((i) => i.reviewerDecision === "reject").length,
    total: items.length,
  };

  const pendingItems = items.filter((i) => !i.reviewerDecision);
  const resolvedItems = items.filter((i) => !!i.reviewerDecision);

  return {
    items,
    pendingItems,
    resolvedItems,
    stats,
    loading,
    error,
    lastUpdated,
    refresh,
    submitDecision,
  };
}
