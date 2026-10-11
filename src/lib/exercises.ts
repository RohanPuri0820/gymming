"use client";

import { useEffect, useState } from "react";
import type { Exercise } from "./types";

export type ExerciseDb = { list: Exercise[]; byId: Map<string, Exercise> };

let cache: ExerciseDb | null = null;
let pending: Promise<ExerciseDb> | null = null;

export function loadExercises(): Promise<ExerciseDb> {
  if (cache) return Promise.resolve(cache);
  pending ??= fetch("/exercises.json")
    .then((r) => r.json() as Promise<Exercise[]>)
    .then((list) => {
      list.sort((a, b) => a.name.localeCompare(b.name));
      cache = { list, byId: new Map(list.map((e) => [e.id, e])) };
      return cache;
    })
    .catch((err) => {
      pending = null;
      throw err;
    });
  return pending;
}

/** Timestamp captured once per mount, safe to use during render. */
export function useMountTime(): number {
  const [now] = useState(() => Date.now());
  return now;
}

export function useExercises(): ExerciseDb | null {
  const [db, setDb] = useState<ExerciseDb | null>(cache);
  useEffect(() => {
    if (!db) loadExercises().then(setDb).catch(console.error);
  }, [db]);
  return db;
}
