"use client";

import { RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import type { MuscleScores } from "@/lib/muscles";
import type { MuscleId } from "@/lib/types";
import { cn } from "@/lib/util";
import { gradientCss, type Palette } from "./palette";

const Body3D = dynamic(() => import("./Body3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-accent" />
    </div>
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
  autoRotate,
}: {
  scores: MuscleScores;
  palette: Palette;
  highlighted?: MuscleId[];
  onSelect?: (m: MuscleId) => void;
  legend?: [string, string];
  className?: string;
  overlay?: ReactNode;
  autoRotate?: boolean;
}) {
  const [view, setView] = useState<"front" | "back">("front");
  return (
    <div
      className={cn("relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0f1116]", className)}
    >
      {/* stage lighting: cool halo behind the figure + lime glow on the floor */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(60% 45% at 50% 42%, rgb(120 140 255 / 0.10), transparent 70%), radial-gradient(50% 12% at 50% 92%, rgb(198 244 50 / 0.16), transparent 70%)",
        }}
      />
      <div className="pointer-events-none absolute inset-x-[22%] bottom-[9%] h-6 rounded-[50%] bg-accent/20 blur-2xl" />
      <Body3D
        scores={scores}
        palette={palette}
        highlighted={highlighted}
        onSelect={onSelect}
        view={view}
        autoRotate={autoRotate}
      />
      <button
        onClick={() => setView((v) => (v === "front" ? "back" : "front"))}
        className="glass absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-ink"
      >
        <RefreshCw size={13} /> {view === "front" ? "Back" : "Front"}
      </button>
      {legend && (
        <div className="pointer-events-none absolute inset-x-4 bottom-3">
          <div className="h-1 rounded-full opacity-90" style={{ background: gradientCss(palette) }} />
          <div className="mt-1 flex justify-between text-[10.5px] font-medium text-muted">
            <span>{legend[0]}</span>
            <span>{legend[1]}</span>
          </div>
        </div>
      )}
      {overlay}
    </div>
  );
}
