"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import Uploader from "@/components/Uploader";

type GalleryForm = {
    name: string;
    images: string[];           // 🔑 keep as array
    eventMonth?: number;
    eventYear?: number;
    tagIds?: string[];
};

export default function NewGalleryPage() {
    const [g, setG] = useState<GalleryForm>({ name: "", images: [] });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    const onUploaded = (urls: string[]) => {
        // The uploader returns URLs; attach them to the form state
        setG(prev => ({ ...prev, images: [...prev.images, ...urls] }));
    };

    const removeAt = (i: number) => {
        setG(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) }));
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsg(null);

        const name = g.name.trim();
        if (!name) { setMsg("Please enter a gallery name."); return; }
        if (g.images.length === 0) { setMsg("Add at least one image."); return; }

        setSaving(true);
        try {
            const res = await fetch("/api/galleries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    images: g.images,                // 🔑 send the array
                    eventMonth: g.eventMonth || undefined,
                    eventYear: g.eventYear || undefined,
                    tags: g.tagIds ?? [],
                }),
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j?.error || "Failed to create gallery");
            }
            setMsg("Gallery created ✅");
            setG({ name: "", images: [] });
        } catch (err: any) {
            setMsg(err.message || "Error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-4 max-w-3xl mx-auto">
            <h1 className="retro-title mb-3">Create Gallery</h1>
            <Card className="p-4">
                <form onSubmit={onSubmit} className="grid gap-3">
                    {msg && <div className="text-sm">{msg}</div>}

                    <Input
                        placeholder="Gallery name"
                        value={g.name}
                        onChange={(e) => setG(v => ({ ...v, name: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && e.preventDefault()} // avoid accidental submit
                    />

                    {/* optional date fields if you use them */}
                    <div className="grid grid-cols-2 gap-2">
                        <Input
                            type="number"
                            placeholder="Month (1-12)"
                            value={g.eventMonth ?? ""}
                            onChange={(e) => setG(v => ({ ...v, eventMonth: e.target.value ? Number(e.target.value) : undefined }))}
                            min={1} max={12}
                        />
                        <Input
                            type="number"
                            placeholder="Year (e.g., 2025)"
                            value={g.eventYear ?? ""}
                            onChange={(e) => setG(v => ({ ...v, eventYear: e.target.value ? Number(e.target.value) : undefined }))}
                            min={1900} max={3000}
                        />
                    </div>

                    {/* DRAG & DROP uploader: only uploads files and returns URLs */}
                    <Uploader onUploaded={onUploaded} className="mt-2" />

                    {/* Preview of images that will be saved */}
                    {g.images.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {g.images.map((url, i) => (
                                <div key={i} className="relative border" style={{ borderColor: "var(--border)" }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={url} alt={`img-${i}`} className="w-full h-32 object-cover" />
                                    <button
                                        type="button"   // 🔒 not submit
                                        className="retro-btn absolute top-1 right-1"
                                        onClick={() => removeAt(i)}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-2 mt-2">
                        <Button type="submit" variant="primary" disabled={saving}>
                            {saving ? "Saving…" : "Save Gallery"}
                        </Button>
                        <Button
                            type="button"
                            onClick={() => setG({ name: "", images: [] })}
                        >
                            Clear
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
