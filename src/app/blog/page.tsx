import Link from 'next/link';
import connect from '@/lib/mongodb';
import Post from '@/models/Post';

type PostItem = { _id: string; title: string };

export default async function BlogPage() {
  await connect();
  const posts: PostItem[] = await Post.find().lean();
  return (
    <div className="p-4">
      <h1>Blog</h1>
      <ul>
        {posts.map((p) => (
          <li key={p._id}>
            <Link href={`/blog/${p._id}`}>{p.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
