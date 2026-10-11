"use client";

import { requireProfile } from "@/components/RequireProfile";
import { AlertTriangle, ArrowLeftRight, Info, Shuffle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BodyMap } from "@/components/body/BodyMap";
import { ExerciseDetail } from "@/components/ExerciseDetail";
import { ExerciseList, ExerciseRow } from "@/components/ExerciseList";
import { Button, Card, Chip, Sheet, Spinner } from "@/components/ui";
import { planScores } from "@/lib/analytics";
import { useExercises } from "@/lib/exercises";
import { buildItem, candidatesFor, FOCI, generateWorkout, suggestFocus, type FocusId, type Plan } from "@/lib/generator";
import { MUSCLE_LABEL } from "@/lib/muscles";
import { useData, useHistory, useWorkout } from "@/lib/store";
import type { MuscleId, Section, WorkoutItem } from "@/lib/types";
import { targetText } from "@/lib/util";

const SECTION_LABEL: Record<Section, string> = { warmup: "Warm-up", main: "Workout", cooldown: "Cool-down stretches" };

function PlanPage() {
  const router = useRouter();
  const db = useExercises();
  const history = useHistory();
  const profile = useData((s) => s.profile)!;
  const active = useWorkout((s) => s.active);
  const start = useWorkout((s) => s.start);

  // Focus can be preselected from the home screen via ?focus= (pages only render in the browser)
  const [chosenFocus, setFocus] = useState<FocusId | null>(() => {
    if (typeof window === "undefined") return null;
    const q = new URLSearchParams(window.location.search).get("focus") as FocusId | null;
    return q && FOCI.some((f) => f.id === q) ? q : null;
  });
  const [custom, setCustom] = useState<MuscleId[]>([]);
  const [minutes, setMinutes] = useState(profile.session_minutes);
  const [seed, setSeed] = useState(() => Date.now());
  // Manual swaps/removals, tied to the generated plan they were made on
  const [edited, setEdited] = useState<{ base: Plan; plan: Plan } | null>(null);
  const [swap, setSwap] = useState<WorkoutItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);

  const suggestion = useMemo(() => (db ? suggestFocus(history, db) : null), [db, history]);
  const focus = chosenFocus ?? suggestion?.focus ?? null;

  const generated = useMemo(() => {
    if (!db || !focus || (focus === "custom" && custom.length === 0)) return null;
    return generateWorkout({ focus, customMuscles: custom, minutes, profile, history, db, seed });
  }, [db, focus, custom, minutes, profile, history, seed]);
  const plan = edited && edited.base === generated ? edited.plan : generated;

  if (!db || !focus) return <Spinner />;

  const items = plan?.workout.items ?? [];
  const scores = planScores(items, db);
  const setItems = (fn: (items: WorkoutItem[]) => WorkoutItem[]) => {
    if (!plan || !generated) return;
    setEdited({ base: generated, plan: { ...plan, workout: { ...plan.workout, items: fn(plan.workout.items) } } });
  };

  function toggleMuscle(m: MuscleId) {
    if (focus !== "custom") setFocus("custom");
    setCustom((c) => (focus !== "custom" ? [m] : c.includes(m) ? c.filter((x) => x !== m) : [...c, m]));
  }

  function begin() {
    if (!plan) return;
    if (active && !confirm("You have a workout in progress. Replace it?")) return;
    start({ ...plan.workout, startedAt: new Date().toISOString() });
    router.push("/workout");
  }

  const sections: Section[] = ["warmup", "main", "cooldown"];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Build a workout</h1>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Focus</h3>
        <div className="flex flex-wrap gap-2">
          {FOCI.map((f) => (
            <Chip key={f.id} active={focus === f.id} onClick={() => setFocus(f.id)}>
              {f.label.replace(/ \(.*\)/, "")}
              {suggestion?.focus === f.id && " ★"}
            </Chip>
          ))}
          <Chip active={focus === "custom"} onClick={() => setFocus("custom")}>
            Pick muscles
          </Chip>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Time</h3>
        <div className="flex gap-2">
          {[30, 45, 60, 75, 90].map((m) => (
            <Chip key={m} active={minutes === m} onClick={() => setMinutes(m)}>
              {m} min
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <BodyMap
          className="h-[380px]"
          scores={scores}
          palette="heat"
          legend={["Light", "Main target"]}
          highlighted={focus === "custom" ? custom : []}
          onSelect={toggleMuscle}
        />
        <p className="mt-2 text-xs text-muted">
          {focus === "custom"
            ? custom.length
              ? `Picked: ${custom.map((m) => MUSCLE_LABEL[m]).join(", ")}. Tap again to remove.`
              : "Tap the muscles you want to train."
            : "What today's plan hits. Tap muscles to build your own instead."}
        </p>
      </div>

      {plan?.warnings.map((w) => (
        <div key={w} className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          <AlertTriangle size={18} className="shrink-0" />
          {w}
        </div>
      ))}

      {plan && (
        <div className="space-y-4">
          {sections.map((sec) => {
            const list = items.filter((i) => i.section === sec);
            if (!list.length) return null;
            return (
              <Card key={sec} className="p-0">
                <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                  <h3 className="text-sm font-semibold">{SECTION_LABEL[sec]}</h3>
                  {sec === "main" && (
                    <button onClick={() => setSeed(Date.now())} className="flex items-center gap-1 text-xs text-accent">
                      <Shuffle size={14} /> Shuffle
                    </button>
                  )}
                </div>
                <div className="px-4">
                  {list.map((it) => {
                    const ex = db.byId.get(it.exerciseId)!;
                    return (
                      <div key={it.uid} className="border-b border-line py-2.5 last:border-0">
                        <div className="flex items-center gap-2">
                          <button className="min-w-0 flex-1 text-left" onClick={() => setDetail(ex.id)}>
                            <div className="truncate font-medium">{ex.name}</div>
                            <div className="text-xs text-muted">
                              {targetText(it)}
                              {it.mode === "reps" && ` · rest ${it.target.restSec}s`}
                            </div>
                          </button>
                          <button onClick={() => setDetail(ex.id)} className="p-2 text-muted" aria-label="Info">
                            <Info size={18} />
                          </button>
                          {sec === "main" && (
                            <button onClick={() => setSwap(it)} className="p-2 text-muted" aria-label="Swap">
                              <ArrowLeftRight size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => setItems((xs) => xs.filter((x) => x.uid !== it.uid))}
                            className="p-2 text-muted"
                            aria-label="Remove"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        {it.note && <p className="mt-1 text-xs text-accent/80">{it.note}</p>}
                      </div>
                    );
                  })}
                </div>
                {sec === "main" && (
                  <button onClick={() => setAdding(true)} className="w-full border-t border-line py-3 text-sm text-accent">
                    + Add exercise
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <div className="sticky bottom-24 z-10">
        <Button variant="primary" size="lg" className="w-full shadow-xl shadow-black/50" onClick={begin} disabled={!plan}>
          Start workout
        </Button>
      </div>

      <Sheet open={!!swap} onClose={() => setSwap(null)} title="Swap exercise">
        {swap && (
          <div>
            <p className="mb-2 text-sm text-muted">Alternatives for {MUSCLE_LABEL[db.byId.get(swap.exerciseId)!.primary[0]]}</p>
            {candidatesFor(db.byId.get(swap.exerciseId)!.primary[0], db, profile.level)
              .filter((c) => c.ex.id !== swap.exerciseId)
              .map(({ ex }) => (
                <ExerciseRow
                  key={ex.id}
                  ex={ex}
                  onClick={() => {
                    const next = buildItem(ex, profile, history, "main");
                    setItems((xs) => xs.map((x) => (x.uid === swap.uid ? next : x)));
                    setSwap(null);
                  }}
                />
              ))}
          </div>
        )}
      </Sheet>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add exercise">
        <ExerciseList
          db={db}
          onPick={(ex) => {
            const it = buildItem(ex, profile, history, "main");
            setItems((xs) => {
              const at = xs.findIndex((x) => x.section === "cooldown");
              const out = [...xs];
              out.splice(at === -1 ? out.length : at, 0, it);
              return out;
            });
            setAdding(false);
          }}
        />
      </Sheet>
      <ExerciseDetail exerciseId={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

export default requireProfile(PlanPage);
