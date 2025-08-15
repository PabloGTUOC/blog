import connect from '@/lib/mongodb';
import Gallery from '@/models/Gallery';
import bcrypt from 'bcryptjs';
import { notFound } from 'next/navigation';
export default async function GalleryPage({
                                              params,
                                              searchParams,
                                          }: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ password?: string }>;
}) {
    const { id } = await params;
    const { password = '' } = await searchParams;

    await connect();
    const gallery = await Gallery.findById(id).lean();
    if (!gallery) return notFound();

    const isProtected = !!gallery.passwordHash;
    const authorized = !isProtected || (await bcrypt.compare(password, gallery.passwordHash));

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

