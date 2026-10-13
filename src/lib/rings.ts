import type { ExerciseDb } from "./exercises";
import type { Goal, Level, Profile, WorkoutWithSets } from "./types";

export type RingKey = "volume" | "sessions" | "cardio";

export type Ring = {
  key: RingKey;
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
};

export const RING_COLOR: Record<RingKey, string> = {
  volume: "#c6f432",
  sessions: "#ff5a6e",
  cardio: "#3ee6ff",
};

// Weekly targets: enough to make progress without burning out a beginner
const SET_TARGET: Record<Level, number> = { beginner: 30, intermediate: 50, expert: 70 };
const SESSION_TARGET: Record<Goal, number> = { general: 3, weight_loss: 4, muscle: 4, strength: 3, mobility: 3 };
const CARDIO_TARGET: Record<Goal, number> = { general: 60, weight_loss: 90, muscle: 30, strength: 20, mobility: 30 };

export function weekStart(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

/** Rings for one set of workouts (a week, or a single session for the summary). */
export function computeRings(workouts: WorkoutWithSets[], db: ExerciseDb, profile: Profile, scale: "week" | "session" = "week"): Ring[] {
  let sets = 0;
  let cardioSec = 0;
  for (const w of workouts)
    for (const s of w.sets) {
      const ex = db.byId.get(s.exercise_id);
      if (ex?.category === "cardio") cardioSec += s.duration_sec ?? 0;
      else if (s.section === "main") sets++;
    }
  const perSession = scale === "session" ? SESSION_TARGET[profile.goal] : 1;
  return [
    {
      key: "volume",
      label: "Sets",
      value: sets,
      target: Math.round(SET_TARGET[profile.level] / perSession),
      unit: "sets",
      color: RING_COLOR.volume,
    },
    {
      key: "sessions",
      label: "Workouts",
      value: scale === "session" ? 1 : workouts.length,
      target: scale === "session" ? 1 : SESSION_TARGET[profile.goal],
      unit: scale === "session" ? "done" : "this week",
      color: RING_COLOR.sessions,
    },
    {
      key: "cardio",
      label: "Cardio",
      value: Math.round(cardioSec / 60),
      target: Math.round(CARDIO_TARGET[profile.goal] / perSession),
      unit: "min",
      color: RING_COLOR.cardio,
    },
  ];
}

export function thisWeek(history: WorkoutWithSets[]): WorkoutWithSets[] {
  const start = weekStart().getTime();
  return history.filter((w) => new Date(w.started_at).getTime() >= start);
}

/** Mon..Sun → did I train that day (for the week strip). */
export function weekDays(history: WorkoutWithSets[]): { label: string; date: Date; trained: boolean; today: boolean }[] {
  const start = weekStart();
  const days = new Set(history.map((w) => new Date(w.started_at).toDateString()));
  const today = new Date().toDateString();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return {
      label: d.toLocaleDateString(undefined, { weekday: "narrow" }),
      date: d,
      trained: days.has(d.toDateString()),
      today: d.toDateString() === today,
    };
  });
}
