"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect } from "react";
import type { Ring } from "@/lib/rings";

/** Concentric activity rings. Rings past 100% keep going round with a darker overlap. */
export function Rings({
  rings,
  size = 180,
  stroke = 18,
  gap = 4,
  delay = 0,
}: {
  rings: Ring[];
  size?: number;
  stroke?: number;
  gap?: number;
  delay?: number;
}) {
  const c = size / 2;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {size >= 100 && (
        // soft glow without CSS filters (cheap on phones)
        <div
          className="pointer-events-none absolute -inset-6"
          style={{
            background: `radial-gradient(closest-side, ${rings[0]?.color}26, transparent)`,
          }}
        />
      )}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="relative -rotate-90"
        aria-hidden
      >
        {rings.map((r, i) => {
          const radius = c - stroke / 2 - i * (stroke + gap);
          const pct = r.target > 0 ? r.value / r.target : 0;
          return (
            <g key={r.key}>
              <circle
                cx={c}
                cy={c}
                r={radius}
                fill="none"
                stroke={r.color}
                strokeOpacity={0.16}
                strokeWidth={stroke}
              />
              <motion.circle
                cx={c}
                cy={c}
                r={radius}
                fill="none"
                stroke={r.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: Math.min(1, Math.max(pct, 0.0001)) }}
                transition={{
                  duration: 1.2,
                  delay: delay + i * 0.12,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
              {pct > 1 && (
                <motion.circle
                  cx={c}
                  cy={c}
                  r={radius}
                  fill="none"
                  stroke={r.color}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: Math.min(1, pct - 1) }}
                  transition={{
                    duration: 0.8,
                    delay: delay + 1.2 + i * 0.12,
                    ease: "easeOut",
                  }}
                  strokeOpacity={0.75}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Counts up to `value` on mount / change. */
export function CountUp({
  value,
  decimals = 0,
  className,
}: {
  value: number;
  decimals?: number;
  className?: string;
}) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) =>
    v.toLocaleString(undefined, {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    }),
  );
  useEffect(() => {
    const ctl = animate(mv, value, { duration: 1, ease: [0.22, 1, 0.36, 1] });
    return () => ctl.stop();
  }, [mv, value]);
  return <motion.span className={className}>{text}</motion.span>;
}
