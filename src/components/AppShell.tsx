"use client";

import { Dumbbell, History, Home, Library, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { useData, useWorkout } from "@/lib/store";
import { cn } from "@/lib/util";
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

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      {pending > 0 && (
        <div className="bg-amber-500/15 px-4 py-1.5 text-center text-xs text-amber-200">
          {pending} workout{pending > 1 ? "s" : ""} saved on this phone, will sync when you&apos;re online
        </div>
      )}
      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur pb-safe">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const on = href === "/" ? pathname === "/" : pathname.startsWith(href);
            const live = href === "/workout" && active;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex flex-col items-center gap-1 py-2.5 text-[11px]",
                  on ? "text-accent" : "text-muted",
                )}
              >
                <Icon size={22} />
                {label}
                {live && <span className="absolute right-[30%] top-2 h-2 w-2 rounded-full bg-accent" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
