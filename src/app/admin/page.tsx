'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [post, setPost] = useState({ title: '', content: '', gallery: '' });
  const [gallery, setGallery] = useState({ name: '', images: '', password: '' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!session) {
    return (
      <div className="p-4">
        <h1>Admin Login</h1>
        <button
          className="border p-2"
          onClick={() => supabase.auth.signInWithOAuth({ provider: 'github' })}
        >
          Sign in with GitHub
        </button>
      </div>
    );
  }

  const createPost = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: post.title,
        content: post.content,
        gallery: post.gallery || null,
      }),
    });
    setPost({ title: '', content: '', gallery: '' });
  };

  const createGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/galleries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: gallery.name,
        images: gallery.images.split(',').map((s) => s.trim()),
        password: gallery.password || undefined,
      }),
    });
    setGallery({ name: '', images: '', password: '' });
  };

  return (
    <div className="p-4 space-y-4">
      <h1>Admin</h1>
      <button className="border p-2" onClick={() => supabase.auth.signOut()}>
        Sign out
      </button>

      <section>
        <h2 className="mt-4">Create Post</h2>
        <form onSubmit={createPost} className="flex flex-col space-y-2">
          <input
            className="border p-1"
            value={post.title}
            onChange={(e) => setPost({ ...post, title: e.target.value })}
            placeholder="Title"
          />
          <textarea
            className="border p-1"
            value={post.content}
            onChange={(e) => setPost({ ...post, content: e.target.value })}
            placeholder="Content"
          />
          <input
            className="border p-1"
            value={post.gallery}
            onChange={(e) => setPost({ ...post, gallery: e.target.value })}
            placeholder="Gallery ID"
          />
          <button type="submit" className="border p-1">Save Post</button>
        </form>
      </section>

      <section>
        <h2 className="mt-4">Create Gallery</h2>
        <form onSubmit={createGallery} className="flex flex-col space-y-2">
          <input
            className="border p-1"
            value={gallery.name}
            onChange={(e) => setGallery({ ...gallery, name: e.target.value })}
            placeholder="Name"
          />
          <input
            className="border p-1"
            value={gallery.images}
            onChange={(e) => setGallery({ ...gallery, images: e.target.value })}
            placeholder="Image URLs comma separated"
          />
          <input
            className="border p-1"
            type="password"
            value={gallery.password}
            onChange={(e) => setGallery({ ...gallery, password: e.target.value })}
            placeholder="Password (optional)"
          />
          <button type="submit" className="border p-1">Save Gallery</button>
        </form>
      </section>
    </div>
  );
}
