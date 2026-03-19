import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { ValidationSeverity } from "./types";

interface ValidationBadgeProps {
  severity: ValidationSeverity;
  count?: number;
  tooltip?: string;
}

const SEVERITY_CONFIG = {
  error: {
    icon: AlertCircle,
    className: "text-red-300/85 bg-red-400/[0.08] border-red-400/20",
  },
  warning: {
    icon: AlertTriangle,
    className: "text-red-300/75 bg-red-400/[0.06] border-red-400/15",
  },
  info: {
    icon: Info,
    className: "text-blue-300/75 bg-blue-400/[0.08] border-blue-400/20",
  },
};

export function ValidationBadge({ severity, count, tooltip }: ValidationBadgeProps) {
  const config = SEVERITY_CONFIG[severity];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border ${config.className}`}
      style={{ fontSize: "10px", fontWeight: 600 }}
      title={tooltip}
    >
      <Icon size={10} />
      {count !== undefined && count > 1 && count}
    </span>
  );
}
