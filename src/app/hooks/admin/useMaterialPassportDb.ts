import { useState, useEffect } from "react";
import { getAuthHeaders } from "@/utils/api/client";
import { getApiUrl } from "@/utils/api/info";
import { TAXONOMY_ALIASES } from "@/data/material-passports";

interface PassportData {
  status?: string;
  lastUpdated?: string;
  sustainability?: Record<string, any>;
  process?: Record<string, any>;
  endUse?: Record<string, any>;
  dyeing?: Record<string, any>;
  [key: string]: any;
}

interface UseMaterialPassportDbResult {
  passport: PassportData | null;
  loading: boolean;
  error: Error | null;
  status: string;
  aliases: any[];
}

/**
 * Hook to fetch material passport from database via Edge Function
 * Replaces the JSON-based useMaterialPassport hook
 */
export function useMaterialPassportDb(materialId: string | undefined): UseMaterialPassportDbResult {
  const aliases = TAXONOMY_ALIASES[materialId ?? ""] ?? [];
  const [passport, setPassport] = useState<PassportData | null>(null);
  const [loading, setLoading] = useState(!!materialId);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<string>("archived");

  useEffect(() => {
    if (!materialId) {
      setPassport(null);
      setLoading(false);
      setError(null);
      setStatus("archived");
      return;
    }
    const requestedId = materialId;

    async function fetchPassport() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          getApiUrl(`material/${encodeURIComponent(requestedId)}/passport`),
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch passport: ${response.status}`);
        }

        const data = await response.json();
        setPassport(data.passport);
        setStatus(data.status || "archived");
      } catch (err) {
        console.warn(`[useMaterialPassportDb] Failed for ${requestedId}:`, err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    }

    fetchPassport();
  }, [materialId]);

  return { passport, loading, error, status, aliases };
}

/**
 * Hook to list all material passports from database
 */
export function useMaterialPassportsDb() {
  const [passports, setPassports] = useState<Record<string, PassportData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchPassports() {
      setLoading(true);
      setError(null);

      try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(getApiUrl("admin/read-passports"), {
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch passports: ${response.status}`);
        }

        const data = await response.json();
        setPassports(data.passports || {});
      } catch (err) {
        console.warn("[useMaterialPassportsDb] Failed:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    }

    fetchPassports();
  }, []);

  return { passports, loading, error };
}
