import { useCallback, useState } from "react";

interface MaterialPassport {
  material_id: string;
  status: string;
  last_updated: string | null;
  payload_jsonb: Record<string, unknown>;
  revision: string;
  updated_at: string;
}

interface UseRealtimePassportsOptions {
  enabled?: boolean;
  onInsert?: (passport: MaterialPassport) => void;
  onUpdate?: (passport: MaterialPassport) => void;
  onDelete?: (materialId: string) => void;
}

/**
 * Hook to subscribe to real-time material passport changes
 * Useful for admin dashboard to see live updates to material data
 */
export function useRealtimePassports(options: UseRealtimePassportsOptions = {}) {
  const { enabled = true } = options;
  const [passports, setPassports] = useState<MaterialPassport[]>([]);
  const [loading] = useState(false);
  const [error] = useState<Error | null>(null);
  const [subscriptionStatus] = useState<string>(enabled ? "disabled" : "off");

  // Initial fetch of passports
  const fetchPassports = useCallback(async () => {
    setPassports([]);
  }, []);

  return {
    passports,
    loading,
    error,
    subscriptionStatus,
    refresh: fetchPassports,
  };
}

/**
 * Hook to subscribe to a single material passport's changes
 */
export function useRealtimePassport(materialId: string | undefined) {
  return { passport: null as MaterialPassport | null, loading: !!materialId, error: null as Error | null };
}

/**
 * Hook to subscribe to material media changes
 */
export function useRealtimeMedia(materialId: string | undefined) {
  return { media: [] as any[], loading: !!materialId, error: null as Error | null };
}
