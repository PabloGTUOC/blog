// app/api/family/galleries/[id]/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import Gallery from "@/models/Gallery";
import Tag from "@/models/Tag";
import { ensureGalleryDir, writeBufferFile } from "@/lib/fs-server";
import { slugify } from "@/lib/slug";
import { join } from "node:path";
import { Types } from "mongoose";
import { getApprovedFamilyUser } from "@/lib/familyAuth";
import connect from "@/lib/mongodb";
import { resolveGalleryImageUrl, sanitizeGalleryFileName } from "@/lib/galleryPaths";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const { error } = await getApprovedFamilyUser();
    if (error === "unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connect();

    const familyTag = await Tag.findOne({ name: /^family$/i }).select("_id").lean<{ _id: Types.ObjectId } | null>();
    const g = await Gallery.findOne({ _id: id, tags: familyTag?._id });
    if (!g) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!g.slug || typeof g.slug !== "string" || g.slug.trim() === "") {
        const fallbackName = typeof g.name === "string" && g.name.trim() ? g.name : g._id.toString();
        g.slug = slugify(fallbackName);
        await g.save();
    }

    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (!files.length) return NextResponse.json({ error: "No files" }, { status: 400 });

    const galleryName =
        typeof g.name === "string" && g.name.trim() ? g.name.trim() : g.slug || g._id.toString();
    const dir = ensureGalleryDir(galleryName, [g.slug, g._id.toString()]);
    const urls: string[] = [];

    for (const f of files) {
        const ab = await f.arrayBuffer();
        const buf = Buffer.from(ab);
        const filename = sanitizeGalleryFileName(f.name);
        const dest = join(dir, filename);
        await writeBufferFile(dest, buf, { overwrite: true });
        urls.push(resolveGalleryImageUrl(galleryName, filename));
    }

    g.images = [
        ...(g.images ?? []).map((img: string) => resolveGalleryImageUrl(galleryName, img)),
        ...urls,
    ];
    g.updatedAt = new Date();
    await g.save();

    return NextResponse.json({ urls }, { status: 200 });
}
