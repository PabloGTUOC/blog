import Link from 'next/link';
import connect from '@/lib/mongodb';
import Gallery from '@/models/Gallery';

type GalleryItem = { _id: string; name: string };

export default async function GalleriesPage() {
  await connect();
  const galleries: GalleryItem[] = await Gallery.find().lean();
  return (
    <div className="p-4">
      <h1>Galleries</h1>
      <ul>
        {galleries.map((g) => (
          <li key={g._id}>
            <Link href={`/galleries/${g._id}`}>{g.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
