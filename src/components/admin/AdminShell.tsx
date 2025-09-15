"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
const NAV = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/entries/new", label: "Create Entry" },
    { href: "/admin/entries", label: "Manage Entries" },
    { href: "/admin/posts/new", label: "Create Post" },
    { href: "/admin/posts", label: "Manage Posts" },
    { href: "/admin/galleries/new", label: "Create Gallery" },
    { href: "/admin/galleries", label: "Manage Galleries" },
    { href: "/admin/tags", label: "Manage Tags" },
    { href: "/admin/users", label: "User Management" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
    const [authed, setAuthed] = useState(false);
    const [form, setForm] = useState({ username: "", password: "" });
    const pathname = usePathname();

    useEffect(() => {
        fetch("/api/admin/me").then((res) => setAuthed(res.ok));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch("/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });
        setAuthed(res.ok);
    };

    if (!authed) {
        return (
            <div className="p-6 max-w-lg mx-auto">
                <Card className="space-y-4 p-4">
                    <h1 className="retro-title">Admin Login</h1>
                    <p className="text-sm text-[var(--subt)]">
                        Sign in to access the admin tools.
                    </p>
                    <form className="space-y-2" onSubmit={handleSubmit}>
                        <input
                            className="retro-input w-full"
                            placeholder="Username"
                            value={form.username}
                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                        />
                        <input
                            type="password"
                            className="retro-input w-full"
                            placeholder="Password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />
                        <Button type="submit" variant="primary" className="w-full">
                            Sign in
                        </Button>
                    </form>
                </Card>
            </div>
        );
    }

    const signOut = async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        setAuthed(false);
    };

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
                    <Button onClick={signOut}>Sign out</Button>
                </div>
            </Card>

            {/* Main content */}
            <div className="min-h-[60vh]">{children}</div>
        </div>
    );
}
