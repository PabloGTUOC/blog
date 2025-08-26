// src/app/page.tsx
import Link from "next/link";
import connect from "@/lib/mongodb";
import Post from "@/models/Post";
import Gallery from "@/models/Gallery";
import "@/models/Tag";
import Tag from "@/models/Tag";
import Carousel from "@/components/Carousel";
import { Card } from "@/components/ui/Card";
import { Types } from "mongoose";

type LeanTag = { _id: Types.ObjectId; name: string; color?: string };
type LeanGallery = { _id: Types.ObjectId; name: string; images: string[] };

type LeanPost = {
    _id: Types.ObjectId;
    title: string;
    content: string;
    gallery?: Types.ObjectId | LeanGallery | null;
    tags?: (Types.ObjectId | LeanTag)[];
};

type LGallery = {
    _id: Types.ObjectId;
    name: string;
    images: string[];
    tags?: (Types.ObjectId | LeanTag)[];
};

function pickTextColor(hex?: string) {
    // very small helper to ensure contrast on the badge background
    if (!hex || !/^#?[0-9a-f]{6}$/i.test(hex)) return "var(--text)";
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    // perceived luminance
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return L > 0.55 ? "#000" : "#fff";
}

export default async function Home() {
    await connect();

    // -------- Posts (newest first) --------
    const rawPosts = await Post.find(
        {},
        { title: 1, content: 1, gallery: 1, tags: 1, createdAt: 1 }
    )
        .sort({ createdAt: -1 })
        .limit(12)
        .populate("gallery", "images")
        .populate("tags", "name color")
        .lean<LeanPost[]>();

    const posts = rawPosts.map((p) => {
        const id = p._id.toString();
        const g = p.gallery && typeof p.gallery === "object" ? (p.gallery as LeanGallery) : null;
        const thumb = g?.images?.[0] ?? "";

        const tags =
            Array.isArray(p.tags)
                ? p.tags
                    .map((t) =>
                        typeof t === "object"
                            ? { id: t._id.toString(), name: t.name, color: t.color }
                            : null
                    )
                    .filter(Boolean) as { id: string; name: string; color?: string }[]
                : [];

        return { id, title: p.title ?? "(untitled)", href: `/blog/${id}`, thumb, tags };
    });

    // Get the 'family' tag id (if it exists)
    const familyTag = await Tag.findOne({ name: /^family$/i }).select("_id").lean<{ _id: Types.ObjectId } | null>();
    const familyId = familyTag?._id;

    // -------- Galleries (newest first) --------
    const rawGalleries = await Gallery.find(
        familyId ? { tags: { $nin: [familyId] } } : {}, // exclude family if tag exists
        { name: 1, images: 1, tags: 1, createdAt: 1 }
    )
        .sort({ createdAt: -1 })
        .limit(12)
        .populate("tags", "name color")
        .lean<LGallery[]>();

    const galleries = rawGalleries.map((g) => {
        const id = g._id.toString();
        const thumb = Array.isArray(g.images) && g.images.length > 0 ? g.images[0] : "";

        const tags =
            Array.isArray(g.tags)
                ? g.tags
                    .map((t) =>
                        typeof t === "object"
                            ? { id: t._id.toString(), name: t.name, color: t.color }
                            : null
                    )
                    .filter(Boolean) as { id: string; name: string; color?: string }[]
                : [];

        return { id, name: g.name ?? "(untitled)", href: `/galleries/${id}`, thumb, tags };
    });

    // -------- Card using your ui/Card + retro badges --------
    function ThumbCard({
                           href,
                           title,
                           thumb,
                           tags,
                       }: {
        href: string;
        title: string;
        thumb?: string;
        tags?: { id: string; name: string; color?: string }[];
    }) {
        const shown = (tags ?? []).slice(0, 3);
        const extra = (tags?.length ?? 0) - shown.length;

        return (
            <Link href={href} className="snap-start no-underline">
                <Card className="p-0 min-w-[240px] w-[240px] overflow-hidden">
                    <div className="relative aspect-[4/3] w-full bg-[var(--muted)] overflow-hidden">
                        {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumb} alt={title} className="w-full h-full object-cover block" loading="lazy" />
                        ) : (
                            <div
                                className="w-full h-full"
                                style={{
                                    background:
                                        "repeating-linear-gradient(45deg, var(--muted) 0 8px, rgba(0,0,0,.05) 8px 16px)",
                                }}
                            />
                        )}

                        {/* retro badges overlay */}
                        {shown.length > 0 && (
                            <div className="absolute left-1 bottom-1 flex flex-wrap gap-1">
                                {shown.map((t) => (
                                    <span
                                        key={t.id}
                                        className="px-2 py-0.5 text-[10px] leading-tight border rounded-[2px]"
                                        style={{
                                            backgroundColor: t.color || "var(--surface)",
                                            color: pickTextColor(t.color),
                                            borderColor: "var(--border)",
                                            boxShadow: "2px 2px 0 0 rgba(0,0,0,0.85)", // retro shadow
                                        }}
                                        title={t.name}
                                    >
                    {t.name}
                  </span>
                                ))}
                                {extra > 0 && (
                                    <span
                                        className="px-2 py-0.5 text-[10px] leading-tight border rounded-[2px]"
                                        style={{
                                            backgroundColor: "var(--surface)",
                                            color: "var(--text)",
                                            borderColor: "var(--border)",
                                            boxShadow: "2px 2px 0 0 rgba(0,0,0,0.85)",
                                        }}
                                        title={`${extra} more`}
                                    >
                    +{extra}
                  </span>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="p-3">
                        <div className="font-medium leading-tight">{title}</div>
                    </div>
                </Card>
            </Link>
        );
    }

    return (
        <div className="p-4 space-y-6">
            <Carousel title="Latest Posts">
                {posts.map((p) => (
                    <ThumbCard key={p.id} href={p.href} title={p.title} thumb={p.thumb} tags={p.tags} />
                ))}
            </Carousel>

            <Carousel title="Latest Galleries">
                {galleries.map((g) => (
                    <ThumbCard key={g.id} href={g.href} title={g.name} thumb={g.thumb} tags={g.tags} />
                ))}
            </Carousel>
        </div>
    );
}
