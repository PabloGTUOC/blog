// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Inter, VT323 } from "next/font/google";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const vt323 = VT323({ weight: "400", subsets: ["latin"], variable: "--font-vt323" });

export const metadata: Metadata = {
    title: "Photo Portfolio",
    description: "Family & personal photo portfolio",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} ${vt323.variable} antialiased`} data-theme="light">
        {/* Set theme ASAP to avoid flash */}
        <script
            dangerouslySetInnerHTML={{
                __html: `
              try {
                var saved = localStorage.getItem('theme');
                var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                var m = saved ? saved : (prefersDark ? 'dark' : 'light');
                document.body.setAttribute('data-theme', m);
              } catch (e) {}
            `,
            }}
        />
        {/* Background wrapper: horizontally centered, near top with padding (see .site-bg in globals.css) */}
        <div className="site-bg">
            {/* Centered app container */}
            <div className="app-frame">
                {/* Top menu / toolbar */}
                <nav className="retro-toolbar">
                    <Link href="/" className="retro-btn" title="Home">Home</Link>
                    <Link href="/galleries" className="retro-btn">Galleries</Link>
                    <Link href="/blog" className="retro-btn">Blog</Link>
                    <Link href="/admin" className="retro-btn">Admin</Link>

                    <span className="retro-title ml-2">Portfolio</span>

                    <div className="ml-auto flex items-center gap-2">
                        <ThemeToggle />
                    </div>
                </nav>

                {/* Page content */}
                <main className="p-4 md:p-6">{children}</main>
            </div>
        </div>
        </body>
        </html>
    );
}
