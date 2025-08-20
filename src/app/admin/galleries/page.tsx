"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

type TagRec = { _id: string; name: string };
type Row = {
    _id: string;
    name: string;
    images: string[];
    hasPassword?: boolean;
    tags: string[];          // <- ensure we keep tags here
    eventMonth?: number;
    eventYear?: number;
};

const MONTHS = [
    { v: 1,  n: "Jan" }, { v: 2,  n: "Feb" }, { v: 3,  n: "Mar" },
    { v: 4,  n: "Apr" }, { v: 5,  n: "May" }, { v: 6,  n: "Jun" },
    { v: 7,  n: "Jul" }, { v: 8,  n: "Aug" }, { v: 9,  n: "Sep" },
    { v: 10, n: "Oct" }, { v: 11, n: "Nov" }, { v: 12, n: "Dec" },
];

export default function ManageGalleriesPage() {
    const [allTags, setAllTags] = useState<TagRec[]>([]);
    const [q, setQ] = useState("");
    const [hasSearched, setHasSearched] = useState(false);
    const [loading, setLoading] = useState(false);

    const [rows, setRows] = useState<Row[]>([]);
    const [edits, setEdits] = useState<Record<string, {
        name: string;
        images: string;
        password?: string;
        tags: string[];                     // <- keep tags in the edit buffer
        eventMonth?: number | "";
        eventYear?: number | "";
    }>>({});

    // Load all tag options for the selector
    useEffect(() => {
        (async () => {
            const res = await fetch("/api/tags");
            setAllTags(await res.json());
        })();
    }, []);

    const search = async () => {
        setHasSearched(true);
        setLoading(true);
        const res = await fetch(`/api/galleries${q ? `?q=${encodeURIComponent(q)}` : ""}`);
        const data = await res.json();
        const normalized: Row[] = (data || []).map((g: any) => ({
            _id: g._id?.toString?.() ?? g._id,
            name: g.name ?? "",
            images: Array.isArray(g.images) ? g.images : [],
            hasPassword: Boolean(g.passwordHash),
            tags: Array.isArray(g.tags)
                ? g.tags.map((t: any) => (typeof t === "object" ? t._id?.toString?.() : t?.toString?.()))
                : [],
            eventMonth: g.eventMonth,
            eventYear: g.eventYear,
        }));
        setRows(normalized);
        setEdits(Object.fromEntries(normalized.map((g) => [g._id, {
            name: g.name,
            images: g.images.join(", "),
            password: "",
            tags: g.tags,                            // <- seed current tags
            eventMonth: g.eventMonth ?? "",
            eventYear: g.eventYear ?? "",
        }])));
        setLoading(false);
    };

    const save = async (id: string) => {
        const g = edits[id];
        const payload: any = {
            name: g.name,
            images: g.images.split(",").map((s) => s.trim()).filter(Boolean),
            tags: g.tags,                           // <- send edited tags to API
        };
        if (g.password && g.password.length > 0) payload.password = g.password;
        if (g.eventMonth !== "") payload.eventMonth = g.eventMonth;
        if (g.eventYear !== "") payload.eventYear = g.eventYear;

        await fetch(`/api/galleries/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        await search();
    };

    const clearEvent = async (id: string) => {
        await fetch(`/api/galleries/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clearEvent: true }),
        });
        await search();
    };

    const clearPassword = async (id: string) => {
        await fetch(`/api/galleries/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clearPassword: true }),
        });
        await search();
    };

    const del = async (id: string) => {
        await fetch(`/api/galleries/${id}`, { method: "DELETE" });
        await search();
    };

    return (
        <div className="space-y-3">
            <h1 className="retro-title">Manage Galleries</h1>

            <div className="flex items-center gap-2">
                <Input
                    placeholder="Search galleries (name, image URL, id)…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && search()}
                />
                <Button variant="primary" onClick={search}>Search</Button>
                <Button onClick={() => { setQ(""); search(); }}>Search All</Button>
                {hasSearched && (
                    <Button onClick={() => { setQ(""); setRows([]); setEdits({}); setHasSearched(false); }}>
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
                    {rows.map((r) => {
                        const e = edits[r._id] ?? {
                            name: r.name,
                            images: r.images.join(", "),
                            password: "",
                            tags: r.tags,
                            eventMonth: r.eventMonth ?? "",
                            eventYear: r.eventYear ?? "",
                        };
                        return (
                            <Card key={r._id} className="space-y-2">
                                <Input
                                    value={e.name}
                                    onChange={(ev) => setEdits((m) => ({ ...m, [r._id]: { ...e, name: ev.target.value } }))}
                                    placeholder="Name"
                                />
                                <Input
                                    value={e.images}
                                    onChange={(ev) => setEdits((m) => ({ ...m, [r._id]: { ...e, images: ev.target.value } }))}
                                    placeholder="Image URLs comma separated"
                                />
                                <Input
                                    type="password"
                                    value={e.password ?? ""}
                                    onChange={(ev) => setEdits((m) => ({ ...m, [r._id]: { ...e, password: ev.target.value } }))}
                                    placeholder={r.hasPassword ? "New password (leave empty to keep current)" : "Password (optional)"}
                                />

                                {/* Month / Year */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <div className="retro-label mb-1">Month</div>
                                        <select
                                            className="retro-input"
                                            value={e.eventMonth === "" ? "" : String(e.eventMonth)}
                                            onChange={(ev) =>
                                                setEdits((m) => ({ ...m, [r._id]: { ...e, eventMonth: ev.target.value ? Number(ev.target.value) : "" } }))
                                            }
                                        >
                                            <option value="">—</option>
                                            {MONTHS.map((mm) => (
                                                <option key={mm.v} value={mm.v}>{mm.n}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <div className="retro-label mb-1">Year</div>
                                        <Input
                                            type="number"
                                            min={1900}
                                            max={3000}
                                            placeholder="YYYY"
                                            value={e.eventYear === "" ? "" : String(e.eventYear)}
                                            onChange={(ev) =>
                                                setEdits((m) => ({ ...m, [r._id]: { ...e, eventYear: ev.target.value ? Number(ev.target.value) : "" } }))
                                            }
                                        />
                                    </div>
                                </div>

                                {/* ✅ TAGS MULTI-SELECT (now you can modify tags) */}
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
                                    {(r.eventMonth || r.eventYear) && (
                                        <Button onClick={() => clearEvent(r._id)}>Clear month/year</Button>
                                    )}
                                    {r.hasPassword && (
                                        <Button onClick={() => clearPassword(r._id)}>Clear password</Button>
                                    )}
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
