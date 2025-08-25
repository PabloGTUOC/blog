"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Gallery = { _id: string; name: string };

export default function GalleryPicker({
                                          value,
                                          onChange,
                                          className = "",
                                      }: {
    value?: { id: string; name?: string } | null;
    onChange: (v: { id: string; name?: string } | null) => void;
    className?: string;
}) {
    const [q, setQ] = useState("");
    const [results, setResults] = useState<Gallery[]>([]);
    const [loading, setLoading] = useState(false);

    const search = async () => {
        setLoading(true);
        const r = await fetch(`/api/galleries?q=${encodeURIComponent(q)}`);
        const data = await r.json();
        setResults((data || []).map((g: any) => ({ _id: g._id, name: g.name ?? "(untitled)" })));
        setLoading(false);
    };

    const copy = (text: string) => {
        navigator.clipboard?.writeText(text).catch(() => {});
    };

    if (value?.id) {
        return (
            <div className={className}>
                <div className="retro-label mb-1">Linked Gallery</div>
                <Card className="p-3 flex items-center justify-between">
                    <div className="text-sm">
                        <div className="font-medium">{value.name || "(unnamed)"}</div>
                        <div className="text-xs text-[var(--subt)]">{value.id}</div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => copy(value.id)}>Copy ID</Button>
                        <Button onClick={() => onChange(null)}>Clear</Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className={className}>
            <div className="retro-label mb-1">Link to Gallery</div>
            <div className="flex gap-2">
                <Input
                    placeholder="Search galleries by name…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && search()}
                />
                <Button onClick={search}>Search</Button>
                <Button onClick={() => { setQ(""); setResults([]); }}>Clear</Button>
            </div>
            {loading ? (
                <div className="text-xs text-[var(--subt)] mt-2">Searching…</div>
            ) : results.length > 0 ? (
                <div className="mt-2 grid gap-2">
                    {results.map((g) => (
                        <Card key={g._id} className="p-3 flex items-center justify-between">
                            <div className="text-sm">
                                <div className="font-medium">{g.name}</div>
                                <div className="text-xs text-[var(--subt)]">{g._id}</div>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={() => navigator.clipboard?.writeText(g._id)}>Copy ID</Button>
                                <Button variant="primary" onClick={() => onChange({ id: g._id, name: g.name })}>
                                    Select
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
