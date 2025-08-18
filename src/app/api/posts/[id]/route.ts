import { NextResponse } from 'next/server';
import connect from '@/lib/mongodb';
import Post from '@/models/Post';

type Ctx = { params: { id: string } };

export async function PUT(req: Request, { params }: Ctx) {
    await connect();
    const body = await req.json();

    const update: any = {};
    if (typeof body.title === 'string') update.title = body.title;
    if (typeof body.content === 'string') update.content = body.content;
    // allow clearing gallery with null/empty string
    if ('gallery' in body) update.gallery = body.gallery || null;

    const post = await Post.findByIdAndUpdate(params.id, { $set: update }, { new: true });
    return NextResponse.json(post);
}

export async function DELETE(_req: Request, { params }: Ctx) {
    await connect();
    await Post.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
}
