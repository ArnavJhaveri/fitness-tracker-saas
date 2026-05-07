/**
 * Shared validation helpers reused across multiple schemas.
 */
import { z } from "zod";
import { ValidationError } from "@/lib/errors";

/**
 * Pagination query params with safe defaults.
 *
 * `page` has a max bound of 10_000 to defend against `?page=999999999`
 * making Postgres compute an enormous OFFSET. With per_page=100 that's
 * still 1M rows to skip, but no realistic UI ever needs that — the cap
 * trades mythological scrolling for predictable query cost.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * ISO date-only strings e.g. "2025-01-15".
 * Cross-field check rejects `from > to` — handlers using this don't have
 * to defensively swap. Both fields are optional, so empty range is valid.
 */
export const dateRangeSchema = z
  .object({
    from: z.string().date().optional(),
    to: z.string().date().optional(),
  })
  .refine((d) => !d.from || !d.to || d.from <= d.to, {
    message: "'from' must be on or before 'to'",
    path: ["from"],
  });

/**
 * Parse and validate a request body using a Zod schema.
 * Throws ValidationError with structured field errors on failure.
 */
export async function parseRequestBody<T>(request: Request, schema: z.ZodSchema<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON");
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const raw = result.error.flatten().fieldErrors;
    const details = Object.fromEntries(
      Object.entries(raw).filter((e): e is [string, string[]] => e[1] !== undefined),
    );
    throw new ValidationError("Validation failed", details);
  }

  return result.data;
}

/**
 * Parse and validate URL search params using a Zod schema.
 * Throws ValidationError on failure.
 */
export function parseSearchParams<T>(
  params: URLSearchParams | Record<string, string>,
  schema: z.ZodSchema<T>,
): T {
  const raw = params instanceof URLSearchParams ? Object.fromEntries(params) : params;
  const result = schema.safeParse(raw);
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    const details = Object.fromEntries(
      Object.entries(fieldErrors).filter((e): e is [string, string[]] => e[1] !== undefined),
    );
    throw new ValidationError("Invalid query parameters", details);
  }
  return result.data;
}
