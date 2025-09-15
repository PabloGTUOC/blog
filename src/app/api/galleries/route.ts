// app/api/galleries/route.ts
import { NextRequest, NextResponse } from "next/server";
import connect from "@/lib/mongodb";
import Gallery from "@/models/Gallery";
import { isValidObjectId } from "mongoose";
import { join, extname, basename } from "node:path";
import { ensureGalleryDir, writeBufferFile, uniqueName } from "@/lib/fs-server";
import { slugify } from "@/lib/slug";

export const runtime = "nodejs";

// GET /api/galleries?q=...&limit=100
export async function GET(req: Request) {
    await connect();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const limit = Number(searchParams.get("limit") ?? 100);

    const criteria: any = q
        ? {
            $or: [
                { name: { $regex: q, $options: "i" } },
                { images: { $elemMatch: { $regex: q, $options: "i" } } },
                ...(isValidObjectId(q) ? [{ _id: q }] : []),
            ],
        }
        : {};

    const galleries = await Gallery.find(
        criteria,
        { name: 1, images: 1, passwordHash: 1, tags: 1, createdAt: 1, eventMonth: 1, eventYear: 1, slug: 1 }
    )
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

    return NextResponse.json(galleries);
}

// POST /api/galleries  (multipart or JSON)
export async function POST(req: NextRequest) {
    try {
        await connect();

        const ct = req.headers.get("content-type") || "";
        if (!ct.includes("multipart/form-data")) {
            return NextResponse.json({ error: "Send multipart/form-data" }, { status: 400 });
        }

        const form = await req.formData();
        const name = String(form.get("name") || "").trim();
        if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

        const password = String(form.get("password") || "") || undefined;
        const eventMonthRaw = form.get("eventMonth");
        const eventYearRaw = form.get("eventYear");

        const tags: string[] = [];
        for (const [k, v] of form.entries()) {
            if (k === "tags[]" && typeof v === "string") tags.push(v);
        }

        const files = form.getAll("files").filter((f): f is File => f instanceof File);

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
            passwordHash: password ? password : undefined, // replace with bcrypt if you like
            tags,
            eventMonth: eventMonthRaw ? Number(eventMonthRaw) : undefined,
            eventYear: eventYearRaw ? Number(eventYearRaw) : undefined,
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
