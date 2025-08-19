// src/components/TopNav.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

export default function TopNav() {
    const pathname = usePathname();
    const router = useRouter();

    const canGoBack = pathname !== "/";

    return (
        <nav className="retro-toolbar">
            <button
                className="retro-btn"
                onClick={() => router.back()}
                disabled={!canGoBack}
                aria-disabled={!canGoBack}
                title="Back"
            >
                ← Back
            </button>

            <Link href="/" className="retro-btn" title="Home">
                Home
            </Link>

            <span className="retro-title ml-2">Portfolio</span>

            <div className="ml-auto flex items-center gap-2">
                <ThemeToggle />
            </div>
        </nav>
    );
}
