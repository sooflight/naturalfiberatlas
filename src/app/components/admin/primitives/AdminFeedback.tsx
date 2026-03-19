import React from "react";

export function FlashToast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        padding: "8px 20px",
        borderRadius: 8,
        background: "#1e1e1e",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "#fff",
        fontSize: 12,
        zIndex: 999,
      }}
      className="animate-toast"
    >
      {message}
    </div>
  );
}

export function SaveIndicator({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  if (status === "idle") return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        padding: "6px 14px",
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 500,
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        gap: 6,
        background:
          status === "error"
            ? "rgba(220,38,38,0.9)"
            : status === "saving"
              ? "rgba(30,30,30,0.95)"
              : "rgba(22,163,74,0.9)",
        color: "#fff",
        border: `1px solid ${
          status === "error"
            ? "rgba(248,113,113,0.3)"
            : status === "saving"
              ? "rgba(255,255,255,0.1)"
              : "rgba(134,239,172,0.3)"
        }`,
        backdropFilter: "blur(8px)",
        transition: "all 0.2s",
      }}
    >
      {status === "saving" && (
        <svg className="animate-spin" style={{ width: 12, height: 12 }} fill="none" viewBox="0 0 24 24">
          <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {status === "saving" ? "Saving..." : status === "saved" ? "Saved to disk" : "Save failed"}
    </div>
  );
}
