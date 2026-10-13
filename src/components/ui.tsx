"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/util";

/** Short vibration on supported phones (Android; iOS ignores it). */
export function haptic(pattern: number | number[] = 12) {
  if (typeof navigator !== "undefined") navigator.vibrate?.(pattern);
}

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "secondary",
  size = "md",
  className,
  onClick,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  return (
    <button
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 rounded-2xl font-semibold transition duration-150 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-35",
        size === "sm" && "h-9 rounded-xl px-3 text-sm",
        size === "md" && "h-11 px-4 text-sm",
        size === "lg" && "h-14 px-6 text-base",
        variant === "primary" && "glow-accent bg-accent text-accent-ink",
        variant === "secondary" && "border border-line bg-white/[0.06] text-ink hover:bg-white/[0.09]",
        variant === "ghost" && "text-muted hover:text-ink",
        variant === "danger" && "border border-red-500/25 bg-red-500/12 text-red-300",
        className,
      )}
      onClick={(e) => {
        if (variant === "primary") haptic(8);
        onClick?.(e);
      }}
      {...rest}
    />
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("surface rounded-3xl p-4", className)}>{children}</div>;
}

export function SectionHeader({ title, action, className }: { title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-2.5 flex items-end justify-between px-1", className)}>
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">{title}</h2>
      {action}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 select-none rounded-full border px-3.5 py-1.5 text-sm font-medium transition active:scale-95",
        active
          ? "border-accent/60 bg-accent text-accent-ink shadow-[0_0_20px_-6px_rgb(198_244_50/0.7)]"
          : "border-line bg-white/[0.04] text-ink/75 hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** iOS-style segmented control with a sliding thumb. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { id: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative flex rounded-2xl border border-line bg-white/[0.04] p-1", className)}>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "relative z-10 flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
            value === o.id ? "text-bg" : "text-muted",
          )}
        >
          {value === o.id && (
            <motion.span
              layoutId={`seg-${options.map((x) => x.id).join("")}`}
              className="absolute inset-0 -z-10 rounded-xl bg-ink"
              transition={{ type: "spring", stiffness: 500, damping: 38 }}
            />
          )}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
}) {
  const drag = useDragControls();
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-[6px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="glass max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border-t border-white/10 pb-safe"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            drag="y"
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => info.offset.y > 120 && onClose()}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              onPointerDown={(e) => drag.start(e)}
              className="sticky top-0 z-10 touch-none rounded-t-[28px] bg-gradient-to-b from-[#12141a] to-[#12141a]/80 px-4 pb-2 pt-2.5 backdrop-blur"
            >
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/20" />
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 truncate text-lg font-bold">{title}</div>
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={onClose}
                  className="rounded-full bg-white/[0.07] p-1.5 text-muted hover:text-ink"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="px-4 pb-6 pt-2">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Stat({ label, value, sub, className }: { label: string; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={cn("surface rounded-2xl px-3.5 py-3", className)}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</div>
      <div className="num mt-1 text-[28px] font-semibold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-muted">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-accent" />
      {label}
    </div>
  );
}

/** Fade-and-rise entrance for page sections, staggered by index. */
export function Reveal({ children, i = 0, className }: { children: ReactNode; i?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function PageHeader({ eyebrow, title, right }: { eyebrow?: string; title: ReactNode; right?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3 pt-1">
      <div>
        {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{eyebrow}</p>}
        <h1 className="text-[30px] font-bold leading-tight tracking-tight">{title}</h1>
      </div>
      {right}
    </header>
  );
}
