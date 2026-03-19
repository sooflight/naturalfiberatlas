type ClassValue = string | number | boolean | undefined | null | ClassValue[];

/**
 * Simple class name utility (cn) that joins class names.
 * This is a lightweight replacement for clsx + tailwind-merge.
 */
export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  for (const input of inputs) {
    if (typeof input === "string" && input.trim()) {
      classes.push(input.trim());
    } else if (typeof input === "number") {
      classes.push(String(input));
    } else if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) classes.push(nested);
    }
  }

  return classes.join(" ");
}
