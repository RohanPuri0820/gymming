-- Gym tracker schema. Paste into Supabase → SQL Editor → Run.
-- Safe to re-run.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  goal text not null default 'general'
    check (goal in ('general', 'weight_loss', 'muscle', 'strength', 'mobility')),
  level text not null default 'beginner'
    check (level in ('beginner', 'intermediate', 'expert')),
  units text not null default 'kg' check (units in ('kg', 'lb')),
  session_minutes int not null default 60 check (session_minutes between 15 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Workout ids are generated on the phone so an offline save can be retried safely.
create table if not exists public.workouts (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  focus text not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists workouts_user_started_idx on public.workouts (user_id, started_at desc);

create table if not exists public.workout_sets (
  id uuid primary key,
  workout_id uuid not null references public.workouts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id text not null,
  section text not null default 'main' check (section in ('warmup', 'main', 'cooldown')),
  item_order int not null,
  set_number int not null,
  weight numeric(6, 2),
  reps int,
  duration_sec int,
  completed_at timestamptz not null
);
create index if not exists workout_sets_user_exercise_idx
  on public.workout_sets (user_id, exercise_id, completed_at desc);
create index if not exists workout_sets_workout_idx on public.workout_sets (workout_id);

create table if not exists public.body_weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  measured_on date not null,
  weight numeric(5, 2) not null,
  unique (user_id, measured_on)
);

-- Row level security: every user can only see and change their own rows.
alter table public.profiles enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;
alter table public.body_weights enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "own workouts" on public.workouts;
create policy "own workouts" on public.workouts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own sets" on public.workout_sets;
create policy "own sets" on public.workout_sets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own body weights" on public.body_weights;
create policy "own body weights" on public.body_weights
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
