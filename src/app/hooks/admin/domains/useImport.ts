import { useCallback, useEffect, useState } from "react";
import { listIngestionBatches, submitIngestionDraft } from "@/database-interface/data/ingestion";
import type { IngestionBatchSummary, IngestionDraft } from "@/database-interface/domains/ingestion/types";

export function useImport() {
  const [batches, setBatches] = useState<IngestionBatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await listIngestionBatches();
      setBatches(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const submit = useCallback(async (draft: IngestionDraft) => {
    const result = await submitIngestionDraft(draft);
    if (result.error) {
      setError(result.error);
      return result;
    }
    await refresh();
    return result;
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    batches,
    loading,
    error,
    refresh,
    submit,
  };
}
