"use client";

import { useMemo, useState } from "react";
import { Calendar, Pause, Pencil, Plus, Power, Sparkles, X } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { PhaseForm } from "@/features/phases/components/PhaseForm";
import { PhaseProgressCard } from "@/features/phases/components/PhaseProgressCard";
import {
  useActivePhase,
  useCreatePhase,
  useEndPhase,
  usePhases,
  usePivotPhase,
} from "@/features/phases/hooks/usePhases";
import { getPhaseTypeMeta } from "@/lib/registry/phase-types";
import { localDateStr } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import type { CreatePhaseInput } from "@/lib/validations/phases";
import type { Phase } from "@/types/database";

type Mode = "list" | "create" | { kind: "pivot"; phase: Phase };

/**
 * /phases — full phase history + the entry point for creating, pivoting,
 * and ending phases.
 *
 * UX architecture:
 *   - The active phase (if any) renders at the top via the same hero card
 *     used on the dashboard, so the two views stay visually coherent.
 *   - Past phases are listed below in reverse-chronological order, grouped
 *     by status so users can scan "what's currently happening" first and
 *     "what's done" second.
 *   - Create / pivot use the same PhaseForm — the difference is which API
 *     they call and what they do to the existing active phase. End is a
 *     confirm-only action with no form.
 */
export default function PhasesPage() {
  const [mode, setMode] = useState<Mode>("list");

  const { data: active } = useActivePhase();
  const { data: all, isLoading } = usePhases();
  const create = useCreatePhase();
  const pivot = usePivotPhase();
  const end = useEndPhase();
  const toast = useToast();

  // Group phases by status. The active phase is rendered separately above
  // (via PhaseProgressCard) so we filter it out of the history list.
  const grouped = useMemo(() => {
    const list = all ?? [];
    const past = list.filter((p) => p.status !== "active");
    return {
      planned: past.filter((p) => p.status === "planned"),
      ended: past.filter((p) => p.status === "ended" || p.status === "superseded"),
    };
  }, [all]);

  // ─── Action handlers ────────────────────────────────────────────────────

  async function handleCreate(payload: CreatePhaseInput) {
    await create.mutateAsync(payload);
    setMode("list");
  }

  async function handlePivot(oldPhase: Phase, payload: CreatePhaseInput) {
    await pivot.mutateAsync({ id: oldPhase.id, input: { new_phase: payload } });
    setMode("list");
  }

  async function handleEnd(phase: Phase) {
    const ok = await toast.confirm(
      `End "${phase.name}"? You'll drop into companion mode (no daily targets) until you start a new phase.`,
      "End phase",
    );
    if (!ok) return;
    end.mutate(
      { id: phase.id },
      {
        onSuccess: () => toast.success("Phase ended. Welcome to companion mode."),
        onError: () => toast.error("Failed to end phase. Please try again."),
      },
    );
  }

  // ─── Mode-specific renders ──────────────────────────────────────────────

  if (mode === "create") {
    return (
      <ModeShell title="Start a new phase" onClose={() => setMode("list")}>
        {active ? (
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
            You already have an active phase ({active.name}). End or pivot it first from the list
            below.
          </p>
        ) : (
          <PhaseForm
            onSubmit={handleCreate}
            onCancel={() => setMode("list")}
            submitLabel="Start phase"
          />
        )}
      </ModeShell>
    );
  }

  if (typeof mode === "object" && mode.kind === "pivot") {
    return (
      <PivotMode
        phase={mode.phase}
        onCancel={() => setMode("list")}
        onSubmit={(payload) => handlePivot(mode.phase, payload)}
      />
    );
  }

  // ─── Default list view ──────────────────────────────────────────────────

  return (
    <div className="flex flex-col">
      <Header title="Phases" />
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {/* Active phase (if any) — same hero card as the dashboard */}
        {active ? (
          <div className="flex flex-col gap-3">
            <PhaseProgressCard phase={active} />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => setMode({ kind: "pivot", phase: active })}
                className="flex items-center gap-1.5"
              >
                <Pencil className="h-4 w-4" />
                Pivot to a new phase
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleEnd(active)}
                className="flex items-center gap-1.5 text-rose-600 hover:text-rose-700 dark:text-rose-400"
              >
                <Power className="h-4 w-4" />
                End phase
              </Button>
            </div>
          </div>
        ) : (
          <Card className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-gray-900 dark:text-gray-100">Companion mode</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No active phase — log freely without a target. Start one when you want focused
                  goals and personalised macro recommendations.
                </p>
              </div>
            </div>
            <Button onClick={() => setMode("create")} className="self-start">
              <Plus className="mr-1.5 h-4 w-4" />
              Start a phase
            </Button>
          </Card>
        )}

        {/* History */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-gray-700 uppercase dark:text-gray-300">
            History
          </h2>
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : grouped.planned.length === 0 && grouped.ended.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No past phases"
              description="Once you end or pivot a phase it appears here so you can compare what worked."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {grouped.planned.map((p) => (
                <li key={p.id}>
                  <HistoryRow phase={p} />
                </li>
              ))}
              {grouped.ended.map((p) => (
                <li key={p.id}>
                  <HistoryRow phase={p} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/**
 * Pivot-mode shell. Lives in its own component so the "tomorrow" default
 * date can be pinned in a useState lazy init (Date.now() in a render body
 * fails the react-hooks/purity rule). Tomorrow is the safe default for the
 * new phase's start date so today's adherence isn't measured against the
 * new target halfway through — users can still pick today explicitly via
 * the date input.
 */
function PivotMode({
  phase,
  onCancel,
  onSubmit,
}: {
  phase: Phase;
  onCancel: () => void;
  onSubmit: (payload: CreatePhaseInput) => Promise<void>;
}) {
  const [tomorrow] = useState(() => localDateStr(new Date(Date.now() + 86_400_000)));
  const meta = getPhaseTypeMeta(phase.phase_type);
  return (
    <ModeShell title={`Pivot from ${phase.name}`} onClose={onCancel}>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        This ends &quot;{phase.name}&quot; ({meta.label}) the day before the new phase starts and
        begins a fresh active phase. Your past adherence stays on the old phase&apos;s targets —
        analytics never get rewritten.
      </p>
      <PhaseForm
        initial={{ start_date: tomorrow }}
        onSubmit={onSubmit}
        onCancel={onCancel}
        submitLabel="Pivot now"
      />
    </ModeShell>
  );
}

function ModeShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col">
      <Header title="Phases" />
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{title}</CardTitle>
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">{children}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function HistoryRow({ phase }: { phase: Phase }) {
  const meta = getPhaseTypeMeta(phase.phase_type);
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          STATUS_BG[phase.status],
        )}
      >
        {phase.status === "planned" ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Calendar className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-gray-900 dark:text-gray-100">{phase.name}</p>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium tracking-wide text-gray-600 uppercase dark:bg-gray-700 dark:text-gray-300">
            {meta.label}
          </span>
          <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium tracking-wide text-gray-500 uppercase dark:bg-gray-800 dark:text-gray-400">
            {phase.status}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {phase.start_date}
          {phase.actual_end_date ? ` — ${phase.actual_end_date}` : ""}
        </p>
        {phase.notes && <p className="mt-1 line-clamp-2 text-xs text-gray-400">{phase.notes}</p>}
      </div>
    </div>
  );
}

const STATUS_BG: Record<Phase["status"], string> = {
  active: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300",
  planned: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300",
  ended: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300",
  superseded: "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300",
};
