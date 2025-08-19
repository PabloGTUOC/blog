"use client";
import { useRef } from "react";

export default function Carousel({
                                     title,
                                     children,
                                 }: {
    title: string;
    children: React.ReactNode;
}) {
    const scroller = useRef<HTMLDivElement>(null);

    const scroll = (dir: number) => {
        const el = scroller.current;
        if (!el) return;
        el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: "smooth" });
    };

    return (
        <section className="space-y-2">
            <div className="flex items-center gap-2">
                <h2 className="retro-title m-0">{title}</h2>
                <div className="ml-auto flex gap-2">
                    <button className="retro-btn" onClick={() => scroll(-1)} aria-label="Scroll left">←</button>
                    <button className="retro-btn" onClick={() => scroll(1)} aria-label="Scroll right">→</button>
                </div>
            </div>

            <div
                ref={scroller}
                className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
                style={{ scrollBehavior: "smooth" }}
            >
                {children}
            </div>
        </section>
    );
}
