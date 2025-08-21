"use client";

import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function FamilyLogin() {
  return (
    <div className="p-6 max-w-lg mx-auto">
      <Card className="space-y-4 p-4">
        <h1 className="retro-title">Family</h1>
        <p className="text-sm text-[var(--subt)]">Sign in to view family galleries.</p>
        <Button
          onClick={() =>
            supabase.auth.signInWithOAuth({
              provider: "google",
              options: {
                redirectTo:
                  typeof window !== "undefined" ? `${window.location.origin}/family` : undefined,
                queryParams: { access_type: "offline", prompt: "consent" },
              },
            })
          }
          variant="primary"
        >
          Sign in with Google
        </Button>
      </Card>
    </div>
  );
}
