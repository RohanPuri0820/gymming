"use client";

import { requireProfile } from "@/components/RequireProfile";
import { AlertTriangle, ArrowLeftRight, ChevronLeft, Crosshair, Play, Plus, Shuffle, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BodyMap } from "@/components/body/BodyMap";
import { ExerciseDetail } from "@/components/ExerciseDetail";
import { ExerciseList, ExerciseRow } from "@/components/ExerciseList";
import { Button, Card, Chip, SectionHeader, Segmented, Sheet, Spinner, Stat } from "@/components/ui";
import { planScores } from "@/lib/analytics";
import { useExercises } from "@/lib/exercises";
import { buildItem, candidatesFor, FOCI, generateWorkout, suggestFocus, type FocusId, type Plan } from "@/lib/generator";
import { MUSCLE_LABEL } from "@/lib/muscles";
import { useData, useHistory, useWorkout } from "@/lib/store";
import type { MuscleId, Section, WorkoutItem } from "@/lib/types";
import { IMAGE_BASE, targetText } from "@/lib/util";

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
  const mainItems = items.filter((i) => i.section === "main");
  const estMin = Math.round(
    items.reduce(
      (t, it) =>
        t +
        (it.mode === "time"
          ? (it.sets.length * (it.target.durationSec + it.target.restSec)) / 60
          : (it.sets.length * (35 + it.target.restSec)) / 60 + 1),
      0,
    ),
  );
  const targets = Object.entries(scores)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 3)
    .map(([m]) => MUSCLE_LABEL[m as MuscleId]);
  let n = 0;

  return (
    <div className="space-y-5 pb-24">
      <header className="flex items-center gap-3 pt-1">
        <button onClick={() => router.back()} className="rounded-full bg-white/[0.06] p-2 text-muted" aria-label="Back">
          <ChevronLeft size={20} />
        </button>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Plan</p>
          <h1 className="text-2xl font-bold leading-tight">Build your workout</h1>
        </div>
      </header>

      <section>
        <SectionHeader title="Focus" />
        <div className="flex flex-wrap gap-2">
          {FOCI.map((f) => (
            <Chip key={f.id} active={focus === f.id} onClick={() => setFocus(f.id)}>
              {suggestion?.focus === f.id && <Sparkles size={13} className="-ml-0.5 mr-1 inline" />}
              {f.label.replace(/ \(.*\)/, "")}
            </Chip>
          ))}
          <Chip active={focus === "custom"} onClick={() => setFocus("custom")}>
            <Crosshair size={13} className="-ml-0.5 mr-1 inline" />
            Pick muscles
          </Chip>
        </div>
      </section>

      <section>
        <SectionHeader title="Time" />
        <Segmented
          value={String(minutes)}
          onChange={(v) => setMinutes(+v)}
          options={[30, 45, 60, 75, 90].map((m) => ({ id: String(m), label: `${m}′` }))}
        />
      </section>

      <section>
        <BodyMap
          className="h-[340px]"
          scores={scores}
          palette="heat"
          legend={["Light", "Main target"]}
          highlighted={focus === "custom" ? custom : []}
          onSelect={toggleMuscle}
          overlay={
            targets.length > 0 && (
              <div className="pointer-events-none absolute left-3 top-3 flex max-w-[60%] flex-wrap gap-1.5">
                {targets.map((t) => (
                  <span key={t} className="glass rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold">
                    {t}
                  </span>
                ))}
              </div>
            )
          }
        />
        <p className="mt-2 text-center text-xs text-muted">
          {focus === "custom"
            ? custom.length
              ? "Tap a muscle again to remove it"
              : "Tap the muscles you want to train"
            : "Tap muscles to build your own instead"}
        </p>
      </section>

      {plan && (
        <div className="grid grid-cols-3 gap-2.5">
          <Stat label="Exercises" value={mainItems.length} />
          <Stat label="Sets" value={mainItems.reduce((t, i) => t + i.sets.length, 0)} />
          <Stat label="Minutes" value={`~${estMin}`} />
        </div>
      )}

      {plan?.warnings.map((w) => (
        <div key={w} className="flex gap-2.5 rounded-2xl border border-amber-400/25 bg-amber-400/[0.08] p-3.5 text-sm text-amber-100/90">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-300" />
          {w}
        </div>
      ))}

      {plan &&
        sections.map((sec) => {
          const list = items.filter((i) => i.section === sec);
          if (!list.length) return null;
          return (
            <section key={sec}>
              <SectionHeader
                title={SECTION_LABEL[sec]}
                action={
                  sec === "main" && (
                    <button onClick={() => setSeed(Date.now())} className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                      <Shuffle size={14} /> Shuffle
                    </button>
                  )
                }
              />
              <Card className="p-1.5">
                <AnimatePresence initial={false}>
                  {list.map((it) => {
                    const ex = db.byId.get(it.exerciseId)!;
                    const num = sec === "main" ? ++n : null;
                    return (
                      <motion.div
                        key={it.uid}
                        layout
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-white/[0.03]"
                      >
                        <button onClick={() => setDetail(ex.id)} className="relative shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={IMAGE_BASE + ex.images[0]} alt="" loading="lazy" className="h-14 w-14 rounded-xl bg-white object-cover" />
                          {num && (
                            <span className="num absolute -left-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-ink ring-2 ring-[#0f1116]">
                              {num}
                            </span>
                          )}
                        </button>
                        <button className="min-w-0 flex-1 text-left" onClick={() => setDetail(ex.id)}>
                          <div className="truncate font-semibold">{ex.name}</div>
                          <div className="mt-0.5 text-xs text-muted">
                            {targetText(it)}
                            {it.mode === "reps" && ` · ${it.target.restSec}s rest`}
                          </div>
                          {it.note && sec === "main" && (
                            <div className="mt-1 line-clamp-1 text-[11px] font-medium text-accent/90">{it.note}</div>
                          )}
                        </button>
                        {sec === "main" && (
                          <button onClick={() => setSwap(it)} className="rounded-full bg-white/[0.05] p-2 text-muted" aria-label="Swap">
                            <ArrowLeftRight size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => setItems((xs) => xs.filter((x) => x.uid !== it.uid))}
                          className="rounded-full p-2 text-muted/70"
                          aria-label="Remove"
                        >
                          <X size={16} />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {sec === "main" && (
                  <button
                    onClick={() => setAdding(true)}
                    className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/10 py-3 text-sm font-semibold text-accent"
                  >
                    <Plus size={16} /> Add exercise
                  </button>
                )}
              </Card>
            </section>
          );
        })}

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg px-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="glass flex items-center gap-3 rounded-[26px] border border-white/10 p-2 pl-5 shadow-[0_20px_50px_-20px_rgb(0_0_0/0.9)]">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{plan?.workout.title ?? "Pick muscles"}</div>
            <div className="text-xs text-muted">{plan ? `${mainItems.length} exercises · ~${estMin} min` : "Tap the body to choose"}</div>
          </div>
          <Button variant="primary" size="lg" className="rounded-[20px] px-7" onClick={begin} disabled={!plan}>
            <Play size={18} fill="currentColor" /> Start
          </Button>
        </div>
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
