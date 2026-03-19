export const ADMIN_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft: { bg: "rgba(96,165,250,0.12)", color: "#60a5fa" },
  reviewed: { bg: "rgba(96,165,250,0.12)", color: "#60a5fa" },
  verified: { bg: "rgba(34,197,94,0.12)", color: "#22c55e" },
  published: { bg: "rgba(192,132,252,0.12)", color: "#c084fc" },
};

export const ADMIN_TYPE_COLORS: Record<string, string> = {
  passport: "#60a5fa",
  supplier: "#c084fc",
  evidence: "#34d399",
};

export function getStatusStyle(status: string | null): { bg: string; color: string } {
  if (!status) return { bg: "rgba(255,255,255,0.06)", color: "#888" };
  return ADMIN_STATUS_COLORS[status] ?? { bg: "rgba(255,255,255,0.06)", color: "#888" };
}
