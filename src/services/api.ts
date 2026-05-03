/**
 * Base HTTP client for all client-side API calls.
 *
 * Unwraps the { success, data } / { success, error } envelope that every
 * route returns, and throws a typed ApiRequestError on failure so hooks
 * can handle errors uniformly without inspecting response shapes.
 */
import type { ApiSuccess, ApiError } from "@/types/api";

// ─── Error class ──────────────────────────────────────────────────────────────

export class ApiRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  // 204 No Content — DELETE success
  if (res.status === 204) return undefined as T;

  const envelope = (await res.json()) as ApiSuccess<T> | ApiError;

  if (!res.ok || !envelope.success) {
    const err = envelope as ApiError;
    throw new ApiRequestError(err.error.code, err.error.message, err.error.details);
  }

  return (envelope as ApiSuccess<T>).data;
}

// ─── HTTP method helpers ──────────────────────────────────────────────────────

export function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path);
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function apiPut<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: "PUT", body: JSON.stringify(body) });
}

export function apiDelete(path: string): Promise<void> {
  return apiFetch<void>(path, { method: "DELETE" });
}

// ─── Query string builder ─────────────────────────────────────────────────────

export function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}
