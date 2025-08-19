import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connect from '@/lib/mongodb';
import Gallery from '@/models/Gallery';

type Ctx = { params: { id: string } };

export async function PUT(req: Request, { params }: Ctx) {
    await connect();
    const body = await req.json();

    const set: any = {};
    const unset: any = {};

    if (typeof body.name === 'string') set.name = body.name;
    if (Array.isArray(body.images)) set.images = body.images;
    if (Array.isArray(body.tags)) set.tags = body.tags;

    if (typeof body.password === 'string' && body.password.length > 0) {
        set.passwordHash = await bcrypt.hash(body.password, 10);
    }
    if (body.clearPassword === true) unset.passwordHash = 1;

    const update: any = {};
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;

    const gallery = await Gallery.findByIdAndUpdate(params.id, update, { new: true });
    return NextResponse.json(gallery);
}

export async function DELETE(_req: Request, { params }: Ctx) {
    await connect();
    await Gallery.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
}
