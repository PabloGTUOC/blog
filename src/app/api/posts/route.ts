import { NextResponse } from 'next/server';
import connect from '@/lib/mongodb';
import Post from '@/models/Post';

export async function GET(req: Request) {
    await connect();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();
    const limit = Number(searchParams.get('limit') ?? 100);

    const criteria: any = q
        ? {
            $or: [
                { title: { $regex: q, $options: 'i' } },
                { content: { $regex: q, $options: 'i' } },
                { _id: q.match(/^[a-f0-9]{24}$/i) ? q : undefined },
            ].filter(Boolean),
        }
        : {};

    const posts = await Post.find(criteria, { title: 1, content: 1, gallery: 1, tags: 1, createdAt: 1 })
        .sort({ createdAt: -1 })
        .limit(limit);

    return NextResponse.json(posts);
}

export async function POST(req: Request) {
    await connect();
    const data = await req.json();
    const post = await Post.create({
        title: data.title,
        content: data.content,
        gallery: data.gallery || null,
        tags: Array.isArray(data.tags) ? data.tags : [],
    });
    return NextResponse.json(post, { status: 201 });
}
