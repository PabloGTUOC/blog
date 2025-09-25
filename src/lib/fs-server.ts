import { existsSync, mkdirSync, renameSync, copyFileSync, createWriteStream, chmodSync } from "node:fs";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";

export const PUBLIC_DIR = "/var/www/blog-uploads";
export const GALLERIES_DIR = join(PUBLIC_DIR, "galleries");
export const ENTRIES_DIR = join(PUBLIC_DIR, "entries");
export const BLOGS_DIR = join(PUBLIC_DIR, "blogs");

export function ensureDir(path: string) {
    if (!existsSync(path)) {
        mkdirSync(path, { recursive: true, mode: 0o755 });
    }
    try {
        chmodSync(path, 0o755);
    } catch {
        // ignore chmod errors (e.g. if not permitted)
    }
}

export function ensureGalleryDir(slug: string) {
    if (!slug || typeof slug !== "string") {
        throw new Error("ensureGalleryDir: slug is missing");
    }
    ensureDir(GALLERIES_DIR);
    const dir = join(GALLERIES_DIR, slug);
    ensureDir(dir);
    return dir;
}

export function ensureEntryDir(id: string) {
    if (!id || typeof id !== "string") {
        throw new Error("ensureEntryDir: id is missing");
    }
    ensureDir(ENTRIES_DIR);
    const dir = join(ENTRIES_DIR, id);
    ensureDir(dir);
    return dir;
}

export function ensureBlogDir(id: string) {
    if (!id || typeof id !== "string") {
        throw new Error("ensureBlogDir: id is missing");
    }
    ensureDir(BLOGS_DIR);
    const dir = join(BLOGS_DIR, id);
    ensureDir(dir);
    return dir;
}

export function writeBufferFile(destPath: string, buffer: Buffer) {
    ensureDir(dirname(destPath));
    return new Promise<void>((resolve, reject) => {
        const ws = createWriteStream(destPath, { flags: "wx", mode: 0o644 });
        ws.on("error", reject);
        ws.on("finish", () => resolve());
        ws.end(buffer);
    });
}

export function uniqueName(base: string, ext: string) {
    // keeps original-ish name shape but avoids collisions
    const id = randomUUID().slice(0, 8);
    const safeBase = base.replace(/[^a-z0-9\-_.]/gi, "_").replace(/\.+/g, ".");
    return `${safeBase}-${id}.${ext.toLowerCase()}`;
}

export function copyLocalFile(srcAbs: string, destAbs: string) {
    ensureDir(dirname(destAbs));
    copyFileSync(srcAbs, destAbs);
    try {
        chmodSync(destAbs, 0o644);
    } catch {
        // ignore chmod errors
    }
}

export function renameGalleryFolder(oldSlug: string, newSlug: string) {
    const from = join(GALLERIES_DIR, oldSlug);
    const to = join(GALLERIES_DIR, newSlug);
    if (existsSync(from)) {
        ensureDir(dirname(to));
        renameSync(from, to);
    } else {
        ensureDir(to);
    }
}
