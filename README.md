# Gym Tracker

A personal gym tracker built for your phone. It logs workouts quickly, builds workouts from your goal, level and recovery, and shows a rotatable 3D muscle map.

**Stack:** Next.js 16 (client-rendered PWA) · Tailwind · react-three-fiber · Supabase (auth + Postgres) · Vercel

## Setup

1. **Database:** open Supabase → SQL Editor, paste [supabase/schema.sql](supabase/schema.sql) and run it.
2. **Auth:** go to Supabase → Authentication → Sign In / Providers → Email.
   - For a personal app, turn **off** "Confirm email" so sign-up logs you straight in.
   - After you've created your account, you can turn off "Allow new users to sign up".
3. **Env:** copy `.env.local.example` to `.env.local` and fill in your project URL and anon key.
4. **Run:** `npm install && npm run dev`, then open http://localhost:3000.

## Deploy (Vercel)

1. Push this folder to a GitHub repo, then import it in Vercel.
2. Add the two `NEXT_PUBLIC_SUPABASE_*` env vars.
3. In Supabase → Authentication → URL Configuration, set **Site URL** to your Vercel URL.
4. On your phone, open the site and choose Add to Home Screen.

## How it works

| Piece | Where |
|---|---|
| Exercise library (876 exercises, public-domain [free-exercise-db](https://github.com/yuhonas/free-exercise-db)) | `public/exercises.json`, rebuilt with `node scripts/build-exercises.mjs` |
| Curated staples the generator picks from (tiered by difficulty) | `src/lib/staples.ts` |
| Workout generator: focus, goal, level, time budget, recovery, progression | `src/lib/generator.ts` |
| Recovery, weekly volume, overdue muscles, PRs | `src/lib/analytics.ts` |
| 3D body (procedural, each muscle group is a tappable mesh) | `src/components/body/` |
| Active workout and offline save queue (localStorage) | `src/lib/store.ts` (`useWorkout`) |
| Supabase data | `src/lib/store.ts` (`useData`) |

**Progression rule (double progression):** when you hit the top of the rep range on every set, the next session suggests more weight: +2.5 kg (or +5 kg for big lower-body lifts).

**Offline:** the active workout lives on your phone. Finished workouts are saved locally first, then synced to Supabase, and retried automatically when you're back online.
