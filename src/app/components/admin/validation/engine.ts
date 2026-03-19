import type { FiberProfile } from "../../../data/fibers";
import type { ValidationRule, ValidationResult, ValidationIssue } from "./types";

export function validateFiber(
  fiber: FiberProfile,
  rules: ValidationRule[]
): ValidationResult {
  const issues: ValidationIssue[] = [];

  for (const rule of rules) {
    const value = (fiber as Record<string, unknown>)[rule.field];
    const isValid = rule.validate(value, fiber);

    if (!isValid) {
      issues.push({
        ruleId: rule.id,
        field: rule.field,
        severity: rule.severity,
        message: rule.message,
      });
    }
  }

  return {
    isValid: issues.filter((i) => i.severity === "error").length === 0,
    issues,
    errors: issues.filter((i) => i.severity === "error"),
    warnings: issues.filter((i) => i.severity === "warning"),
    info: issues.filter((i) => i.severity === "info"),
  };
}
