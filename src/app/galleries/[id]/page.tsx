// src/app/galleries/[id]/page.tsx
import connect from '@/lib/mongodb';
import Gallery from '@/models/Gallery';
import bcrypt from 'bcryptjs';
import { notFound } from 'next/navigation';

type Props = {
    params: { id: string };
    searchParams: { password?: string };
};

export default async function GalleryPage({ params, searchParams }: Props) {
    await connect();
    const gallery = await Gallery.findById(params.id).lean();

    if (!gallery) notFound();

    const hasPassword = Boolean(gallery.passwordHash);
    const provided = searchParams.password ?? '';

    if (hasPassword) {
        const ok = provided && (await bcrypt.compare(provided, gallery.passwordHash));
        if (!ok) {
            return (
                <div className="p-4 space-y-3">
                    <h1 className="text-xl font-semibold">{gallery.name}</h1>
                    <p className="text-sm">This gallery is protected.</p>
                    {/* Simple GET form so `password` appears in the query string */}
                    <form method="GET" className="flex items-center gap-2">
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            className="border p-2"
                            required
                        />
                        <button type="submit" className="border p-2">Enter</button>
                    </form>
                </div>
            );
        }
    }

    const images: string[] = Array.isArray(gallery.images) ? gallery.images : [];

    return (
        <div className="p-4">
            <h1 className="text-xl font-semibold mb-4">{gallery.name}</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {images.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={url} alt={`image-${i}`} className="w-full h-auto object-cover" />
                ))}
            </div>
        </div>
    );
}

