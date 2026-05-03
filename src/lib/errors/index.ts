/**
 * Domain error classes and HTTP response helpers.
 *
 * Using typed error classes instead of raw `throw new Error(string)` lets
 * catch blocks inspect `.code` and respond appropriately without stringly
 * typed comparisons.
 */
import { NextResponse } from "next/server";
import type { ApiError, ApiErrorCode } from "@/types/api";
import { logger } from "@/lib/logger";

// ─── Domain error classes ─────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super("UNAUTHORIZED", message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super("FORBIDDEN", message, 403);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super("NOT_FOUND", `${resource} not found`, 404);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, string[]>) {
    super("VALIDATION_ERROR", message, 422, details);
    this.name = "ValidationError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message, 409);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super("RATE_LIMITED", "Too many requests. Please try again later.", 429);
    this.name = "RateLimitError";
  }
}

// ─── HTTP response helpers ────────────────────────────────────────────────────

/**
 * Convert any thrown value into a typed NextResponse<ApiError>.
 * Use in Route Handler catch blocks to guarantee consistent error envelopes.
 */
export function handleRouteError(err: unknown): NextResponse<ApiError> {
  if (err instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      },
      { status: err.statusCode },
    );
  }

  // Unknown error — log it and return a safe generic message (never leak internals)
  logger.error("Unhandled route error", {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR" as ApiErrorCode,
        message: "An unexpected error occurred. Please try again.",
      },
    },
    { status: 500 },
  );
}
