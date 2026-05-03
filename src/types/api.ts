/**
 * Standardised API response shapes used across all route handlers.
 * Keeping a single envelope means clients can handle errors uniformly.
 */

// ─── Success envelope ─────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

// ─── Error envelope ───────────────────────────────────────────────────────────

export interface ApiError {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    /** Field-level validation errors from Zod */
    details?: Record<string, string[]>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface ApiMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
}

// ─── Error codes ──────────────────────────────────────────────────────────────

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "INTERNAL_ERROR";

// ─── Date range filter ────────────────────────────────────────────────────────

export interface DateRangeParams {
  from?: string; // ISO date
  to?: string; // ISO date
}
