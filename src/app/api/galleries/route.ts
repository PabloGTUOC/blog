import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connect from '@/lib/mongodb';
import Gallery from '@/models/Gallery';

export async function GET(req: Request) {
    await connect();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();
    const limit = Number(searchParams.get('limit') ?? 100);

    const criteria: any = q
        ? {
            $or: [
                { name: { $regex: q, $options: 'i' } },
                { images: { $elemMatch: { $regex: q, $options: 'i' } } },
                { _id: q?.match(/^[a-f0-9]{24}$/i) ? q : undefined },
            ].filter(Boolean),
        }
        : {};

    const galleries = await Gallery.find(
        criteria,
        { name: 1, images: 1, passwordHash: 1, tags: 1, createdAt: 1, eventMonth: 1, eventYear: 1 }
    )
        .sort({ createdAt: -1 })
        .limit(limit);

    return NextResponse.json(galleries);
}

export async function POST(req: Request) {
    await connect();
    const data = await req.json();

    const doc: any = {
        name: data.name,
        images: Array.isArray(data.images) ? data.images : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
    };

    if (data.password) {
        doc.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const em = Number(data.eventMonth);
    const ey = Number(data.eventYear);
    if (Number.isInteger(em) && em >= 1 && em <= 12) doc.eventMonth = em;
    if (Number.isInteger(ey) && ey >= 1900 && ey <= 3000) doc.eventYear = ey;

    const gallery = await Gallery.create(doc);
    return NextResponse.json(gallery, { status: 201 });
}
