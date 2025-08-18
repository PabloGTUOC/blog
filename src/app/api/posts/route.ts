import { NextResponse } from 'next/server';
import connect from '@/lib/mongodb';
import Post from '@/models/Post';

export async function GET(req: Request) {
    await connect();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();
    const limit = Number(searchParams.get('limit') ?? 100);

    const criteria = q
        ? {
            $or: [
                { title: { $regex: q, $options: 'i' } },
                { content: { $regex: q, $options: 'i' } },
                // allow id search
                { _id: q.match(/^[a-f0-9]{24}$/i) ? q : undefined },
            ].filter(Boolean),
        }
        : {};

    const posts = await Post.find(criteria, { title: 1, content: 1, gallery: 1, createdAt: 1 })
        .sort({ createdAt: -1 })
        .limit(limit);

    return NextResponse.json(posts);
}

export async function POST(req: Request) {
    await connect();
    const data = await req.json();
    const post = await Post.create(data);
    return NextResponse.json(post, { status: 201 });
}
