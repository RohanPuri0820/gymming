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
    <div className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
      <button onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={IMAGE_BASE + ex.images[0]}
          alt=""
          loading="lazy"
          className="h-12 w-12 shrink-0 rounded-lg bg-card2 object-cover"
        />
        <div className="min-w-0">
          <div className="truncate font-medium">{ex.name}</div>
          <div className="truncate text-xs text-muted">
            {ex.primary.map((m) => MUSCLE_LABEL[m]).join(", ")} · {ex.equipment} · {ex.level}
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
          className="h-11 w-full rounded-xl border border-line bg-card2 pl-10 pr-3 outline-none focus:border-accent"
        />
      </div>
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip active={!muscle} onClick={() => setMuscle(null)}>All muscles</Chip>
        {MUSCLES.map((m) => (
          <Chip key={m.id} active={muscle === m.id} onClick={() => setMuscle(muscle === m.id ? null : m.id)}>
            {m.label}
          </Chip>
        ))}
      </div>
      <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
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
      <div className="mt-2 text-xs text-muted">{results.length} exercises</div>
      <div className="mt-1">
        {results.slice(0, shown).map((ex) => (
          <ExerciseRow key={ex.id} ex={ex} onClick={() => onPick(ex)} right={renderRight?.(ex)} />
        ))}
      </div>
      {results.length > shown && (
        <button onClick={() => setShown(shown + limit)} className="mt-3 w-full py-3 text-sm text-accent">
          Show more
        </button>
      )}
    </div>
  );
}
