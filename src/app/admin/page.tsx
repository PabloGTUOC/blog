'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

type PostRec = { _id: string; title: string; content: string; gallery?: string | null; tags: string[] };
type GalleryRec = { _id: string; name: string; images: string[]; hasPassword?: boolean; tags: string[] };
type TagRec = { _id: string; name: string; color?: string };

export default function AdminPage() {
    const [session, setSession] = useState<Session | null>(null);

    // ---- Create form state
    const [post, setPost] = useState({ title: '', content: '', gallery: '', tags: [] as string[] });
    const [gallery, setGallery] = useState({ name: '', images: '', password: '', tags: [] as string[] });

    // ---- Lists + edit buffers
    const [posts, setPosts] = useState<PostRec[]>([]);
    const [galleries, setGalleries] = useState<GalleryRec[]>([]);
    const [postEdits, setPostEdits] = useState<Record<string, PostRec>>({});
    const [galleryEdits, setGalleryEdits] = useState<Record<string, { name: string; images: string; password?: string; tags: string[] }>>({});

    // ---- Search UI state (explicit search only)
    const [postSearch, setPostSearch] = useState('');
    const [gallerySearch, setGallerySearch] = useState('');
    const [postHasSearched, setPostHasSearched] = useState(false);
    const [galleryHasSearched, setGalleryHasSearched] = useState(false);
    const [postLoading, setPostLoading] = useState(false);
    const [galleryLoading, setGalleryLoading] = useState(false);

    // ---- Tags: dropdown options + management (list hidden until search)
    const [allTags, setAllTags] = useState<TagRec[]>([]); // used for dropdowns
    const [tagSearch, setTagSearch] = useState('');
    const [tagHasSearched, setTagHasSearched] = useState(false);
    const [tagLoading, setTagLoading] = useState(false);
    const [tagsList, setTagsList] = useState<TagRec[]>([]); // only shown after Search
    const [tagEdits, setTagEdits] = useState<Record<string, TagRec>>({});
    const [tagCreate, setTagCreate] = useState({ name: '', color: '#111111' });
    const [postTagChoice, setPostTagChoice] = useState<string>('');
    const [galleryTagChoice, setGalleryTagChoice] = useState<string>('');



    // ---- Auth
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => setSession(data.session));
        const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
        return () => listener?.subscription?.unsubscribe();
    }, []);

    // ---- Load tag options for dropdowns once you’re logged in (do not reveal the list)
    useEffect(() => {
        if (!session) return;
        (async () => {
            const res = await fetch('/api/tags');
            const data: TagRec[] = await res.json();
            setAllTags(data);
        })();
    }, [session]);

    // ========== API helpers ==========
    async function fetchPosts(q: string) {
        setPostLoading(true);
        const res = await fetch(`/api/posts${q ? `?q=${encodeURIComponent(q)}` : ''}`);
        const data = await res.json();
        const normalized: PostRec[] = (data || []).map((p: any) => ({
            _id: p._id?.toString?.() ?? p._id,
            title: p.title ?? '',
            content: p.content ?? '',
            gallery: typeof p.gallery === 'object' ? p.gallery?._id?.toString?.() : p.gallery ?? null,
            tags: Array.isArray(p.tags) ? p.tags.map((t: any) => (typeof t === 'object' ? t._id?.toString?.() : t?.toString?.())) : [],
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
            tags: Array.isArray(g.tags) ? g.tags.map((t: any) => (typeof t === 'object' ? t._id?.toString?.() : t?.toString?.())) : [],
        }));
        setGalleries(normalized);
        setGalleryEdits(
            Object.fromEntries(
                normalized.map((g) => [g._id, { name: g.name, images: g.images.join(', '), password: '', tags: g.tags }])
            )
        );
        setGalleryLoading(false);
    }

    async function fetchTags(q: string) {
        setTagLoading(true);
        const res = await fetch(`/api/tags${q ? `?q=${encodeURIComponent(q)}` : ''}`);
        const data: TagRec[] = await res.json();
        setTagsList(data);
        setTagEdits(Object.fromEntries(data.map((t) => [t._id, { ...t }])));
        setTagLoading(false);
    }

    // ========== Explicit search triggers ==========
    async function onSearchPosts() { setPostHasSearched(true); await fetchPosts(postSearch); }
    async function onSearchGalleries() { setGalleryHasSearched(true); await fetchGalleries(gallerySearch); }
    async function onSearchTags() { setTagHasSearched(true); await fetchTags(tagSearch); } // blank => all

    // ========== Create handlers ==========
    const createPost = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: post.title,
                content: post.content,
                gallery: post.gallery || null,
                tags: post.tags,
            }),
        });
        setPost({ title: '', content: '', gallery: '', tags: [] });
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
                tags: gallery.tags,
            }),
        });
        setGallery({ name: '', images: '', password: '', tags: [] });
        if (galleryHasSearched) await fetchGalleries(gallerySearch);
    };

    // ========== Update/Delete handlers ==========
    async function savePost(id: string) {
        const p = postEdits[id];
        await fetch(`/api/posts/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: p.title, content: p.content, gallery: p.gallery || null, tags: p.tags }),
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
            tags: g.tags,
        };
        if (g.password && g.password.length > 0) payload.password = g.password;
        await fetch(`/api/galleries/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        if (galleryHasSearched) await fetchGalleries(gallerySearch);
    }
    async function clearGalleryPassword(id: string) {
        await fetch(`/api/galleries/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clearPassword: true }),
        });
        if (galleryHasSearched) await fetchGalleries(gallerySearch);
    }
    async function deleteGallery(id: string) {
        await fetch(`/api/galleries/${id}`, { method: 'DELETE' });
        if (galleryHasSearched) await fetchGalleries(gallerySearch);
    }

    // ========== Tag management ==========
    async function createTag(e: React.FormEvent) {
        e.preventDefault();
        await fetch('/api/tags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tagCreate) });
        setTagCreate({ name: '', color: '#111111' });
        // Update dropdown options only (do not reveal tag list)
        const res = await fetch('/api/tags');
        setAllTags(await res.json());
    }
    async function saveTag(id: string) {
        const t = tagEdits[id];
        await fetch(`/api/tags/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t) });
        const res = await fetch('/api/tags'); // refresh dropdown options
        setAllTags(await res.json());
        if (tagHasSearched) await fetchTags(tagSearch);
    }
    async function deleteTag(id: string) {
        await fetch(`/api/tags/${id}`, { method: 'DELETE' });
        const res = await fetch('/api/tags'); // refresh dropdown options
        setAllTags(await res.json());
        if (tagHasSearched) await fetchTags(tagSearch);
    }

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

    // Helper: render multi-select bound to allTags
    function TagMultiSelect({
                                value,
                                onChange,
                            }: {
        value: string[];
        onChange: (v: string[]) => void;
    }) {
        if (allTags.length === 0) {
            return (
                <div className="text-xs text-[var(--subt)]">
                    No tags yet — create them in <span className="underline">Manage Tags</span> below.
                </div>
            );
        }
        return (
            <>
                <div className="retro-label mb-1">Tags</div>
                <select
                    multiple
                    className="retro-input h-28"
                    value={value}
                    onChange={(e) => {
                        const vals = Array.from(e.currentTarget.selectedOptions).map((o) => o.value);
                        onChange(vals);
                    }}
                >
                    {allTags.map((t) => (
                        <option key={t._id} value={t._id}>
                            {t.name}
                        </option>
                    ))}
                </select>
                <div className="text-xs text-[var(--subt)]">Hold ⌘/Ctrl to select multiple.</div>
            </>
        );
    }

    return (
        <div className="p-4 space-y-6">
            <h1 className="retro-title">Admin</h1>
            <Button onClick={() => supabase.auth.signOut()}>Sign out</Button>

            {/* ===== TAGS MANAGEMENT ===== */}
            <section>
                <h2 className="retro-title">Manage Tags</h2>

                {/* Create Tag */}
                <Card className="space-y-2">
                    <div className="retro-label">Create Tag</div>
                    <form onSubmit={createTag} className="grid gap-2 md:grid-cols-[1fr_160px_auto]">
                        <Input
                            placeholder="Tag name"
                            value={tagCreate.name}
                            onChange={(e) => setTagCreate((s) => ({ ...s, name: e.target.value }))}
                        />
                        <Input
                            type="color"
                            value={tagCreate.color}
                            onChange={(e) => setTagCreate((s) => ({ ...s, color: e.target.value }))}
                        />
                        <Button variant="primary" type="submit">
                            Add
                        </Button>
                    </form>
                </Card>

                {/* Tag Search controls */}
                <div className="flex items-center gap-2 mt-3 mb-2">
                    <Input
                        placeholder="Search tags…"
                        value={tagSearch}
                        onChange={(e) => setTagSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onSearchTags()}
                    />
                    <Button variant="primary" onClick={onSearchTags}>
                        Search
                    </Button>
                    <Button onClick={() => { setTagSearch(''); onSearchTags(); }}>
                        Search All
                    </Button>
                    {tagHasSearched && (
                        <Button
                            onClick={() => {
                                setTagSearch('');
                                setTagsList([]);
                                setTagEdits({});
                                setTagHasSearched(false); // hide list
                            }}
                        >
                            Clear
                        </Button>
                    )}
                </div>

                {/* Tag list — visible only after explicit Search */}
                {!tagHasSearched ? null : tagLoading ? (
                    <div className="text-sm text-[var(--subt)]">Searching…</div>
                ) : tagsList.length === 0 ? (
                    <div className="text-sm text-[var(--subt)]">No matches.</div>
                ) : (
                    <div className="grid gap-3">
                        {tagsList.map((t) => {
                            const edit = tagEdits[t._id] ?? t;
                            return (
                                <Card key={t._id} className="space-y-2">
                                    <div className="grid gap-2 md:grid-cols-[1fr_160px_auto_auto]">
                                        <Input
                                            value={edit.name}
                                            onChange={(e) =>
                                                setTagEdits((m) => ({ ...m, [t._id]: { ...edit, name: e.target.value } }))
                                            }
                                        />
                                        <Input
                                            type="color"
                                            value={edit.color ?? '#111111'}
                                            onChange={(e) =>
                                                setTagEdits((m) => ({ ...m, [t._id]: { ...edit, color: e.target.value } }))
                                            }
                                        />
                                        <Button variant="primary" onClick={() => saveTag(t._id)}>
                                            Save
                                        </Button>
                                        <Button onClick={() => deleteTag(t._id)}>Delete</Button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* ===== CREATE POST ===== */}
            <section>
                <Card className="mt-4 space-y-2">
                    <div className="retro-label">Create Post</div>
                    <form onSubmit={createPost} className="grid gap-2">
                        <Input
                            placeholder="Title"
                            value={post.title}
                            onChange={(e) => setPost({ ...post, title: e.target.value })}
                        />
                        <textarea
                            className="retro-input"
                            placeholder="Content"
                            value={post.content}
                            onChange={(e) => setPost({ ...post, content: e.target.value })}
                            rows={4}
                        />
                        <Input
                            placeholder="Gallery ID (optional)"
                            value={post.gallery}
                            onChange={(e) => setPost({ ...post, gallery: e.target.value })}
                        />

                        {/* Tags (add one at a time) */}
                        {allTags.length > 0 ? (
                            <div>
                                <div className="retro-label mb-1">Tags</div>

                                <div className="flex items-center gap-2">
                                    <select
                                        className="retro-input"
                                        value={postTagChoice}
                                        onChange={(e) => setPostTagChoice(e.target.value)}
                                    >
                                        <option value="">Choose a tag…</option>
                                        {allTags.map((t) => (
                                            <option key={t._id} value={t._id}>
                                                {t.name}
                                            </option>
                                        ))}
                                    </select>

                                    <Button
                                        type="button"
                                        onClick={() => {
                                            if (!postTagChoice) return;
                                            setPost((s) => ({
                                                ...s,
                                                tags: s.tags.includes(postTagChoice)
                                                    ? s.tags
                                                    : [...s.tags, postTagChoice],
                                            }));
                                            setPostTagChoice(''); // reset so you can pick another
                                        }}
                                    >
                                        Add
                                    </Button>
                                </div>

                                {/* Show selected tags as removable pills */}
                                {post.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {post.tags.map((id) => {
                                            const t = allTags.find((x) => x._id === id);
                                            return (
                                                <span key={id} className="retro-btn">
                                                    {t?.name ?? 'Tag'}
                                                    <button
                                                        type="button"
                                                        className="ml-2"
                                                        aria-label="Remove tag"
                                                        onClick={() =>
                                                            setPost((s) => ({
                                                                ...s,
                                                                tags: s.tags.filter((x) => x !== id),
                                                            }))
                                                        }
                                                    >
                                                            ×
                                                    </button>
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
                                No tags yet — create them in <span className="underline">Manage Tags</span> below.
                            </div>
                        )}

                        <Button variant="primary" type="submit">
                            Save Post
                        </Button>
                    </form>
                </Card>
            </section>

            {/* ===== CREATE GALLERY ===== */}
            <section>
                <Card className="mt-4 space-y-2">
                    <div className="retro-label">Create Gallery</div>
                    <form onSubmit={createGallery} className="grid gap-2">
                        <Input
                            placeholder="Name"
                            value={gallery.name}
                            onChange={(e) => setGallery({ ...gallery, name: e.target.value })}
                        />
                        <Input
                            placeholder="Image URLs comma separated"
                            value={gallery.images}
                            onChange={(e) => setGallery({ ...gallery, images: e.target.value })}
                        />
                        <Input
                            type="password"
                            placeholder="Password (optional)"
                            value={gallery.password}
                            onChange={(e) => setGallery({ ...gallery, password: e.target.value })}
                        />

                        {/* Tags (add one at a time) */}
                        {allTags.length > 0 ? (
                            <div>
                                <div className="retro-label mb-1">Tags</div>

                                <div className="flex items-center gap-2">
                                    <select
                                        className="retro-input"
                                        value={galleryTagChoice}
                                        onChange={(e) => setGalleryTagChoice(e.target.value)}
                                    >
                                        <option value="">Choose a tag…</option>
                                        {allTags.map((t) => (
                                            <option key={t._id} value={t._id}>
                                                {t.name}
                                            </option>
                                        ))}
                                    </select>

                                    <Button
                                        type="button"
                                        onClick={() => {
                                            if (!galleryTagChoice) return;
                                            setGallery((s) => ({
                                                ...s,
                                                tags: s.tags.includes(galleryTagChoice)
                                                    ? s.tags
                                                    : [...s.tags, galleryTagChoice],
                                            }));
                                            setGalleryTagChoice(''); // reset so you can pick another
                                        }}
                                    >
                                        Add
                                    </Button>
                                </div>

                                {/* Show selected tags as removable pills */}
                                {gallery.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {gallery.tags.map((id) => {
                                            const t = allTags.find((x) => x._id === id);
                                            return (
                                                <span key={id} className="retro-btn">
                                                    {t?.name ?? 'Tag'}
                                                    <button
                                                        type="button"
                                                        className="ml-2"
                                                        aria-label="Remove tag"
                                                        onClick={() =>
                                                            setGallery((s) => ({
                                                                ...s,
                                                                tags: s.tags.filter((x) => x !== id),
                                                            }))
                                                        }
                                                    >
                                                        ×
                                                    </button>
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
                                No tags yet — create them in <span className="underline">Manage Tags</span> below.
                            </div>
                        )}


                        <Button variant="primary" type="submit">
                            Save Gallery
                        </Button>
                    </form>
                </Card>
            </section>

            {/* ===== MANAGE POSTS ===== */}
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
                    <Button onClick={() => { setPostSearch(''); onSearchPosts(); }}>Search All</Button>
                    {postHasSearched && (
                        <Button onClick={() => { setPostSearch(''); setPosts([]); setPostEdits({}); setPostHasSearched(false); }}>
                            Clear
                        </Button>
                    )}
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
                                    <Input
                                        value={edit.title}
                                        onChange={(e) => setPostEdits((m) => ({ ...m, [p._id]: { ...edit, title: e.target.value } }))}
                                        placeholder="Title"
                                    />
                                    <textarea
                                        className="retro-input"
                                        rows={3}
                                        value={edit.content}
                                        onChange={(e) => setPostEdits((m) => ({ ...m, [p._id]: { ...edit, content: e.target.value } }))}
                                        placeholder="Content"
                                    />
                                    <Input
                                        value={edit.gallery ?? ''}
                                        onChange={(e) => setPostEdits((m) => ({ ...m, [p._id]: { ...edit, gallery: e.target.value || null } }))}
                                        placeholder="Gallery ID (optional)"
                                    />
                                    <div>
                                        <div className="retro-label mb-1">Tags</div>
                                        <select
                                            multiple
                                            className="retro-input h-28"
                                            value={edit.tags ?? []}
                                            onChange={(e) => {
                                                const vals = Array.from(e.currentTarget.selectedOptions).map((o) => o.value);
                                                setPostEdits((m) => ({ ...m, [p._id]: { ...edit, tags: vals } }));
                                            }}
                                        >
                                            {allTags.map((t) => (
                                                <option key={t._id} value={t._id}>{t.name}</option>
                                            ))}
                                        </select>
                                        <div className="text-xs text-[var(--subt)]">Hold ⌘/Ctrl to select multiple.</div>
                                    </div>
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

            {/* ===== MANAGE GALLERIES ===== */}
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
                    <Button onClick={() => { setGallerySearch(''); onSearchGalleries(); }}>Search All</Button>
                    {galleryHasSearched && (
                        <Button onClick={() => { setGallerySearch(''); setGalleries([]); setGalleryEdits({}); setGalleryHasSearched(false); }}>
                            Clear
                        </Button>
                    )}
                </div>

                {!galleryHasSearched ? null : galleryLoading ? (
                    <div className="text-sm text-[var(--subt)]">Searching…</div>
                ) : galleries.length === 0 ? (
                    <div className="text-sm text-[var(--subt)]">No matches.</div>
                ) : (
                    <div className="grid gap-3">
                        {galleries.map((g) => {
                            const edit = galleryEdits[g._id] ?? { name: g.name, images: g.images.join(', '), password: '', tags: g.tags };
                            return (
                                <Card key={g._id} className="space-y-2">
                                    <Input
                                        value={edit.name}
                                        onChange={(e) => setGalleryEdits((m) => ({ ...m, [g._id]: { ...edit, name: e.target.value } }))}
                                        placeholder="Name"
                                    />
                                    <Input
                                        value={edit.images}
                                        onChange={(e) => setGalleryEdits((m) => ({ ...m, [g._id]: { ...edit, images: e.target.value } }))}
                                        placeholder="Image URLs comma separated"
                                    />
                                    <Input
                                        type="password"
                                        value={edit.password ?? ''}
                                        onChange={(e) => setGalleryEdits((m) => ({ ...m, [g._id]: { ...edit, password: e.target.value } }))}
                                        placeholder="Password (optional)"
                                    />
                                    <div>
                                        <div className="retro-label mb-1">Tags</div>
                                        <select
                                            multiple
                                            className="retro-input h-28"
                                            value={edit.tags ?? []}
                                            onChange={(e) => {
                                                const vals = Array.from(e.currentTarget.selectedOptions).map((o) => o.value);
                                                setGalleryEdits((m) => ({ ...m, [g._id]: { ...edit, tags: vals } }));
                                            }}
                                        >
                                            {allTags.map((t) => (
                                                <option key={t._id} value={t._id}>{t.name}</option>
                                            ))}
                                        </select>
                                        <div className="text-xs text-[var(--subt)]">Hold ⌘/Ctrl to select multiple.</div>
                                    </div>
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
