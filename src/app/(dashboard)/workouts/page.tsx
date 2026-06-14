"use client";

import { useState } from "react";
import { Dumbbell, Plus } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { StartWorkoutModal } from "@/features/workouts/components/StartWorkoutModal";
import { WorkoutCard } from "@/features/workouts/components/WorkoutCard";
import { WorkoutDetailView } from "@/features/workouts/components/WorkoutDetailView";
import { useWorkoutSessions } from "@/features/workouts/hooks/useWorkouts";

export default function WorkoutsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: sessions = [], isLoading } = useWorkoutSessions();

  const [now] = useState(() => Date.now());

  const activeSession = sessions.find((s) => !s.ended_at);
  const thisWeek = sessions.filter((s) => {
    const daysAgo = (now - new Date(s.started_at).getTime()) / 86_400_000;
    return daysAgo <= 7;
  }).length;

  if (selectedId) {
    return (
      <div className="flex flex-col">
        <Header title="Workouts" />
        <div className="p-4 sm:p-6">
          <WorkoutDetailView sessionId={selectedId} onBack={() => setSelectedId(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="Workouts" />
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <p className="text-xs text-gray-500 dark:text-gray-400">This week</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-7 w-12" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{thisWeek}</p>
            )}
            <p className="text-xs text-gray-400">workouts</p>
          </Card>
          <Card>
            <p className="text-xs text-gray-500 dark:text-gray-400">Active session</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-7 w-20" />
            ) : (
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {activeSession ? "In progress" : "None"}
              </p>
            )}
          </Card>
        </div>

        {/* Start workout */}
        {showForm ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Start workout</CardTitle>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <StartWorkoutModal
                onSuccess={(id) => {
                  setShowForm(false);
                  setSelectedId(id);
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 self-start">
            <Plus className="h-4 w-4" /> Start workout
          </Button>
        )}

        {/* Session list */}
        <Card>
          <CardHeader>
            <CardTitle>Recent workouts</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col gap-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <EmptyState
                icon={Dumbbell}
                title="No workouts yet"
                description="Start your first workout session above."
              />
            ) : (
              <div className="flex flex-col gap-3">
                {sessions.map((session) => (
                  <WorkoutCard
                    key={session.id}
                    session={session}
                    onClick={() => setSelectedId(session.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
