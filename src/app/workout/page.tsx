"use client";

import { requireProfile } from "@/components/RequireProfile";
import {
  ArrowLeftRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  ListOrdered,
  Minus,
  Pause,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ExerciseDemo, ExerciseDetail } from "@/components/ExerciseDetail";
import { ExerciseList, ExerciseRow } from "@/components/ExerciseList";
import { Button, Card, Sheet, Spinner, Stat } from "@/components/ui";
import { bestSet, lastPerformance } from "@/lib/analytics";
import { useExercises } from "@/lib/exercises";
import { buildItem, candidatesFor } from "@/lib/generator";
import { MUSCLE_LABEL } from "@/lib/muscles";
import { useData, useHistory, useWorkout } from "@/lib/store";
import type { LoggedSet, WorkoutItem } from "@/lib/types";
import { cn, e1rm, fmtDuration, targetText, uid } from "@/lib/util";

/* ---------- small helpers ---------- */

function useNow(intervalMs = 500) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const get = () =>
      navigator.wakeLock
        .request("screen")
        .then((l) => (lock = l))
        .catch(() => {});
    get();
    const vis = () => document.visibilityState === "visible" && get();
    document.addEventListener("visibilitychange", vis);
    return () => {
      document.removeEventListener("visibilitychange", vis);
      lock?.release().catch(() => {});
    };
  }, [on]);
}

function alertDone() {
  navigator.vibrate?.([200, 100, 200]);
  try {
    const ctx = new AudioContext();
    [0, 0.25].forEach((at) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.25, ctx.currentTime + at);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + at);
      o.stop(ctx.currentTime + at + 0.22);
    });
  } catch {}
}

function Stepper({
  value,
  onChange,
  step,
  min = 0,
  format,
  inputMode = "decimal",
  disabled,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  step: number;
  min?: number;
  format?: (v: number) => string;
  inputMode?: "decimal" | "numeric";
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className={cn("flex h-12 items-center rounded-xl border border-line bg-card2", disabled && "opacity-60")}>
      <button
        className="flex h-full w-9 items-center justify-center text-muted active:text-ink"
        onClick={() => onChange(Math.max(min, +((value ?? 0) - step).toFixed(2)))}
        disabled={disabled}
        aria-label="Decrease"
      >
        <Minus size={16} />
      </button>
      {format && !editing ? (
        <button className="min-w-0 flex-1 text-center text-lg font-semibold tabular-nums" onClick={() => setEditing(true)} disabled={disabled}>
          {value == null ? "—" : format(value)}
        </button>
      ) : (
        <input
          type="number"
          inputMode={inputMode}
          autoFocus={editing}
          onBlur={() => setEditing(false)}
          value={value ?? ""}
          placeholder="—"
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === "" ? null : +e.target.value)}
          onFocus={(e) => e.target.select()}
          className="w-full min-w-0 flex-1 bg-transparent text-center text-lg font-semibold tabular-nums outline-none"
        />
      )}
      <button
        className="flex h-full w-9 items-center justify-center text-muted active:text-ink"
        onClick={() => onChange(+((value ?? 0) + step).toFixed(2))}
        disabled={disabled}
        aria-label="Increase"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

/* ---------- rest timer bar ---------- */

function RestBar() {
  const rest = useWorkout((s) => s.rest);
  const extend = useWorkout((s) => s.extendRest);
  const stop = useWorkout((s) => s.stopRest);
  const now = useNow(250);
  const fired = useRef<number | null>(null);
  const left = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0;

  useEffect(() => {
    if (rest && left === 0 && fired.current !== rest.endsAt) {
      fired.current = rest.endsAt;
      alertDone();
      const t = setTimeout(stop, 1500);
      return () => clearTimeout(t);
    }
  }, [rest, left, stop]);

  if (!rest) return null;
  const pct = 100 * (1 - left / rest.total);
  return (
    <div className="fixed inset-x-0 bottom-[68px] z-30 mx-auto max-w-lg px-3 pb-safe">
      <div className="overflow-hidden rounded-2xl border border-line bg-card2 shadow-2xl shadow-black/60">
        <div className="h-1 bg-accent transition-all" style={{ width: `${pct}%` }} />
        <div className="flex items-center gap-2 p-2.5">
          <div className="flex-1 pl-2">
            <div className="text-xs text-muted">{left === 0 ? "Go!" : "Rest"}</div>
            <div className="text-2xl font-bold tabular-nums">{fmtDuration(left)}</div>
          </div>
          <Button size="sm" onClick={() => extend(-15)}>−15s</Button>
          <Button size="sm" onClick={() => extend(15)}>+15s</Button>
          <Button size="sm" variant="primary" onClick={stop}>Skip</Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- one set row ---------- */

function SetRow({
  item,
  set,
  index,
  units,
  onDone,
}: {
  item: WorkoutItem;
  set: LoggedSet;
  index: number;
  units: string;
  onDone: () => void;
}) {
  const update = useWorkout((s) => s.updateSet);
  const remove = useWorkout((s) => s.removeSet);
  const patch = (p: Partial<LoggedSet>) => update(item.uid, set.uid, p);
  const now = useNow(250);
  const [timerEnd, setTimerEnd] = useState<number | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const weightStep = units === "kg" ? 2.5 : 5;
  const showWeight = item.mode === "reps" || set.weight != null;
  const timeLeft = timerEnd ? Math.max(0, Math.ceil((timerEnd - now) / 1000)) : null;

  useEffect(() => () => clearTimeout(timeout.current ?? undefined), []);

  function toggleTimer() {
    clearTimeout(timeout.current ?? undefined);
    if (timerEnd) return setTimerEnd(null);
    const ms = (set.durationSec ?? 30) * 1000;
    setTimerEnd(Date.now() + ms);
    timeout.current = setTimeout(() => {
      setTimerEnd(null);
      alertDone();
      patch({ done: true, doneAt: new Date().toISOString() });
      onDone();
    }, ms);
  }

  function toggle() {
    if (set.done) return patch({ done: false, doneAt: null });
    patch({ done: true, doneAt: new Date().toISOString() });
    onDone();
  }

  return (
    <div className={cn("flex items-center gap-2 rounded-xl p-1.5 transition", set.done && "bg-accent/10")}>
      <button
        onClick={() => !set.done && remove(item.uid, set.uid)}
        className="w-6 shrink-0 text-center text-sm font-semibold text-muted"
        title="Tap to remove this set"
      >
        {index + 1}
      </button>
      {item.mode === "reps" ? (
        <>
          <div className="min-w-0 flex-[1.2]">
            <Stepper value={set.weight} onChange={(v) => patch({ weight: v })} step={weightStep} disabled={set.done} />
          </div>
          <div className="min-w-0 flex-1">
            <Stepper value={set.reps} onChange={(v) => patch({ reps: v == null ? null : Math.round(v) })} step={1} inputMode="numeric" disabled={set.done} />
          </div>
        </>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <Stepper
              value={timeLeft ?? set.durationSec}
              onChange={(v) => patch({ durationSec: v == null ? null : Math.round(v) })}
              step={15}
              format={(v) => fmtDuration(v)}
              disabled={set.done || timerEnd != null}
            />
          </div>
          {showWeight && (
            <div className="w-24">
              <Stepper value={set.weight} onChange={(v) => patch({ weight: v })} step={weightStep} disabled={set.done} />
            </div>
          )}
          {!set.done && (
            <button
              onClick={toggleTimer}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-card2"
              aria-label={timerEnd ? "Pause timer" : "Start timer"}
            >
              {timerEnd ? <Pause size={20} /> : <Play size={20} />}
            </button>
          )}
        </>
      )}
      <button
        onClick={toggle}
        className={cn(
          "flex h-12 w-14 shrink-0 items-center justify-center rounded-xl border transition active:scale-95",
          set.done ? "border-accent bg-accent text-accent-ink" : "border-line bg-card2 text-muted",
        )}
        aria-label={set.done ? "Undo set" : "Complete set"}
      >
        <Check size={24} strokeWidth={3} />
      </button>
    </div>
  );
}

/* ---------- page ---------- */

function WorkoutPage() {
  const router = useRouter();
  const db = useExercises();
  const history = useHistory();
  const profile = useData((s) => s.profile)!;
  const syncPending = useData((s) => s.syncPending);
  const w = useWorkout();
  const now = useNow(1000);
  const [showDemo, setShowDemo] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  useWakeLock(!!w.active);

  const active = w.active;
  const item = active?.items[active.current];
  const ex = item && db?.byId.get(item.exerciseId);

  const summary = useMemo(() => {
    if (!active || !db) return null;
    let sets = 0;
    let volume = 0;
    const prs: string[] = [];
    for (const it of active.items) {
      const done = it.sets.filter((s) => s.done);
      sets += done.length;
      done.forEach((s) => (volume += (s.weight ?? 0) * (s.reps ?? 0)));
      const prev = bestSet(history, it.exerciseId);
      const top = Math.max(0, ...done.map((s) => (s.weight && s.reps ? e1rm(s.weight, s.reps) : 0)));
      if (top > 0 && (!prev || top > prev.e1rm + 0.01)) prs.push(db.byId.get(it.exerciseId)?.name ?? it.exerciseId);
    }
    // On the very first workout everything would be a "PR", so don't show any
    return { sets, volume, prs: history.length ? prs : [] };
  }, [active, db, history]);

  if (!db) return <Spinner />;

  if (!active) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-2xl bg-card2 p-4 text-accent">
          <Sparkles size={32} />
        </div>
        <h1 className="text-xl font-bold">No workout running</h1>
        <p className="max-w-xs text-sm text-muted">Get a plan built around your goal and recovery, or log freestyle.</p>
        <Link href="/plan" className="w-full max-w-xs">
          <Button variant="primary" size="lg" className="w-full">Build a workout</Button>
        </Link>
        <Button
          className="w-full max-w-xs"
          onClick={() =>
            w.start({ id: uid(), title: "Freestyle", focus: "freestyle", startedAt: new Date().toISOString(), items: [], current: 0 })
          }
        >
          Start empty workout
        </Button>
      </div>
    );
  }

  const elapsed = Math.floor((now - new Date(active.startedAt).getTime()) / 1000);
  const last = item ? lastPerformance(history, item.exerciseId) : null;
  const go = (i: number) => {
    w.setCurrent(Math.max(0, Math.min(active.items.length - 1, i)));
    setShowDemo(false);
    window.scrollTo({ top: 0 });
  };

  function onSetDone(it: WorkoutItem, setUid: string) {
    const remaining = it.sets.filter((s) => !s.done && s.uid !== setUid).length;
    const isLastItem = active!.current >= active!.items.length - 1;
    if (remaining === 0) {
      // Exercise finished → rest, and move on to the next one
      if (!isLastItem) {
        if (it.section === "main" && it.target.restSec > 0) w.startRest(it.target.restSec);
        setTimeout(() => go(active!.current + 1), 400);
      }
    } else if (it.target.restSec > 0) {
      w.startRest(it.target.restSec);
    }
  }

  async function save() {
    const done = w.finish();
    setFinishOpen(false);
    if (done) await syncPending();
    router.push("/history");
  }

  const doneItems = (it: WorkoutItem) => it.sets.length > 0 && it.sets.every((s) => s.done);

  return (
    <div className="space-y-3">
      {/* top bar */}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-bold">{active.title}</div>
          <div className="text-xs tabular-nums text-muted">
            {fmtDuration(elapsed)} · {active.items.filter(doneItems).length}/{active.items.length} exercises
          </div>
        </div>
        <Button size="sm" onClick={() => setListOpen(true)} aria-label="All exercises">
          <ListOrdered size={18} />
        </Button>
        <Button size="sm" variant="primary" onClick={() => setFinishOpen(true)}>
          Finish
        </Button>
      </div>

      {/* progress dots */}
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {active.items.map((it, i) => (
          <button
            key={it.uid}
            onClick={() => go(i)}
            className={cn(
              "h-2 min-w-6 flex-1 rounded-full",
              i === active.current ? "bg-ink" : doneItems(it) ? "bg-accent" : "bg-line",
            )}
            aria-label={`Exercise ${i + 1}`}
          />
        ))}
      </div>

      {!item || !ex ? (
        <Card className="py-10 text-center">
          <p className="mb-4 text-muted">Add your first exercise.</p>
          <Button variant="primary" onClick={() => setAddOpen(true)}>
            <Plus size={18} /> Add exercise
          </Button>
        </Card>
      ) : (
        <Card className="space-y-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-accent">
              {item.section === "warmup" ? "Warm-up" : item.section === "cooldown" ? "Cool-down" : `Exercise ${active.items.filter((x) => x.section === "main").indexOf(item) + 1}`}
            </div>
            <button onClick={() => setDetail(ex.id)} className="text-left text-xl font-bold leading-tight">
              {ex.name}
            </button>
            <div className="mt-0.5 text-xs text-muted">
              {ex.primary.map((m) => MUSCLE_LABEL[m]).join(", ")} · {ex.equipment}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-lg bg-card2 px-2.5 py-1">
              Target: <b>{targetText(item)}</b>
            </span>
            {item.mode === "reps" && item.target.restSec > 0 && (
              <span className="rounded-lg bg-card2 px-2.5 py-1">Rest {item.target.restSec}s</span>
            )}
          </div>

          {item.note && <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">{item.note}</p>}
          {last && item.section === "main" && (
            <p className="text-xs text-muted">
              Last time:{" "}
              {last.sets
                .map((s) => (s.duration_sec != null ? fmtDuration(s.duration_sec) : `${s.weight ?? 0}×${s.reps ?? 0}`))
                .join(" · ")}
            </p>
          )}

          {showDemo ? (
            <button onClick={() => setShowDemo(false)} className="block w-full">
              <ExerciseDemo images={ex.images} />
            </button>
          ) : null}

          <div className="space-y-1.5">
            <div className="flex gap-2 px-1.5 text-[11px] uppercase tracking-wide text-muted">
              <span className="w-6 text-center">Set</span>
              {item.mode === "reps" ? (
                <>
                  <span className="flex-[1.2] text-center">{profile.units}</span>
                  <span className="flex-1 text-center">Reps</span>
                </>
              ) : (
                <span className="flex-1 text-center">Time</span>
              )}
              <span className="w-14" />
            </div>
            {item.sets.map((s, i) => (
              <SetRow key={s.uid} item={item} set={s} index={i} units={profile.units} onDone={() => onSetDone(item, s.uid)} />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button size="sm" onClick={() => w.addSet(item.uid)}>
              <Plus size={16} /> Set
            </Button>
            <Button size="sm" onClick={() => setSwapOpen(true)}>
              <ArrowLeftRight size={16} /> Swap
            </Button>
            <Button size="sm" onClick={() => setShowDemo((v) => !v)}>
              <ImageIcon size={16} /> {showDemo ? "Hide" : "Demo"}
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button size="lg" onClick={() => go(active.current - 1)} disabled={active.current === 0}>
          <ChevronLeft /> Prev
        </Button>
        {active.current < active.items.length - 1 ? (
          <Button size="lg" onClick={() => go(active.current + 1)}>
            Next <ChevronRight />
          </Button>
        ) : (
          <Button size="lg" variant="primary" onClick={() => setFinishOpen(true)}>
            Finish
          </Button>
        )}
      </div>
      <button onClick={() => setAddOpen(true)} className="w-full py-2 text-sm text-accent">
        + Add exercise
      </button>

      <RestBar />

      {/* all exercises */}
      <Sheet open={listOpen} onClose={() => setListOpen(false)} title="Exercises">
        {active.items.map((it, i) => {
          const e = db.byId.get(it.exerciseId);
          return (
            <div key={it.uid} className="flex items-center gap-2 border-b border-line py-2 last:border-0">
              <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => (go(i), setListOpen(false))}>
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", doneItems(it) ? "bg-accent text-accent-ink" : i === active.current ? "bg-ink text-bg" : "bg-card2 text-muted")}>
                  {doneItems(it) ? <Check size={14} /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate">{e?.name}</span>
                  <span className="text-xs text-muted">{targetText(it)}</span>
                </span>
              </button>
              <button onClick={() => w.removeItem(it.uid)} className="p-2 text-muted" aria-label="Remove">
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </Sheet>

      {/* swap */}
      <Sheet open={swapOpen} onClose={() => setSwapOpen(false)} title="Swap exercise">
        {item && ex && (
          <>
            <p className="mb-1 text-sm text-muted">Machine busy? Alternatives for {MUSCLE_LABEL[ex.primary[0]]}:</p>
            {candidatesFor(ex.primary[0], db, profile.level)
              .filter((c) => c.ex.id !== ex.id)
              .map(({ ex: alt }) => (
                <ExerciseRow
                  key={alt.id}
                  ex={alt}
                  onClick={() => {
                    w.replaceItem(item.uid, buildItem(alt, profile, history, item.section));
                    setSwapOpen(false);
                  }}
                />
              ))}
          </>
        )}
      </Sheet>

      {/* add */}
      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Add exercise">
        <ExerciseList
          db={db}
          onPick={(e) => {
            w.addItem(buildItem(e, profile, history, "main"));
            setAddOpen(false);
          }}
        />
      </Sheet>

      {/* finish */}
      <Sheet open={finishOpen} onClose={() => setFinishOpen(false)} title="Finish workout">
        {summary && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Time" value={fmtDuration(elapsed)} />
              <Stat label="Sets" value={summary.sets} />
              <Stat label={`Volume (${profile.units})`} value={Math.round(summary.volume).toLocaleString()} />
            </div>
            {summary.prs.length > 0 && (
              <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm">
                <div className="mb-1 flex items-center gap-2 font-semibold text-amber-200">
                  <Trophy size={16} /> New personal bests
                </div>
                <div className="text-amber-100/80">{summary.prs.join(", ")}</div>
              </div>
            )}
            {summary.sets === 0 ? (
              <>
                <p className="text-sm text-muted">No sets ticked off yet, so there&apos;s nothing to save.</p>
                <Button
                  variant="danger"
                  className="w-full"
                  onClick={() => {
                    w.discard();
                    setFinishOpen(false);
                  }}
                >
                  Discard workout
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted">Only ticked sets are saved. Saved to this phone first, then synced.</p>
                <Button variant="primary" size="lg" className="w-full" onClick={save}>
                  Save workout
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    if (confirm("Throw away this workout?")) {
                      w.discard();
                      setFinishOpen(false);
                    }
                  }}
                >
                  Discard
                </Button>
              </>
            )}
          </div>
        )}
      </Sheet>
      <ExerciseDetail exerciseId={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

export default requireProfile(WorkoutPage);
