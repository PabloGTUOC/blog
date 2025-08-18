import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connect from '@/lib/mongodb';
import Gallery from '@/models/Gallery';

export async function GET(req: Request) {
    await connect();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();
    const limit = Number(searchParams.get('limit') ?? 100);

    const criteria = q
        ? {
            $or: [
                { name: { $regex: q, $options: 'i' } },
                { images: { $elemMatch: { $regex: q, $options: 'i' } } },
                { _id: q?.match(/^[a-f0-9]{24}$/i) ? q : undefined },
            ].filter(Boolean),
        }
        : {};

    const galleries = await Gallery.find(criteria, { name: 1, images: 1, passwordHash: 1, createdAt: 1 })
        .sort({ createdAt: -1 })
        .limit(limit);

    return NextResponse.json(galleries);
}

export async function POST(req: Request) {
    await connect();
    const data = await req.json();
    if (data.password) {
        data.passwordHash = await bcrypt.hash(data.password, 10);
        delete data.password;
    }
    const gallery = await Gallery.create(data);
    return NextResponse.json(gallery, { status: 201 });
}
