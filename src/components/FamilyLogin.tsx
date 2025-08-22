"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function FamilyLogin() {
    const [loading, setLoading] = useState(false);

    const signIn = async () => {
        setLoading(true);
        try {
            await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo:
                        typeof window !== "undefined"
                            ? `${window.location.origin}/auth/callback?next=/family`
                            : undefined,
                    // ask for refresh token; useful for SSR
                    queryParams: { access_type: "offline", prompt: "consent" },
                },
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-lg mx-auto">
            <Card className="space-y-4 p-4">
                <h1 className="retro-title">Family</h1>
                <p className="text-sm text-[var(--subt)]">Sign in to view family galleries.</p>
                <Button onClick={signIn} variant="primary" disabled={loading}>
                    {loading ? "Redirecting…" : "Sign in with Google"}
                </Button>
            </Card>
        </div>
    );
}
