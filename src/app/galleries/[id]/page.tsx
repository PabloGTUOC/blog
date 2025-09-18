// src/app/galleries/[id]/page.tsx
import connect from "@/lib/mongodb";
import Gallery from "@/models/Gallery";
import "@/models/Tag"; // ensure schema for populate
import { Types } from "mongoose";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

// Types
type Params = Promise<{ id: string }>;
type LeanTag = { _id: Types.ObjectId; name: string; color?: string };
type LeanGallery = {
    _id: Types.ObjectId;
    name: string;
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

export default async function GalleryPage({ params }: { params: Params }) {
    const { id } = await params;

    await connect();

    const gallery = await Gallery.findById(id)
        .select("name description images tags eventMonth eventYear createdAt")
        .populate("tags", "name color")
        .lean<Omit<LeanGallery, "tags"> & { tags?: LeanTag[] }>(); // <- populated shape

    if (!gallery) return notFound();

    const tags = (gallery.tags ?? []).map((t) => ({
        id: t._id.toString(),
        name: t.name,
        color: t.color,
    }));

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

            {Array.isArray(gallery.images) && gallery.images.length > 0 ? (
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {gallery.images.map((src, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={src} alt={`img-${i}`} className="w-full h-auto object-cover rounded" loading="lazy" />
                    ))}
                </div>
            ) : (
                <div className="text-sm text-[var(--subt)]">No images yet.</div>
            )}
        </div>
    );
}
