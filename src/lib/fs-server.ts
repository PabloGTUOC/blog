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

export function ensureGalleryDir(galleryName: string, legacyKeys: string[] = []) {
    if (!galleryName || typeof galleryName !== "string") {
        throw new Error("ensureGalleryDir: gallery name is missing");
    }
    const trimmed = galleryName.trim();
    if (!trimmed) {
        throw new Error("ensureGalleryDir: gallery name is empty");
    }
    if (/[\\/]/u.test(trimmed)) {
        throw new Error("ensureGalleryDir: gallery name cannot include path separators");
    }

    ensureDir(GALLERIES_DIR);
    const dir = join(GALLERIES_DIR, trimmed);

    if (!existsSync(dir)) {
        for (const legacy of legacyKeys) {
            if (!legacy || typeof legacy !== "string") continue;
            const candidate = join(GALLERIES_DIR, legacy);
            if (!existsSync(candidate)) continue;
            try {
                renameSync(candidate, dir);
                break;
            } catch {
                // fallback to creating the folder below
            }
        }
    }

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

export function writeBufferFile(destPath: string, buffer: Buffer, options?: { overwrite?: boolean }) {
    const overwrite = options?.overwrite ?? false;
    ensureDir(dirname(destPath));
    return new Promise<void>((resolve, reject) => {
        const ws = createWriteStream(destPath, { flags: overwrite ? "w" : "wx", mode: 0o644 });
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

export function renameGalleryFolder(oldName: string, newName: string, legacyKeys: string[] = []) {
    if (!newName || typeof newName !== "string") {
        throw new Error("renameGalleryFolder: new name is missing");
    }
    const trimmedNew = newName.trim();
    if (!trimmedNew) {
        throw new Error("renameGalleryFolder: new name is empty");
    }
    if (/[\\/]/u.test(trimmedNew)) {
        throw new Error("renameGalleryFolder: new name cannot include path separators");
    }

    ensureDir(GALLERIES_DIR);
    const target = join(GALLERIES_DIR, trimmedNew);
    ensureDir(dirname(target));

    const candidates = [oldName, ...legacyKeys].filter(
        (name): name is string => typeof name === "string" && name.trim() !== ""
    );

    for (const candidateName of candidates) {
        const trimmedCandidate = candidateName.trim();
        if (!trimmedCandidate) continue;
        const candidatePath = join(GALLERIES_DIR, trimmedCandidate);
        if (!existsSync(candidatePath)) continue;
        if (candidatePath === target) return;
        try {
            renameSync(candidatePath, target);
            return;
        } catch {
            // try the next candidate
        }
    }

    ensureDir(target);
}
