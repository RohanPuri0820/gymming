"use client";

import { ProfileForm } from "./ProfileForm";

export function Onboarding() {
  return (
    <div className="mx-auto max-w-lg px-5 py-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Welcome</p>
      <h1 className="num mt-1 text-[44px] font-bold uppercase">Let&apos;s set you up</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        This shapes the workouts the app builds for you. You can change it any time in Profile.
      </p>
      <ProfileForm submitLabel="Start training" />
    </div>
  );
}
