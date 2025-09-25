import Link from "next/link";
import connect from "@/lib/mongodb";
import Post from "@/models/Post";
import { Card } from "@/components/ui/Card";

type PostItem = { _id: string; title: string; createdAt: string; excerpt: string };

export default async function BlogPage() {
    await connect();

    // Include _id, title, createdAt, and content (for excerpt)
    const raw = await Post.find({}, { _id: 1, title: 1, createdAt: 1, content: 1 })
        .sort({ createdAt: -1 })
        .lean();

    const posts: PostItem[] = raw.map((p: any) => {
        const text = p.content ?? "";
        // Extract first paragraph OR first 200 characters
        const excerpt =
            text.split("\n\n")[0].slice(0, 200) + (text.length > 200 ? "…" : "");

        return {
            _id: p._id.toString(),
            title: p.title ?? "(untitled)",
            createdAt: p.createdAt?.toISOString?.() ?? "",
            excerpt,
        };
    });

    return (
        <div className="space-y-3">
            <h1 className="retro-title">Blog</h1>

            <Card>
                {posts.length === 0 ? (
                    <div className="text-sm text-[var(--subt)] p-2">No posts yet.</div>
                ) : (
                    <ul className="grid gap-4">
                        {posts.map((p) => (
                            <li key={p._id} className="p-3 border-b border-[var(--border)]">
                                <Link
                                    className="text-lg font-bold text-[var(--accent)] hover:underline"
                                    href={`/blog/${p._id}`}
                                >
                                    {p.title}
                                </Link>
                                <div className="text-xs text-[var(--subt)]">
                                    {p.createdAt.slice(0, 10)}
                                </div>
                                <p className="mt-1 text-sm text-[var(--fg)]">{p.excerpt}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );
}
