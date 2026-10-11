export type MuscleId =
  | "abdominals"
  | "abductors"
  | "adductors"
  | "biceps"
  | "calves"
  | "chest"
  | "forearms"
  | "glutes"
  | "hamstrings"
  | "lats"
  | "lower back"
  | "middle back"
  | "neck"
  | "quadriceps"
  | "shoulders"
  | "traps"
  | "triceps";

export type Level = "beginner" | "intermediate" | "expert";

export type Exercise = {
  id: string;
  name: string;
  level: Level;
  mechanic: "compound" | "isolation" | null;
  equipment: string;
  category: string;
  force: string | null;
  primary: MuscleId[];
  secondary: MuscleId[];
  instructions: string[];
  images: string[];
};

export type Goal = "general" | "weight_loss" | "muscle" | "strength" | "mobility";
export type Units = "kg" | "lb";

export type Profile = {
  id: string;
  display_name: string | null;
  goal: Goal;
  level: Level;
  units: Units;
  session_minutes: number;
};

export type Section = "warmup" | "main" | "cooldown";
export type Mode = "reps" | "time";

export type Target = {
  sets: number;
  repMin: number;
  repMax: number;
  durationSec: number; // used when mode === "time"
  restSec: number;
};

export type LoggedSet = {
  uid: string;
  weight: number | null;
  reps: number | null;
  durationSec: number | null;
  done: boolean;
  doneAt: string | null;
};

export type WorkoutItem = {
  uid: string;
  exerciseId: string;
  section: Section;
  mode: Mode;
  target: Target;
  note: string | null; // e.g. progression hint
  sets: LoggedSet[];
};

export type ActiveWorkout = {
  id: string;
  title: string;
  focus: string;
  startedAt: string;
  items: WorkoutItem[];
  current: number;
};

// Shape stored in Supabase (and in the offline pending queue)
export type SetRow = {
  id: string;
  workout_id: string;
  exercise_id: string;
  section: Section;
  item_order: number;
  set_number: number;
  weight: number | null;
  reps: number | null;
  duration_sec: number | null;
  completed_at: string;
};

export type WorkoutRow = {
  id: string;
  title: string;
  focus: string;
  started_at: string;
  ended_at: string;
  notes: string | null;
};

export type WorkoutWithSets = WorkoutRow & { sets: SetRow[] };

export type BodyWeightRow = {
  id: string;
  measured_on: string;
  weight: number;
};
