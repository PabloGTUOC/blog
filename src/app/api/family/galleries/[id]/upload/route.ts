// app/api/family/galleries/[id]/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import connect from "@/lib/mongodb";
import FamilyUser from "@/models/FamilyUser";
import Gallery from "@/models/Gallery";
import Tag from "@/models/Tag";
import { ensureGalleryDir, writeBufferFile, uniqueName } from "@/lib/fs-server";
import { slugify } from "@/lib/slug";
import { join, extname, basename } from "node:path";
import { Types } from "mongoose";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connect();
    const dbUser = await FamilyUser.findOne({ email: user.email }).lean();
    if (dbUser?.status !== "approved") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const familyTag = await Tag.findOne({ name: /^family$/i }).select("_id").lean<{ _id: Types.ObjectId } | null>();
    const g = await Gallery.findOne({ _id: id, tags: familyTag?._id });
    if (!g) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!g.slug || typeof g.slug !== "string" || g.slug.trim() === "") {
        const fallbackName = typeof g.name === "string" && g.name.trim() ? g.name : String(g._id);
        g.slug = slugify(fallbackName);
        await g.save();
    }

    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (!files.length) return NextResponse.json({ error: "No files" }, { status: 400 });

    const dir = ensureGalleryDir(g.slug);
    const urls: string[] = [];

    for (const f of files) {
        const ab = await f.arrayBuffer();
        const buf = Buffer.from(ab);
        const ext = (extname(f.name) || ".jpg").replace(".", "");
        const base = basename(f.name, "." + ext);
        const filename = uniqueName(base, ext);
        const dest = join(dir, filename);
        await writeBufferFile(dest, buf);
        urls.push(`/galleries/${g.slug}/${filename}`);
    }

    g.images.push(...urls);
    g.updatedAt = new Date();
    await g.save();

    return NextResponse.json({ urls }, { status: 200 });
}
