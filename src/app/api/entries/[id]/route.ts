import { NextResponse } from 'next/server';
import connect from '@/lib/mongodb';
import Entry from '@/models/Entry';

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

    const entry = await Entry.findByIdAndUpdate(id, { $set: update }, { new: true });
    return NextResponse.json(entry);
}

export async function DELETE(_req: Request, { params }: Ctx) {
    await connect();
    const { id } = await params;
    await Entry.findByIdAndDelete(id);
    return NextResponse.json({ ok: true });
}
