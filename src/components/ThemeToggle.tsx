"use client";
import { useEffect, useState } from "react";

type Mode = "light" | "dark";

export default function ThemeToggle({ className }: { className?: string }) {
    const [mounted, setMounted] = useState(false);
    const [mode, setMode] = useState<Mode>("light"); // SSR default

    // Initialize on client only
    useEffect(() => {
        setMounted(true);
        try {
            const saved = (localStorage.getItem("theme") as Mode | null) ?? null;
            const prefersDark =
                typeof window !== "undefined" &&
                window.matchMedia &&
                window.matchMedia("(prefers-color-scheme: dark)").matches;

            const initial: Mode = saved ?? (prefersDark ? "dark" : "light");
            setMode(initial);
            if (typeof document !== "undefined") {
                document.body.setAttribute("data-theme", initial);
            }
        } catch {/* ignore */}
    }, []);

    const toggle = () => {
        const next: Mode = mode === "light" ? "dark" : "light";
        setMode(next);
        if (typeof document !== "undefined") {
            document.body.setAttribute("data-theme", next);
        }
        try { localStorage.setItem("theme", next); } catch {/* ignore */}
    };

    return (
        <button
            className={`retro-btn ${className ?? ""}`}
    onClick={toggle}
    aria-label="Toggle theme"
    aria-pressed={mode === "dark"}
>
    {/* Avoid hydration text mismatch */}
    <span suppressHydrationWarning>
    {mounted ? (mode === "light" ? "Dark" : "Light") : "Theme"}
    </span>
    </button>
);
}
