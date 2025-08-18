import Link from 'next/link';
import connect from '@/lib/mongodb';
import Gallery from '@/models/Gallery';
import { Card } from '@/components/ui/Card';

type GalleryItem = { _id: string; name: string };

export default async function GalleriesPage() {
  await connect();
  const galleries: GalleryItem[] = await Gallery.find().lean();
  return (
      <div className="space-y-3">
          <h1 className="retro-title">Galleries</h1>
          <Card>
              <ul className="grid gap-2">
                  {galleries.map((g) => (
                      <li key={g._id}>
                          <Link className="text-[var(--accent)] underline" href={`/galleries/${g._id}`}>{g.name}</Link>
                      </li>
                  ))}
              </ul>
          </Card>
      </div>
  );
}
