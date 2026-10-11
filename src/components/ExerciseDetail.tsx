"use client";

import { bestSet } from "@/lib/analytics";
import { useExercises } from "@/lib/exercises";
import { MUSCLE_LABEL } from "@/lib/muscles";
import { useData, useHistory } from "@/lib/store";
import { e1rm, fmtDate, fmtDuration, fmtWeight, IMAGE_BASE } from "@/lib/util";
import { Sheet, Stat } from "./ui";

/** Two dataset frames cross-fading = a simple movement demo. */
export function ExerciseDemo({ images, className = "" }: { images: string[]; className?: string }) {
  if (!images.length) return null;
  return (
    <div className={`relative aspect-[4/3] overflow-hidden rounded-xl bg-white ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={IMAGE_BASE + (images[1] ?? images[0])} alt="" className="absolute inset-0 h-full w-full object-contain" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={IMAGE_BASE + images[0]} alt="" className="demo-frame-a absolute inset-0 h-full w-full object-contain" />
    </div>
  );
}

export function ExerciseDetail({ exerciseId, onClose }: { exerciseId: string | null; onClose: () => void }) {
  const db = useExercises();
  const history = useHistory();
  const units = useData((s) => s.profile?.units ?? "kg");
  const ex = exerciseId ? db?.byId.get(exerciseId) : null;
  if (!ex) return null;

  const best = bestSet(history, ex.id);
  const sessions = history
    .filter((w) => w.sets.some((s) => s.exercise_id === ex.id))
    .slice(0, 6)
    .map((w) => ({ date: w.started_at, sets: w.sets.filter((s) => s.exercise_id === ex.id) }));

  return (
    <Sheet open onClose={onClose} title={ex.name}>
      <ExerciseDemo images={ex.images} />
      <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
        {ex.primary.map((m) => (
          <span key={m} className="rounded-full bg-accent/15 px-2.5 py-1 text-accent">{MUSCLE_LABEL[m]}</span>
        ))}
        {ex.secondary.map((m) => (
          <span key={m} className="rounded-full bg-card2 px-2.5 py-1 text-muted">{MUSCLE_LABEL[m]}</span>
        ))}
        <span className="rounded-full bg-card2 px-2.5 py-1 text-muted">{ex.equipment}</span>
        <span className="rounded-full bg-card2 px-2.5 py-1 text-muted">{ex.level}</span>
      </div>

      {best && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Stat label="Best set" value={`${fmtWeight(best.weight, units)} × ${best.reps}`} />
          <Stat label="Est. 1-rep max" value={fmtWeight(Math.round(best.e1rm * 10) / 10, units)} />
        </div>
      )}

      {sessions.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 text-sm font-semibold">Your recent sessions</h4>
          <div className="space-y-1.5">
            {sessions.map((s) => (
              <div key={s.date} className="flex justify-between gap-3 rounded-lg bg-card2 px-3 py-2 text-sm">
                <span className="text-muted">{fmtDate(s.date)}</span>
                <span className="text-right tabular-nums">
                  {s.sets
                    .map((x) =>
                      x.duration_sec != null
                        ? fmtDuration(x.duration_sec)
                        : `${x.weight ?? 0}×${x.reps ?? 0}`,
                    )
                    .join("  ·  ")}
                </span>
              </div>
            ))}
          </div>
          {best && (
            <p className="mt-2 text-xs text-muted">
              Best estimated max comes from {best.weight} {units} × {best.reps} on {fmtDate(best.date)} (
              {Math.round(e1rm(best.weight, best.reps))} {units}).
            </p>
          )}
        </div>
      )}

      <h4 className="mb-2 mt-4 text-sm font-semibold">How to do it</h4>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-ink/90">
        {ex.instructions.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </Sheet>
  );
}
