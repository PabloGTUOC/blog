"use client";

import { useRef, useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import Uploader from "@/components/Uploader";
import { startGooglePhotosPick } from "@/utils/googlePhotosPicker";

type ClientProps = { id: string; name: string; initialImages: string[] };

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_PHOTOS_CLIENT_ID;
const GOOGLE_ENABLED = Boolean(GOOGLE_CLIENT_ID);

export default function Client({ id, name, initialImages }: ClientProps) {
    const [images, setImages] = useState(initialImages);
    const [importing, setImporting] = useState(false);
    const [waiting, setWaiting] = useState<{ uri: string } | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    // Abort polling if the component unmounts
    useEffect(() => {
        return () => abortRef.current?.abort();
    }, []);

    async function uploadSelected(files: File[]) {
        if (!files.length) return { urls: [] as string[] };

        const form = new FormData();
        files.forEach((f) => form.append("files", f)); // server expects "files"
        const res = await fetch(`/api/family/galleries/${id}/upload`, { method: "POST", body: form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Upload failed");
        // be tolerant to response shapes: {urls: string[]} or { urls }
        const urls: string[] = Array.isArray(data?.urls) ? data.urls : [];
        return { urls };
    }

    const importFromGooglePhotos = async () => {
        if (!GOOGLE_ENABLED || !GOOGLE_CLIENT_ID || importing) return;
        setImporting(true);

        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const { start, finish } = startGooglePhotosPick({ clientId: GOOGLE_CLIENT_ID });

            // 1) create session and get pickerUri
            const { sessionId, pickerUri } = await start();
            setWaiting({ uri: pickerUri });

            // 2) open picker (if blocked, user can click link in the overlay)
            window.open(pickerUri, "_blank", "noopener,noreferrer");

            // 3) wait for Done, then download files
            const { files, failures } = await finish(sessionId, {
                signal: controller.signal,
                timeoutMs: 10 * 60 * 1000,
                intervalMs: 1500,
            });

            // This uploader only accepts images; skip videos if any
            const imagesOnly = files.filter((f) => f.type.startsWith("image/"));
            const skipped = files.length - imagesOnly.length;

            // 4) upload to the same endpoint the Uploader uses
            const { urls } = await uploadSelected(imagesOnly);
            if (urls.length) setImages((prev) => prev.concat(urls));

            if (failures || skipped) {
                const parts = [];
                if (failures) parts.push(`${failures} download failure${failures === 1 ? "" : "s"}`);
                if (skipped) parts.push(`${skipped} video${skipped === 1 ? "" : "s"} skipped`);
                alert(parts.join("; "));
            }
        } catch (err) {
            if (!(err instanceof DOMException && err.name === "AbortError")) {
                console.error(err);
                alert(err instanceof Error ? err.message : String(err));
            }
        } finally {
            setWaiting(null);
            setImporting(false);
            abortRef.current = null;
        }
    };

    return (
        <div className="space-y-3">
            <h1 className="retro-title">Add Photos – {name}</h1>
            <Card className="space-y-3 p-4">
                {/* Normal OS file picker */}
                <Uploader
                    multiple
                    accept="image/*"
                    to={`/api/family/galleries/${id}/upload`}
                    onUploaded={(urls) => setImages((prev) => [...prev, ...urls])}
                />

                {/* Google Photos import */}
                {GOOGLE_ENABLED ? (
                    <button
                        type="button"
                        className="retro-btn"
                        onClick={importFromGooglePhotos}
                        disabled={importing}
                    >
                        {importing ? "Loading Google Photos…" : "Import from Google Photos"}
                    </button>
                ) : (
                    <div className="text-xs text-[var(--subt)]">
                        Set <code>NEXT_PUBLIC_GOOGLE_PHOTOS_CLIENT_ID</code> to enable Google Photos import.
                    </div>
                )}

                {/* Thumbnails */}
                {images.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {images.map((src, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={src} alt="img" className="w-24 h-24 object-cover" />
                        ))}
                    </div>
                )}
            </Card>

            {/* Waiting overlay while user picks in Google Photos */}
            {waiting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white text-black rounded-2xl p-4 w-[min(92vw,460px)] space-y-2 shadow-xl">
                        <div className="font-medium text-lg">Finish selection in Google Photos</div>
                        <p className="text-sm text-gray-700">
                            A picker opened in a new tab. If you’re on desktop, open this link on your phone,
                            select photos, and tap <b>Done</b>:
                        </p>
                        <a
                            href={waiting.uri}
                            target="_blank"
                            rel="noreferrer"
                            className="break-all underline text-blue-700"
                        >
                            {waiting.uri}
                        </a>
                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    abortRef.current?.abort();
                                    setWaiting(null);
                                }}
                                className="retro-btn"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => window.open(waiting.uri, "_blank", "noopener,noreferrer")}
                                className="retro-btn"
                            >
                                Open again
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">
                            Keep this page open; your photos will appear here and upload automatically when you finish.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
