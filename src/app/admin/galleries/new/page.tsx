"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import Uploader from "@/components/Uploader";


type TagRec = { _id: string; name: string };

const MONTHS = [
    { v: 1,  n: "Jan" }, { v: 2,  n: "Feb" }, { v: 3,  n: "Mar" },
    { v: 4,  n: "Apr" }, { v: 5,  n: "May" }, { v: 6,  n: "Jun" },
    { v: 7,  n: "Jul" }, { v: 8,  n: "Aug" }, { v: 9,  n: "Sep" },
    { v: 10, n: "Oct" }, { v: 11, n: "Nov" }, { v: 12, n: "Dec" },
];

export default function CreateGalleryPage() {
    const [allTags, setAllTags] = useState<TagRec[]>([]);
    const [name, setName] = useState("");
    const [images, setImages] = useState<string[]>([]);
    const [password, setPassword] = useState("");
    const [previews, setPreviews] = useState<string[]>([]);

    const [tags, setTags] = useState<string[]>([]);
    const [tagChoice, setTagChoice] = useState("");

    // NEW: month / year
    const [eventMonth, setEventMonth] = useState<number | "">("");
    const [eventYear, setEventYear] = useState<number | "">("");

    useEffect(() => {
        (async () => {
            const res = await fetch("/api/tags");
            setAllTags(await res.json());
        })();
    }, []);

    const addTag = () => {
        if (!tagChoice) return;
        setTags((t) => (t.includes(tagChoice) ? t : [...t, tagChoice]));
        setTagChoice("");
    };

    const removeTag = (id: string) => setTags((t) => t.filter((x) => x !== id));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch("/api/galleries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                images,
                password: password || undefined,
                tags,
                eventMonth: eventMonth === "" ? undefined : eventMonth,
                eventYear: eventYear === "" ? undefined : eventYear,
            }),
        });
        setName(""); setImages([]); setPassword(""); setTags([]);
        setEventMonth(""); setEventYear("");
        setPreviews([]);
        alert("Gallery created");
    };

    return (
        <div className="space-y-3">
            <h1 className="retro-title">Create Gallery</h1>
            <Card className="space-y-2">
                <form onSubmit={submit} className="grid gap-2">
                    <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                    <Uploader
                        onUploaded={(urls) => {
                            setPreviews((prev) => [...prev, ...urls]);
                            setImages((prev) => [...prev, ...urls]);
                        }}
                    />
                    {previews.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {previews.map((src, i) => (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img key={i} src={src} alt="preview" className="w-24 h-24 object-cover" />
                            ))}
                        </div>
                    )}
                    <Input type="password" placeholder="Password (optional)" value={password} onChange={(e) => setPassword(e.target.value)} />

                    {/* Month / Year */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <div className="retro-label mb-1">Month (optional)</div>
                            <select
                                className="retro-input"
                                value={eventMonth === "" ? "" : String(eventMonth)}
                                onChange={(e) => setEventMonth(e.target.value ? Number(e.target.value) : "")}
                            >
                                <option value="">—</option>
                                {MONTHS.map(m => <option key={m.v} value={m.v}>{m.n}</option>)}
                            </select>
                        </div>
                        <div>
                            <div className="retro-label mb-1">Year (optional)</div>
                            <Input
                                type="number"
                                min={1900}
                                max={3000}
                                placeholder="YYYY"
                                value={eventYear === "" ? "" : String(eventYear)}
                                onChange={(e) => setEventYear(e.target.value ? Number(e.target.value) : "")}
                            />
                        </div>
                    </div>

                    {/* Tags picker (one at a time) */}
                    {allTags.length > 0 ? (
                        <div>
                            <div className="retro-label mb-1">Tags</div>
                            <div className="flex items-center gap-2">
                                <select className="retro-input" value={tagChoice} onChange={(e) => setTagChoice(e.target.value)}>
                                    <option value="">Choose a tag…</option>
                                    {allTags.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                                </select>
                                <Button type="button" onClick={addTag}>Add</Button>
                            </div>
                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {tags.map((id) => {
                                        const t = allTags.find((x) => x._id === id);
                                        return (
                                            <span key={id} className="retro-btn">
                        {t?.name ?? "Tag"}
                                                <button type="button" className="ml-2" onClick={() => removeTag(id)}>×</button>
                      </span>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-xs text-[var(--subt)]">No tags yet — create them in <span className="underline">Manage Tags</span>.</div>
                    )}

                    <Button variant="primary" type="submit">Save Gallery</Button>
                </form>
            </Card>
        </div>
    );
}
