"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * images: list of image URLs
 * thumbRatio: "square" | "4/3" | "3/2" | "16/9" (controls thumbnail slot size)
 */
export default function GalleryViewer({
                                          images,
                                          thumbRatio = "square",
                                      }: {
    images: string[];
    thumbRatio?: "square" | "4/3" | "3/2" | "16/9";
}) {
    const [open, setOpen] = useState(false);
    const [idx, setIdx] = useState(0);

    const ratioClass =
        thumbRatio === "square"
            ? "aspect-square"
            : thumbRatio === "4/3"
                ? "aspect-[4/3]"
                : thumbRatio === "3/2"
                    ? "aspect-[3/2]"
                    : "aspect-[16/9]";

    const openAt = (i: number) => { setIdx(i); setOpen(true); };
    const close = useCallback(() => setOpen(false), []);
    const prev = useCallback(() => setIdx((i) => (i - 1 + images.length) % images.length), [images.length]);
    const next = useCallback(() => setIdx((i) => (i + 1) % images.length), [images.length]);

    // Keyboard + scroll lock
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
            else if (e.key === "ArrowLeft") prev();
            else if (e.key === "ArrowRight") next();
        };
        window.addEventListener("keydown", onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [open, close, prev, next]);

    return (
        <>
            {/* UNIFORM THUMBNAIL GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {images.map((url, i) => (
                    <button
                        key={i}
                        type="button"
                        className="block relative overflow-hidden rounded group"
                        onClick={() => openAt(i)}
                        aria-label={`Open image ${i + 1}`}
                    >
                        <div className={`${ratioClass} w-full bg-[var(--muted)] relative`}>
                            {/* cover = same slot for portrait & landscape */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={url}
                                alt={`image-${i + 1}`}
                                loading="lazy"
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03] cursor-zoom-in"
                            />
                        </div>
                    </button>
                ))}
            </div>

            {/* LIGHTBOX */}
            {open && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3"
                    role="dialog"
                    aria-modal="true"
                    onClick={close}
                >
                    <div
                        className="relative border bg-[var(--surface)]"
                        style={{
                            borderColor: "var(--border)",
                            boxShadow: "8px 8px 0 rgba(0,0,0,.9)",
                            maxWidth: "90vw",      // tweak to 70vw if you want stricter 70%
                            maxHeight: "80vh",     // tweak to 70vh for exact 70%
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={images[idx]}
                            alt={`image-${idx + 1}`}
                            className="block object-contain"
                            style={{ maxWidth: "90vw", maxHeight: "80vh" }}
                        />

                        <button className="retro-btn absolute top-2 right-2" onClick={close} aria-label="Close">×</button>
                        {images.length > 1 && (
                            <>
                                <button className="retro-btn absolute left-2 top-1/2 -translate-y-1/2" onClick={prev} aria-label="Previous">←</button>
                                <button className="retro-btn absolute right-2 top-1/2 -translate-y-1/2" onClick={next} aria-label="Next">→</button>
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs px-2 py-1 border bg-[var(--surface)]" style={{ borderColor: "var(--border)" }}>
                                    {idx + 1} / {images.length}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
