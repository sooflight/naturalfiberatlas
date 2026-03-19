import { createContext, useContext, useMemo, useCallback } from "react";
import type { FiberProfile } from "../../../data/fibers";
import type { ValidationContextValue, ValidationResult } from "./types";
import { validateFiber } from "./engine";
import { DEFAULT_VALIDATION_RULES } from "./rules";

const ValidationContext = createContext<ValidationContextValue | null>(null);

export function ValidationProvider({
  fiber,
  children,
}: {
  fiber: FiberProfile;
  children: React.ReactNode;
}) {
  const result = useMemo(() => {
    return validateFiber(fiber, DEFAULT_VALIDATION_RULES);
  }, [fiber]);

  const getFieldIssues = useCallback(
    (field: string) => result.issues.filter((i) => i.field === field),
    [result]
  );

  const value = useMemo(
    () => ({
      validate: () => result,
      getFieldIssues,
      result,
    }),
    [result, getFieldIssues]
  );

  return (
    <ValidationContext.Provider value={value}>
      {children}
    </ValidationContext.Provider>
  );
}

export function useValidation(): ValidationContextValue {
  const ctx = useContext(ValidationContext);
  if (!ctx) {
    throw new Error("useValidation must be used within ValidationProvider");
  }
  return ctx;
}
