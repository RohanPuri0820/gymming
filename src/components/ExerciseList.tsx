"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { ExerciseDb } from "@/lib/exercises";
import { MUSCLES, MUSCLE_LABEL } from "@/lib/muscles";
import type { Exercise, MuscleId } from "@/lib/types";
import { IMAGE_BASE } from "@/lib/util";
import { Chip } from "./ui";

const EQUIPMENT = ["machine", "cable", "dumbbell", "barbell", "body only", "kettlebells", "bands", "other"];
const TYPES = [
  { id: "strength", label: "Strength" },
  { id: "stretching", label: "Stretching" },
  { id: "cardio", label: "Cardio" },
  { id: "plyometrics", label: "Plyo" },
];

export function ExerciseRow({ ex, onClick, right }: { ex: Exercise; onClick?: () => void; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-1 py-2 transition hover:bg-white/[0.03]">
      <button onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={IMAGE_BASE + ex.images[0]} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl bg-white object-cover" />
        <div className="min-w-0">
          <div className="truncate font-semibold">{ex.name}</div>
          <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
            <span className="text-ink/70">{ex.primary.map((m) => MUSCLE_LABEL[m]).join(", ")}</span>
            <span className="h-0.5 w-0.5 rounded-full bg-muted" />
            {ex.equipment}
            <span className="h-0.5 w-0.5 rounded-full bg-muted" />
            {ex.level}
          </div>
        </div>
      </button>
      {right}
    </div>
  );
}

export function ExerciseList({
  db,
  onPick,
  initialMuscle = null,
  muscle: controlledMuscle,
  onMuscleChange,
  renderRight,
  limit = 60,
}: {
  db: ExerciseDb;
  onPick: (ex: Exercise) => void;
  initialMuscle?: MuscleId | null;
  muscle?: MuscleId | null;
  onMuscleChange?: (m: MuscleId | null) => void;
  renderRight?: (ex: Exercise) => React.ReactNode;
  limit?: number;
}) {
  const [q, setQ] = useState("");
  const [localMuscle, setLocalMuscle] = useState<MuscleId | null>(initialMuscle);
  const muscle = controlledMuscle !== undefined ? controlledMuscle : localMuscle;
  const setMuscle = (m: MuscleId | null) => (onMuscleChange ? onMuscleChange(m) : setLocalMuscle(m));
  const [equip, setEquip] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [shown, setShown] = useState(limit);

  const results = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    return db.list.filter(
      (e) =>
        (!muscle || e.primary.includes(muscle) || e.secondary.includes(muscle)) &&
        (!equip || e.equipment === equip) &&
        (!type || e.category === type || (type === "strength" && ["powerlifting", "olympic weightlifting", "strongman"].includes(e.category))) &&
        terms.every((t) => e.name.toLowerCase().includes(t)),
    ).sort((a, b) => {
      // Primary-muscle matches first when filtering by muscle
      if (!muscle) return 0;
      return Number(b.primary.includes(muscle)) - Number(a.primary.includes(muscle));
    });
  }, [db, q, muscle, equip, type]);

  return (
    <div>
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setShown(limit);
          }}
          placeholder="Search 870+ exercises"
          className="h-12 w-full rounded-2xl border border-line bg-white/[0.05] pl-10 pr-3 outline-none transition focus:border-accent/60 focus:bg-white/[0.07]"
        />
      </div>
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip active={!muscle} onClick={() => setMuscle(null)}>All muscles</Chip>
        {MUSCLES.map((m) => (
          <Chip key={m.id} active={muscle === m.id} onClick={() => setMuscle(muscle === m.id ? null : m.id)}>
            {m.label}
          </Chip>
        ))}
      </div>
      <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
        {TYPES.map((t) => (
          <Chip key={t.id} active={type === t.id} onClick={() => setType(type === t.id ? null : t.id)}>
            {t.label}
          </Chip>
        ))}
        <span className="mx-1 w-px shrink-0 bg-line" />
        {EQUIPMENT.map((e) => (
          <Chip key={e} active={equip === e} onClick={() => setEquip(equip === e ? null : e)}>
            {e}
          </Chip>
        ))}
      </div>
      <div className="mt-3 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{results.length} exercises</div>
      <div className="mt-1">
        {results.slice(0, shown).map((ex) => (
          <ExerciseRow key={ex.id} ex={ex} onClick={() => onPick(ex)} right={renderRight?.(ex)} />
        ))}
      </div>
      {results.length > shown && (
        <button onClick={() => setShown(shown + limit)} className="mt-3 w-full rounded-2xl border border-line py-3 text-sm font-semibold text-accent">
          Show more
        </button>
      )}
    </div>
  );
}
