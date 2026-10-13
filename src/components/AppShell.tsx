"use client";

import { Dumbbell, History, Home, Library, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { useData, useWorkout } from "@/lib/store";
import { cn, fmtDuration } from "@/lib/util";
import { Login } from "./Login";
import { Onboarding } from "./Onboarding";
import { Spinner } from "./ui";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/exercises", label: "Exercises", icon: Library },
  { href: "/workout", label: "Workout", icon: Dumbbell },
  { href: "/history", label: "History", icon: History },
  { href: "/profile", label: "Profile", icon: User },
];

const noop = () => () => {};

export function AppShell({ children }: { children: ReactNode }) {
  // false during prerender, true in the browser: the app is fully client-rendered
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const ready = useData((s) => s.ready);
  const session = useData((s) => s.session);
  const profile = useData((s) => s.profile);
  const profileLoaded = useData((s) => s.profileLoaded);
  const setSession = useData((s) => s.setSession);
  const syncPending = useData((s) => s.syncPending);
  const active = useWorkout((s) => s.active);
  const pending = useWorkout((s) => s.pending.length);
  const pathname = usePathname();

  useEffect(() => {
    if (!supabaseConfigured) {
      setSession(null);
      return;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    const online = () => syncPending();
    window.addEventListener("online", online);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener("online", online);
    };
  }, [setSession, syncPending]);

  // Pages stay mounted (hidden) behind the gate screens: each page guards itself with
  // requireProfile, and Next expects the page segment to always be rendered.
  const gate =
    !mounted || !ready ? <Spinner /> : !session ? <Login /> : !profileLoaded ? <Spinner label="Loading your data…" /> : !profile ? <Onboarding /> : null;
  if (gate)
    return (
      <>
        {gate}
        <div hidden>{children}</div>
      </>
    );

  // Focused screens bring their own bottom bar
  const focusMode = (pathname.startsWith("/workout") && !!active) || pathname.startsWith("/plan");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      {pending > 0 && (
        <div className="bg-amber-400/10 px-4 py-1.5 text-center text-xs text-amber-200">
          {pending} workout{pending > 1 ? "s" : ""} saved on this phone · syncs when you&apos;re online
        </div>
      )}
      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={cn("flex-1 px-4 pt-[max(env(safe-area-inset-top),16px)]", focusMode ? "pb-10" : "pb-36")}
      >
        {children}
      </motion.main>

      {!focusMode && (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg px-3 pb-[max(env(safe-area-inset-bottom),12px)]">
          {active && <LiveBar title={active.title} startedAt={active.startedAt} />}
          <nav className="glass flex items-center justify-around rounded-[26px] border border-white/10 px-2 py-1.5 shadow-[0_20px_50px_-20px_rgb(0_0_0/0.9)]">
            {NAV.map(({ href, label, icon: Icon }) => {
              const on = href === "/" ? pathname === "/" : pathname.startsWith(href);
              if (href === "/workout")
                return (
                  <Link key={href} href={href} aria-label={label} className="-mt-7">
                    <span className="glow-accent flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-ink ring-4 ring-bg transition active:scale-95">
                      <Icon size={26} strokeWidth={2.4} />
                    </span>
                  </Link>
                );
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative flex w-16 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10.5px] font-medium transition",
                    on ? "text-ink" : "text-muted",
                  )}
                >
                  {on && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 -z-10 rounded-2xl bg-white/[0.08]"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  )}
                  <Icon size={21} strokeWidth={on ? 2.4 : 1.9} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}

function LiveBar({ title, startedAt }: { title: string; startedAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <Link
      href="/workout"
      className="glass mb-2 flex items-center gap-3 rounded-2xl border border-accent/30 px-4 py-2.5 shadow-[0_0_30px_-12px_rgb(198_244_50/0.6)]"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</span>
      <span className="num text-xl text-accent">{fmtDuration((now - new Date(startedAt).getTime()) / 1000)}</span>
      <span className="text-xs font-semibold text-muted">Resume</span>
    </Link>
  );
}
