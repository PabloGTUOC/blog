import connect from '@/lib/mongodb';
import Post from '@/models/Post';
import { notFound } from 'next/navigation';

export default async function PostPage({ params }: { params: { id: string } }) {
  await connect();
  const post = await Post.findById(params.id).populate('gallery').lean();
  if (!post) return notFound();
  return (
    <div className="p-4">
      <h1>{post.title}</h1>
      <article>{post.content}</article>
    </div>
  );
}
