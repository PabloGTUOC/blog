import { NextResponse } from "next/server";
import connect from "@/lib/mongodb";
import Tag from "@/models/Tag";

type Ctx = { params: { id: string } };

export async function PUT(req: Request, { params }: Ctx) {
    await connect();
    const body = await req.json();
    const update: any = {};
    if (typeof body.name === "string") update.name = body.name.trim();
    if (typeof body.color === "string") update.color = body.color;
    const tag = await Tag.findByIdAndUpdate(params.id, { $set: update }, { new: true });
    return NextResponse.json(tag);
}

export async function DELETE(_req: Request, { params }: Ctx) {
    await connect();
    await Tag.findByIdAndDelete(params.id);
    // Optional: clean up references later if you want.
    return NextResponse.json({ ok: true });
}
