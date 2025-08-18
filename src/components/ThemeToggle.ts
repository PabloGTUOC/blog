// src/components/ThemeToggle.tsx
"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
    const [mode, setMode] = useState<"light" | "dark">("light");
    useEffect(() => {
        const m = (localStorage.getItem("theme") as "light" | "dark") || "light";
        setMode(m);
        document.body.setAttribute("data-theme", m);
    }, []);
    return (
        <button
            className="retro-btn ml-2"
    onClick={() => {
        const next = mode === "light" ? "dark" : "light";
        setMode(next);
        localStorage.setItem("theme", next);
        document.body.setAttribute("data-theme", next);
    }}
>
    {mode === "light" ? "Dark" : "Light"}
    </button>
);
}
