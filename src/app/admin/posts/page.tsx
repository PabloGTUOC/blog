"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

type TagRec = { _id: string; name: string };
type PostRec = { _id: string; title: string; content: string; gallery?: string | null; tags: string[] };

export default function ManagePostsPage() {
    const [allTags, setAllTags] = useState<TagRec[]>([]);
    const [q, setQ] = useState("");
    const [hasSearched, setHasSearched] = useState(false);
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<PostRec[]>([]);
    const [edits, setEdits] = useState<Record<string, PostRec>>({});

    useEffect(() => {
        (async () => {
            const res = await fetch("/api/tags");
            setAllTags(await res.json());
        })();
    }, []);

    const search = async () => {
        setHasSearched(true);
        setLoading(true);
        const res = await fetch(`/api/posts${q ? `?q=${encodeURIComponent(q)}` : ""}`);
        const data = await res.json();
        const normalized: PostRec[] = (data || []).map((p: any) => ({
            _id: p._id?.toString?.() ?? p._id,
            title: p.title ?? "",
            content: p.content ?? "",
            gallery: typeof p.gallery === "object" ? p.gallery?._id?.toString?.() : p.gallery ?? null,
            tags: Array.isArray(p.tags) ? p.tags.map((t: any) => (typeof t === "object" ? t._id?.toString?.() : t?.toString?.())) : [],
        }));
        setRows(normalized);
        setEdits(Object.fromEntries(normalized.map((r) => [r._id, { ...r }])));
        setLoading(false);
    };

    const save = async (id: string) => {
        const r = edits[id];
        await fetch(`/api/posts/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: r.title, content: r.content, gallery: r.gallery || null, tags: r.tags }),
        });
        await search();
    };

    const del = async (id: string) => {
        await fetch(`/api/posts/${id}`, { method: "DELETE" });
        await search();
    };

    return (
        <div className="space-y-3">
            <h1 className="retro-title">Manage Posts</h1>

            <div className="flex items-center gap-2">
                <Input placeholder="Search posts (title, content, id)…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
                <Button variant="primary" onClick={search}>Search</Button>
                <Button onClick={() => { setQ(""); search(); }}>Search All</Button>
                {hasSearched && <Button onClick={() => { setQ(""); setRows([]); setEdits({}); setHasSearched(false); }}>Clear</Button>}
            </div>

            {!hasSearched ? null : loading ? (
                <div className="text-sm text-[var(--subt)]">Searching…</div>
            ) : rows.length === 0 ? (
                <div className="text-sm text-[var(--subt)]">No matches.</div>
            ) : (
                <div className="grid gap-3">
                    {rows.map((r) => {
                        const e = edits[r._id] ?? r;
                        return (
                            <Card key={r._id} className="space-y-2">
                                <Input value={e.title} onChange={(ev) => setEdits((m) => ({ ...m, [r._id]: { ...e, title: ev.target.value } }))} placeholder="Title" />
                                <textarea className="retro-input" rows={3} value={e.content} onChange={(ev) => setEdits((m) => ({ ...m, [r._id]: { ...e, content: ev.target.value } }))} placeholder="Content" />
                                <Input value={e.gallery ?? ""} onChange={(ev) => setEdits((m) => ({ ...m, [r._id]: { ...e, gallery: ev.target.value || null } }))} placeholder="Gallery ID (optional)" />
                                <div>
                                    <div className="retro-label mb-1">Tags</div>
                                    <select
                                        multiple
                                        className="retro-input h-28"
                                        value={e.tags ?? []}
                                        onChange={(ev) => {
                                            const vals = Array.from(ev.currentTarget.selectedOptions).map((o) => o.value);
                                            setEdits((m) => ({ ...m, [r._id]: { ...e, tags: vals } }));
                                        }}
                                    >
                                        {allTags.map((t) => (
                                            <option key={t._id} value={t._id}>{t.name}</option>
                                        ))}
                                    </select>
                                    <div className="text-xs text-[var(--subt)]">Hold ⌘/Ctrl to select multiple.</div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="primary" onClick={() => save(r._id)}>Save</Button>
                                    <Button onClick={() => del(r._id)}>Delete</Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
