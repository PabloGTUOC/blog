// app/api/family/galleries/route.ts
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

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connect();
        const dbUser = await FamilyUser.findOne({ email: user.email }).lean();
        if (dbUser?.status !== "approved") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const ct = req.headers.get("content-type") || "";
        if (!ct.includes("multipart/form-data")) {
            return NextResponse.json({ error: "Send multipart/form-data" }, { status: 400 });
        }

        const form = await req.formData();
        const name = String(form.get("name") || "").trim();
        if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

        const files = form.getAll("files").filter((f): f is File => f instanceof File);
        if (files.length === 0) {
            return NextResponse.json({ error: "No files" }, { status: 400 });
        }

        const eventMonthRaw = form.get("eventMonth");
        const eventYearRaw = form.get("eventYear");

        // Find or create the family tag
        const familyTag = await Tag.findOneAndUpdate(
            { name: /^family$/i },
            { $setOnInsert: { name: "family" } },
            { new: true, upsert: true }
        ).lean<{ _id: Types.ObjectId }>();

        const slug = slugify(name);
        const dir = ensureGalleryDir(slug);
        const urls: string[] = [];

        for (const f of files) {
            const ab = await f.arrayBuffer();
            const buf = Buffer.from(ab);
            const ext = (extname(f.name) || ".jpg").replace(".", "");
            const base = basename(f.name, "." + ext);
            const filename = uniqueName(base, ext);
            const dest = join(dir, filename);
            await writeBufferFile(dest, buf);
            urls.push(`/galleries/${slug}/${filename}`);
        }

        const doc = await Gallery.create({
            name,
            slug,
            images: urls,
            tags: [familyTag._id],
            eventMonth: eventMonthRaw ? Number(eventMonthRaw) : undefined,
            eventYear: eventYearRaw ? Number(eventYearRaw) : undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        return NextResponse.json({ _id: doc._id, name: doc.name, slug: doc.slug, images: doc.images }, { status: 201 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Create failed" }, { status: 500 });
    }
}
