"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import Uploader from "@/components/Uploader";

type EntryForm = {
    title: string;
    caption: string;
    imageUrl: string;
    date: string;
    tags: string[];
};

type TagOption = { _id: string; name: string };

export default function NewEntryPage() {
    const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
    const [entry, setEntry] = useState<EntryForm>({
        title: "",
        caption: "",
        imageUrl: "",
        date: today,
        tags: [],
    });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [allTags, setAllTags] = useState<TagOption[]>([]);
    const [entryId, setEntryId] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/tags");
                if (!res.ok) return;
                const data: unknown = await res.json();
                if (!Array.isArray(data)) return;

                const normalized = data
                    .map((item) => {
                        if (!item || typeof item !== "object") return null;
                        const raw = item as { _id?: unknown; name?: unknown };
                        const id =
                            typeof raw._id === "string"
                                ? raw._id
                                : raw._id && typeof raw._id === "object" && "toString" in raw._id
                                    ? String((raw._id as { toString(): unknown }).toString())
                                    : "";
                        const name = typeof raw.name === "string" ? raw.name : "";
                        return id ? { _id: id, name } : null;
                    })
                    .filter((tag): tag is TagOption => Boolean(tag));

                setAllTags(normalized);
            } catch (error) {
                console.error("Failed to load tags", error);
            }
        })();
    }, []);

    const loadEntryId = useCallback(async () => {
        let previous: string | null = null;
        setEntryId((prev) => {
            previous = prev;
            return null;
        });
        try {
            const res = await fetch("/api/entries/new-id");
            if (!res.ok) throw new Error("Failed to reserve entry id");
            const data: unknown = await res.json();
            const id = typeof (data as { id?: unknown }).id === "string" ? (data as { id: string }).id : null;
            if (!id) throw new Error("Invalid id response");
            setEntryId(id);
        } catch (error) {
            console.error("Failed to load entry id", error);
            setEntryId(previous);
        }
    }, []);

    useEffect(() => {
        void loadEntryId();
    }, [loadEntryId]);

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);
        setMsg(null);
        try {
            const payload: Record<string, unknown> = {
                title: entry.title,
                caption: entry.caption,
                imageUrl: entry.imageUrl,
                tags: entry.tags,
            };
            if (entryId) payload._id = entryId;
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
            setEntry({ title: "", caption: "", imageUrl: "", date: today, tags: [] });
            await loadEntryId();
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
                        targetType="entries"
                        targetId={entryId ?? undefined}
                        disabled={!entryId}
                        onUploaded={(urls) =>
                            setEntry((v) => ({ ...v, imageUrl: urls[0] ?? v.imageUrl }))
                        }
                    />
                    {!entryId && (
                        <div className="text-xs text-[var(--subt)]">Preparing upload destination…</div>
                    )}

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

                    <div>
                        <div className="retro-label mb-1">Tags</div>
                        <select
                            multiple
                            className="retro-input h-28"
                            value={entry.tags}
                            onChange={(event) => {
                                const values = Array.from(event.currentTarget.selectedOptions).map((option) => option.value);
                                setEntry((v) => ({ ...v, tags: values }));
                            }}
                        >
                            {allTags.map((tag) => (
                                <option key={tag._id} value={tag._id}>
                                    {tag.name}
                                </option>
                            ))}
                        </select>
                        <div className="text-xs text-[var(--subt)]">
                            {allTags.length > 0
                                ? "Hold ⌘/Ctrl to select multiple."
                                : "No tags yet — create them in Manage Tags."}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button type="submit" variant="primary" disabled={saving}>
                            {saving ? "Saving…" : "Save Entry"}
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                setEntry({ title: "", caption: "", imageUrl: "", date: today, tags: [] });
                                void loadEntryId();
                            }}
                        >
                            Clear
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
