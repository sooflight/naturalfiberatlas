import type { FiberProfile } from "../../../data/fibers";

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationRule {
  id: string;
  field: string;
  severity: ValidationSeverity;
  message: string;
  validate: (value: unknown, fiber: FiberProfile) => boolean;
}

export interface ValidationIssue {
  ruleId: string;
  field: string;
  severity: ValidationSeverity;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
}

export interface ValidationContextValue {
  validate: (fiber: FiberProfile) => ValidationResult;
  getFieldIssues: (field: string) => ValidationIssue[];
  result: ValidationResult | null;
}
