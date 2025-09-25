import { NextResponse } from 'next/server';
import { rm, unlink } from 'fs/promises';
import path from 'path';
import connect from '@/lib/mongodb';
import Entry from '@/models/Entry';
import { ENTRIES_DIR, PUBLIC_DIR } from '@/lib/fs-server';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
    await connect();
    const { id } = await params;
    const raw: unknown = await req.json();

    if (!raw || typeof raw !== 'object') {
        return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    const data = raw as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    if (typeof data.title === 'string') update.title = data.title;
    if (typeof data.caption === 'string') update.caption = data.caption;
    if (typeof data.imageUrl === 'string') update.imageUrl = data.imageUrl;
    if ('publishedAt' in data) {
        const value = data.publishedAt;
        const date = typeof value === 'string' || value instanceof Date ? new Date(value) : null;
        if (date && !Number.isNaN(date.valueOf())) {
            update.publishedAt = date;
        }
    }
    if (Array.isArray(data.tags)) {
        update.tags = data.tags
            .map((value) => (typeof value === 'string' ? value : null))
            .filter((value): value is string => Boolean(value));
    }

    const entry = await Entry.findByIdAndUpdate(id, { $set: update }, { new: true });
    return NextResponse.json(entry);
}

export async function DELETE(_req: Request, { params }: Ctx) {
    await connect();
    const { id } = await params;
    const entry = await Entry.findByIdAndDelete(id);

    if (entry?.imageUrl && typeof entry.imageUrl === 'string') {
        const clean = entry.imageUrl.split('?')[0]?.split('#')[0] ?? '';
        const relativePath = clean.replace(/^\/+/u, '');
        const filePath = path.resolve(PUBLIC_DIR, relativePath);
        const legacyUploadsDir = path.join(PUBLIC_DIR, 'uploads');
        if (filePath.startsWith(ENTRIES_DIR) || filePath.startsWith(legacyUploadsDir)) {
            try {
                await unlink(filePath);
            } catch (error) {
                const err = error as NodeJS.ErrnoException;
                if (err.code !== 'ENOENT') {
                    console.error('Failed to remove entry image', error);
                }
            }
        }
    }

    try {
        await rm(path.join(ENTRIES_DIR, id), { recursive: true, force: true });
    } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code !== 'ENOENT') {
            console.error('Failed to remove entry directory', error);
        }
    }

    return NextResponse.json({ ok: true });
}
