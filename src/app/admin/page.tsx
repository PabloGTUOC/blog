'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

type PostRec = { _id: string; title: string; content: string; gallery?: string | null };
type GalleryRec = { _id: string; name: string; images: string[]; hasPassword?: boolean };

export default function AdminPage() {
    const [session, setSession] = useState<Session | null>(null);

    // create forms
    const [post, setPost] = useState({ title: '', content: '', gallery: '' });
    const [gallery, setGallery] = useState({ name: '', images: '', password: '' });

    // lists + edit buffers
    const [posts, setPosts] = useState<PostRec[]>([]);
    const [galleries, setGalleries] = useState<GalleryRec[]>([]);
    const [postEdits, setPostEdits] = useState<Record<string, PostRec>>({});
    const [galleryEdits, setGalleryEdits] = useState<Record<string, { name: string; images: string; password?: string }>>({});

    // search UI state
    const [postSearch, setPostSearch] = useState('');
    const [gallerySearch, setGallerySearch] = useState('');
    const [postLoading, setPostLoading] = useState(false);
    const [galleryLoading, setGalleryLoading] = useState(false);
    const [postHasSearched, setPostHasSearched] = useState(false);
    const [galleryHasSearched, setGalleryHasSearched] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => setSession(data.session));
        const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
        return () => listener.subscription.unsubscribe();
    }, []);

    if (!session) {
        return (
            <div className="p-4">
                <h1>Admin Login</h1>
                <button
                    className="border p-2"
                    onClick={() =>
                        supabase.auth.signInWithOAuth({
                            provider: 'google',
                            options: {
                                redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/admin` : undefined,
                                queryParams: { access_type: 'offline', prompt: 'consent' },
                            },
                        })
                    }
                >
                    Sign in with Google
                </button>
            </div>
        );
    }

    // ------- API helpers -------
    async function fetchPosts(q: string) {
        setPostLoading(true);
        const res = await fetch(`/api/posts${q ? `?q=${encodeURIComponent(q)}` : ''}`);
        const data = await res.json();
        const normalized: PostRec[] = (data || []).map((p: any) => ({
            _id: p._id?.toString?.() ?? p._id,
            title: p.title ?? '',
            content: p.content ?? '',
            gallery: typeof p.gallery === 'object' ? p.gallery?._id?.toString?.() : p.gallery ?? null,
        }));
        setPosts(normalized);
        setPostEdits(Object.fromEntries(normalized.map((p) => [p._id, { ...p }])));
        setPostLoading(false);
    }

    async function fetchGalleries(q: string) {
        setGalleryLoading(true);
        const res = await fetch(`/api/galleries${q ? `?q=${encodeURIComponent(q)}` : ''}`);
        const data = await res.json();
        const normalized: GalleryRec[] = (data || []).map((g: any) => ({
            _id: g._id?.toString?.() ?? g._id,
            name: g.name ?? '',
            images: Array.isArray(g.images) ? g.images : [],
            hasPassword: Boolean(g.passwordHash),
        }));
        setGalleries(normalized);
        setGalleryEdits(Object.fromEntries(normalized.map((g) => [g._id, { name: g.name, images: g.images.join(', '), password: '' }])));
        setGalleryLoading(false);
    }

    // ------- explicit search triggers -------
    async function onSearchPosts() {
        setPostHasSearched(true);
        await fetchPosts(postSearch /* blank => all */);
    }
    async function onSearchGalleries() {
        setGalleryHasSearched(true);
        await fetchGalleries(gallerySearch /* blank => all */);
    }

    // ------- create handlers -------
    const createPost = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: post.title, content: post.content, gallery: post.gallery || null }),
        });
        setPost({ title: '', content: '', gallery: '' });
        if (postHasSearched) await fetchPosts(postSearch);
    };

    const createGallery = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch('/api/galleries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: gallery.name,
                images: gallery.images.split(',').map((s) => s.trim()).filter(Boolean),
                password: gallery.password || undefined,
            }),
        });
        setGallery({ name: '', images: '', password: '' });
        if (galleryHasSearched) await fetchGalleries(gallerySearch);
    };

    // ------- update/delete handlers -------
    async function savePost(id: string) {
        const p = postEdits[id];
        await fetch(`/api/posts/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: p.title, content: p.content, gallery: p.gallery || null }),
        });
        if (postHasSearched) await fetchPosts(postSearch);
    }
    async function deletePost(id: string) {
        await fetch(`/api/posts/${id}`, { method: 'DELETE' });
        if (postHasSearched) await fetchPosts(postSearch);
    }

    async function saveGallery(id: string) {
        const g = galleryEdits[id];
        const payload: any = {
            name: g.name,
            images: g.images.split(',').map((s) => s.trim()).filter(Boolean),
        };
        if (g.password && g.password.length > 0) payload.password = g.password; // server hashes it
        await fetch(`/api/galleries/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (galleryHasSearched) await fetchGalleries(gallerySearch);
    }
    async function clearGalleryPassword(id: string) {
        await fetch(`/api/galleries/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clearPassword: true }),
        });
        if (galleryHasSearched) await fetchGalleries(gallerySearch);
    }
    async function deleteGallery(id: string) {
        await fetch(`/api/galleries/${id}`, { method: 'DELETE' });
        if (galleryHasSearched) await fetchGalleries(gallerySearch);
    }

    return (
        <div className="p-4 space-y-6">
            <h1 className="retro-title">Admin</h1>
            <Button onClick={() => supabase.auth.signOut()}>Sign out</Button>

            {/* CREATE POST */}
            <section>
                <Card className="mt-4 space-y-2">
                    <div className="retro-label">Create Post</div>
                    <form onSubmit={createPost} className="grid gap-2">
                        <Input placeholder="Title" value={post.title} onChange={(e) => setPost({ ...post, title: e.target.value })} />
                        <textarea className="retro-input" placeholder="Content" value={post.content} onChange={(e) => setPost({ ...post, content: e.target.value })} rows={4} />
                        <Input placeholder="Gallery ID (optional)" value={post.gallery} onChange={(e) => setPost({ ...post, gallery: e.target.value })} />
                        <Button variant="primary" type="submit">Save Post</Button>
                    </form>
                </Card>
            </section>

            {/* CREATE GALLERY */}
            <section>
                <Card className="mt-4 space-y-2">
                    <div className="retro-label">Create Gallery</div>
                    <form onSubmit={createGallery} className="grid gap-2">
                        <Input placeholder="Name" value={gallery.name} onChange={(e) => setGallery({ ...gallery, name: e.target.value })} />
                        <Input placeholder="Image URLs comma separated" value={gallery.images} onChange={(e) => setGallery({ ...gallery, images: e.target.value })} />
                        <Input type="password" placeholder="Password (optional)" value={gallery.password} onChange={(e) => setGallery({ ...gallery, password: e.target.value })} />
                        <Button variant="primary" type="submit">Save Gallery</Button>
                    </form>
                </Card>
            </section>

            {/* MANAGE POSTS */}
            <section>
                <h2 className="retro-title">Manage Posts</h2>
                <div className="flex items-center gap-2 mb-2">
                    <Input
                        placeholder="Search posts (title, content, id)…"
                        value={postSearch}
                        onChange={(e) => setPostSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onSearchPosts()}
                    />
                    <Button variant="primary" onClick={onSearchPosts}>Search</Button>
                    {postHasSearched && <Button onClick={() => { setPostSearch(''); setPosts([]); setPostEdits({}); setPostHasSearched(false); }}>Clear</Button>}
                </div>

                {!postHasSearched ? null : postLoading ? (
                    <div className="text-sm text-[var(--subt)]">Searching…</div>
                ) : posts.length === 0 ? (
                    <div className="text-sm text-[var(--subt)]">No matches.</div>
                ) : (
                    <div className="grid gap-3">
                        {posts.map((p) => {
                            const edit = postEdits[p._id] ?? p;
                            return (
                                <Card key={p._id} className="space-y-2">
                                    <Input value={edit.title} onChange={(e) => setPostEdits((m) => ({ ...m, [p._id]: { ...edit, title: e.target.value } }))} placeholder="Title" />
                                    <textarea className="retro-input" rows={3} value={edit.content} onChange={(e) => setPostEdits((m) => ({ ...m, [p._id]: { ...edit, content: e.target.value } }))} placeholder="Content" />
                                    <Input value={edit.gallery ?? ''} onChange={(e) => setPostEdits((m) => ({ ...m, [p._id]: { ...edit, gallery: e.target.value || null } }))} placeholder="Gallery ID (optional)" />
                                    <div className="flex gap-2">
                                        <Button variant="primary" onClick={() => savePost(p._id)}>Save</Button>
                                        <Button onClick={() => deletePost(p._id)}>Delete</Button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* MANAGE GALLERIES */}
            <section>
                <h2 className="retro-title">Manage Galleries</h2>
                <div className="flex items-center gap-2 mb-2">
                    <Input
                        placeholder="Search galleries (name, image URL, id)…"
                        value={gallerySearch}
                        onChange={(e) => setGallerySearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onSearchGalleries()}
                    />
                    <Button variant="primary" onClick={onSearchGalleries}>Search</Button>
                    {galleryHasSearched && <Button onClick={() => { setGallerySearch(''); setGalleries([]); setGalleryEdits({}); setGalleryHasSearched(false); }}>Clear</Button>}
                </div>

                {!galleryHasSearched ? null : galleryLoading ? (
                    <div className="text-sm text-[var(--subt)]">Searching…</div>
                ) : galleries.length === 0 ? (
                    <div className="text-sm text-[var(--subt)]">No matches.</div>
                ) : (
                    <div className="grid gap-3">
                        {galleries.map((g) => {
                            const edit = galleryEdits[g._id] ?? { name: g.name, images: g.images.join(', '), password: '' };
                            return (
                                <Card key={g._id} className="space-y-2">
                                    <Input value={edit.name} onChange={(e) => setGalleryEdits((m) => ({ ...m, [g._id]: { ...edit, name: e.target.value } }))} placeholder="Name" />
                                    <Input value={edit.images} onChange={(e) => setGalleryEdits((m) => ({ ...m, [g._id]: { ...edit, images: e.target.value } }))} placeholder="Image URLs comma separated" />
                                    <Input type="password" value={edit.password ?? ''} onChange={(e) => setGalleryEdits((m) => ({ ...m, [g._id]: { ...edit, password: e.target.value } }))} placeholder={g.hasPassword ? 'New password (leave empty to keep current)' : 'Password (optional)'} />
                                    <div className="flex gap-2">
                                        <Button variant="primary" onClick={() => saveGallery(g._id)}>Save</Button>
                                        {g.hasPassword && <Button onClick={() => clearGalleryPassword(g._id)}>Clear password</Button>}
                                        <Button onClick={() => deleteGallery(g._id)}>Delete</Button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
