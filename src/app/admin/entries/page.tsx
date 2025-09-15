"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import Uploader from "@/components/Uploader";

type EntryRec = {
    _id: string;
    title: string;
    caption: string;
    imageUrl: string;
    publishedAt?: string;
};

export default function ManageEntriesPage() {
    const [q, setQ] = useState("");
    const [hasSearched, setHasSearched] = useState(false);
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<EntryRec[]>([]);
    const [edits, setEdits] = useState<Record<string, EntryRec>>({});

    const search = async () => {
        setHasSearched(true);
        setLoading(true);
        const res = await fetch(`/api/entries${q ? `?q=${encodeURIComponent(q)}` : ""}`);
        const data: unknown = await res.json();

        const toIso = (value: unknown) => {
            if (!value) return "";
            const date = typeof value === "string" || value instanceof Date ? new Date(value) : null;
            return date && !Number.isNaN(date.valueOf()) ? date.toISOString() : "";
        };

        const normalized: EntryRec[] = Array.isArray(data)
            ? data
                  .map((entry) => {
                      if (!entry || typeof entry !== "object") {
                          return {
                              _id: "",
                              title: "",
                              caption: "",
                              imageUrl: "",
                              publishedAt: "",
                          };
                      }

                      const obj = entry as Record<string, unknown>;
                      const idValue = obj._id;
                      const id =
                          typeof idValue === "string"
                              ? idValue
                              : idValue && typeof idValue === "object" && "toString" in idValue
                                  ? String((idValue as { toString(): unknown }).toString())
                                  : "";

                      const title = typeof obj.title === "string" ? obj.title : "";
                      const caption = typeof obj.caption === "string" ? obj.caption : "";
                      const imageUrl = typeof obj.imageUrl === "string" ? obj.imageUrl : "";
                      const publishedAt = toIso(obj.publishedAt) || toIso(obj.createdAt);

                      return { _id: id, title, caption, imageUrl, publishedAt };
                  })
                  .filter((entry) => entry._id.length > 0)
            : [];
        setRows(normalized);
        setEdits(Object.fromEntries(normalized.map((entry) => [entry._id, { ...entry }])));
        setLoading(false);
    };

    const save = async (id: string) => {
        const entry = edits[id];
        const payload: Record<string, unknown> = {
            title: entry.title,
            caption: entry.caption,
            imageUrl: entry.imageUrl,
        };
        if (entry.publishedAt) payload.publishedAt = entry.publishedAt;

        await fetch(`/api/entries/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        await search();
    };

    const del = async (id: string) => {
        await fetch(`/api/entries/${id}`, { method: "DELETE" });
        await search();
    };

    return (
        <div className="space-y-3">
            <h1 className="retro-title">Manage Entries</h1>

            <div className="flex items-center gap-2">
                <Input
                    placeholder="Search entries (title, caption, id)…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && search()}
                />
                <Button variant="primary" onClick={search}>Search</Button>
                <Button onClick={() => { setQ(""); search(); }}>Search All</Button>
                {hasSearched && (
                    <Button
                        onClick={() => {
                            setQ("");
                            setRows([]);
                            setEdits({});
                            setHasSearched(false);
                        }}
                    >
                        Clear
                    </Button>
                )}
            </div>

            {!hasSearched ? null : loading ? (
                <div className="text-sm text-[var(--subt)]">Searching…</div>
            ) : rows.length === 0 ? (
                <div className="text-sm text-[var(--subt)]">No matches.</div>
            ) : (
                <div className="grid gap-3">
                    {rows.map((row) => {
                        const entry = edits[row._id] ?? row;
                        const dateValue = entry.publishedAt ? entry.publishedAt.slice(0, 10) : "";
                        return (
                            <Card key={row._id} className="space-y-2">
                                <Input
                                    value={entry.title}
                                    onChange={(ev) =>
                                        setEdits((m) => ({ ...m, [row._id]: { ...entry, title: ev.target.value } }))
                                    }
                                    placeholder="Title"
                                />

                                <Input
                                    type="date"
                                    value={dateValue}
                                    onChange={(ev) => {
                                        const v = ev.target.value;
                                        setEdits((m) => ({
                                            ...m,
                                            [row._id]: {
                                                ...entry,
                                                publishedAt: v ? new Date(`${v}T00:00:00`).toISOString() : "",
                                            },
                                        }));
                                    }}
                                />

                                <Uploader
                                    multiple={false}
                                    accept="image/*"
                                    onUploaded={(urls) =>
                                        setEdits((m) => ({
                                            ...m,
                                            [row._id]: { ...entry, imageUrl: urls[0] ?? entry.imageUrl },
                                        }))
                                    }
                                />

                                {entry.imageUrl && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={entry.imageUrl} alt="preview" className="w-full max-w-sm rounded border border-[var(--border)]" />
                                )}

                                <Input
                                    value={entry.imageUrl}
                                    onChange={(ev) =>
                                        setEdits((m) => ({ ...m, [row._id]: { ...entry, imageUrl: ev.target.value } }))
                                    }
                                    placeholder="Image URL"
                                />

                                <textarea
                                    className="retro-input min-h-[100px]"
                                    value={entry.caption}
                                    onChange={(ev) =>
                                        setEdits((m) => ({ ...m, [row._id]: { ...entry, caption: ev.target.value } }))
                                    }
                                    placeholder="Caption"
                                />

                                <div className="flex gap-2">
                                    <Button variant="primary" onClick={() => save(row._id)}>Save</Button>
                                    <Button onClick={() => del(row._id)}>Delete</Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
