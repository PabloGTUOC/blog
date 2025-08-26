import connect from "@/lib/mongodb";
import Post from "@/models/Post";
import "@/models/Gallery"; // for populate
import "@/models/Tag";     // for populate
import { Types } from "mongoose";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

type Params = Promise<{ id: string }>;
type LeanTag = { _id: Types.ObjectId; name: string; color?: string };
type LeanGallery = { _id: Types.ObjectId; name: string; images?: string[] };
type LeanPost = {
    _id: Types.ObjectId;
    title: string;
    content: string;
    gallery?: Types.ObjectId | LeanGallery | null;
    tags?: (Types.ObjectId | LeanTag)[];
    createdAt?: Date;
};

// Render markdown with links as <a> tags
function renderWithLinks(text: string): React.ReactNode {
    const nodes: React.ReactNode[] = [];
    const urlRe = /\bhttps?:\/\/[^\s<>()]+/gi; // simple http/https matcher
    let last = 0;
    for (const match of text.matchAll(urlRe)) {
        const start = match.index ?? 0;
        const end = start + match[0].length;
        if (start > last) nodes.push(text.slice(last, start));       // plain text chunk
        const href = match[0];
        nodes.push(
            <a
                key={`${start}-${end}`}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
            >
                {href}
            </a>
        );
        last = end;
    }
    if (last < text.length) nodes.push(text.slice(last));
    return <>{nodes}</>;
}

function pickTextColor(hex?: string) {
    if (!hex || !/^#?[0-9a-f]{6}$/i.test(hex)) return "var(--text)";
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b; // luminance
    return L > 0.55 ? "#000" : "#fff";
}

export default async function PostPage({ params }: { params: Params }) {
    const { id } = await params;

    await connect();

    const post = await Post.findById(id)
        .select("title content gallery tags createdAt")
        .populate("gallery", "name images")
        .populate("tags", "name color")
        .lean<LeanPost>();

    if (!post) return notFound();

    // derive gallery refs safely
    const gallery =
        post.gallery && typeof post.gallery === "object" ? (post.gallery as LeanGallery) : null;
    const galleryId = gallery?._id?.toString?.();
    const galleryName = gallery?.name ?? null;
    const galleryImages = Array.isArray(gallery?.images) ? gallery.images : [];

    // tags normalized
    const tags =
        Array.isArray(post.tags)
            ? (post.tags
                .map((t) =>
                    typeof t === "object"
                        ? { id: t._id.toString(), name: t.name, color: t.color }
                        : null
                )
                .filter(Boolean) as { id: string; name: string; color?: string }[])
            : [];

    const titleShadow = "3px 3px 0 rgba(0,0,0,.8)";

    const created =
        post.createdAt ? new Date(post.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : undefined;

    return (
        <div className="p-4">
            <Card className="p-0 overflow-hidden post-card">
                {/* Header */}
                <header className="px-4 md:px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
                    <h1
                        className="post-title font-[var(--font-vt323)] leading-none tracking-tight"
                        style={{
                            color: "var(--accent)",
                            textShadow: titleShadow,
                        }}
                    >
                        {post.title}
                    </h1>

                    {galleryId && galleryImages.length > 0 && (
                        <Link href={`/galleries/${galleryId}`} className="mt-2 block">
                            <div className="flex gap-2">
                                {galleryImages.slice(0, 4).map((src, i) => (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img key={i} src={src} alt="gallery preview" className="w-16 h-16 object-cover border" />
                                ))}
                            </div>
                        </Link>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--subt)]">
                        {created && <span className="retro-label">{created}</span>}
                        {galleryId && (
                            <span>
                <span className="retro-label mr-1">Gallery:</span>
                <Link href={`/galleries/${galleryId}`} className="text-[var(--accent)] underline">
                  {galleryName ?? "View gallery"}
                </Link>
              </span>
                        )}
                        {tags.length > 0 && (
                            <span className="flex flex-wrap gap-1">
                {tags.map((t) => (
                    <span
                        key={t.id}
                        className="retro-chip"
                        style={{
                            backgroundColor: t.color || "var(--surface)",
                            color: pickTextColor(t.color),
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
                </header>

                {/* Body */}
                <article className="prose-retro p-4 md:p-6 whitespace-pre-wrap">
                    {renderWithLinks(post.content)}
                </article>
            </Card>
        </div>
    );
}
