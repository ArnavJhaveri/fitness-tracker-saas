/**
 * Tiny supabase-js mock harness for db/* repository tests.
 *
 * Why this exists: the db/* layer wraps supabase-js's fluent builder
 * (`.from(...).select(...).eq(...).single()`). Spying on that with vi.fn()
 * by hand is verbose and easy to get wrong — the chain is a Proxy in the
 * real client and is itself thenable, so naive mocks miss either the
 * `await chain` path (range-style queries) or the `.single()` path.
 *
 * This harness gives tests a credible stand-in:
 *
 *   - `from(table)` and `rpc(fn, args)` return a chainable builder that
 *     records every operation invoked on it.
 *   - The chain is thenable (await yields the next queued result) AND has
 *     `.single()` / `.maybeSingle()` (which yield the same).
 *   - Tests pre-load results with `queue(...)` (table queries) and
 *     `queueRpc(...)` (RPC calls) — call order is FIFO and per-stack so
 *     mixed sequences stay deterministic.
 *   - `calls` exposes the recorded chain for assertions like "did this
 *     query include `.eq('status', 'active')`".
 *
 * It's deliberately not a generic mock — only the surface area used by
 * src/lib/db/* is covered. Add methods if a new repo function reaches for
 * something we don't yet handle.
 */

import { vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface MockResult<T = unknown> {
  data: T | null;
  error: { code?: string; message: string } | null;
  count?: number;
}

export interface RecordedCall {
  /** "from" for `.from(table)` builds, "rpc" for `.rpc(fn, args)` builds. */
  kind: "from" | "rpc";
  /** Table name for `from`, function name for `rpc`. */
  name: string;
  /** Args passed to the `rpc(fn, args)` call. Empty object for `from`. */
  rpcArgs?: unknown;
  /** Ordered (method, args) tuples invoked on the builder, e.g. ["eq", ["id", "x"]]. */
  ops: Array<[string, unknown[]]>;
}

export interface SupabaseMock {
  /** Cast as SupabaseClient when passing to repo functions. */
  supabase: SupabaseClient;
  /** Every from()/rpc() build, in invocation order. */
  calls: RecordedCall[];
  /** Push the next result a `from(...)` chain (or `.single()`) will resolve to. */
  queue: (result: MockResult) => void;
  /** Push the next result a `rpc(...)` call will resolve to. */
  queueRpc: (result: MockResult) => void;
  /** Convenience: assert the i-th call's recorded ops contain `[method, args]`. */
  hasOp: (callIndex: number, method: string, args: unknown[]) => boolean;
}

export function makeSupabaseMock(): SupabaseMock {
  const calls: RecordedCall[] = [];
  const fromQueue: MockResult[] = [];
  const rpcQueue: MockResult[] = [];

  const buildBuilder = (entry: RecordedCall, isRpc: boolean) => {
    const settle = (): MockResult => {
      const queue = isRpc ? rpcQueue : fromQueue;
      // Default to a no-op success when the test forgot to queue — better
      // than throwing, since most repos check `error` and bail before they
      // touch `data`. Failing tests will surface as "unexpected null data"
      // rather than "Promise rejected: queue empty".
      return queue.shift() ?? { data: null, error: null };
    };

    const builder: Record<string | symbol, unknown> = {};

    const proxy: unknown = new Proxy(builder, {
      get(_target, prop) {
        // Make the builder itself awaitable. `.then` is the marker JS uses
        // to detect thenables, so returning a function here lets repos do
        // `await supabase.from(...).select(...)` (no terminal `.single()`).
        if (prop === "then") {
          return (resolve: (value: MockResult) => unknown, reject?: (reason: unknown) => unknown) =>
            Promise.resolve(settle()).then(resolve, reject);
        }

        // `.single()` and `.maybeSingle()` are the most common terminals.
        // Both are async-functions that return the queued result.
        if (prop === "single" || prop === "maybeSingle") {
          return () => Promise.resolve(settle());
        }

        // Symbol lookups (e.g. Symbol.toPrimitive) shouldn't be recorded.
        if (typeof prop === "symbol") return undefined;

        // Every other property — `.select`, `.eq`, `.order`, `.range`,
        // `.is`, `.ilike`, `.insert`, `.update`, `.delete`, etc. — is a
        // chainable that records its args and returns the builder.
        return (...args: unknown[]) => {
          entry.ops.push([prop, args]);
          return proxy;
        };
      },
    });

    return proxy;
  };

  const supabase = {
    from: vi.fn((table: string) => {
      const entry: RecordedCall = { kind: "from", name: table, ops: [] };
      calls.push(entry);
      return buildBuilder(entry, false);
    }),
    rpc: vi.fn((fn: string, args: unknown) => {
      const entry: RecordedCall = { kind: "rpc", name: fn, rpcArgs: args, ops: [] };
      calls.push(entry);
      return buildBuilder(entry, true);
    }),
    auth: {
      getUser: vi.fn(),
    },
    // Cast through unknown — we deliberately cover only the surface used
    // by db/*. Adding more methods is one-line.
  } as unknown as SupabaseClient;

  return {
    supabase,
    calls,
    queue: (result) => {
      fromQueue.push(result);
    },
    queueRpc: (result) => {
      rpcQueue.push(result);
    },
    hasOp: (callIndex, method, args) => {
      const c = calls[callIndex];
      if (!c) return false;
      return c.ops.some(([m, a]) => m === method && JSON.stringify(a) === JSON.stringify(args));
    },
  };
}
