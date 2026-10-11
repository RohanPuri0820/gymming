import * as THREE from "three";

export type Palette = "heat" | "recovery" | "neglect";

export const NEUTRAL = "#6b7488";

const STOPS: Record<Palette, [number, string][]> = {
  // planned / volume: yellow → orange → red
  heat: [
    [0, "#fde047"],
    [0.5, "#f97316"],
    [1, "#dc2626"],
  ],
  // recovery: fresh green → amber → fatigued red
  recovery: [
    [0, "#22c55e"],
    [0.45, "#eab308"],
    [1, "#dc2626"],
  ],
  // neglect: light violet → deep violet (more overdue)
  neglect: [
    [0, "#ddd6fe"],
    [1, "#7c3aed"],
  ],
};

const tmpA = new THREE.Color();
const tmpB = new THREE.Color();

export function colorFor(score: number | undefined, palette: Palette): string {
  // Heat/neglect: 0 means "not involved", show neutral. Recovery colours everything.
  if (palette !== "recovery" && (!score || score <= 0.02)) return NEUTRAL;
  const s = Math.max(0, Math.min(1, score ?? 0));
  const stops = STOPS[palette];
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, c0] = stops[i];
    const [p1, c1] = stops[i + 1];
    if (s <= p1) {
      tmpA.set(c0);
      tmpB.set(c1);
      return "#" + tmpA.lerp(tmpB, (s - p0) / (p1 - p0)).getHexString();
    }
  }
  return stops[stops.length - 1][1];
}

export function gradientCss(palette: Palette): string {
  return `linear-gradient(90deg, ${STOPS[palette].map(([p, c]) => `${c} ${p * 100}%`).join(", ")})`;
}
