import connect from '@/lib/mongodb';
import Gallery from '@/models/Gallery';
import '@/models/Tag';
import bcrypt from 'bcryptjs';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Types } from 'mongoose';
import GalleryViewer from "@/components/GalleryViewer";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ password?: string | string[] }>;
type LeanTag = { _id: Types.ObjectId; name: string; color?: string };

function pickTextColor(hex?: string) {
    if (!hex || !/^#?[0-9a-f]{6}$/i.test(hex)) return "#000";
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return L > 0.55 ? "#000" : "#fff";
}
function hashString(s: string) { let h = 0; for (let i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i))|0; return Math.abs(h); }

function formatEventDate(month?: number, year?: number) {
    const names = ["", "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    if (month && year) return `${names[month]} ${year}`;
    if (month) return names[month];
    if (year) return String(year);
    return "";
}

export default async function GalleryPage({
                                              params,
                                              searchParams,
                                          }: {
    params: Params;
    searchParams: SearchParams;
}) {
    const { id } = await params;
    const sp = await searchParams;
    const providedParam = sp.password;
    const provided = Array.isArray(providedParam) ? providedParam[0] : (providedParam ?? '');

    await connect();

    const gallery = await Gallery.findById(id)
        .select('name images passwordHash tags eventMonth eventYear')
        .populate('tags', 'name color')
        .lean<{ _id: Types.ObjectId; name: string; images: string[]; passwordHash?: string; tags?: (Types.ObjectId | LeanTag)[]; eventMonth?: number; eventYear?: number; }>();

    if (!gallery) return notFound();

    const hasPassword = Boolean(gallery.passwordHash);
    if (hasPassword) {
        const ok = provided && (await bcrypt.compare(provided, gallery.passwordHash!));
        if (!ok) {
            // Protected screen
            return (
                <div className="p-4 space-y-3">
                    <Card className="p-4 space-y-3 gallery-card">
                        <h1 className="page-title" style={{ color: "var(--accent)", textShadow: "3px 3px 0 rgba(0,0,0,.8)" }}>
                            {gallery.name}
                        </h1>
                        <p className="text-sm">This gallery is protected.</p>
                        <form method="GET" className="flex items-center gap-2">
                            <input type="password" name="password" placeholder="Password" className="retro-input" required />
                            <button type="submit" className="retro-btn">Enter</button>
                        </form>
                    </Card>
                </div>
            );
        }
    }

    const images: string[] = Array.isArray(gallery.images) ? gallery.images : [];

    // Accent color: prefer first tag color, else palette by id hash
    const tags =
        Array.isArray(gallery.tags)
            ? (gallery.tags
                .map((t) => (typeof t === 'object' ? { id: t._id.toString(), name: t.name, color: t.color } : null))
                .filter(Boolean) as { id: string; name: string; color?: string }[])
            : [];
    const palette = ["#ff4fa3", "#2bd9ff", "#ffd166", "#4f9dff"];
    const accentHex = tags[0]?.color || palette[hashString(id) % palette.length];

    return (
        <div className="p-4">
            <Card className="p-0 overflow-hidden gallery-card">
                <header className="px-4 md:px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
                    <h1
                        className="page-title leading-none tracking-tight"
                        style={{ color: accentHex, textShadow: "3px 3px 0 rgba(0,0,0,.8)" }}
                    >
                        {gallery.name}
                    </h1>

                    {/* NEW: subtitle with Month/Year if present */}
                    {!!(gallery.eventMonth || gallery.eventYear) && (
                        <div className="gallery-subtitle mt-1">
                            {formatEventDate(gallery.eventMonth, gallery.eventYear)}
                        </div>
                    )}
                    {/* existing tags block remains the same */}
                    {tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {tags.map((t) => (
                                <span
                                    key={t.id}
                                    className="retro-chip"
                                    style={{ backgroundColor: t.color || "var(--surface)", color: pickTextColor(t.color), borderColor: "var(--border)" }}
                                    title={t.name}
                                    >
                                    {t.name}
                                </span>
                            ))}
                        </div>
                    )}
                </header>

                <div className="p-4 md:p-6">
                    <div className="p-4 md:p-6">
                        <GalleryViewer images={images} />
                    </div>
                </div>
            </Card>
        </div>
    );
}
