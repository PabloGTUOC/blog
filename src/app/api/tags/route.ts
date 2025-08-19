import { NextResponse } from "next/server";
import connect from "@/lib/mongodb";
import Tag from "@/models/Tag";

export async function GET(req: Request) {
    await connect();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const criteria = q ? { name: { $regex: q, $options: "i" } } : {};
    const tags = await Tag.find(criteria).sort({ name: 1 }).lean();
    return NextResponse.json(tags);
}

export async function POST(req: Request) {
    await connect();
    const body = await req.json();
    const tag = await Tag.create({
        name: String(body.name).trim(),
        color: body.color || "#111111",
    });
    return NextResponse.json(tag, { status: 201 });
}
