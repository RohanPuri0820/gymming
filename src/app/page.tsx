"use client";

import { requireProfile } from "@/components/RequireProfile";
import { ArrowRight, Flame, Play, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BodyMap } from "@/components/body/BodyMap";
import type { Palette } from "@/components/body/palette";
import { ExerciseDetail } from "@/components/ExerciseDetail";
import { ExerciseRow } from "@/components/ExerciseList";
import { CountUp, Rings } from "@/components/Rings";
import { Card, Reveal, SectionHeader, Segmented, Sheet, Spinner, Stat } from "@/components/ui";
import {
  fatigueByMuscle,
  lastTrainedDays,
  neglectScores,
  volumeByMuscle,
  weekStreak,
} from "@/lib/analytics";
import { useExercises } from "@/lib/exercises";
import { candidatesFor, FOCI, suggestFocus } from "@/lib/generator";
import { MUSCLE_LABEL, type MuscleScores } from "@/lib/muscles";
import { computeRings, thisWeek, weekDays } from "@/lib/rings";
import { useData, useHistory, useWorkout } from "@/lib/store";
import type { MuscleId } from "@/lib/types";
import { cn, daysAgo } from "@/lib/util";

type ModeId = "recovery" | "week" | "neglect";
const MODES: Record<ModeId, { label: string; palette: Palette; legend: [string, string]; help: string }> = {
  recovery: { label: "Recovery", palette: "recovery", legend: ["Fresh", "Fatigued"], help: "How recovered each muscle is" },
  week: { label: "This week", palette: "heat", legend: ["A few sets", "10+ sets"], help: "Working sets per muscle, last 7 days" },
  neglect: { label: "Overdue", palette: "neglect", legend: ["Recently", "2+ weeks"], help: "Time since each muscle was trained" },
};

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Late night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Home() {
  const db = useExercises();
  const history = useHistory();
  const profile = useData((s) => s.profile)!;
  const active = useWorkout((s) => s.active);
  const [mode, setMode] = useState<ModeId>("recovery");
  const [muscle, setMuscle] = useState<MuscleId | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const data = useMemo(() => {
    if (!db) return null;
    const volume = volumeByMuscle(history, db, 7);
    const weekScores: MuscleScores = {};
    for (const [m, v] of Object.entries(volume)) weekScores[m as MuscleId] = Math.min(1, (v ?? 0) / 10);
    return {
      volume,
      scores: {
        recovery: fatigueByMuscle(history, db),
        week: weekScores,
        neglect: neglectScores(history, db),
      } as Record<ModeId, MuscleScores>,
      days: lastTrainedDays(history, db),
      suggestion: suggestFocus(history, db),
      rings: computeRings(thisWeek(history), db, profile),
      week: weekDays(history),
    };
  }, [db, history, profile]);

  if (!db || !data) return <Spinner />;

  const focus = FOCI.find((f) => f.id === data.suggestion.focus)!;
  const focusLabel = focus.label.replace(/ \(.*\)/, "");
  const lastDays = history[0] ? daysAgo(history[0].started_at) : null;
  const initial = (profile.display_name ?? "You").trim()[0]?.toUpperCase();

  return (
    <div className="space-y-5">
      <Reveal>
        <header className="flex items-start justify-between pt-1">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">
              {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}
            </p>
            <h1 className="mt-1 text-[30px] font-bold leading-tight tracking-tight">
              {greeting()}
              {profile.display_name ? (
                <>
                  ,<br />
                  <span className="text-accent">{profile.display_name}</span>
                </>
              ) : null}
            </h1>
          </div>
          <Link
            href="/profile"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-white/15 to-white/[0.03] text-lg font-bold"
          >
            {initial}
          </Link>
        </header>
      </Reveal>

      {/* Weekly rings */}
      <Reveal i={1}>
        <Card className="p-5">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <Rings rings={data.rings} size={150} stroke={15} gap={4} />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              {data.rings.map((r) => (
                <div key={r.key}>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: r.color }}>
                    {r.label}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <CountUp value={r.value} className="num text-[26px] font-semibold" />
                    <span className="num text-lg text-muted">/{r.target}</span>
                    <span className="ml-1 text-xs text-muted">{r.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-7 gap-1.5">
            {data.week.map((d) => (
              <div key={d.date.toISOString()} className="flex flex-col items-center gap-1.5">
                <span className={cn("text-[11px] font-semibold", d.today ? "text-ink" : "text-muted")}>{d.label}</span>
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border",
                    d.trained
                      ? "border-accent bg-accent text-accent-ink shadow-[0_0_14px_-3px_rgb(198_244_50/0.8)]"
                      : d.today
                        ? "border-white/40"
                        : "border-white/10",
                  )}
                >
                  {d.trained && <Flame size={14} strokeWidth={2.6} />}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </Reveal>

      {/* Today */}
      <Reveal i={2}>
        {active ? (
          <Link href="/workout" className="block">
            <div className="relative overflow-hidden rounded-3xl border border-accent/30 bg-[linear-gradient(135deg,rgb(198_244_50/0.22),rgb(62_230_255/0.08)_60%,transparent)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">In progress</p>
              <div className="mt-1 text-2xl font-bold">{active.title}</div>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-ink">
                <Play size={16} fill="currentColor" /> Resume workout
              </div>
            </div>
          </Link>
        ) : (
          <Link href={`/plan?focus=${data.suggestion.focus}`} className="block">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgb(198_244_50/0.20),rgb(62_230_255/0.07)_55%,rgb(255_90_110/0.06))] p-5">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                <Sparkles size={13} /> Today&apos;s pick
              </p>
              <div className="num mt-2 text-[44px] font-bold uppercase">{focusLabel}</div>
              <p className="mt-1 max-w-[85%] text-sm text-ink/70">{data.suggestion.reason}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-medium text-muted">{profile.session_minutes} min · built for you</span>
                <span className="glow-accent flex h-11 items-center gap-2 rounded-full bg-accent pl-5 pr-4 text-sm font-bold text-accent-ink">
                  Let&apos;s go <ArrowRight size={18} />
                </span>
              </div>
            </div>
          </Link>
        )}
      </Reveal>

      {/* Body */}
      <Reveal i={3}>
        <SectionHeader title="Your body" action={<span className="text-xs text-muted">{MODES[mode].help}</span>} />
        <Segmented
          className="mb-3"
          value={mode}
          onChange={setMode}
          options={(Object.keys(MODES) as ModeId[]).map((id) => ({ id, label: MODES[id].label }))}
        />
        <BodyMap
          className="h-[440px]"
          scores={data.scores[mode]}
          palette={MODES[mode].palette}
          legend={MODES[mode].legend}
          highlighted={muscle ? [muscle] : []}
          onSelect={setMuscle}
          autoRotate
        />
        <p className="mt-2 text-center text-xs text-muted">Drag to spin · tap a muscle for details</p>
      </Reveal>

      <Reveal i={4}>
        <div className="grid grid-cols-3 gap-2.5">
          <Stat label="Streak" value={weekStreak(history)} sub="weeks" />
          <Stat label="Workouts" value={history.length} sub="all time" />
          <Stat label="Last" value={lastDays == null ? "—" : lastDays === 0 ? "Today" : `${lastDays}d`} sub={lastDays == null ? "no sessions" : lastDays === 0 ? "keep it up" : "ago"} />
        </div>
      </Reveal>

      <Sheet open={!!muscle} onClose={() => setMuscle(null)} title={muscle ? MUSCLE_LABEL[muscle] : ""}>
        {muscle && (
          <div>
            <div className="grid grid-cols-3 gap-2">
              <Stat
                label="Last trained"
                value={data.days[muscle] == null ? "Never" : data.days[muscle] === 0 ? "Today" : `${data.days[muscle]}d`}
              />
              <Stat label="Sets · 7d" value={Math.round((data.volume[muscle] ?? 0) * 10) / 10} />
              <Stat label="Fatigue" value={`${Math.round((data.scores.recovery[muscle] ?? 0) * 100)}%`} />
            </div>
            <SectionHeader className="mt-5" title="Good exercises for this" />
            {candidatesFor(muscle, db, profile.level)
              .slice(0, 8)
              .map(({ ex }) => (
                <ExerciseRow key={ex.id} ex={ex} onClick={() => setDetail(ex.id)} />
              ))}
            <Link href={`/exercises?muscle=${encodeURIComponent(muscle)}`} className="mt-3 block text-center text-sm font-semibold text-accent">
              See all {MUSCLE_LABEL[muscle]} exercises
            </Link>
          </div>
        )}
      </Sheet>
      <ExerciseDetail exerciseId={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

export default requireProfile(Home);
