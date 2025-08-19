// src/app/galleries/[id]/page.tsx
import connect from '@/lib/mongodb';
import Gallery from '@/models/Gallery';
import bcrypt from 'bcryptjs';
import { notFound } from 'next/navigation';

// In Next 14.2+/15, params & searchParams are Promises in server components.
type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ password?: string | string[] }>;

export default async function GalleryPage({
                                              params,
                                              searchParams,
                                          }: {
    params: Params;
    searchParams: SearchParams;
}) {
    const { id } = await params;                // 👈 await params
    const sp = await searchParams;              // 👈 await searchParams
    const providedParam = sp.password;
    const provided = Array.isArray(providedParam) ? providedParam[0] : (providedParam ?? '');

    await connect();

    const gallery = await Gallery.findById(id).lean();
    if (!gallery) return notFound();            // 👈 return, don’t just call

    const hasPassword = Boolean(gallery.passwordHash);

    if (hasPassword) {
        const ok = provided && (await bcrypt.compare(provided, gallery.passwordHash));
        if (!ok) {
            return (
                <div className="p-4 space-y-3">
                    <h1 className="retro-title">{gallery.name}</h1>
                    <p className="text-sm">This gallery is protected.</p>
                    {/* Simple GET form so `password` appears in the query string */}
                    <form method="GET" className="flex items-center gap-2">
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            className="retro-input"
                            required
                        />
                        <button type="submit" className="retro-btn">Enter</button>
                    </form>
                </div>
            );
        }
    }

    const images: string[] = Array.isArray(gallery.images) ? gallery.images : [];

    return (
        <div className="p-4">
            <h1 className="retro-title mb-4">{gallery.name}</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {images.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={url} alt={`image-${i}`} className="w-full h-auto object-cover" />
                ))}
            </div>
        </div>
    );
}
