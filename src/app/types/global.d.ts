/**
 * Global type definitions for common patterns.
 * Use these instead of `any` for better type safety.
 */

/**
 * Generic type for API responses where the shape is dynamic.
 * Prefer explicit types over this when possible.
 */
export type ApiResponse<T = unknown> = T;

/**
 * Type for error values in catch blocks.
 * Use this instead of `any` for error handling.
 */
export type UnknownError = Error | unknown;

/**
 * Type for JSON-serializable values.
 */
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export interface JsonObject {
  [key: string]: JsonValue;
}
export type JsonArray = JsonValue[];

/**
 * Helper to make specific properties optional.
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Helper to make specific properties required.
 */
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Type for record with string keys and unknown values.
 * Use this instead of `Record<string, any>`.
 */
export type UnknownRecord = Record<string, unknown>;

/**
 * Type for a function that can accept any arguments.
 * Use this sparingly and prefer explicit function types.
 */
export type AnyFunction = (...args: unknown[]) => unknown;

/**
 * Nullable type shorthand.
 */
export type Nullable<T> = T | null | undefined;
