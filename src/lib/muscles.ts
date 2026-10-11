import type { MuscleId } from "./types";

export const MUSCLES: { id: MuscleId; label: string; side: "front" | "back" }[] = [
  { id: "chest", label: "Chest", side: "front" },
  { id: "shoulders", label: "Shoulders", side: "front" },
  { id: "biceps", label: "Biceps", side: "front" },
  { id: "forearms", label: "Forearms", side: "front" },
  { id: "abdominals", label: "Abs & Core", side: "front" },
  { id: "quadriceps", label: "Quads", side: "front" },
  { id: "adductors", label: "Adductors (inner thigh)", side: "front" },
  { id: "abductors", label: "Abductors (outer hip)", side: "front" },
  { id: "neck", label: "Neck", side: "front" },
  { id: "traps", label: "Traps", side: "back" },
  { id: "lats", label: "Lats", side: "back" },
  { id: "middle back", label: "Middle back", side: "back" },
  { id: "lower back", label: "Lower back", side: "back" },
  { id: "triceps", label: "Triceps", side: "back" },
  { id: "glutes", label: "Glutes", side: "back" },
  { id: "hamstrings", label: "Hamstrings", side: "back" },
  { id: "calves", label: "Calves", side: "back" },
];

export const MUSCLE_LABEL = Object.fromEntries(
  MUSCLES.map((m) => [m.id, m.label]),
) as Record<MuscleId, string>;

export type MuscleScores = Partial<Record<MuscleId, number>>;
