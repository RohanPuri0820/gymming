"use client";

import { Dumbbell } from "lucide-react";
import { useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { Button, Card } from "./ui";

export function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (res.error) return setMsg({ kind: "err", text: res.error.message });
    if (mode === "up" && !res.data.session)
      setMsg({ kind: "ok", text: "Check your email to confirm your account, then sign in." });
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5">
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-2xl bg-accent p-3 text-accent-ink">
          <Dumbbell size={26} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Gym Tracker</h1>
          <p className="text-sm text-muted">Log fast. Train smart.</p>
        </div>
      </div>
      {!supabaseConfigured ? (
        <Card>
          <p className="font-semibold">Supabase isn&apos;t configured yet</p>
          <p className="mt-2 text-sm text-muted">
            Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
            <code>.env.local</code> and restart the app.
          </p>
        </Card>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 w-full rounded-xl border border-line bg-card px-4 outline-none focus:border-accent"
          />
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 w-full rounded-xl border border-line bg-card px-4 outline-none focus:border-accent"
          />
          <Button variant="primary" size="lg" className="w-full" disabled={busy}>
            {busy ? "…" : mode === "in" ? "Sign in" : "Create account"}
          </Button>
          {msg && <p className={msg.kind === "err" ? "text-sm text-red-300" : "text-sm text-accent"}>{msg.text}</p>}
          <button
            type="button"
            onClick={() => setMode(mode === "in" ? "up" : "in")}
            className="w-full py-2 text-sm text-muted"
          >
            {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
          </button>
        </form>
      )}
    </div>
  );
}
