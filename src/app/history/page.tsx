"use client";

import { requireProfile } from "@/components/RequireProfile";
import { ChevronDown, Scale, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ExerciseDetail } from "@/components/ExerciseDetail";
import { Button, Card, PageHeader, SectionHeader, Spinner, Stat } from "@/components/ui";
import { Rings } from "@/components/Rings";
import { WeightChart } from "@/components/WeightChart";
import { weekStreak, workoutMuscles, workoutVolume } from "@/lib/analytics";
import { useExercises, useMountTime } from "@/lib/exercises";
import { MUSCLE_LABEL } from "@/lib/muscles";
import { computeRings } from "@/lib/rings";
import { useData, useHistory, useWorkout } from "@/lib/store";
import type { WorkoutWithSets } from "@/lib/types";
import { cn, fmtDate, fmtDuration } from "@/lib/util";

function BodyWeight() {
  const rows = useData((s) => s.bodyWeights);
  const units = useData((s) => s.profile?.units ?? "kg");
  const log = useData((s) => s.logBodyWeight);
  const del = useData((s) => s.deleteBodyWeight);
  const [value, setValue] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const now = useMountTime();

  const latest = rows[0];
  const monthAgo = rows.find((r) => now - new Date(r.measured_on).getTime() >= 28 * 86_400_000);
  const change = latest && monthAgo ? latest.weight - monthAgo.weight : null;

  async function save() {
    const n = parseFloat(value);
    if (!n) return;
    const today = new Date();
    const d = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const e = await log(d, n);
    setErr(e);
    if (!e) setValue("");
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <Scale size={18} className="text-accent" />
        <h2 className="font-semibold">Body weight</h2>
        {latest && (
          <span className="ml-auto text-sm tabular-nums">
            <b>{latest.weight} {units}</b>
            {change != null && (
              <span className="ml-2 text-muted">
                {change > 0 ? "+" : ""}
                {change.toFixed(1)} in 4 wks
              </span>
            )}
          </span>
        )}
      </div>
      <WeightChart rows={rows} units={units} />
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Today's weight (${units})`}
          className="h-12 min-w-0 flex-1 rounded-2xl border border-line bg-white/[0.05] px-4 outline-none focus:border-accent/60"
        />
        <Button variant="primary" size="lg" className="h-12" onClick={save} disabled={!value}>
          Log
        </Button>
      </div>
      {err && <p className="text-sm text-red-300">{err}</p>}
      {rows.length > 0 && (
        <div>
          {(showAll ? rows : rows.slice(0, 3)).map((r) => (
            <div key={r.id} className="flex items-center justify-between border-b border-line py-1.5 text-sm last:border-0">
              <span className="text-muted">{fmtDate(r.measured_on + "T12:00:00")}</span>
              <span className="flex items-center gap-2 tabular-nums">
                {r.weight} {units}
                <button onClick={() => del(r.id)} className="p-1 text-muted" aria-label="Delete">
                  <Trash2 size={14} />
                </button>
              </span>
            </div>
          ))}
          {rows.length > 3 && (
            <button onClick={() => setShowAll(!showAll)} className="mt-1 text-xs text-accent">
              {showAll ? "Show less" : `Show all ${rows.length}`}
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

function WorkoutCard({ w, onExercise }: { w: WorkoutWithSets; onExercise: (id: string) => void }) {
  const db = useExercises()!;
  const units = useData((s) => s.profile?.units ?? "kg");
  const del = useData((s) => s.deleteWorkout);
  const pending = useWorkout((s) => s.pending.some((p) => p.id === w.id));
  const profile = useData((s) => s.profile);
  const [open, setOpen] = useState(false);
  const secs = Math.round((new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()) / 1000);
  const groups = useMemo(() => {
    const m = new Map<string, typeof w.sets>();
    [...w.sets].sort((a, b) => a.item_order - b.item_order || a.set_number - b.set_number).forEach((s) => {
      m.set(s.exercise_id, [...(m.get(s.exercise_id) ?? []), s]);
    });
    return [...m.entries()];
  }, [w]);

  const d = new Date(w.started_at);
  return (
    <Card className="p-0">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-4 p-4 text-left">
        <div className="flex w-12 shrink-0 flex-col items-center rounded-2xl bg-white/[0.05] py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
            {d.toLocaleDateString(undefined, { month: "short" })}
          </span>
          <span className="num text-[26px] font-semibold">{d.getDate()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-bold">{w.title}</span>
            {pending && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200">not synced</span>}
          </div>
          <div className="mt-0.5 text-xs text-muted">
            {d.toLocaleDateString(undefined, { weekday: "long" })} · {fmtDuration(secs)} · {w.sets.filter((s) => s.section === "main").length} sets ·{" "}
            {Math.round(workoutVolume(w)).toLocaleString()} {units}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {workoutMuscles(w, db)
              .slice(0, 5)
              .map((m) => (
                <span key={m} className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-ink/70">
                  {MUSCLE_LABEL[m]}
                </span>
              ))}
          </div>
        </div>
        {profile && <Rings rings={computeRings([w], db, profile, "session")} size={46} stroke={5} gap={1.5} />}
        <ChevronDown size={18} className={cn("text-muted transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-white/[0.06] px-4 pb-4 pt-2">
          {groups.map(([id, sets]) => (
            <div key={id} className="border-b border-white/[0.05] py-2.5 last:border-0">
              <button onClick={() => onExercise(id)} className="text-left text-sm font-semibold">
                {db.byId.get(id)?.name ?? id}
              </button>
              <div className="text-xs tabular-nums text-muted">
                {sets
                  .map((s) => (s.duration_sec != null ? fmtDuration(s.duration_sec) : `${s.weight ?? 0}${units} × ${s.reps ?? 0}`))
                  .join("  ·  ")}
              </div>
            </div>
          ))}
          <Button
            variant="danger"
            size="sm"
            className="mt-3"
            onClick={() => confirm("Delete this workout?") && del(w.id)}
          >
            <Trash2 size={14} /> Delete
          </Button>
        </div>
      )}
    </Card>
  );
}

function HistoryPage() {
  const db = useExercises();
  const history = useHistory();
  const [detail, setDetail] = useState<string | null>(null);
  const now = useMountTime();
  if (!db) return <Spinner />;

  const monthAgo = now - 30 * 86_400_000;
  const month = history.filter((w) => new Date(w.started_at).getTime() > monthAgo);

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Your progress" title="History" />
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Last 30 days" value={month.length} />
        <Stat label="Week streak" value={weekStreak(history)} />
        <Stat label="All time" value={history.length} />
      </div>
      <BodyWeight />
      {history.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No workouts yet. Your first one will show up here.</p>
      ) : (
        <div className="space-y-3">
          <SectionHeader title="Workouts" />
          {history.map((w) => (
            <WorkoutCard key={w.id} w={w} onExercise={setDetail} />
          ))}
        </div>
      )}
      <ExerciseDetail exerciseId={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

export default requireProfile(HistoryPage);
