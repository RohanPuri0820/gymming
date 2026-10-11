import type { WorkoutItem } from "./types";

// crypto.randomUUID only exists on https/localhost; phones testing over LAN need a fallback.
export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (+c ^ (Math.random() * 16) >> (+c / 4)).toString(16),
  );
}

// Proxied through our own domain, see rewrites in next.config.ts
export const IMAGE_BASE = "/ex-img/";

export function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function fmtWeight(w: number | null | undefined, units: string): string {
  if (w == null) return "—";
  return `${+w.toFixed(2)} ${units}`;
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function cn(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(" ");
}

// Epley estimated one-rep max
export function e1rm(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function targetText(it: WorkoutItem): string {
  if (it.mode === "time") return `${it.sets.length} × ${fmtDuration(it.target.durationSec)}`;
  const r = it.target.repMin === it.target.repMax ? `${it.target.repMax}` : `${it.target.repMin}–${it.target.repMax}`;
  return `${it.sets.length} × ${r} reps`;
}
