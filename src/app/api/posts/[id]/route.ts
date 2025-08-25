import { NextResponse } from 'next/server';
import connect from '@/lib/mongodb';
import Post from '@/models/Post';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
    await connect();
    const { id } = await params;
    const body = await req.json();
    const update: any = {};
    if (typeof body.title === 'string') update.title = body.title;
    if (typeof body.content === 'string') update.content = body.content;
    if ('gallery' in body) update.gallery = body.gallery || null;
    if (Array.isArray(body.tags)) update.tags = body.tags;
    const post = await Post.findByIdAndUpdate(id, { $set: update }, { new: true });
    return NextResponse.json(post);
}

export async function DELETE(_req: Request, { params }: Ctx) {
    await connect();
    const { id } = await params;
    await Post.findByIdAndDelete(id);
    return NextResponse.json({ ok: true });
}

