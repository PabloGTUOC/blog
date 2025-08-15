import connect from '@/lib/mongodb';
import Post, { type PostDoc } from '@/models/Post';
import { notFound } from 'next/navigation';

export default async function PostPage({
                                           params,
                                       }: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    await connect();
    const post: PostDoc | null = await Post.findById(id)
        .populate('gallery')
        .lean();
    if (!post || Array.isArray(post)) return notFound();

    return (
        <div className="p-4">
            <h1>{post.title}</h1>
            <article>{post.content}</article>
        </div>
    );
}
