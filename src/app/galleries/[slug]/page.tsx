// src/app/galleries/[slug]/page.tsx
import connect from "@/lib/mongodb";
import Gallery from "@/models/Gallery";
import "@/models/Tag"; // ensure schema for populate
import { Types } from "mongoose";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import GalleryViewer from "@/components/GalleryViewer";
import { resolveGalleryImageUrl } from "@/lib/galleryPaths";
import { ensureGalleryDir } from "@/lib/fs-server";

// Types
type Params = Promise<{ slug: string }>;
type LeanTag = { _id: Types.ObjectId; name: string; color?: string };
type LeanGallery = {
    _id: Types.ObjectId;
    name: string;
    slug?: string;
    description?: string;
    images: string[];
    tags?: (Types.ObjectId | LeanTag)[];
    eventMonth?: number;
    eventYear?: number;
    createdAt?: Date;
};

function formatEventDate(m?: number, y?: number) {
    const names = ["", "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    if (m && y) return `${names[m]} ${y}`;
    if (m) return names[m];
    if (y) return String(y);
    return "";
}

function buildGalleryQuery(slugOrId: string) {
    const trimmed = slugOrId.trim();
    if (!trimmed) return { slug: trimmed };

    // Support legacy numeric/objectId URLs by checking for a 24-char hex string.
    const isObjectId = /^[a-f0-9]{24}$/iu.test(trimmed);
    if (isObjectId) {
        try {
            return {
                $or: [
                    { slug: trimmed },
                    { _id: new Types.ObjectId(trimmed) },
                ],
            } as const;
        } catch {
            // fall through to slug lookup if ObjectId construction fails
        }
    }

    return { slug: trimmed } as const;
}

export default async function GalleryPage({ params }: { params: Params }) {
    const { slug } = await params;
    const trimmedSlug = typeof slug === "string" ? slug.trim() : "";
    if (!trimmedSlug) return notFound();

    await connect();

    const gallery = await Gallery.findOne(buildGalleryQuery(trimmedSlug))
        .select("name slug description images tags eventMonth eventYear createdAt")
        .populate("tags", "name color")
        .lean<Omit<LeanGallery, "tags"> & { tags?: LeanTag[] }>(); // <- populated shape

    if (!gallery) return notFound();

    const galleryName =
        typeof gallery.name === "string" && gallery.name.trim() ? gallery.name.trim() : gallery.slug ?? gallery._id.toString();

    try {
        const legacyKeys = [gallery.slug, gallery._id.toString()].filter(
            (key): key is string => typeof key === "string" && key.trim() !== ""
        );
        ensureGalleryDir(galleryName, legacyKeys);
    } catch (err) {
        console.error("Failed to ensure gallery directory", err);
    }

    const tags = (gallery.tags ?? []).map((t) => ({
        id: t._id.toString(),
        name: t.name,
        color: t.color,
    }));

    const imageUrls = Array.isArray(gallery.images)
        ? gallery.images
              .filter((img): img is string => typeof img === "string" && img.trim() !== "")
              .map((img) => resolveGalleryImageUrl(galleryName, img))
        : [];

    return (
        <div className="p-4 space-y-4">
            <header className="flex items-center justify-between">
                <h1 className="retro-title">{gallery.name}</h1>
                <Link href={`/family/galleries/${gallery._id.toString()}/add`} className="retro-btn">
                    Add photos
                </Link>
            </header>

            <div className="text-sm text-[var(--subt)] flex items-center gap-3">
                {(gallery.eventMonth || gallery.eventYear) && (
                    <span className="retro-label">{formatEventDate(gallery.eventMonth, gallery.eventYear)}</span>
                )}
                {tags.length > 0 && (
                    <span className="flex flex-wrap gap-1">
            {tags.map((t) => (
                <span
                    key={t.id}
                    className="retro-chip"
                    style={{
                        backgroundColor: t.color || "var(--surface)",
                        color: "#000",
                        borderColor: "var(--border)",
                    }}
                    title={t.name}
                >
                {t.name}
              </span>
            ))}
          </span>
                )}
            </div>

            {gallery.description && (
                <Card className="p-3 whitespace-pre-wrap">{gallery.description}</Card>
            )}

            {imageUrls.length > 0 ? (
                <GalleryViewer images={imageUrls} thumbRatio="square" />
            ) : (
                <div className="text-sm text-[var(--subt)]">No images yet.</div>
            )}
        </div>
    );
}
