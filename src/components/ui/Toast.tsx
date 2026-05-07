"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Lightweight in-house toast system. Replaces the previous mix of
 * `window.alert(...)` (modal, blocks main thread, no theming, no a11y for
 * screen-reader users) and silent failures.
 *
 * Surface:
 *   - <ToastProvider> wraps the app at the root layout level.
 *   - useToast() returns { success, error, info } imperative helpers.
 *   - confirmToast(message) returns Promise<boolean> — non-blocking
 *     confirm replacement that resolves when the user picks an action.
 *
 * Why not a dependency: the surface is small (≈2 helpers), and shipping
 * a custom one keeps the bundle lean + the styling consistent with the
 * rest of the app's Tailwind palette.
 *
 * Accessibility:
 *   - role="status" with aria-live="polite" for non-error toasts so a
 *     screen reader announces them once.
 *   - role="alert" with aria-live="assertive" for errors.
 *   - confirmToast renders role="alertdialog" with aria-modal so
 *     assistive tech treats it as a blocking decision.
 */

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  /** When the user must decide (confirm dialog) */
  confirm?: {
    confirmLabel: string;
    cancelLabel: string;
    resolve: (ok: boolean) => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  push: (kind: ToastKind, message: string) => void;
  confirm: (message: string, confirmLabel?: string, cancelLabel?: string) => Promise<boolean>;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;
const AUTO_DISMISS_MS = 5_000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Track timers per id so we can clear on manual dismiss
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    // Resolve any pending confirm as cancelled when the user clicks X.
    setToasts((prev) => {
      const t = prev.find((x) => x.id === id);
      if (t?.confirm) t.confirm.resolve(false);
      return prev.filter((x) => x.id !== id);
    });
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, kind, message }]);
      // Auto-dismiss non-confirm toasts after 5s
      const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  const confirm = useCallback(
    (message: string, confirmLabel = "Confirm", cancelLabel = "Cancel") => {
      return new Promise<boolean>((resolve) => {
        const id = nextId++;
        // Confirm toasts do not auto-dismiss — the user must pick.
        setToasts((prev) => [
          ...prev,
          { id, kind: "info", message, confirm: { confirmLabel, cancelLabel, resolve } },
        ]);
      });
    },
    [],
  );

  // Clean up timers on unmount
  useEffect(() => {
    const timersAtMount = timers.current;
    return () => {
      timersAtMount.forEach((t) => clearTimeout(t));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, push, confirm, dismiss }}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
}

/**
 * The visible stack. Renders bottom-right on desktop; bottom-centre on
 * mobile so it doesn't collide with the bottom nav bar (z-50 keeps it
 * above the sheet too).
 */
function ToastViewport() {
  const ctx = useContext(ToastContext);
  if (!ctx) return null;
  const { toasts, dismiss } = ctx;

  if (toasts.length === 0) return null;

  return (
    <div
      // Position: above the mobile bottom-nav (h-16 + safe-area). On lg+
      // we anchor to the right edge so it doesn't compete with the page.
      className="pointer-events-none fixed right-0 bottom-20 left-0 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-4 lg:left-auto lg:items-end lg:px-6"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const isError = toast.kind === "error";
  const isConfirm = toast.confirm != null;

  return (
    <div
      role={isConfirm ? "alertdialog" : isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-modal={isConfirm ? "true" : undefined}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur",
        toast.kind === "success" &&
          "border-emerald-300 bg-emerald-50/95 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-100",
        toast.kind === "error" &&
          "border-rose-300 bg-rose-50/95 text-rose-900 dark:border-rose-800 dark:bg-rose-950/90 dark:text-rose-100",
        toast.kind === "info" &&
          "border-gray-200 bg-white/95 text-gray-900 dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-100",
      )}
    >
      <div className="mt-0.5 shrink-0">
        {toast.kind === "success" && <CheckCircle2 className="h-4 w-4" />}
        {toast.kind === "error" && <CircleAlert className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm">{toast.message}</p>
        {toast.confirm && (
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                toast.confirm!.resolve(true);
                onDismiss();
              }}
              className="rounded-md bg-rose-600 px-3 py-1 text-xs font-medium text-white hover:bg-rose-700"
            >
              {toast.confirm.confirmLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                toast.confirm!.resolve(false);
                onDismiss();
              }}
              className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {toast.confirm.cancelLabel}
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="-mr-1 rounded p-1 text-gray-400 hover:bg-black/5 dark:hover:bg-white/5"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * Imperative toast helpers. Throws when used outside ToastProvider — that
 * surfaces wiring mistakes loudly rather than silently no-op'ing.
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return {
    success: (message: string) => ctx.push("success", message),
    error: (message: string) => ctx.push("error", message),
    info: (message: string) => ctx.push("info", message),
    /**
     * Non-blocking confirm. Returns a promise that resolves true (confirm)
     * or false (cancel/dismiss). Drop-in replacement for window.confirm.
     */
    confirm: ctx.confirm,
  };
}
