"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

type TagRec = { _id: string; name: string; color?: string };

export default function ManageTagsPage() {
    const [allTags, setAllTags] = useState<TagRec[]>([]); // for dropdown consumers elsewhere
    const [createTag, setCreateTag] = useState({ name: "", color: "#111111" });

    const [q, setQ] = useState("");
    const [hasSearched, setHasSearched] = useState(false);
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<TagRec[]>([]);
    const [edits, setEdits] = useState<Record<string, TagRec>>({});

    useEffect(() => {
        (async () => {
            const res = await fetch("/api/tags");
            setAllTags(await res.json());
        })();
    }, []);

    async function refreshOptionsOnly() {
        const res = await fetch("/api/tags");
        setAllTags(await res.json());
    }

    const search = async () => {
        setHasSearched(true);
        setLoading(true);
        const res = await fetch(`/api/tags${q ? `?q=${encodeURIComponent(q)}` : ""}`);
        const data: TagRec[] = await res.json();
        setRows(data);
        setEdits(Object.fromEntries(data.map((t) => [t._id, { ...t }])));
        setLoading(false);
    };

    const submitCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch("/api/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(createTag) });
        setCreateTag({ name: "", color: "#111111" });
        await refreshOptionsOnly(); // don't auto-reveal list
    };

    const save = async (id: string) => {
        const t = edits[id];
        await fetch(`/api/tags/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(t) });
        await refreshOptionsOnly();
        await search();
    };

    const del = async (id: string) => {
        await fetch(`/api/tags/${id}`, { method: "DELETE" });
        await refreshOptionsOnly();
        await search();
    };

    return (
        <div className="space-y-3">
            <h1 className="retro-title">Manage Tags</h1>

            <Card className="space-y-2">
                <div className="retro-label">Create Tag</div>
                <form onSubmit={submitCreate} className="grid gap-2 md:grid-cols-[1fr_160px_auto]">
                    <Input placeholder="Tag name" value={createTag.name} onChange={(e) => setCreateTag((s) => ({ ...s, name: e.target.value }))} />
                    <Input type="color" value={createTag.color} onChange={(e) => setCreateTag((s) => ({ ...s, color: e.target.value }))} />
                    <Button variant="primary" type="submit">Add</Button>
                </form>
            </Card>

            <div className="flex items-center gap-2">
                <Input placeholder="Search tags…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
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
                                <div className="grid gap-2 md:grid-cols-[1fr_160px_auto_auto]">
                                    <Input value={e.name} onChange={(ev) => setEdits((m) => ({ ...m, [r._id]: { ...e, name: ev.target.value } }))} />
                                    <Input type="color" value={e.color ?? "#111111"} onChange={(ev) => setEdits((m) => ({ ...m, [r._id]: { ...e, color: ev.target.value } }))} />
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
