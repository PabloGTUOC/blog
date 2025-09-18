// src/app/api/tags/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import connect from "@/lib/mongodb";
import Tag from "@/models/Tag";

function getId(ctx: any): string {
    const raw = ctx?.params?.id;
    return Array.isArray(raw) ? raw[0] : (raw as string);
}

export async function PUT(req: NextRequest, ctx: any) {
    await connect();

    const body = (await req.json()) as Partial<{ name: string; color: string }>;
    const update: Partial<{ name: string; color: string }> = {};

    if (typeof body.name === "string") update.name = body.name.trim();
    if (typeof body.color === "string") update.color = body.color;

    const id = getId(ctx);
    const tag = await Tag.findByIdAndUpdate(id, { $set: update }, { new: true });

    if (!tag) return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    return NextResponse.json({ data: tag });
}

export async function DELETE(_req: NextRequest, ctx: any) {
    await connect();

    const id = getId(ctx);
    const deleted = await Tag.findByIdAndDelete(id);

    if (!deleted) return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
}
