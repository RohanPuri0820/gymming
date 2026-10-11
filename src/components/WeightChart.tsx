"use client";

import { useMemo, useRef, useState } from "react";
import type { BodyWeightRow } from "@/lib/types";

// Validated (dataviz validator, dark mode) single-series line colour
const LINE = "#65a30d";
const GRID = "#262c3a";
const SURFACE = "#151922";

const W = 340;
const H = 120;
const PAD = { l: 34, r: 10, t: 10, b: 20 };

export function WeightChart({ rows, units }: { rows: BodyWeightRow[]; units: string }) {
  const data = useMemo(
    () =>
      [...rows]
        .sort((a, b) => a.measured_on.localeCompare(b.measured_on))
        .slice(-90)
        .map((r) => ({ t: new Date(r.measured_on + "T12:00:00").getTime(), w: r.weight, d: r.measured_on })),
    [rows],
  );
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  if (data.length < 2) return null;

  const t0 = data[0].t;
  const t1 = data[data.length - 1].t;
  const ws = data.map((d) => d.w);
  const pad = Math.max(0.5, (Math.max(...ws) - Math.min(...ws)) * 0.15);
  const y0 = Math.min(...ws) - pad;
  const y1 = Math.max(...ws) + pad;
  const x = (t: number) => PAD.l + ((t - t0) / Math.max(1, t1 - t0)) * (W - PAD.l - PAD.r);
  const y = (w: number) => PAD.t + (1 - (w - y0) / (y1 - y0)) * (H - PAD.t - PAD.b);
  const path = data.map((d, i) => `${i ? "L" : "M"}${x(d.t).toFixed(1)},${y(d.w).toFixed(1)}`).join("");
  const area = `${path}L${x(t1)},${H - PAD.b}L${x(t0)},${H - PAD.b}Z`;
  const ticks = [y0 + (y1 - y0) * 0.15, (y0 + y1) / 2, y1 - (y1 - y0) * 0.15];
  const last = data[data.length - 1];
  const h = hover != null ? data[hover] : null;
  const fmtD = (d: string) => new Date(d + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });

  function onMove(e: React.PointerEvent) {
    const r = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    data.forEach((d, i) => {
      if (Math.abs(x(d.t) - px) < Math.abs(x(data[best].t) - px)) best = i;
    });
    setHover(best);
  }

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Body weight trend, latest ${last.w} ${units}`}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth={1} />
            <text x={PAD.l - 6} y={y(v) + 3.5} textAnchor="end" className="fill-muted text-[10px] tabular-nums">
              {v.toFixed(1)}
            </text>
          </g>
        ))}
        <text x={PAD.l} y={H - 5} className="fill-muted text-[10px]">{fmtD(data[0].d)}</text>
        <text x={W - PAD.r} y={H - 5} textAnchor="end" className="fill-muted text-[10px]">{fmtD(last.d)}</text>
        <path d={area} fill={LINE} opacity={0.1} />
        <path d={path} fill="none" stroke={LINE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {h && <line x1={x(h.t)} x2={x(h.t)} y1={PAD.t} y2={H - PAD.b} stroke="#8b93a7" strokeWidth={1} />}
        {(h ? [h] : [last]).map((p) => (
          <circle key={p.d} cx={x(p.t)} cy={y(p.w)} r={4} fill={LINE} stroke={SURFACE} strokeWidth={2} />
        ))}
      </svg>
      {h && (
        <div
          className="pointer-events-none absolute top-0 rounded-lg border border-line bg-card2 px-2 py-1 text-xs shadow-lg"
          style={{ left: `${(x(h.t) / W) * 100}%`, transform: `translateX(${x(h.t) > W / 2 ? "-105%" : "5%"})` }}
        >
          <div className="text-muted">{fmtD(h.d)}</div>
          <div className="font-semibold tabular-nums">{h.w} {units}</div>
        </div>
      )}
    </div>
  );
}
