"use client";

import { X } from "lucide-react";
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/util";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none select-none",
        size === "sm" && "h-9 px-3 text-sm",
        size === "md" && "h-11 px-4 text-sm",
        size === "lg" && "h-14 px-6 text-base",
        variant === "primary" && "bg-accent text-accent-ink",
        variant === "secondary" && "bg-card2 text-ink border border-line",
        variant === "ghost" && "text-muted hover:text-ink",
        variant === "danger" && "bg-red-500/15 text-red-300 border border-red-500/30",
        className,
      )}
      {...rest}
    />
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border border-line bg-card p-4", className)}>{children}</div>;
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
        "shrink-0 rounded-full border px-3 py-1.5 text-sm transition select-none",
        active ? "border-accent bg-accent/15 text-accent" : "border-line bg-card2 text-muted",
        className,
      )}
    >
      {children}
    </button>
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
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-t border-line bg-card pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-card px-4 py-3">
          <div className="min-w-0 truncate text-base font-semibold">{title}</div>
          <button onClick={onClose} className="rounded-full p-2 text-muted hover:text-ink" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl bg-card2 px-3 py-2">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-muted">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent" />
      {label}
    </div>
  );
}
