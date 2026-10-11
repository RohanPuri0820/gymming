"use client";

import { requireProfile } from "@/components/RequireProfile";
import { useState } from "react";
import { BodyMap } from "@/components/body/BodyMap";
import { ExerciseDetail } from "@/components/ExerciseDetail";
import { ExerciseList } from "@/components/ExerciseList";
import { Spinner } from "@/components/ui";
import { useExercises } from "@/lib/exercises";
import { MUSCLES } from "@/lib/muscles";
import type { MuscleId } from "@/lib/types";

function ExercisesPage() {
  const db = useExercises();
  // Deep link from the home screen: /exercises?muscle=chest (pages only render in the browser)
  const [muscle, setMuscle] = useState<MuscleId | null>(() => {
    if (typeof window === "undefined") return null;
    const m = new URLSearchParams(window.location.search).get("muscle");
    return m && MUSCLES.some((x) => x.id === m) ? (m as MuscleId) : null;
  });
  const [detail, setDetail] = useState<string | null>(null);

  if (!db) return <Spinner />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Exercises</h1>
      <BodyMap
        className="h-[300px]"
        scores={muscle ? { [muscle]: 1 } : {}}
        palette="heat"
        highlighted={muscle ? [muscle] : []}
        onSelect={(m) => setMuscle(muscle === m ? null : m)}
      />
      <p className="-mt-2 text-xs text-muted">Tap a muscle on the body to filter.</p>
      <ExerciseList db={db} muscle={muscle} onMuscleChange={setMuscle} onPick={(ex) => setDetail(ex.id)} />
      <ExerciseDetail exerciseId={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

export default requireProfile(ExercisesPage);
