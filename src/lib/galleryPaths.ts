export function sanitizeGalleryFileName(originalName: string) {
    const fallback = `image-${Date.now().toString(36)}`;
    if (typeof originalName !== "string") {
        return fallback;
    }
    const stripped = originalName.split(/[/\\]/u).pop() ?? "";
    const trimmed = stripped.trim();
    const [withoutQuery] = trimmed.split(/[?#]/u);
    const dotIndex = withoutQuery.lastIndexOf(".");
    const rawBase = dotIndex > 0 ? withoutQuery.slice(0, dotIndex) : withoutQuery;
    const rawExt = dotIndex > 0 ? withoutQuery.slice(dotIndex + 1) : "";

    const safeBase = rawBase.replace(/[^a-zA-Z0-9_-]/gu, "_").slice(0, 80) || "image";
    const safeExt = rawExt.replace(/[^a-zA-Z0-9]/gu, "").slice(0, 12).toLowerCase();

    return safeExt ? `${safeBase}.${safeExt}` : safeBase;
}

export function resolveGalleryImageUrl(galleryName: string, value: string) {
    if (!galleryName || typeof galleryName !== "string") return value;
    const trimmedName = galleryName.trim();
    if (!trimmedName) return value;

    const basePath = `/uploads/${trimmedName}`;

    if (typeof value !== "string") {
        return basePath;
    }

    const trimmedValue = value.trim();
    if (!trimmedValue) {
        return basePath;
    }

    if (/^https?:\/\//iu.test(trimmedValue) || trimmedValue.startsWith("data:")) {
        return trimmedValue;
    }

    const uploadsMatch = trimmedValue.match(/^\/(?:uploads|galleries)\/[^/]+\/(.+)$/u);
    if (uploadsMatch) {
        return `${basePath}/${uploadsMatch[1]}`;
    }

    const filePart = trimmedValue.split(/[/\\]/u).pop() ?? trimmedValue;
    const safeFile = sanitizeGalleryFileName(filePart);
    return `${basePath}/${safeFile}`;
}
