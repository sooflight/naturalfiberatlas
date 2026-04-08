/**
 * ProfileStatusCircle — Single circle status indicator for Live vs Archived.
 * Color indicates status: Live (emerald), Archived (amber).
 * Legacy `draft` is treated as archived. Click toggles: Live ↔ Archived.
 */

import React from "react";
import { cn } from "@/database-interface/lib/utils";

export type ProfileStatusValue = "published" | "draft" | "archived" | null | undefined;

export interface ProfileStatusCircleProps {
  status: ProfileStatusValue;
  onToggle: () => void;
  disabled?: boolean;
  /** Optional id for aria-describedby when status error is shown */
  ariaDescribedBy?: string;
  /** Optional test id for the button */
  dataTestId?: string;
  /** Optional title/tooltip */
  title?: string;
}

function toDisplayStatus(status: ProfileStatusValue): "live" | "archived" {
  if (status === "published") return "live";
  return "archived";
}

function getAriaLabel(displayStatus: "live" | "archived"): string {
  switch (displayStatus) {
    case "live":
      return "Set profile status to Archived";
    case "archived":
      return "Set profile status to Live";
  }
}

function getStatusColorClasses(displayStatus: "live" | "archived"): string {
  switch (displayStatus) {
    case "live":
      return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]";
    case "archived":
      return "bg-amber-300";
  }
}

export function ProfileStatusCircle({
  status,
  onToggle,
  disabled = false,
  ariaDescribedBy,
  dataTestId = "profile-status-circle",
  title,
}: ProfileStatusCircleProps) {
  const displayStatus = toDisplayStatus(status);
  const isLive = displayStatus === "live";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isLive}
      aria-label={getAriaLabel(displayStatus)}
      aria-describedby={ariaDescribedBy}
      data-status={displayStatus}
      data-testid={dataTestId}
      disabled={disabled}
      aria-disabled={disabled ? "true" : "false"}
      title={title ?? (displayStatus === "live" ? "Live" : "Archived")}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onToggle();
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "h-3 w-3 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 shrink-0",
        getStatusColorClasses(displayStatus)
      )}
    />
  );
}
