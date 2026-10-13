"use client";

import { requireProfile } from "@/components/RequireProfile";
import {
  ArrowLeftRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  ListOrdered,
  Minus,
  Pause,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Trophy,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BodyMap } from "@/components/body/BodyMap";
import { ExerciseDemo, ExerciseDetail } from "@/components/ExerciseDetail";
import { ExerciseList, ExerciseRow } from "@/components/ExerciseList";
import { CountUp, Rings } from "@/components/Rings";
import { Button, Card, haptic, SectionHeader, Sheet, Spinner, Stat } from "@/components/ui";
import { bestSet, lastPerformance, planScores } from "@/lib/analytics";
import { useExercises } from "@/lib/exercises";
import { buildItem, candidatesFor } from "@/lib/generator";
import { MUSCLE_LABEL, type MuscleScores } from "@/lib/muscles";
import { computeRings, RING_COLOR, type Ring } from "@/lib/rings";
import { useData, useHistory, useWorkout } from "@/lib/store";
import type { LoggedSet, WorkoutItem } from "@/lib/types";
import { cn, e1rm, fmtDuration, IMAGE_BASE, targetText, uid } from "@/lib/util";

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
  const bump = (d: number) => {
    haptic(6);
    onChange(Math.max(min, +((value ?? 0) + d).toFixed(2)));
  };
  return (
    <div
      className={cn(
        "flex h-14 items-center rounded-2xl border transition",
        disabled ? "border-transparent bg-transparent" : "border-white/[0.07] bg-white/[0.05]",
      )}
    >
      {!disabled && (
        <button className="flex h-full w-9 items-center justify-center text-muted active:text-ink" onClick={() => bump(-step)} aria-label="Decrease">
          <Minus size={16} />
        </button>
      )}
      {format && !editing ? (
        <button className="num min-w-0 flex-1 text-center text-[28px] font-semibold" onClick={() => setEditing(true)} disabled={disabled}>
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
          className="num w-full min-w-0 flex-1 bg-transparent text-center text-[28px] font-semibold outline-none placeholder:text-muted/50"
        />
      )}
      {!disabled && (
        <button className="flex h-full w-9 items-center justify-center text-muted active:text-ink" onClick={() => bump(step)} aria-label="Increase">
          <Plus size={16} />
        </button>
      )}
    </div>
  );
}

/* ---------- rest timer: a shrinking ring ---------- */

function RestPanel({ next }: { next: string | null }) {
  const rest = useWorkout((s) => s.rest);
  const extend = useWorkout((s) => s.extendRest);
  const stop = useWorkout((s) => s.stopRest);
  const now = useNow(200);
  const fired = useRef<number | null>(null);
  const leftMs = rest ? Math.max(0, rest.endsAt - now) : 0;
  const left = Math.ceil(leftMs / 1000);

  useEffect(() => {
    if (rest && left === 0 && fired.current !== rest.endsAt) {
      fired.current = rest.endsAt;
      alertDone();
      const t = setTimeout(stop, 1500);
      return () => clearTimeout(t);
    }
  }, [rest, left, stop]);

  const size = 112;
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const frac = rest ? leftMs / (rest.total * 1000) : 0;

  return (
    <AnimatePresence>
      {rest && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="fixed inset-x-0 bottom-[92px] z-40 mx-auto max-w-lg px-3"
        >
          <div className="flex items-center gap-4 rounded-[28px] border border-ring-cardio/25 bg-[#10131a] p-3 pr-4 shadow-[0_0_50px_-15px_rgb(62_230_255/0.5),0_20px_50px_-10px_rgb(0_0_0/0.9)]">
            <div className="relative shrink-0">
              <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#3ee6ff" strokeOpacity={0.15} strokeWidth={10} />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke="#3ee6ff"
                  strokeWidth={10}
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - frac)}
                  style={{ transition: "stroke-dashoffset 0.2s linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="num text-[34px] font-semibold">{left === 0 ? "GO" : fmtDuration(left)}</span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ring-cardio">Rest</div>
              {next && <div className="mt-0.5 line-clamp-2 text-sm text-ink/80">Next: {next}</div>}
              <div className="mt-2.5 flex gap-2">
                <Button size="sm" onClick={() => extend(-15)}>−15</Button>
                <Button size="sm" onClick={() => extend(15)}>+15</Button>
                <Button size="sm" variant="primary" className="flex-1" onClick={stop}>
                  Skip
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- one set row ---------- */

function SetRow({
  item,
  set,
  index,
  units,
  isNext,
  onDone,
}: {
  item: WorkoutItem;
  set: LoggedSet;
  index: number;
  units: string;
  isNext: boolean;
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

  function complete() {
    haptic([18, 40, 18]);
    patch({ done: true, doneAt: new Date().toISOString() });
    onDone();
  }

  function toggleTimer() {
    clearTimeout(timeout.current ?? undefined);
    if (timerEnd) return setTimerEnd(null);
    const ms = (set.durationSec ?? 30) * 1000;
    setTimerEnd(Date.now() + ms);
    timeout.current = setTimeout(() => {
      setTimerEnd(null);
      alertDone();
      complete();
    }, ms);
  }

  function toggle() {
    if (set.done) return patch({ done: false, doneAt: null });
    complete();
  }

  return (
    <motion.div
      layout
      className={cn(
        "flex items-center gap-2 rounded-2xl p-1.5 transition-colors",
        set.done ? "bg-accent/[0.09]" : isNext ? "bg-white/[0.03] ring-1 ring-white/10" : "",
      )}
    >
      <button
        onClick={() => !set.done && remove(item.uid, set.uid)}
        className={cn("num w-7 shrink-0 text-center text-xl font-semibold", set.done ? "text-accent" : "text-muted")}
        title="Tap to remove this set"
      >
        {index + 1}
      </button>
      {item.mode === "reps" ? (
        <>
          <div className="min-w-0 flex-[1.15]">
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
              className={cn(
                "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border transition",
                timerEnd ? "border-ring-cardio/50 bg-ring-cardio/15 text-ring-cardio" : "border-white/[0.07] bg-white/[0.05]",
              )}
              aria-label={timerEnd ? "Pause timer" : "Start timer"}
            >
              {timerEnd ? <Pause size={22} /> : <Play size={22} fill="currentColor" />}
            </button>
          )}
        </>
      )}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={toggle}
        className={cn(
          "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border transition-colors",
          set.done ? "glow-accent border-accent bg-accent text-accent-ink" : "border-white/[0.07] bg-white/[0.05] text-muted",
        )}
        aria-label={set.done ? "Undo set" : "Complete set"}
      >
        <motion.span key={String(set.done)} initial={{ scale: set.done ? 0.3 : 1, rotate: set.done ? -30 : 0 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 600, damping: 18 }}>
          <Check size={26} strokeWidth={3.2} />
        </motion.span>
      </motion.button>
    </motion.div>
  );
}

/* ---------- finish celebration ---------- */

type Celebration = {
  title: string;
  elapsed: number;
  sets: number;
  volume: number;
  prs: string[];
  rings: Ring[];
  scores: MuscleScores;
};

// Deterministic scatter (0..1) so the burst looks random but renders purely
const jitter = (i: number, k: number) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const CONFETTI = Array.from({ length: 36 }, (_, i) => ({
  a: (i / 36) * Math.PI * 2 + jitter(i, 1) * 0.3,
  d: 120 + jitter(i, 2) * 140,
  c: [RING_COLOR.volume, RING_COLOR.sessions, RING_COLOR.cardio, "#ffd166"][i % 4],
  r: jitter(i, 3) * 360,
}));

function Confetti() {
  const bits = CONFETTI;
  return (
    <div className="pointer-events-none absolute left-1/2 top-40">
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute h-2.5 w-1.5 rounded-sm"
          style={{ background: b.c }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: Math.cos(b.a) * b.d, y: Math.sin(b.a) * b.d + 120, opacity: 0, rotate: b.r }}
          transition={{ duration: 1.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </div>
  );
}

function FinishScreen({ c, units, onDone }: { c: Celebration; units: string; onDone: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative space-y-5 overflow-x-clip pb-10 pt-4 text-center">
      {c.prs.length > 0 && <Confetti />}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Workout complete</p>
        <h1 className="mt-1 text-3xl font-bold">{c.title}</h1>
      </div>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="flex justify-center"
      >
        <Rings rings={c.rings} size={210} stroke={20} gap={5} delay={0.2} />
      </motion.div>
      <div className="flex justify-center gap-5">
        {c.rings.map((r) => (
          <div key={r.key}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: r.color }}>
              {r.label}
            </div>
            <div className="num text-2xl font-semibold">
              {r.value}
              <span className="text-base text-muted">/{r.target}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2.5 text-left">
        <Stat label="Time" value={fmtDuration(c.elapsed)} />
        <Stat label="Sets" value={<CountUp value={c.sets} />} />
        <Stat label={`Volume`} value={<CountUp value={Math.round(c.volume)} />} sub={units} />
      </div>
      {c.prs.length > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="rounded-3xl border border-amber-300/30 bg-[linear-gradient(135deg,rgb(255_209_102/0.18),transparent)] p-4 text-left"
        >
          <div className="flex items-center gap-2 font-bold text-amber-200">
            <Trophy size={18} /> {c.prs.length === 1 ? "New personal best!" : `${c.prs.length} new personal bests!`}
          </div>
          <div className="mt-1 text-sm text-amber-50/80">{c.prs.join(" · ")}</div>
        </motion.div>
      )}
      <div className="text-left">
        <SectionHeader title="Muscles worked" />
        <BodyMap className="h-[320px]" scores={c.scores} palette="heat" legend={["Light", "Hard"]} autoRotate />
      </div>
      <Button variant="primary" size="lg" className="w-full" onClick={onDone}>
        Done
      </Button>
    </motion.div>
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
  const [celebration, setCelebration] = useState<Celebration | null>(null);
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

  if (celebration)
    return <FinishScreen c={celebration} units={profile.units} onDone={() => router.push("/history")} />;

  if (!active) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-5 text-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-accent/30 blur-2xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-accent text-accent-ink">
            <Sparkles size={34} />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold">Ready when you are</h1>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted">Get a plan built around your goal and recovery, or log freestyle.</p>
        </div>
        <Link href="/plan" className="w-full max-w-xs">
          <Button variant="primary" size="lg" className="w-full">
            Build a workout
          </Button>
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
  const nextItem = active.items[active.current + 1];
  const nextEx = nextItem && db.byId.get(nextItem.exerciseId);
  const go = (i: number) => {
    w.setCurrent(Math.max(0, Math.min(active.items.length - 1, i)));
    setShowDemo(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  function onSetDone(it: WorkoutItem, setUid: string) {
    const remaining = it.sets.filter((s) => !s.done && s.uid !== setUid).length;
    const isLastItem = active!.current >= active!.items.length - 1;
    if (remaining === 0) {
      // Exercise finished → rest, and move on to the next one
      if (!isLastItem) {
        if (it.section === "main" && it.target.restSec > 0) w.startRest(it.target.restSec);
        setTimeout(() => go(active!.current + 1), 500);
      }
    } else if (it.target.restSec > 0) {
      w.startRest(it.target.restSec);
    }
  }

  async function save() {
    if (!summary || !active) return;
    const scores = planScores(
      active.items.map((it) => ({ ...it, sets: it.sets.filter((s) => s.done) })),
      db!,
    );
    const done = w.finish();
    setFinishOpen(false);
    if (!done) return;
    setCelebration({
      title: done.title,
      elapsed,
      sets: summary.sets,
      volume: summary.volume,
      prs: summary.prs,
      rings: computeRings([done], db!, profile, "session"),
      scores,
    });
    window.scrollTo({ top: 0 });
    syncPending();
  }

  const doneItems = (it: WorkoutItem) => it.sets.length > 0 && it.sets.every((s) => s.done);
  const nextSetIdx = item ? item.sets.findIndex((s) => !s.done) : -1;
  const sectionLabel =
    item?.section === "warmup"
      ? "Warm-up"
      : item?.section === "cooldown"
        ? "Cool-down"
        : `Exercise ${active.items.filter((x) => x.section === "main").indexOf(item!) + 1} of ${active.items.filter((x) => x.section === "main").length}`;
  const restNext =
    item && nextSetIdx >= 0
      ? `set ${nextSetIdx + 1}${item.mode === "reps" ? ` · ${item.sets[nextSetIdx].weight ?? "—"} ${profile.units} × ${item.sets[nextSetIdx].reps ?? "—"}` : ""}`
      : nextEx
        ? nextEx.name
        : null;

  return (
    <div className="space-y-4 pb-28">
      {/* top bar */}
      <div className="flex items-center gap-2">
        <button onClick={() => router.push("/")} className="rounded-full bg-white/[0.06] p-2 text-muted" aria-label="Minimise">
          <ChevronDown size={20} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <div className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-muted">{active.title}</div>
          <div className="num text-[30px] font-semibold text-accent">{fmtDuration(elapsed)}</div>
        </div>
        <button onClick={() => setListOpen(true)} className="rounded-full bg-white/[0.06] p-2 text-muted" aria-label="All exercises">
          <ListOrdered size={20} />
        </button>
        <Button size="sm" variant="primary" className="rounded-full px-4" onClick={() => setFinishOpen(true)}>
          Finish
        </Button>
      </div>

      {/* progress */}
      <div className="flex gap-1">
        {active.items.map((it, i) => (
          <button
            key={it.uid}
            onClick={() => go(i)}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i === active.current ? "bg-ink" : doneItems(it) ? "bg-accent" : "bg-white/10",
            )}
            aria-label={`Exercise ${i + 1}`}
          />
        ))}
      </div>

      {!item || !ex ? (
        <Card className="py-12 text-center">
          <p className="mb-4 text-muted">Add your first exercise.</p>
          <Button variant="primary" onClick={() => setAddOpen(true)}>
            <Plus size={18} /> Add exercise
          </Button>
        </Card>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={item.uid}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            {/* hero */}
            <div className="flex gap-4">
              <button onClick={() => setShowDemo((v) => !v)} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-white" aria-label="Show demo">
                <ExerciseDemo images={ex.images} className="!aspect-square h-full w-full !rounded-2xl" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">{sectionLabel}</div>
                <button onClick={() => setDetail(ex.id)} className="mt-0.5 text-left text-[22px] font-bold leading-[1.15]">
                  {ex.name}
                </button>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {ex.primary.map((m) => (
                    <span key={m} className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[11px] font-medium text-ink/80">
                      {MUSCLE_LABEL[m]}
                    </span>
                  ))}
                  <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[11px] text-muted">{ex.equipment}</span>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {showDemo && (
                <motion.button
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onClick={() => setShowDemo(false)}
                  className="block w-full overflow-hidden"
                >
                  <ExerciseDemo images={ex.images} />
                </motion.button>
              )}
            </AnimatePresence>

            {/* target + coaching */}
            <Card className="space-y-2 p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Target</div>
                  <div className="num text-2xl font-semibold">{targetText(item)}</div>
                </div>
                {item.mode === "reps" && item.target.restSec > 0 && (
                  <div className="text-right">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Rest</div>
                    <div className="num text-2xl font-semibold text-ring-cardio">{item.target.restSec}s</div>
                  </div>
                )}
              </div>
              {item.note && (
                <p className="flex gap-2 rounded-xl bg-accent/[0.08] px-3 py-2 text-[13px] text-accent">
                  <Sparkles size={15} className="mt-0.5 shrink-0" />
                  {item.note}
                </p>
              )}
              {last && item.section === "main" && (
                <p className="px-1 text-xs text-muted">
                  Last time:{" "}
                  <span className="text-ink/80">
                    {last.sets
                      .map((s) => (s.duration_sec != null ? fmtDuration(s.duration_sec) : `${s.weight ?? 0}×${s.reps ?? 0}`))
                      .join("  ·  ")}
                  </span>
                </p>
              )}
            </Card>

            {/* sets */}
            <div className="space-y-1.5">
              <div className="flex gap-2 px-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted">
                <span className="w-7 text-center">Set</span>
                {item.mode === "reps" ? (
                  <>
                    <span className="flex-[1.15] text-center">{ex?.equipment === "body only" ? `+${profile.units}` : profile.units}</span>
                    <span className="flex-1 text-center">Reps</span>
                  </>
                ) : (
                  <span className="flex-1 text-center">Time</span>
                )}
                <span className="w-14" />
              </div>
              {item.sets.map((s, i) => (
                <SetRow
                  key={s.uid}
                  item={item}
                  set={s}
                  index={i}
                  units={profile.units}
                  isNext={i === nextSetIdx}
                  onDone={() => onSetDone(item, s.uid)}
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" onClick={() => w.addSet(item.uid)}>
                <Plus size={16} /> Set
              </Button>
              <Button size="sm" onClick={() => setSwapOpen(true)}>
                <ArrowLeftRight size={16} /> Swap
              </Button>
              <Button size="sm" onClick={() => setDetail(ex.id)}>
                <Info size={16} /> How to
              </Button>
            </div>

            {/* up next */}
            {nextItem && nextEx && (
              <button onClick={() => go(active.current + 1)} className="surface flex w-full items-center gap-3 rounded-3xl p-3 text-left">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={IMAGE_BASE + nextEx.images[0]} alt="" className="h-12 w-12 rounded-xl bg-white object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted">Up next</div>
                  <div className="truncate font-semibold">{nextEx.name}</div>
                  <div className="text-xs text-muted">{targetText(nextItem)}</div>
                </div>
                <ChevronRight className="text-muted" />
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      <button onClick={() => setAddOpen(true)} className="flex w-full items-center justify-center gap-1.5 py-2 text-sm font-semibold text-accent">
        <Plus size={16} /> Add exercise
      </button>

      {/* bottom controls */}
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg px-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="glass flex gap-2 rounded-[26px] border border-white/10 p-2 shadow-[0_20px_50px_-20px_rgb(0_0_0/0.9)]">
          <Button size="lg" className="w-16 rounded-[20px] px-0" onClick={() => go(active.current - 1)} disabled={active.current === 0} aria-label="Previous">
            <ChevronLeft />
          </Button>
          {active.current < active.items.length - 1 ? (
            <Button size="lg" className="flex-1 rounded-[20px]" onClick={() => go(active.current + 1)}>
              Next exercise <ChevronRight size={20} />
            </Button>
          ) : (
            <Button size="lg" variant="primary" className="flex-1 rounded-[20px]" onClick={() => setFinishOpen(true)}>
              <Check size={20} strokeWidth={3} /> Finish workout
            </Button>
          )}
        </div>
      </div>

      <RestPanel next={restNext} />

      {/* all exercises */}
      <Sheet open={listOpen} onClose={() => setListOpen(false)} title="Exercises">
        {active.items.map((it, i) => {
          const e = db.byId.get(it.exerciseId);
          return (
            <div key={it.uid} className="flex items-center gap-2 rounded-2xl py-1.5">
              <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => (go(i), setListOpen(false))}>
                <span
                  className={cn(
                    "num flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base font-bold",
                    doneItems(it) ? "bg-accent text-accent-ink" : i === active.current ? "bg-ink text-bg" : "bg-white/[0.06] text-muted",
                  )}
                >
                  {doneItems(it) ? <Check size={15} strokeWidth={3} /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{e?.name}</span>
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
            <p className="mb-2 text-sm text-muted">Machine busy? Alternatives for {MUSCLE_LABEL[ex.primary[0]]}:</p>
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
      <Sheet open={finishOpen} onClose={() => setFinishOpen(false)} title="Finish workout?">
        {summary && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Time" value={fmtDuration(elapsed)} />
              <Stat label="Sets" value={summary.sets} />
              <Stat label="Volume" value={Math.round(summary.volume).toLocaleString()} sub={profile.units} />
            </div>
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
                <p className="text-sm text-muted">Only ticked sets are saved. They&apos;re stored on this phone first, then synced.</p>
                <Button variant="primary" size="lg" className="w-full" onClick={save}>
                  <Check size={20} strokeWidth={3} /> Save workout
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
