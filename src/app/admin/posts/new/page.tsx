"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import GalleryPicker from "@/components/admin/GalleryPicker";

type PostForm = { title: string; content: string };

export default function NewPostPage() {
    const [post, setPost] = useState<PostForm>({ title: "", content: "" });
    const [selectedGallery, setSelectedGallery] =
        useState<{ id: string; name?: string } | null>(null);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMsg(null);
        try {
            const res = await fetch("/api/posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: post.title,
                    content: post.content,
                    gallery: selectedGallery?.id || null,
                }),
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({} as any));
                throw new Error(j?.message || "Failed to create post");
            }
            setMsg("Saved!");
            setPost({ title: "", content: "" });
            setSelectedGallery(null);
        } catch (err: any) {
            setMsg(err.message || "Error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-4 max-w-2xl mx-auto">
            <h1 className="retro-title mb-3">Create Post</h1>
            <Card className="p-4">
                <form onSubmit={onSubmit} className="grid gap-3">
                    {msg && <div className="text-sm">{msg}</div>}

                    <Input
                        placeholder="Title"
                        value={post.title}
                        onChange={(e) => setPost((p) => ({ ...p, title: e.target.value }))}
                    />

                    <textarea
                        className="retro-input min-h-[120px]"
                        placeholder="Content"
                        value={post.content}
                        onChange={(e) =>
                            setPost((p) => ({ ...p, content: e.target.value }))
                        }
                    />

                    <GalleryPicker
                        value={selectedGallery}
                        onChange={setSelectedGallery}
                        className="mt-2"
                    />

                    <div className="flex gap-2">
                        <Button type="submit" variant="primary" disabled={saving}>
                            {saving ? "Saving…" : "Save Post"}
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                setPost({ title: "", content: "" });
                                setSelectedGallery(null);
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
