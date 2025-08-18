import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, VT323 } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const vt323 = VT323({ weight: "400", subsets: ["latin"], variable: "--font-vt323" });


const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Photo Portfolio",
    description: "Family & personal photo portfolio",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} ${vt323.variable} antialiased`} data-theme="light">
        <div className="retro-toolbar">
            <span className="retro-title">Portfolio</span>
            <div className="ml-auto text-xs text-[var(--subt)]">retro mode</div>
        </div>
        <main className="max-w-5xl mx-auto p-4">{children}</main>
        </body>
        </html>
    );
}
