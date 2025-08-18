// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
    content: ["./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                // Light theme
                base: {
                    bg: "#f6f6f6",
                    surface: "#ffffff",
                    border: "#1a1a1a",
                    text: "#111111",
                    subt: "#444444",
                    accent: "#0b5fff",
                    accent2: "#ffb300",
                    muted: "#e5e5e5",
                },
                // Dark theme
                dark: {
                    bg: "#0f0f10",
                    surface: "#141416",
                    border: "#d2d2d2",
                    text: "#f7f7f8",
                    subt: "#c0c0c0",
                    accent: "#6aa0ff",
                    accent2: "#ffd166",
                    muted: "#2a2a2e",
                },
            },
            boxShadow: {
                // Flat retro “hard” shadows
                retro: "2px 2px 0 0 rgba(0,0,0,0.85)",
                retroInset: "inset 2px 2px 0 0 rgba(255,255,255,0.9)",
            },
            borderRadius: {
                retro: "0.25rem", // subtle, almost square
            },
            fontFamily: {
                // headings get a retro monospace; body stays modern/readable
                monoRetro: ["VT323", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
                body: ["Inter", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
            },
        },
    },
    plugins: [],
} satisfies Config;
