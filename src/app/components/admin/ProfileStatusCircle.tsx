/**
 * ProfileStatusCircle — Single circle status indicator for Live/Draft/Archive.
 * Color indicates status: Live (emerald), Draft (neutral), Archived (amber).
 * Click cycles through: Live → Draft → Archived → Live.
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

function toDisplayStatus(status: ProfileStatusValue): "live" | "draft" | "archived" {
  if (status === "archived") return "archived";
  return status === "published" ? "live" : "draft";
}

function getAriaLabel(displayStatus: "live" | "draft" | "archived"): string {
  switch (displayStatus) {
    case "live":
      return "Set profile status to Draft";
    case "draft":
      return "Set profile status to Archived";
    case "archived":
      return "Set profile status to Live";
  }
}

function getStatusColorClasses(displayStatus: "live" | "draft" | "archived"): string {
  switch (displayStatus) {
    case "live":
      return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]";
    case "draft":
      return "bg-neutral-300";
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
      title={title ?? (displayStatus === "live" ? "Live" : displayStatus === "archived" ? "Archived" : "Draft")}
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
