"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

type TagRec = { _id: string; name: string };

const MONTHS = [
    { v: 1, n: "Jan" }, { v: 2, n: "Feb" }, { v: 3, n: "Mar" },
    { v: 4, n: "Apr" }, { v: 5, n: "May" }, { v: 6, n: "Jun" },
    { v: 7, n: "Jul" }, { v: 8, n: "Aug" }, { v: 9, n: "Sep" },
    { v: 10, n: "Oct" }, { v: 11, n: "Nov" }, { v: 12, n: "Dec" },
];

export default function CreateGalleryPage() {
    const [allTags, setAllTags] = useState<TagRec[]>([]);
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [files, setFiles] = useState<FileList | null>(null); // <-- store files to send in one go
    const [previews, setPreviews] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);

    const [tags, setTags] = useState<string[]>([]);
    const [tagChoice, setTagChoice] = useState("");

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

    const onPickFiles: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        const fs = e.target.files;
        setFiles(fs);
        // show local previews just for UX; the server will return final URLs after create
        if (fs && fs.length) {
            const urls = Array.from(fs).map((f) => URL.createObjectURL(f));
            setPreviews((prev) => [...prev, ...urls]);
        }
    };

    const submit: React.FormEventHandler = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const form = new FormData();
            form.set("name", name);
            if (password) form.set("password", password);
            if (eventMonth !== "") form.set("eventMonth", String(eventMonth));
            if (eventYear !== "") form.set("eventYear", String(eventYear));
            // tags[] as repeated keys
            for (const t of tags) form.append("tags[]", t);

            // IMPORTANT: files must be appended under the key "files"
            if (files) Array.from(files).forEach((f) => form.append("files", f));

            const res = await fetch("/api/galleries", { method: "POST", body: form });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Create failed");

            // Optionally: replace previews with real URLs from server
            // setPreviews(data.images || []);

            // reset
            setName(""); setPassword(""); setFiles(null);
            setTags([]); setEventMonth(""); setEventYear("");
            setPreviews([]);
            alert("Gallery created");
        } catch (err: any) {
            console.error(err);
            alert(err.message || String(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-3">
            <h1 className="retro-title">Create Gallery</h1>
            <Card className="space-y-2">
                <form onSubmit={submit} className="grid gap-2">
                    <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />

                    {/* Pick files here; they will be sent with the name in the same request */}
                    <input type="file" multiple accept="image/*" onChange={onPickFiles} />

                    {previews.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {previews.map((src, i) => (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img key={i} src={src} alt="preview" className="w-24 h-24 object-cover" />
                            ))}
                        </div>
                    )}

                    <Input
                        type="password"
                        placeholder="Password (optional)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

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
                                {MONTHS.map((m) => <option key={m.v} value={m.v}>{m.n}</option>)}
                            </select>
                        </div>
                        <div>
                            <div className="retro-label mb-1">Year (optional)</div>
                            <Input
                                type="number" min={1900} max={3000} placeholder="YYYY"
                                value={eventYear === "" ? "" : String(eventYear)}
                                onChange={(e) => setEventYear(e.target.value ? Number(e.target.value) : "")}
                            />
                        </div>
                    </div>

                    {/* Tags */}
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

                    <Button variant="primary" type="submit" disabled={busy}>
                        {busy ? "Saving…" : "Save Gallery"}
                    </Button>
                </form>
            </Card>
        </div>
    );
}
