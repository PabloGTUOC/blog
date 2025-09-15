"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import Uploader from "@/components/Uploader";

type EntryForm = {
    title: string;
    caption: string;
    imageUrl: string;
    date: string;
};

export default function NewEntryPage() {
    const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
    const [entry, setEntry] = useState<EntryForm>({
        title: "",
        caption: "",
        imageUrl: "",
        date: today,
    });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);
        setMsg(null);
        try {
            const payload: Record<string, unknown> = {
                title: entry.title,
                caption: entry.caption,
                imageUrl: entry.imageUrl,
            };
            if (entry.date) {
                payload.publishedAt = new Date(`${entry.date}T00:00:00`).toISOString();
            }

            const res = await fetch("/api/entries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const raw = (await res.json().catch(() => ({}))) as unknown;
                const message =
                    typeof raw === "object" && raw !== null && "message" in raw && typeof (raw as { message?: unknown }).message === "string"
                        ? (raw as { message: string }).message
                        : undefined;
                throw new Error(message || "Failed to create entry");
            }

            setMsg("Saved!");
            setEntry({ title: "", caption: "", imageUrl: "", date: today });
        } catch (error: unknown) {
            setMsg(error instanceof Error ? error.message : "Error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-4 max-w-2xl mx-auto">
            <h1 className="retro-title mb-3">Create Entry</h1>
            <Card className="p-4">
                <form onSubmit={onSubmit} className="grid gap-3">
                    {msg && <div className="text-sm">{msg}</div>}

                    <Input
                        placeholder="Title"
                        value={entry.title}
                        onChange={(e) => setEntry((v) => ({ ...v, title: e.target.value }))}
                    />

                    <Input
                        type="date"
                        value={entry.date}
                        onChange={(e) => setEntry((v) => ({ ...v, date: e.target.value }))}
                    />

                    <Uploader
                        multiple={false}
                        accept="image/*"
                        onUploaded={(urls) =>
                            setEntry((v) => ({ ...v, imageUrl: urls[0] ?? v.imageUrl }))
                        }
                    />

                    {entry.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={entry.imageUrl} alt="preview" className="w-full rounded border border-[var(--border)]" />
                    )}

                    <Input
                        placeholder="Image URL"
                        value={entry.imageUrl}
                        onChange={(e) => setEntry((v) => ({ ...v, imageUrl: e.target.value }))}
                    />

                    <textarea
                        className="retro-input min-h-[120px]"
                        placeholder="Caption"
                        value={entry.caption}
                        onChange={(e) => setEntry((v) => ({ ...v, caption: e.target.value }))}
                    />

                    <div className="flex gap-2">
                        <Button type="submit" variant="primary" disabled={saving}>
                            {saving ? "Saving…" : "Save Entry"}
                        </Button>
                        <Button
                            type="button"
                            onClick={() => setEntry({ title: "", caption: "", imageUrl: "", date: today })}
                        >
                            Clear
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
