import Link from "next/link";
import connect from "@/lib/mongodb";
import Post from "@/models/Post";
import { Card } from "@/components/ui/Card";

type PostItem = { _id: string; title: string };

export default async function BlogPage() {
    await connect();

    // Sort newest first and only fetch what you need
    const raw = await Post.find({}, { title: 1, createdAt: 1 })
        .sort({ createdAt: -1 })
        .lean();

    const posts: PostItem[] = raw.map((p: any) => ({
        _id: p._id.toString(),
        title: p.title ?? "(untitled)",
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
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );
}

