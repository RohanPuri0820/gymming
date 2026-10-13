"use client";

import { useState } from "react";
import { GOALS, LEVELS } from "@/lib/generator";
import { useData } from "@/lib/store";
import type { Goal, Level, Profile, Units } from "@/lib/types";
import { cn } from "@/lib/util";
import { Button } from "./ui";

function Option({
  on,
  onClick,
  title,
  blurb,
}: {
  on: boolean;
  onClick: () => void;
  title: string;
  blurb: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border p-3.5 text-left transition active:scale-[0.99]",
        on ? "border-accent/60 bg-accent/[0.08] shadow-[0_0_24px_-10px_rgb(198_244_50/0.6)]" : "border-line bg-white/[0.04]",
      )}
    >
      <div className={cn("font-semibold", on && "text-accent")}>{title}</div>
      <div className="text-xs text-muted">{blurb}</div>
    </button>
  );
}

export function ProfileForm({ initial, submitLabel, onSaved }: {
  initial?: Profile | null;
  submitLabel: string;
  onSaved?: () => void;
}) {
  const saveProfile = useData((s) => s.saveProfile);
  const [name, setName] = useState(initial?.display_name ?? "");
  const [goal, setGoal] = useState<Goal>(initial?.goal ?? "general");
  const [level, setLevel] = useState<Level>(initial?.level ?? "beginner");
  const [units, setUnits] = useState<Units>(initial?.units ?? "kg");
  const [minutes, setMinutes] = useState(initial?.session_minutes ?? 60);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    const e = await saveProfile({ display_name: name || null, goal, level, units, session_minutes: minutes });
    setBusy(false);
    setErr(e);
    if (!e) onSaved?.();
  }

  return (
    <div className="space-y-6">
      <section>
        <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">Your name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Optional"
          className="h-12 w-full rounded-2xl border border-line bg-white/[0.05] px-4 outline-none focus:border-accent/60"
        />
      </section>
      <section>
        <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">Main goal</h3>
        <div className="space-y-2">
          {GOALS.map((g) => (
            <Option key={g.id} on={goal === g.id} onClick={() => setGoal(g.id)} title={g.label} blurb={g.blurb} />
          ))}
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">Experience</h3>
        <div className="space-y-2">
          {LEVELS.map((l) => (
            <Option key={l.id} on={level === l.id} onClick={() => setLevel(l.id)} title={l.label} blurb={l.blurb} />
          ))}
        </div>
      </section>
      <section className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">Units</h3>
          <div className="flex gap-2">
            {(["kg", "lb"] as const).map((u) => (
              <Button key={u} type="button" variant={units === u ? "primary" : "secondary"} className="flex-1" onClick={() => setUnits(u)}>
                {u}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">Session length</h3>
          <select
            value={minutes}
            onChange={(e) => setMinutes(+e.target.value)}
            className="h-11 w-full rounded-2xl border border-line bg-white/[0.05] px-3"
          >
            {[30, 45, 60, 75, 90].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </div>
      </section>
      {err && <p className="text-sm text-red-300">{err}</p>}
      <Button variant="primary" size="lg" className="w-full" onClick={save} disabled={busy}>
        {busy ? "Saving…" : submitLabel}
      </Button>
    </div>
  );
}
