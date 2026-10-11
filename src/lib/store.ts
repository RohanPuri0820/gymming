"use client";

import type { Session } from "@supabase/supabase-js";
import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "./supabase";
import type {
  ActiveWorkout,
  BodyWeightRow,
  LoggedSet,
  Profile,
  SetRow,
  WorkoutItem,
  WorkoutWithSets,
} from "./types";
import { uid } from "./util";

/* ---------- Active workout + offline queue (persisted to localStorage) ---------- */

type Rest = { endsAt: number; total: number } | null;

type WorkoutState = {
  active: ActiveWorkout | null;
  pending: WorkoutWithSets[];
  rest: Rest;
  start: (w: ActiveWorkout) => void;
  discard: () => void;
  setCurrent: (i: number) => void;
  updateSet: (itemUid: string, setUid: string, patch: Partial<LoggedSet>) => void;
  addSet: (itemUid: string) => void;
  removeSet: (itemUid: string, setUid: string) => void;
  replaceItem: (itemUid: string, item: WorkoutItem) => void;
  addItem: (item: WorkoutItem) => void;
  removeItem: (itemUid: string) => void;
  startRest: (sec: number) => void;
  extendRest: (sec: number) => void;
  stopRest: () => void;
  finish: () => WorkoutWithSets | null;
  markSynced: (id: string) => void;
};

function mapItem(w: ActiveWorkout, itemUid: string, fn: (it: WorkoutItem) => WorkoutItem): ActiveWorkout {
  return { ...w, items: w.items.map((it) => (it.uid === itemUid ? fn(it) : it)) };
}

export const useWorkout = create<WorkoutState>()(
  persist(
    (set, get) => ({
      active: null,
      pending: [],
      rest: null,
      start: (w) => set({ active: w, rest: null }),
      discard: () => set({ active: null, rest: null }),
      setCurrent: (i) => set((s) => (s.active ? { active: { ...s.active, current: i } } : s)),
      updateSet: (itemUid, setUid, patch) =>
        set((s) =>
          s.active
            ? {
                active: mapItem(s.active, itemUid, (it) => ({
                  ...it,
                  sets: it.sets.map((x) => (x.uid === setUid ? { ...x, ...patch } : x)),
                })),
              }
            : s,
        ),
      addSet: (itemUid) =>
        set((s) =>
          s.active
            ? {
                active: mapItem(s.active, itemUid, (it) => {
                  const last = it.sets[it.sets.length - 1];
                  return {
                    ...it,
                    sets: [
                      ...it.sets,
                      {
                        uid: uid(),
                        weight: last?.weight ?? null,
                        reps: last?.reps ?? (it.mode === "reps" ? it.target.repMax : null),
                        durationSec: last?.durationSec ?? (it.mode === "time" ? it.target.durationSec : null),
                        done: false,
                        doneAt: null,
                      },
                    ],
                  };
                }),
              }
            : s,
        ),
      removeSet: (itemUid, setUid) =>
        set((s) =>
          s.active
            ? { active: mapItem(s.active, itemUid, (it) => ({ ...it, sets: it.sets.filter((x) => x.uid !== setUid) })) }
            : s,
        ),
      replaceItem: (itemUid, item) => set((s) => (s.active ? { active: mapItem(s.active, itemUid, () => item) } : s)),
      addItem: (item) =>
        set((s) => {
          if (!s.active) return s;
          // New exercises go before the cool-down
          const items = [...s.active.items];
          const firstCool = items.findIndex((i) => i.section === "cooldown");
          const at = firstCool === -1 ? items.length : firstCool;
          items.splice(at, 0, item);
          return { active: { ...s.active, items, current: at } };
        }),
      removeItem: (itemUid) =>
        set((s) => {
          if (!s.active) return s;
          const items = s.active.items.filter((i) => i.uid !== itemUid);
          return { active: { ...s.active, items, current: Math.min(s.active.current, Math.max(0, items.length - 1)) } };
        }),
      startRest: (sec) => set({ rest: sec > 0 ? { endsAt: Date.now() + sec * 1000, total: sec } : null }),
      extendRest: (sec) =>
        set((s) => (s.rest ? { rest: { endsAt: s.rest.endsAt + sec * 1000, total: s.rest.total + sec } } : s)),
      stopRest: () => set({ rest: null }),
      finish: () => {
        const w = get().active;
        if (!w) return null;
        const sets: SetRow[] = [];
        w.items.forEach((it, order) => {
          it.sets
            .filter((x) => x.done)
            .forEach((x, n) =>
              sets.push({
                id: uid(),
                workout_id: w.id,
                exercise_id: it.exerciseId,
                section: it.section,
                item_order: order,
                set_number: n + 1,
                weight: x.weight,
                reps: it.mode === "reps" ? x.reps : null,
                duration_sec: it.mode === "time" ? x.durationSec : null,
                completed_at: x.doneAt ?? new Date().toISOString(),
              }),
            );
        });
        const done: WorkoutWithSets = {
          id: w.id,
          title: w.title,
          focus: w.focus,
          started_at: w.startedAt,
          ended_at: new Date().toISOString(),
          notes: null,
          sets,
        };
        set((s) => ({ active: null, rest: null, pending: sets.length ? [...s.pending, done] : s.pending }));
        return done;
      },
      markSynced: (id) => set((s) => ({ pending: s.pending.filter((p) => p.id !== id) })),
    }),
    { name: "gym-workout" },
  ),
);

/* ---------- Server data (session, profile, history) ---------- */

type DataState = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  profileLoaded: boolean;
  history: WorkoutWithSets[];
  bodyWeights: BodyWeightRow[];
  setSession: (s: Session | null) => void;
  loadAll: () => Promise<void>;
  saveProfile: (p: Omit<Profile, "id">) => Promise<string | null>;
  syncPending: () => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  logBodyWeight: (date: string, weight: number) => Promise<string | null>;
  deleteBodyWeight: (id: string) => Promise<void>;
};

export const useData = create<DataState>()((set, get) => ({
  ready: false,
  session: null,
  profile: null,
  profileLoaded: false,
  history: [],
  bodyWeights: [],
  setSession: (session) => {
    const changed = session?.user.id !== get().session?.user.id;
    set({ session, ready: true });
    if (!session) set({ profile: null, profileLoaded: false, history: [], bodyWeights: [] });
    else if (changed) get().loadAll();
  },
  loadAll: async () => {
    const user = get().session?.user;
    if (!user) return;
    const [p, h, bw] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("workouts")
        .select("*, sets:workout_sets(*)")
        .order("started_at", { ascending: false })
        .limit(400),
      supabase.from("body_weights").select("id, measured_on, weight").order("measured_on", { ascending: false }).limit(365),
    ]);
    set({
      profile: (p.data as Profile) ?? null,
      profileLoaded: !p.error,
      history: ((h.data as WorkoutWithSets[]) ?? []).map((w) => ({
        ...w,
        sets: w.sets.map((s) => ({ ...s, weight: s.weight == null ? null : Number(s.weight) })),
      })),
      bodyWeights: ((bw.data as BodyWeightRow[]) ?? []).map((r) => ({ ...r, weight: Number(r.weight) })),
    });
    if (p.error) console.error(p.error);
    get().syncPending();
  },
  saveProfile: async (p) => {
    const user = get().session?.user;
    if (!user) return "Not signed in";
    const row = { ...p, id: user.id, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("profiles").upsert(row).select().single();
    if (error) return error.message;
    set({ profile: data as Profile, profileLoaded: true });
    return null;
  },
  syncPending: async () => {
    if (!get().session) return;
    for (const w of useWorkout.getState().pending) {
      const { sets, ...workout } = w;
      const a = await supabase.from("workouts").upsert(workout);
      if (a.error) {
        console.warn("Sync failed, will retry", a.error.message);
        return;
      }
      if (sets.length) {
        const b = await supabase.from("workout_sets").upsert(sets);
        if (b.error) {
          console.warn("Sync failed, will retry", b.error.message);
          return;
        }
      }
      useWorkout.getState().markSynced(w.id);
      set((s) => ({
        history: [w, ...s.history.filter((x) => x.id !== w.id)].sort((x, y) =>
          y.started_at.localeCompare(x.started_at),
        ),
      }));
    }
  },
  deleteWorkout: async (id) => {
    useWorkout.getState().markSynced(id);
    set((s) => ({ history: s.history.filter((w) => w.id !== id) }));
    await supabase.from("workouts").delete().eq("id", id);
  },
  logBodyWeight: async (date, weight) => {
    const { data, error } = await supabase
      .from("body_weights")
      .upsert({ measured_on: date, weight }, { onConflict: "user_id,measured_on" })
      .select("id, measured_on, weight")
      .single();
    if (error) return error.message;
    const row = { ...(data as BodyWeightRow), weight: Number(data.weight) };
    set((s) => ({
      bodyWeights: [row, ...s.bodyWeights.filter((b) => b.measured_on !== date)].sort((a, b) =>
        b.measured_on.localeCompare(a.measured_on),
      ),
    }));
    return null;
  },
  deleteBodyWeight: async (id) => {
    set((s) => ({ bodyWeights: s.bodyWeights.filter((b) => b.id !== id) }));
    await supabase.from("body_weights").delete().eq("id", id);
  },
}));

/** History including workouts that haven't synced yet (so offline sessions still count). */
export function useHistory(): WorkoutWithSets[] {
  const history = useData((s) => s.history);
  const pending = useWorkout((s) => s.pending);
  return useMemo(() => {
    if (!pending.length) return history;
    const ids = new Set(history.map((w) => w.id));
    return [...pending.filter((p) => !ids.has(p.id)), ...history].sort((a, b) =>
      b.started_at.localeCompare(a.started_at),
    );
  }, [history, pending]);
}

// Dev-only handle for automated UI checks
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__gym = { useData, useWorkout };
}
