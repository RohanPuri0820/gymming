import { fatigueByMuscle, lastPerformance, neglectScores } from "./analytics";
import type { ExerciseDb } from "./exercises";
import { MUSCLE_LABEL } from "./muscles";
import {
  CARDIO,
  STRENGTH_STAPLES,
  STRETCHES,
  TIME_BASED,
  WARMUP_MOVES,
  type Staple,
} from "./staples";
import type {
  ActiveWorkout,
  Exercise,
  Goal,
  Level,
  LoggedSet,
  MuscleId,
  Profile,
  Section,
  Target,
  WorkoutItem,
  WorkoutWithSets,
} from "./types";
import { uid } from "./util";

type Slot = { m: MuscleId; mech?: "compound" | "isolation"; pool?: string[] };

const REAR_DELTS = ["Reverse_Machine_Flyes", "Cable_Rear_Delt_Fly", "Face_Pull", "Reverse_Flyes"];
const SIDE_DELTS = ["Cable_Seated_Lateral_Raise", "Seated_Side_Lateral_Raise", "Side_Lateral_Raise"];

export type FocusId =
  | "full"
  | "upper"
  | "lower"
  | "push"
  | "pull"
  | "chest_triceps"
  | "back_biceps"
  | "shoulders_arms"
  | "core"
  | "custom";

export const FOCI: { id: FocusId; label: string; region: "upper" | "lower" | "full"; slots: Slot[] }[] = [
  {
    id: "full",
    label: "Full body",
    region: "full",
    slots: [
      { m: "quadriceps", mech: "compound" },
      { m: "chest", mech: "compound" },
      { m: "lats", mech: "compound" },
      { m: "hamstrings" },
      { m: "shoulders", mech: "compound" },
      { m: "middle back", mech: "compound" },
      { m: "glutes" },
      { m: "abdominals" },
    ],
  },
  {
    id: "upper",
    label: "Upper body",
    region: "upper",
    slots: [
      { m: "chest", mech: "compound" },
      { m: "lats", mech: "compound" },
      { m: "shoulders", mech: "compound" },
      { m: "middle back", mech: "compound" },
      { m: "shoulders", pool: SIDE_DELTS },
      { m: "biceps" },
      { m: "triceps" },
      { m: "chest", mech: "isolation" },
    ],
  },
  {
    id: "lower",
    label: "Lower body",
    region: "lower",
    slots: [
      { m: "quadriceps", mech: "compound" },
      { m: "hamstrings" },
      { m: "glutes" },
      { m: "quadriceps", mech: "isolation" },
      { m: "calves" },
      { m: "abductors" },
      { m: "adductors" },
      { m: "abdominals" },
    ],
  },
  {
    id: "push",
    label: "Push (chest, shoulders, triceps)",
    region: "upper",
    slots: [
      { m: "chest", mech: "compound" },
      { m: "shoulders", mech: "compound" },
      { m: "chest", mech: "compound" },
      { m: "shoulders", pool: SIDE_DELTS },
      { m: "triceps" },
      { m: "chest", mech: "isolation" },
      { m: "triceps" },
      { m: "abdominals" },
    ],
  },
  {
    id: "pull",
    label: "Pull (back, biceps)",
    region: "upper",
    slots: [
      { m: "lats", mech: "compound" },
      { m: "middle back", mech: "compound" },
      { m: "shoulders", pool: REAR_DELTS },
      { m: "biceps" },
      { m: "lats" },
      { m: "traps" },
      { m: "biceps" },
      { m: "lower back" },
    ],
  },
  {
    id: "chest_triceps",
    label: "Chest & triceps",
    region: "upper",
    slots: [
      { m: "chest", mech: "compound" },
      { m: "chest", mech: "compound" },
      { m: "triceps" },
      { m: "chest", mech: "isolation" },
      { m: "triceps" },
      { m: "shoulders", pool: SIDE_DELTS },
      { m: "abdominals" },
    ],
  },
  {
    id: "back_biceps",
    label: "Back & biceps",
    region: "upper",
    slots: [
      { m: "lats", mech: "compound" },
      { m: "middle back", mech: "compound" },
      { m: "biceps" },
      { m: "lats" },
      { m: "biceps" },
      { m: "shoulders", pool: REAR_DELTS },
      { m: "lower back" },
      { m: "forearms" },
    ],
  },
  {
    id: "shoulders_arms",
    label: "Shoulders & arms",
    region: "upper",
    slots: [
      { m: "shoulders", mech: "compound" },
      { m: "shoulders", pool: SIDE_DELTS },
      { m: "biceps" },
      { m: "triceps" },
      { m: "shoulders", pool: REAR_DELTS },
      { m: "biceps" },
      { m: "triceps" },
      { m: "forearms" },
    ],
  },
  {
    id: "core",
    label: "Core & stability",
    region: "full",
    slots: [
      { m: "abdominals" },
      { m: "glutes" },
      { m: "abdominals" },
      { m: "lower back" },
      { m: "abdominals" },
      { m: "abductors" },
      { m: "abdominals" },
    ],
  },
];

export const GOALS: { id: Goal; label: string; blurb: string }[] = [
  { id: "general", label: "General fitness", blurb: "Balanced strength + a little cardio" },
  { id: "weight_loss", label: "Weight loss", blurb: "Higher reps, short rests, cardio finisher" },
  { id: "muscle", label: "Build muscle", blurb: "Moderate reps, more sets" },
  { id: "strength", label: "Strength", blurb: "Heavy, low reps, long rests" },
  { id: "mobility", label: "Mobility & stability", blurb: "Controlled reps, more stretching" },
];

export const LEVELS: { id: Level; label: string; blurb: string }[] = [
  { id: "beginner", label: "Beginner", blurb: "New, returning, or under ~6 months of steady training" },
  { id: "intermediate", label: "Intermediate", blurb: "6 months – 2 years, comfortable with free weights" },
  { id: "expert", label: "Advanced", blurb: "2+ years, confident with barbell lifts" },
];

// Higher = more likely to be picked
const TIER_WEIGHT: Record<Level, Record<1 | 2 | 3, number>> = {
  beginner: { 1: 4, 2: 1, 3: 0 },
  intermediate: { 1: 1.5, 2: 2, 3: 1 },
  expert: { 1: 1, 2: 1.5, 3: 2 },
};

export function prescription(
  goal: Goal,
  level: Level,
  ex: Exercise,
  mode: "reps" | "time",
): Target {
  const compound = ex.mechanic === "compound";
  if (mode === "time") {
    const hold = level === "beginner" ? 30 : level === "intermediate" ? 45 : 60;
    return { sets: 3, repMin: 0, repMax: 0, durationSec: hold, restSec: 45 };
  }
  const base = (sets: number, repMin: number, repMax: number, restSec: number): Target => ({
    sets: level === "beginner" ? Math.min(sets, 3) : sets,
    repMin,
    repMax,
    durationSec: 0,
    restSec,
  });
  switch (goal) {
    case "weight_loss":
      return base(3, 12, 15, compound ? 60 : 45);
    case "muscle":
      return compound ? base(4, 8, 10, 120) : base(3, 10, 15, 75);
    case "strength":
      return compound ? base(5, 4, 6, 180) : base(3, 8, 10, 90);
    case "mobility":
      return base(3, 12, 15, 60);
    default:
      return compound ? base(3, 8, 12, 90) : base(3, 10, 12, 60);
  }
}

function emptySets(n: number, weights: (number | null)[], reps: number | null, dur: number | null): LoggedSet[] {
  return Array.from({ length: n }, (_, i) => ({
    uid: uid(),
    weight: weights[i] ?? weights[weights.length - 1] ?? null,
    reps,
    durationSec: dur,
    done: false,
    doneAt: null,
  }));
}

const LOWER = new Set<MuscleId>(["quadriceps", "hamstrings", "glutes", "calves", "adductors", "abductors"]);

/** Builds a workout item, prefilled from last time with a progressive-overload suggestion. */
export function buildItem(
  ex: Exercise,
  profile: Profile,
  history: WorkoutWithSets[],
  section: Section = "main",
  override?: Partial<Target>,
): WorkoutItem {
  const mode = TIME_BASED.has(ex.id) ? "time" : "reps";
  const target = { ...prescription(profile.goal, profile.level, ex, mode), ...override };
  const last = lastPerformance(history, ex.id);
  let note: string | null = null;
  let weights: (number | null)[] = [null];
  let reps: number | null = mode === "reps" ? target.repMax : null;

  if (section === "main" && mode === "reps" && last) {
    const lastWeights = last.sets.map((s) => s.weight);
    const topWeight = Math.max(0, ...lastWeights.map((w) => w ?? 0));
    const hitTop = last.sets.length >= 1 && last.sets.every((s) => (s.reps ?? 0) >= target.repMax);
    if (topWeight > 0 && hitTop) {
      const kg = profile.units === "kg";
      const bigLower = ex.mechanic === "compound" && ex.primary.some((m) => LOWER.has(m));
      const inc = bigLower ? (kg ? 5 : 10) : kg ? 2.5 : 5;
      weights = [topWeight + inc];
      reps = target.repMin;
      note = `You hit ${target.repMax} reps on every set last time. Try ${topWeight + inc} ${profile.units}.`;
    } else if (topWeight > 0) {
      weights = lastWeights;
      reps = last.sets[0]?.reps ?? target.repMin;
      note = `Same weight as last time. Aim for ${target.repMax} reps on every set, then go heavier.`;
    } else {
      reps = last.sets[0]?.reps ?? target.repMax;
    }
  } else if (section === "main" && mode === "reps" && ex.equipment !== "body only") {
    note = `First time: pick a weight where you could do 2–3 more reps after ${target.repMax}.`;
  }

  return {
    uid: uid(),
    exerciseId: ex.id,
    section,
    mode,
    target,
    note,
    sets: emptySets(target.sets, weights, reps, mode === "time" ? target.durationSec : null),
  };
}

function familyKey(ex: Exercise): string {
  const words = ["Pulldown", "Row", "Press", "Curl", "Fly", "Flye", "Butterfly", "Crossover", "Raise", "Squat",
    "Lunge", "Extension", "Pushdown", "Shrug", "Bridge", "Thrust", "Kickback", "Push-Up", "Pushups", "Crunch", "Twist"];
  const fam = words.find((w) => ex.id.includes(w)) ?? ex.id;
  return `${ex.primary[0]}:${fam}:${ex.id.includes("Incline") ? "inc" : ""}`;
}

function weightedPick<T>(items: { item: T; w: number }[], rand: () => number): T | null {
  const total = items.reduce((t, i) => t + i.w, 0);
  if (total <= 0) return null;
  let r = rand() * total;
  for (const i of items) {
    r -= i.w;
    if (r <= 0) return i.item;
  }
  return items[items.length - 1].item;
}

/** Candidate exercises that could fill a slot, best first. Also used for "swap". */
export function candidatesFor(
  muscle: MuscleId,
  db: ExerciseDb,
  level: Level,
  opts: { mech?: "compound" | "isolation"; pool?: string[] } = {},
): { ex: Exercise; staple: Staple }[] {
  const staples = opts.pool
    ? STRENGTH_STAPLES.filter((s) => opts.pool!.includes(s.id))
    : STRENGTH_STAPLES;
  const all = staples
    .map((s) => ({ staple: s, ex: db.byId.get(s.id)! }))
    .filter((c) => c.ex && c.ex.primary[0] === muscle && TIER_WEIGHT[level][c.staple.tier] > 0);
  const withMech = opts.mech ? all.filter((c) => c.ex.mechanic === opts.mech) : all;
  return (withMech.length ? withMech : all).sort(
    (a, b) => TIER_WEIGHT[level][b.staple.tier] - TIER_WEIGHT[level][a.staple.tier],
  );
}

const FINISHER_MIN: Record<Goal, number> = { general: 8, weight_loss: 12, muscle: 0, strength: 0, mobility: 0 };

export type Plan = { workout: ActiveWorkout; warnings: string[] };

export function generateWorkout(args: {
  focus: FocusId;
  customMuscles?: MuscleId[];
  minutes: number;
  profile: Profile;
  history: WorkoutWithSets[];
  db: ExerciseDb;
  seed?: number;
}): Plan {
  const { focus, profile, history, db, minutes } = args;
  let s = args.seed ?? Date.now();
  const rand = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const def = FOCI.find((f) => f.id === focus);
  const fatigue = fatigueByMuscle(history, db);
  const warnings: string[] = [];

  let slots: Slot[];
  if (focus === "custom") {
    const ms = args.customMuscles?.length ? args.customMuscles : (["chest", "lats", "quadriceps"] as MuscleId[]);
    // Compound for each chosen muscle first, then an isolation pass
    slots = [
      ...ms.map((m) => ({ m, mech: "compound" as const })),
      ...ms.map((m) => ({ m, mech: "isolation" as const })),
    ];
  } else {
    slots = def!.slots;
  }
  const region = def?.region ?? "full";

  // Time budget → number of main exercises
  const finisher = FINISHER_MIN[profile.goal];
  const warmupMin = 7;
  const cooldownMin = profile.goal === "mobility" ? 8 : 4;
  const mainMin = Math.max(10, minutes - warmupMin - cooldownMin - finisher);
  // Average of a compound and an isolation exercise: ~35s per set + rest, plus 1 min setup
  const comp = prescription(profile.goal, profile.level, { mechanic: "compound" } as Exercise, "reps");
  const iso = prescription(profile.goal, profile.level, { mechanic: "isolation" } as Exercise, "reps");
  const perExercise = ((comp.sets + iso.sets) / 2) * (35 + (comp.restSec + iso.restSec) / 2) / 60 + 1;
  const count = Math.max(3, Math.min(slots.length, Math.floor(mainMin / perExercise)));

  // Exercises done in the last 4 weeks get a boost; repeating them is what lets you progress.
  const recent = new Set<string>();
  const cutoff = Date.now() - 28 * 86_400_000;
  history.forEach((w) => {
    if (new Date(w.started_at).getTime() > cutoff) w.sets.forEach((x) => recent.add(x.exercise_id));
  });

  const heavyGoal = (profile.goal === "strength" || profile.goal === "muscle") && profile.level !== "beginner";
  const chosen: Exercise[] = [];
  const families = new Set<string>();
  for (const slot of slots) {
    if (chosen.length >= count) break;
    const cands = candidatesFor(slot.m, db, profile.level, slot).filter(
      (c) => !chosen.some((x) => x.id === c.ex.id) && !families.has(familyKey(c.ex)),
    );
    const pick = weightedPick(
      cands.map((c) => ({
        item: c.ex,
        w:
          TIER_WEIGHT[profile.level][c.staple.tier] *
          (recent.has(c.ex.id) ? 4 : 1) *
          // Bodyweight moves are too light for heavy goals once you're past beginner
          (heavyGoal && c.ex.equipment === "body only" ? 0.15 : 1),
      })),
      rand,
    );
    if (!pick) continue;
    chosen.push(pick);
    families.add(familyKey(pick));
  }

  const tired = [...new Set(chosen.map((e) => e.primary[0]))].filter((m) => (fatigue[m] ?? 0) > 0.6);
  if (tired.length)
    warnings.push(
      `${tired.map((m) => MUSCLE_LABEL[m]).join(", ")} still recovering from a recent session. Go a little lighter or pick another focus.`,
    );

  const items: WorkoutItem[] = [];
  const get = (id: string) => db.byId.get(id)!;

  // Warm-up: 5 min easy cardio + 2 mobility moves for today's region
  items.push(buildItem(get(CARDIO.warmup[Math.floor(rand() * 2)]), profile, history, "warmup", { sets: 1, durationSec: 300 }));
  const moves = [...WARMUP_MOVES[region]].sort(() => rand() - 0.5).slice(0, 2);
  moves.forEach((id) =>
    items.push(buildItem(get(id), profile, history, "warmup", { sets: 1, durationSec: 30, repMin: 8, repMax: 10, restSec: 15 })),
  );

  chosen.forEach((ex) => items.push(buildItem(ex, profile, history, "main")));

  if (finisher > 0) {
    const id = CARDIO.finisher[Math.floor(rand() * CARDIO.finisher.length)];
    items.push(buildItem(get(id), profile, history, "main", { sets: 1, durationSec: finisher * 60, restSec: 0 }));
  }

  // Cool-down: stretch the muscles that worked hardest
  const targetMuscles = [...new Set(chosen.flatMap((e) => e.primary))];
  const stretchIds = [...new Set(
    targetMuscles.map((m) => STRETCHES.find((st) => st.muscle === m)?.id).filter(Boolean) as string[],
  )].slice(0, profile.goal === "mobility" ? 6 : 4);
  const holdSec = profile.goal === "mobility" ? 45 : 30;
  stretchIds.forEach((id) =>
    items.push(
      buildItem(get(id), profile, history, "cooldown", {
        sets: profile.goal === "mobility" ? 2 : 1,
        durationSec: holdSec,
        restSec: 10,
      }),
    ),
  );

  const title =
    focus === "custom"
      ? `Custom: ${(args.customMuscles ?? []).map((m) => MUSCLE_LABEL[m]).join(", ")}`
      : def!.label.replace(/ \(.*\)/, "");

  return {
    workout: {
      id: uid(),
      title,
      focus,
      startedAt: new Date().toISOString(),
      items,
      current: 0,
    },
    warnings,
  };
}

/** Recommends today's focus: the split whose muscles are freshest and most overdue. */
export function suggestFocus(history: WorkoutWithSets[], db: ExerciseDb): { focus: FocusId; reason: string } {
  if (!history.length) return { focus: "full", reason: "A full-body session is the best place to start." };
  const fatigue = fatigueByMuscle(history, db);
  const neglect = neglectScores(history, db);
  const options: FocusId[] = ["full", "upper", "lower", "push", "pull"];
  let best = { focus: "full" as FocusId, score: -1 };
  for (const id of options) {
    const muscles = [...new Set(FOCI.find((f) => f.id === id)!.slots.map((sl) => sl.m))];
    const score =
      muscles.reduce((t, m) => t + (1 - (fatigue[m] ?? 0)) + 0.6 * (neglect[m] ?? 0), 0) / muscles.length;
    if (score > best.score) best = { focus: id, score };
  }
  const label = FOCI.find((f) => f.id === best.focus)!.label.replace(/ \(.*\)/, "");
  return { focus: best.focus, reason: `${label} muscles are the most recovered and most overdue.` };
}
