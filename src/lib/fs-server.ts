import { existsSync, mkdirSync, renameSync, copyFileSync, createWriteStream } from "node:fs";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";

export const PUBLIC_DIR = "/root/projects/blog-uploads";
export const GALLERIES_DIR = join(PUBLIC_DIR, "galleries");
export const UPLOADS_DIR = join(PUBLIC_DIR, "uploads");

export function ensureDir(path: string) {
    if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

export function ensureGalleryDir(slug: string) {
    if (!slug || typeof slug !== "string") {
        throw new Error("ensureGalleryDir: slug is missing");
    }
    const dir = join(GALLERIES_DIR, slug);
    ensureDir(dir);
    return dir;
}

export function writeBufferFile(destPath: string, buffer: Buffer) {
    ensureDir(dirname(destPath));
    return new Promise<void>((resolve, reject) => {
        const ws = createWriteStream(destPath, { flags: "wx" });
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
