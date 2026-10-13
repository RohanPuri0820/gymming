"use client";

import { requireProfile } from "@/components/RequireProfile";
import { useState } from "react";
import { ProfileForm } from "@/components/ProfileForm";
import { Button, Card, PageHeader } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useData } from "@/lib/store";

function ProfilePage() {
  const profile = useData((s) => s.profile);
  const email = useData((s) => s.session?.user.email);
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Settings" title="Profile" />
      <Card>
        <ProfileForm
          initial={profile}
          submitLabel={saved ? "Saved ✓" : "Save changes"}
          onSaved={() => {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }}
        />
      </Card>
      <Card className="space-y-2 text-sm">
        <h2 className="font-semibold">Use it like an app</h2>
        <p className="text-muted">
          iPhone: open in Safari → Share → <b>Add to Home Screen</b>. Android: Chrome menu → <b>Install app</b>.
          It opens full-screen and keeps the screen awake during workouts.
        </p>
      </Card>
      <Card className="flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate text-muted">{email}</span>
        <Button size="sm" onClick={() => supabase.auth.signOut()}>
          Sign out
        </Button>
      </Card>
      <p className="text-center text-xs text-muted">
        Exercise library: free-exercise-db (public domain).
      </p>
    </div>
  );
}

export default requireProfile(ProfilePage);
