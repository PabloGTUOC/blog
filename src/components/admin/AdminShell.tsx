"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const NAV = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/posts/new", label: "Create Post" },
    { href: "/admin/posts", label: "Manage Posts" },
    { href: "/admin/galleries/new", label: "Create Gallery" },
    { href: "/admin/galleries", label: "Manage Galleries" },
    { href: "/admin/tags", label: "Manage Tags" },
    { href: "/admin/users", label: "User Management" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const pathname = usePathname();

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => setSession(data.session));
        const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
        return () => listener.subscription.unsubscribe();
    }, []);

    if (!session) {
        return (
            <div className="p-6 max-w-lg mx-auto">
                <Card className="space-y-4 p-4">
                    <h1 className="retro-title">Admin Login</h1>
                    <p className="text-sm text-[var(--subt)]">
                        Sign in to access the admin tools.
                    </p>
                    <Button
                        onClick={() =>
                            supabase.auth.signInWithOAuth({
                                provider: "google",
                                options: {
                                    redirectTo: typeof window !== "undefined" ? `${window.location.origin}/admin` : undefined,
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

    return (
        <div className="grid md:grid-cols-[220px_minmax(0,1fr)] gap-4 p-4">
            {/* Left menu */}
            <Card className="p-3 h-max sticky top-4">
                <div className="retro-title mb-2">Admin</div>
                <nav className="grid gap-1">
                    {NAV.map((n) => {
                        const active = pathname === n.href;
                        return (
                            <Link
                                key={n.href}
                                href={n.href}
                                className={`retro-btn ${active ? "bg-[var(--accent)] text-white border-black" : ""}`}
                            >
                                {n.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="mt-3">
                    <Button onClick={() => supabase.auth.signOut()}>Sign out</Button>
                </div>
            </Card>

            {/* Main content */}
            <div className="min-h-[60vh]">{children}</div>
        </div>
    );
}
