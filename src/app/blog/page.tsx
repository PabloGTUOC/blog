import Link from "next/link";
import connect from "@/lib/mongodb";
import Post from "@/models/Post";
import { Card } from "@/components/ui/Card";

type PostItem = { _id: string; title: string; createdAt: string };

export default async function BlogPage() {
    await connect();

    // Always fetch _id explicitly
    const raw = await Post.find({}, { _id: 1, title: 1, createdAt: 1 })
        .sort({ createdAt: -1 })
        .lean();

    const posts: PostItem[] = raw.map((p: any) => ({
        _id: p._id.toString(),
        title: p.title ?? "(untitled)",
        createdAt: p.createdAt?.toISOString?.() ?? "",
    }));

    return (
        <div className="space-y-3">
            <h1 className="retro-title">Blog</h1>

            <Card>
                {posts.length === 0 ? (
                    <div className="text-sm text-[var(--subt)] p-2">No posts yet.</div>
                ) : (
                    <ul className="grid gap-2">
                        {posts.map((p) => (
                            <li key={p._id}>
                                <Link
                                    className="text-[var(--accent)] underline"
                                    href={`/blog/${p._id}`}
                                >
                                    {p.title}
                                </Link>
                                <span className="ml-2 text-xs text-[var(--subt)]">
                                    {p.createdAt.slice(0, 10)}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );
}
