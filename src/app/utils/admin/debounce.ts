import { useState, useEffect, useMemo, useCallback } from 'react';

/**
 * Debounce function utility.
 * Returns a debounced version of the input function that delays execution
 * until after `delay` milliseconds have elapsed since the last call.
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * React hook for debouncing a value.
 * Returns the debounced value that updates only after `delay` ms of stability.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * React hook for creating a debounced callback.
 * Returns a memoized debounced function that persists across renders.
 */
export function useDebouncedCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  return useMemo(
    () => debounce(callback, delay),
    [callback, delay]
  );
}

/**
 * Leading-edge debounce (executes immediately then waits).
 * Useful for button clicks that should fire immediately but then have a cooldown.
 */
export function debounceLeading<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastCallTime = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const isThrottled = now - lastCallTime < delay;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!isThrottled) {
      lastCallTime = now;
      fn(...args);
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
    }, delay);
  };
}
