// src/app/blog/[id]/page.tsx
import connect from "@/lib/mongodb";
import Post from "@/models/Post";
import "@/models/Gallery";
import { Types } from "mongoose";
import { notFound } from "next/navigation";
import Link from "next/link";

type Params = Promise<{ id: string }>;
type LeanGallery = { _id: Types.ObjectId; name: string };
type LeanPost = {
    _id: Types.ObjectId;
    title: string;
    content: string;
    gallery?: Types.ObjectId | LeanGallery | null;
};

export default async function PostPage({ params }: { params: Params }) {
    const { id } = await params; // 👈 await the params

    await connect();

    const post = await Post.findById(id)
        .populate("gallery", "name")
        .lean<LeanPost>();

    if (!post) return notFound();

    const isPopulated = (g: LeanPost["gallery"]): g is LeanGallery =>
        !!g && typeof g === "object" && "name" in g;

    const galleryId = post.gallery
        ? isPopulated(post.gallery)
            ? post.gallery._id.toString()
            : post.gallery.toString()
        : null;

    const galleryName = isPopulated(post.gallery) ? post.gallery.name : null;

    return (
        <div className="p-4 space-y-3">
            <h1 className="retro-title">{post.title}</h1>
            <div className="retro-card p-3 whitespace-pre-wrap">{post.content}</div>

            {galleryId && (
                <div className="text-sm">
                    <span className="retro-label mr-2">Gallery</span>
                    <Link href={`/galleries/${galleryId}`} className="text-[var(--accent)] underline">
                        {galleryName ?? "View gallery"}
                    </Link>
                </div>
            )}
        </div>
    );
}
