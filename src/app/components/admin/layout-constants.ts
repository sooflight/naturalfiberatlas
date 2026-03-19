export const NODE_SIDEBAR_WIDTH_PX = 248;

/** Design tokens for NodeSidebar — spacing, typography, colors */
export const SIDEBAR_TOKENS = {
  space: { xs: 4, sm: 6, md: 8, lg: 12 } as const,
  radius: { sm: 4, md: 6, lg: 8 } as const,
  font: { xs: 8, sm: 9, md: 10, base: 11 } as const,
  color: {
    border: "rgba(255,255,255,0.08)",
    borderMuted: "rgba(255,255,255,0.05)",
    borderStrong: "rgba(255,255,255,0.12)",
    bgInput: "rgba(255,255,255,0.04)",
    bgMuted: "rgba(255,255,255,0.02)",
    bgHover: "rgba(255,255,255,0.03)",
    bgActive: "rgba(96,165,250,0.14)",
    text: "#ddd",
    textMuted: "#7e7e7e",
    textDim: "#666",
    textDimmer: "#5f5f5f",
    textActive: "#cddfff",
    accent: "rgba(96,165,250,0.14)",
    accentBorder: "rgba(96,165,250,0.35)",
  } as const,
} as const;
