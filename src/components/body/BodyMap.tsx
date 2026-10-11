"use client";

import { RotateCcw } from "lucide-react";
import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import type { MuscleScores } from "@/lib/muscles";
import type { MuscleId } from "@/lib/types";
import { cn } from "@/lib/util";
import { gradientCss, type Palette } from "./palette";

const Body3D = dynamic(() => import("./Body3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted">Loading 3D body…</div>
  ),
});

export function BodyMap({
  scores,
  palette,
  highlighted,
  onSelect,
  legend,
  className,
  overlay,
}: {
  scores: MuscleScores;
  palette: Palette;
  highlighted?: MuscleId[];
  onSelect?: (m: MuscleId) => void;
  legend?: [string, string];
  className?: string;
  overlay?: ReactNode;
}) {
  const [view, setView] = useState<"front" | "back">("front");
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-line bg-[radial-gradient(ellipse_at_center,#1d2230_0%,#0f1218_70%)]", className)}>
      <Body3D scores={scores} palette={palette} highlighted={highlighted} onSelect={onSelect} view={view} />
      <button
        onClick={() => setView((v) => (v === "front" ? "back" : "front"))}
        className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-line bg-card/80 px-3 py-1.5 text-xs text-ink backdrop-blur"
      >
        <RotateCcw size={14} /> {view === "front" ? "Show back" : "Show front"}
      </button>
      {legend && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3">
          <div className="h-1.5 rounded-full" style={{ background: gradientCss(palette) }} />
          <div className="mt-1 flex justify-between text-[11px] text-muted">
            <span>{legend[0]}</span>
            <span>{legend[1]}</span>
          </div>
        </div>
      )}
      {overlay}
    </div>
  );
}
