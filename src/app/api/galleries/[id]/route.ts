// app/api/galleries/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import connect from "@/lib/mongodb";
import Gallery from "@/models/Gallery";
import { isValidObjectId } from "mongoose";
import { slugify } from "@/lib/slug";
import { PUBLIC_DIR, renameGalleryFolder } from "@/lib/fs-server";
import { rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { resolveGalleryImageUrl } from "@/lib/galleryPaths";

export const runtime = "nodejs";

// GET /api/galleries/:id
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    await connect();
    const { id } = await ctx.params;               // <-- await it
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
    const g = await Gallery.findById(id).lean();
    if (!g) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(g);
}

// PUT /api/galleries/:id
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    await connect();
    const { id } = await ctx.params;               // <-- await it
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

    const payload = await req.json();
    const g = await Gallery.findById(id);
    if (!g) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // rename / slug
    if (typeof payload.name === "string" && payload.name.trim() && payload.name !== g.name) {
        const newSlug = slugify(payload.name);
        const newName = payload.name.trim();
        const currentName = typeof g.name === "string" && g.name.trim() ? g.name.trim() : g.slug;
        try {
            renameGalleryFolder(currentName || g._id.toString(), newName, [g.slug, g._id.toString()]);
            g.images = (g.images || []).map((u: string) => resolveGalleryImageUrl(newName, u));
            g.slug = newSlug;
            g.name = newName;
        } catch (e) {
            console.error("renameGalleryFolder failed:", e);
            return NextResponse.json({ error: "Rename failed" }, { status: 500 });
        }
    }

    // Only update fields; no file I/O here
    if (Array.isArray(payload.images)) {
        // Optional guard: reject local previews
        if (payload.images.some((u: string) => u.startsWith("blob:") || u.startsWith("file:"))) {
            return NextResponse.json({ error: "Images must be server URLs" }, { status: 400 });
        }
        const currentName = typeof g.name === "string" && g.name.trim() ? g.name.trim() : g.slug || g._id.toString();
        g.images = payload.images.map((img: string) => resolveGalleryImageUrl(currentName, img));
    }
    if (Array.isArray(payload.tags)) g.tags = payload.tags;

    if (payload.clearPassword) g.passwordHash = undefined;
    else if (typeof payload.password === "string" && payload.password.length > 0) {
        g.passwordHash = payload.password; // hash if you want
    }

    if (payload.clearEvent) {
        g.eventMonth = undefined;
        g.eventYear = undefined;
    } else {
        if (typeof payload.eventMonth === "number") g.eventMonth = payload.eventMonth;
        if (typeof payload.eventYear === "number") g.eventYear = payload.eventYear;
    }

    g.updatedAt = new Date();
    await g.save();
    return NextResponse.json({ ok: true });
}

// DELETE /api/galleries/:id?deleteFiles=1
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    await connect();
    const { id } = await ctx.params;

    if (!isValidObjectId(id)) {
        return NextResponse.json({ error: "Bad id" }, { status: 400 });
    }

    const g = await Gallery.findById(id);
    if (!g) return NextResponse.json({ ok: true, note: "already missing" });

    const { searchParams } = new URL(req.url);
    const delFiles = searchParams.get("deleteFiles") === "1";

    const diagnostics: any = { slug: g.slug, name: g.name, attempts: [] };

    if (delFiles) {
        // 1) Primary expected folder on disk
        const tryDirs = new Set<string>();
        const possibleKeys = [g.name, g.slug, g._id.toString()].filter(
            (key): key is string => typeof key === "string" && key.trim() !== ""
        );
        for (const key of possibleKeys) {
            tryDirs.add(join(PUBLIC_DIR, "galleries", key.trim()));
        }

        // 2) Any dirs derivable from stored URLs (covers legacy paths or typos)
        for (const u of g.images ?? []) {
            if (typeof u !== "string") continue;
            // normalize URL like /galleries/slug/file.jpg or /uploads/whatever
            const clean = u.split("?")[0].split("#")[0];
            if (clean.startsWith("/")) {
                const rel = clean.replace(/^\/+/u, "");
                const abs = join(PUBLIC_DIR, rel);
                // delete the file's parent directory (the gallery folder)
                tryDirs.add(dirname(abs));
            }
        }

        // Attempt to delete each unique directory
        for (const dir of tryDirs) {
            const existedBefore = existsSync(dir);
            let removed = false;
            let error: string | null = null;

            if (existedBefore) {
                try {
                    // remove dir or file (if someone stored a single file path as "dir")
                    const st = await stat(dir);
                    const target = st.isDirectory() ? dir : dir; // same param, rm handles both
                    await rm(target, { recursive: true, force: true });
                    removed = !existsSync(dir);
                } catch (e: any) {
                    error = e?.message || String(e);
                }
            }

            diagnostics.attempts.push({ dir, existedBefore, removed, error });
        }
    }

    await Gallery.deleteOne({ _id: g._id });

    // Return diagnostics so you can see exactly what happened
    return NextResponse.json({ ok: true, diagnostics });
}