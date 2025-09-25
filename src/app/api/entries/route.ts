import { NextResponse } from 'next/server';
import connect from '@/lib/mongodb';
import Entry from '@/models/Entry';
import { Types } from 'mongoose';

export async function GET(req: Request) {
    await connect();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();
    const limit = Number(searchParams.get('limit') ?? 100);

    const orConditions = q
        ? [
              { title: { $regex: q, $options: 'i' } },
              { caption: { $regex: q, $options: 'i' } },
              q.match(/^[a-f0-9]{24}$/i) ? { _id: q } : null,
          ].filter(Boolean)
        : [];

    const criteria =
        orConditions.length > 0
            ? ({ $or: orConditions as Record<string, unknown>[] } as Record<string, unknown>)
            : ({} as Record<string, unknown>);

    const entries = await Entry.find(criteria, {
        title: 1,
        caption: 1,
        imageUrl: 1,
        publishedAt: 1,
        createdAt: 1,
        tags: 1,
    })
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(limit);

    return NextResponse.json(entries);
}

export async function POST(req: Request) {
    await connect();
    const raw: unknown = await req.json();

    if (!raw || typeof raw !== 'object') {
        return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    const data = raw as Record<string, unknown>;
    const publishedAt = data.publishedAt ? new Date(data.publishedAt as string) : new Date();
    if (Number.isNaN(publishedAt.valueOf())) {
        return NextResponse.json({ message: 'Invalid publishedAt' }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
        title: typeof data.title === 'string' ? data.title : '',
        caption: typeof data.caption === 'string' ? data.caption : '',
        imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : '',
        publishedAt,
        tags: Array.isArray(data.tags)
            ? data.tags
                  .map((value) => (typeof value === 'string' ? value : null))
                  .filter((value): value is string => Boolean(value))
            : [],
    };

    if (typeof data._id === 'string' && Types.ObjectId.isValid(data._id)) {
        payload._id = new Types.ObjectId(data._id);
    }

    const entry = await Entry.create(payload);

    return NextResponse.json(entry, { status: 201 });
}
