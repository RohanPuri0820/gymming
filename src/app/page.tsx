"use client";

import { requireProfile } from "@/components/RequireProfile";
import { ChevronRight, Play, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BodyMap } from "@/components/body/BodyMap";
import type { Palette } from "@/components/body/palette";
import { ExerciseDetail } from "@/components/ExerciseDetail";
import { ExerciseRow } from "@/components/ExerciseList";
import { Card, Chip, Sheet, Spinner, Stat } from "@/components/ui";
import {
  fatigueByMuscle,
  lastTrainedDays,
  neglectScores,
  volumeByMuscle,
  weekStreak,
} from "@/lib/analytics";
import { useExercises, useMountTime } from "@/lib/exercises";
import { candidatesFor, suggestFocus } from "@/lib/generator";
import { MUSCLE_LABEL, type MuscleScores } from "@/lib/muscles";
import { useData, useHistory, useWorkout } from "@/lib/store";
import type { MuscleId } from "@/lib/types";

const MODES: { id: string; label: string; palette: Palette; legend: [string, string]; help: string }[] = [
  { id: "recovery", label: "Recovery", palette: "recovery", legend: ["Fresh", "Fatigued"], help: "How recovered each muscle is from recent training." },
  { id: "week", label: "This week", palette: "heat", legend: ["A few sets", "10+ sets"], help: "Working sets per muscle over the last 7 days." },
  { id: "neglect", label: "Overdue", palette: "neglect", legend: ["Recently", "2+ weeks"], help: "How long since each muscle was trained." },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Home() {
  const db = useExercises();
  const history = useHistory();
  const profile = useData((s) => s.profile)!;
  const active = useWorkout((s) => s.active);
  const [mode, setMode] = useState(MODES[0]);
  const [muscle, setMuscle] = useState<MuscleId | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const now = useMountTime();

  const data = useMemo(() => {
    if (!db) return null;
    const volume = volumeByMuscle(history, db, 7);
    const weekScores: MuscleScores = {};
    for (const [m, v] of Object.entries(volume)) weekScores[m as MuscleId] = Math.min(1, (v ?? 0) / 10);
    return {
      volume,
      scores: {
        recovery: fatigueByMuscle(history, db),
        week: weekScores,
        neglect: neglectScores(history, db),
      } as Record<string, MuscleScores>,
      days: lastTrainedDays(history, db),
      suggestion: suggestFocus(history, db),
    };
  }, [db, history]);

  if (!db || !data) return <Spinner />;

  const weekAgo = now - 7 * 86_400_000;
  const thisWeek = history.filter((w) => new Date(w.started_at).getTime() > weekAgo).length;

  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm text-muted">
          {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="text-2xl font-bold">
          {greeting()}
          {profile.display_name ? `, ${profile.display_name}` : ""}
        </h1>
      </header>

      {active ? (
        <Link href="/workout">
          <Card className="flex items-center gap-3 border-accent/50 bg-accent/10">
            <Play className="text-accent" />
            <div className="flex-1">
              <div className="font-semibold">Resume: {active.title}</div>
              <div className="text-xs text-muted">Workout in progress</div>
            </div>
            <ChevronRight className="text-muted" />
          </Card>
        </Link>
      ) : (
        <Link href={`/plan?focus=${data.suggestion.focus}`}>
          <Card className="flex items-center gap-3">
            <div className="rounded-xl bg-accent p-2.5 text-accent-ink">
              <Sparkles size={20} />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Build today&apos;s workout</div>
              <div className="text-xs text-muted">{data.suggestion.reason}</div>
            </div>
            <ChevronRight className="text-muted" />
          </Card>
        </Link>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Stat label="This week" value={thisWeek} />
        <Stat label="Week streak" value={weekStreak(history)} />
        <Stat label="Total" value={history.length} />
      </div>

      <div>
        <div className="mb-2 flex gap-2">
          {MODES.map((m) => (
            <Chip key={m.id} active={mode.id === m.id} onClick={() => setMode(m)}>
              {m.label}
            </Chip>
          ))}
        </div>
        <BodyMap
          className="h-[460px]"
          scores={data.scores[mode.id]}
          palette={mode.palette}
          legend={mode.legend}
          highlighted={muscle ? [muscle] : []}
          onSelect={setMuscle}
        />
        <p className="mt-2 text-xs text-muted">{mode.help} Drag to rotate · tap a muscle.</p>
      </div>

      <Sheet open={!!muscle} onClose={() => setMuscle(null)} title={muscle ? MUSCLE_LABEL[muscle] : ""}>
        {muscle && (
          <div>
            <div className="grid grid-cols-3 gap-2">
              <Stat
                label="Last trained"
                value={data.days[muscle] == null ? "Never" : data.days[muscle] === 0 ? "Today" : `${data.days[muscle]}d ago`}
              />
              <Stat label="Sets (7d)" value={Math.round((data.volume[muscle] ?? 0) * 10) / 10} />
              <Stat label="Fatigue" value={`${Math.round((data.scores.recovery[muscle] ?? 0) * 100)}%`} />
            </div>
            <h4 className="mb-1 mt-4 text-sm font-semibold">Good exercises for this</h4>
            {candidatesFor(muscle, db, profile.level)
              .slice(0, 8)
              .map(({ ex }) => (
                <ExerciseRow key={ex.id} ex={ex} onClick={() => setDetail(ex.id)} />
              ))}
            <Link href={`/exercises?muscle=${encodeURIComponent(muscle)}`} className="mt-3 block text-center text-sm text-accent">
              See all {MUSCLE_LABEL[muscle]} exercises
            </Link>
          </div>
        )}
      </Sheet>
      <ExerciseDetail exerciseId={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

export default requireProfile(Home);
