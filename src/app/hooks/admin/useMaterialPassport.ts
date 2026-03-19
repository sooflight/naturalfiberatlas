import { useMemo } from "react";
import { MATERIAL_PASSPORTS } from "@/data/material-passports";
import { TAXONOMY_ALIASES } from "@/data/material-passports";

export function useMaterialPassport(materialId: string | undefined) {
  const passport = useMemo(() => {
    if (!materialId) return null;
    return (MATERIAL_PASSPORTS as Record<string, any>)[materialId] ?? null;
  }, [materialId]);

  return {
    passport,
    aliases: TAXONOMY_ALIASES[materialId ?? ""] ?? [],
    loading: false,
    error: null as string | null,
  };
}
