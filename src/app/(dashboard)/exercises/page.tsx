"use client";

import { useMemo, useState } from "react";
import { Archive, ArchiveRestore, Dumbbell, Pencil, Plus, Search, X } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import {
  useArchiveExercise,
  useExercises,
  useRestoreExercise,
} from "@/features/exercises/hooks/useExercises";
import { ExerciseForm } from "@/features/exercises/components/ExerciseForm";
import type { Exercise } from "@/types/database";

type Tab = "all" | "mine" | "archived";

const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "mine", label: "My customs" },
  { value: "archived", label: "Archived" },
];

export default function ExercisesPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);

  // The "archived" tab passes include_archived=true and filters client-side
  // for archived_at != null. The list endpoint always returns active rows
  // unless include_archived is set; we don't use a separate "archived only"
  // server filter to keep the API surface small.
  const includeArchived = tab === "archived";
  const { data: rows, isLoading } = useExercises({
    q: submittedQuery || undefined,
    include_archived: includeArchived,
    per_page: 100,
  });

  const archive = useArchiveExercise();
  const restore = useRestoreExercise();
  const toast = useToast();

  // Apply the tab filter on top of the server result. The server already
  // limits visibility (system + caller's customs), so "mine" just narrows
  // to user-owned rows here.
  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      if (tab === "mine") return r.is_custom && !r.archived_at;
      if (tab === "archived") return r.archived_at != null;
      return !r.archived_at;
    });
  }, [rows, tab]);

  async function handleArchive(ex: Exercise) {
    const ok = await toast.confirm(
      `Archive "${ex.name}"? Historical workouts that reference it stay intact, and you can restore it later.`,
      "Archive",
    );
    if (!ok) return;
    archive.mutate(ex.id, {
      onError: () => toast.error("Failed to archive. Please try again."),
    });
  }

  function handleRestore(ex: Exercise) {
    restore.mutate(ex.id, {
      onError: () => toast.error("Failed to restore. Please try again."),
    });
  }

  // ─── Form modal-equivalent (inline panel) ─────────────────────────────────
  // We render the form inline above the list rather than in a modal so the
  // search + tabs stay context-visible and mobile users don't lose place.
  if (creating || editing) {
    return (
      <div className="flex flex-col">
        <Header title="Exercises" />
        <div className="flex flex-col gap-4 p-4 sm:p-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{editing ? "Edit exercise" : "New custom exercise"}</CardTitle>
                <button
                  onClick={() => {
                    setCreating(false);
                    setEditing(null);
                  }}
                  aria-label="Close form"
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <ExerciseForm
                exercise={editing ?? undefined}
                onCancel={() => {
                  setCreating(false);
                  setEditing(null);
                }}
                onSuccess={() => {
                  setCreating(false);
                  setEditing(null);
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="Exercises" />
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {/* Search + new */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 gap-2">
            <input
              type="text"
              aria-label="Search exercises"
              placeholder="Search exercises…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setSubmittedQuery(query.trim());
              }}
              className="h-10 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
            <Button
              onClick={() => setSubmittedQuery(query.trim())}
              variant="secondary"
              className="flex items-center gap-1.5"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
            </Button>
          </div>
          <Button onClick={() => setCreating(true)} className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            New custom
          </Button>
        </div>

        {/* Tabs — full ARIA wiring: each tab has aria-controls pointing at the
            list panel, the panel has role="tabpanel" + aria-labelledby tying
            it back to the active tab. Without these, screen readers announce
            "tab" but can't navigate to the controlled region. */}
        <div
          role="tablist"
          aria-label="Filter exercises"
          className="flex gap-1 self-start rounded-lg bg-gray-100 p-1 dark:bg-gray-800"
        >
          {TABS.map((t) => (
            <button
              key={t.value}
              id={`exercises-tab-${t.value}`}
              role="tab"
              aria-selected={tab === t.value}
              aria-controls="exercises-tabpanel"
              tabIndex={tab === t.value ? 0 : -1}
              onClick={() => setTab(t.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t.value
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* List — the tab panel. */}
        <div id="exercises-tabpanel" role="tabpanel" aria-labelledby={`exercises-tab-${tab}`}>
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Dumbbell}
              title={tab === "archived" ? "No archived exercises" : "No exercises found"}
              description={
                tab === "mine"
                  ? "Create a custom exercise to keep things you do regularly close at hand."
                  : tab === "archived"
                    ? "Archive a custom exercise to hide it from the picker without losing history."
                    : "Try a different search term, or create a custom exercise."
              }
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {filtered.map((ex) => (
                <li key={ex.id}>
                  <ExerciseRow
                    exercise={ex}
                    onEdit={() => setEditing(ex)}
                    onArchive={() => handleArchive(ex)}
                    onRestore={() => handleRestore(ex)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function ExerciseRow({
  exercise,
  onEdit,
  onArchive,
  onRestore,
}: {
  exercise: Exercise;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  const isOwn = exercise.is_custom;
  const isArchived = exercise.archived_at != null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
        <Dumbbell className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="font-semibold text-gray-900 dark:text-gray-100">{exercise.name}</p>
          {isOwn && (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium tracking-wide text-indigo-700 uppercase dark:bg-indigo-900/30 dark:text-indigo-300">
              Custom
            </span>
          )}
          {isArchived && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium tracking-wide text-amber-800 uppercase dark:bg-amber-900/30 dark:text-amber-300">
              Archived
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {capitalize(exercise.category)} · {prettyMuscle(exercise.primary_muscle_group)}
        </p>
        {exercise.instructions && (
          <p className="mt-1 line-clamp-2 text-xs text-gray-400">{exercise.instructions}</p>
        )}
      </div>

      {/* Owner-only actions. System exercises are read-only. */}
      {isOwn && (
        <div className="flex shrink-0 gap-1">
          {isArchived ? (
            <button
              onClick={onRestore}
              aria-label={`Restore ${exercise.name}`}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-emerald-500 dark:hover:bg-gray-700"
            >
              <ArchiveRestore className="h-4 w-4" />
            </button>
          ) : (
            <>
              <button
                onClick={onEdit}
                aria-label={`Edit ${exercise.name}`}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-indigo-500 dark:hover:bg-gray-700"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={onArchive}
                aria-label={`Archive ${exercise.name}`}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-rose-500 dark:hover:bg-gray-700"
              >
                <Archive className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function prettyMuscle(m: string) {
  return m.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
