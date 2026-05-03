import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines clsx (conditional classes) with tailwind-merge (dedup conflicting
 * Tailwind utilities). Safe to call with any mix of strings, arrays, objects.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
