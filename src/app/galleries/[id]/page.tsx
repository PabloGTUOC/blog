import connect from '@/lib/mongodb';
import Gallery from '@/models/Gallery';
import bcrypt from 'bcryptjs';
import { notFound } from 'next/navigation';

export default async function GalleryPage({ params, searchParams }: { params: { id: string }; searchParams: { password?: string } }) {
  await connect();
  const gallery = await Gallery.findById(params.id).lean();
  if (!gallery) return notFound();

  const isProtected = !!gallery.passwordHash;
  let authorized = true;
  if (isProtected) {
    const entered = searchParams.password || '';
    authorized = await bcrypt.compare(entered, gallery.passwordHash);
  }

  if (isProtected && !authorized) {
    return (
      <form>
        <input type="password" name="password" placeholder="Password" className="border p-1" />
        <button type="submit" className="ml-2 border p-1">Enter</button>
      </form>
    );
  }

  return (
    <div className="p-4">
      <h1>{gallery.name}</h1>
      <div className="grid grid-cols-3 gap-2">
        {gallery.images?.map((url: string, i: number) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={url} alt={`image-${i}`} />
        ))}
      </div>
    </div>
  );
}
