import { useMemo } from "react";
import { MATERIAL_PASSPORTS } from "@/data/material-passports";

export interface SubstitutionCriteria {
  strength: number;
  breathability: number;
  drape?: number;
  durability: number;
  sustainability: number;
  dyeCompatibility?: number;
}

export interface SubstitutionResult {
  materialId: string;
  score: number;
  passport?: Record<string, any>;
  tradeoffs: {
    better: string[];
    worse: string[];
  };
}

const DEFAULT_CRITERIA: SubstitutionCriteria = {
  strength: 0.5,
  breathability: 0.5,
  drape: 0.3,
  durability: 0.5,
  sustainability: 0.5,
  dyeCompatibility: 0.3,
};

export function useSubstitution(
  materialId: string | undefined,
  criteria: SubstitutionCriteria = DEFAULT_CRITERIA
) {
  return useMemo<SubstitutionResult[]>(() => {
    if (!materialId) return [];
    const entries = Object.entries(MATERIAL_PASSPORTS as Record<string, any>).filter(
      ([id]) => id !== materialId
    );

    return entries
      .map(([id, passport]) => {
        const perf = passport?.performance ?? {};
        const s = Number(perf.strength?.rating ?? 0) / 5;
        const b = Number(perf.breathability?.rating ?? 0) / 5;
        const d = Number(perf.durability?.rating ?? 0) / 5;
        const sus = Number(passport?.sustainability?.circularity?.rating ?? 0) / 5;
        const score =
          s * criteria.strength +
          b * criteria.breathability +
          d * criteria.durability +
          sus * criteria.sustainability;
        const better: string[] = [];
        const worse: string[] = [];
        if (s >= 0.6) better.push("Strength");
        else worse.push("Strength");
        if (b >= 0.6) better.push("Breathability");
        else worse.push("Breathability");
        if (d >= 0.6) better.push("Durability");
        else worse.push("Durability");
        if (sus >= 0.6) better.push("Sustainability");
        else worse.push("Sustainability");
        return {
          materialId: id,
          score,
          passport,
          tradeoffs: { better, worse },
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [materialId, criteria]);
}
