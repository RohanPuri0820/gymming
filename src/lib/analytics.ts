import type { ExerciseDb } from "./exercises";
import type { MuscleScores } from "./muscles";
import { MUSCLES } from "./muscles";
import type { MuscleId, SetRow, WorkoutItem, WorkoutWithSets } from "./types";
import { e1rm } from "./util";

const HOUR = 3_600_000;

// A set counts fully for its primary muscles and half for secondary ones.
function forEachMuscle(
  db: ExerciseDb,
  exerciseId: string,
  fn: (m: MuscleId, weight: number) => void,
) {
  const ex = db.byId.get(exerciseId);
  if (!ex) return;
  ex.primary.forEach((m) => fn(m, 1));
  ex.secondary.forEach((m) => fn(m, 0.5));
}

function workingSets(history: WorkoutWithSets[]): SetRow[] {
  return history.flatMap((w) => w.sets.filter((s) => s.section === "main"));
}

/** Effective sets per muscle over the last `days` days. */
export function volumeByMuscle(history: WorkoutWithSets[], db: ExerciseDb, days = 7) {
  const since = Date.now() - days * 24 * HOUR;
  const out: MuscleScores = {};
  for (const s of workingSets(history)) {
    if (new Date(s.completed_at).getTime() < since) continue;
    forEachMuscle(db, s.exercise_id, (m, w) => (out[m] = (out[m] ?? 0) + w));
  }
  return out;
}

/** 0 = fresh, 1 = heavily fatigued. Each set's effect decays with a ~30h time constant. */
export function fatigueByMuscle(history: WorkoutWithSets[], db: ExerciseDb): MuscleScores {
  const now = Date.now();
  const raw: MuscleScores = {};
  for (const s of workingSets(history)) {
    const hours = (now - new Date(s.completed_at).getTime()) / HOUR;
    if (hours > 24 * 6) continue;
    const decay = Math.exp(-hours / 30);
    forEachMuscle(db, s.exercise_id, (m, w) => (raw[m] = (raw[m] ?? 0) + w * decay));
  }
  const out: MuscleScores = {};
  for (const m of MUSCLES) out[m.id] = Math.min(1, (raw[m.id] ?? 0) / 6);
  return out;
}

/** Days since each muscle was last trained as a primary mover (null = never). */
export function lastTrainedDays(history: WorkoutWithSets[], db: ExerciseDb) {
  const last: Partial<Record<MuscleId, number>> = {};
  for (const s of workingSets(history)) {
    const t = new Date(s.completed_at).getTime();
    db.byId.get(s.exercise_id)?.primary.forEach((m) => {
      if (!last[m] || t > last[m]!) last[m] = t;
    });
  }
  const out: Partial<Record<MuscleId, number | null>> = {};
  for (const m of MUSCLES) {
    out[m.id] = last[m.id] ? Math.floor((Date.now() - last[m.id]!) / (24 * HOUR)) : null;
  }
  return out;
}

/** 0 = trained today, 1 = two weeks or more (or never). */
export function neglectScores(history: WorkoutWithSets[], db: ExerciseDb): MuscleScores {
  const days = lastTrainedDays(history, db);
  const out: MuscleScores = {};
  for (const m of MUSCLES) {
    const d = days[m.id];
    out[m.id] = d == null ? 1 : Math.min(1, d / 14);
  }
  return out;
}

/** How hard a planned/active workout hits each muscle, normalised to the max. */
export function planScores(items: WorkoutItem[], db: ExerciseDb): MuscleScores {
  const raw: MuscleScores = {};
  for (const it of items) {
    if (it.section !== "main") continue;
    forEachMuscle(db, it.exerciseId, (m, w) => (raw[m] = (raw[m] ?? 0) + w * it.sets.length));
  }
  const max = Math.max(1, ...Object.values(raw).map((v) => v ?? 0));
  const out: MuscleScores = {};
  for (const [m, v] of Object.entries(raw)) out[m as MuscleId] = (v ?? 0) / max;
  return out;
}

/** Sets from the most recent workout that included this exercise. */
export function lastPerformance(history: WorkoutWithSets[], exerciseId: string) {
  for (const w of history) {
    const sets = w.sets
      .filter((s) => s.exercise_id === exerciseId)
      .sort((a, b) => a.set_number - b.set_number);
    if (sets.length) return { date: w.started_at, sets };
  }
  return null;
}

export function bestSet(history: WorkoutWithSets[], exerciseId: string) {
  let best: { weight: number; reps: number; e1rm: number; date: string } | null = null;
  for (const w of history)
    for (const s of w.sets) {
      if (s.exercise_id !== exerciseId || !s.weight || !s.reps) continue;
      const est = e1rm(s.weight, s.reps);
      if (!best || est > best.e1rm)
        best = { weight: s.weight, reps: s.reps, e1rm: est, date: w.started_at };
    }
  return best;
}

export function workoutVolume(w: WorkoutWithSets): number {
  return w.sets.reduce((t, s) => t + (s.weight ?? 0) * (s.reps ?? 0), 0);
}

export function workoutMuscles(w: WorkoutWithSets, db: ExerciseDb): MuscleId[] {
  const set = new Set<MuscleId>();
  w.sets
    .filter((s) => s.section === "main")
    .forEach((s) => db.byId.get(s.exercise_id)?.primary.forEach((m) => set.add(m)));
  return [...set];
}

/** Consecutive weeks (Mon-start) with at least one workout, counting back from this week. */
export function weekStreak(history: WorkoutWithSets[]): number {
  const weekKey = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x.getTime();
  };
  const weeks = new Set(history.map((w) => weekKey(new Date(w.started_at))));
  let streak = 0;
  const cursor = new Date();
  // This week doesn't break the streak until it's over
  if (!weeks.has(weekKey(cursor))) cursor.setDate(cursor.getDate() - 7);
  while (weeks.has(weekKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}
