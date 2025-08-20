"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

type TagRec = { _id: string; name: string; color?: string };

export default function CreatePostPage() {
    const [allTags, setAllTags] = useState<TagRec[]>([]);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [galleryId, setGalleryId] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [tagChoice, setTagChoice] = useState("");

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
        await fetch("/api/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title,
                content,
                gallery: galleryId || null,
                tags,
            }),
        });
        setTitle(""); setContent(""); setGalleryId(""); setTags([]);
        alert("Post created");
    };

    return (
        <div className="space-y-3">
            <h1 className="retro-title">Create Post</h1>
            <Card className="space-y-2">
                <form onSubmit={submit} className="grid gap-2">
                    <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    <textarea
                        className="retro-input"
                        rows={5}
                        placeholder="Content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                    <Input
                        placeholder="Gallery ID (optional)"
                        value={galleryId}
                        onChange={(e) => setGalleryId(e.target.value)}
                    />

                    {/* Tag picker */}
                    {allTags.length > 0 ? (
                        <div>
                            <div className="retro-label mb-1">Tags</div>
                            <div className="flex items-center gap-2">
                                <select
                                    className="retro-input"
                                    value={tagChoice}
                                    onChange={(e) => setTagChoice(e.target.value)}
                                >
                                    <option value="">Choose a tag…</option>
                                    {allTags.map((t) => (
                                        <option key={t._id} value={t._id}>{t.name}</option>
                                    ))}
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
                            <div className="text-xs text-[var(--subt)] mt-1">
                                Pick one, click <em>Add</em>. Repeat to attach multiple tags.
                            </div>
                        </div>
                    ) : (
                        <div className="text-xs text-[var(--subt)]">
                            No tags yet — create them in <span className="underline">Manage Tags</span>.
                        </div>
                    )}

                    <Button variant="primary" type="submit">Save Post</Button>
                </form>
            </Card>
        </div>
    );
}
