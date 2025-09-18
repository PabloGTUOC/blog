// app/api/family/galleries/route.ts
import { NextRequest, NextResponse } from "next/server";
import Gallery from "@/models/Gallery";
import Tag from "@/models/Tag";
import { ensureGalleryDir, writeBufferFile, uniqueName } from "@/lib/fs-server";
import { slugify } from "@/lib/slug";
import { join, extname, basename } from "node:path";
import { Types } from "mongoose";
import { getApprovedFamilyUser } from "@/lib/familyAuth";
import connect from "@/lib/mongodb";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    try {
        const { error } = await getApprovedFamilyUser();
        if (error === "unauthorized") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (error) {
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
        const monthNum = Number(eventMonthRaw);
        const yearNum = Number(eventYearRaw);
        if (!eventMonthRaw || Number.isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            return NextResponse.json({ error: "Event month is required" }, { status: 400 });
        }
        if (!eventYearRaw || Number.isNaN(yearNum) || yearNum < 1900 || yearNum > 3000) {
            return NextResponse.json({ error: "Event year is required" }, { status: 400 });
        }

        await connect();

        // Find or create the family tag
        const familyTag = await Tag.findOneAndUpdate(
            { name: /^family$/i },
            { $setOnInsert: { name: "family" } },
            { new: true, upsert: true }
        ).lean<{ _id: Types.ObjectId }>();

        if (!familyTag?._id) {
            // Extremely unlikely with upsert+new, but satisfies TS and protects at runtime
            return NextResponse.json({ error: "Failed to ensure family tag" }, { status: 500 });
        }

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
            tags: [familyTag._id],        // <- now safe
            eventMonth: monthNum,
            eventYear: yearNum,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        return NextResponse.json(
            { _id: doc._id, name: doc.name, slug: doc.slug, images: doc.images },
            { status: 201 }
        );
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Create failed" }, { status: 500 });
    }
}