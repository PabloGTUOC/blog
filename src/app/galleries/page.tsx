// src/app/galleries/page.tsx
import Link from "next/link";
import connect from "@/lib/mongodb";
import Gallery from "@/models/Gallery";
import Tag from "@/models/Tag";
import { Card } from "@/components/ui/Card";
import { Types } from "mongoose";
import TagFilterDropdown from "@/components/TagFilterDropdown";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type LeanTag = { _id: Types.ObjectId; name: string; color?: string };

type LeanGalleryCard = {
    _id: Types.ObjectId;
    slug?: string;
    name: string;
    images: string[];
    eventMonth?: number;
    eventYear?: number;
    tags?: LeanTag[]; // populated shape after .populate("tags")
};

const MONTHS = [
    { v: 1,  n: "Jan" }, { v: 2,  n: "Feb" }, { v: 3,  n: "Mar" },
    { v: 4,  n: "Apr" }, { v: 5,  n: "May" }, { v: 6,  n: "Jun" },
    { v: 7,  n: "Jul" }, { v: 8,  n: "Aug" }, { v: 9,  n: "Sep" },
    { v: 10, n: "Oct" }, { v: 11, n: "Nov" }, { v: 12, n: "Dec" },
];

function pickTextColor(hex?: string) {
    if (!hex || !/^#?[0-9a-f]{6}$/i.test(hex)) return "var(--text)";
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return L > 0.55 ? "#000" : "#fff";
}
function formatEventDate(m?: number, y?: number) {
    const names = ["", "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    if (m && y) return `${names[m]} ${y}`;
    if (m) return names[m];
    if (y) return String(y);
    return "";
}
function toArray(v?: string | string[]) {
    return Array.isArray(v) ? v : v ? [v] : [];
}

export default async function GalleriesIndex({ searchParams }: { searchParams: SearchParams }) {
    const sp = await searchParams;
    await connect();

    // Find the family tag id (if it exists)
    const familyTag = await Tag.findOne({ name: /^family$/i })
        .select("_id name")
        .lean<{ _id: Types.ObjectId } | null>();
    const familyId = familyTag?._id?.toString();

    // Parse filters
    const m = Number(sp.m ?? "");
    const y = Number(sp.y ?? "");
    const tagFilterIds = toArray(sp.t).filter(Boolean); // array of tag ids (strings)
    const validMonth = Number.isInteger(m) && m >= 1 && m <= 12 ? m : undefined;
    const validYear  = Number.isInteger(y) && y >= 1900 && y <= 3000 ? y : undefined;

    // Build criteria: exclude 'family'; include tag filters if provided
    const and: Record<string, unknown>[] = [];
    if (validMonth) and.push({ eventMonth: validMonth });
    if (validYear)  and.push({ eventYear: validYear });
    if (familyId)   and.push({ tags: { $nin: [familyId] } });
    if (tagFilterIds.length > 0) and.push({ tags: { $all: tagFilterIds } });
    const criteria = and.length ? { $and: and } : {};

    // Options for tag filter: all tags except 'family'
    const tagOptions = await Tag.find(familyId ? { _id: { $ne: familyId } } : {}, "name color")
        .sort({ name: 1 })
        .lean<{ _id: Types.ObjectId; name: string; color?: string }[]>();

    // Distinct years present (for this section that excludes family)
    const yearCriteria = familyId ? { tags: { $nin: [familyId] } } : {};
    const years = (await Gallery.distinct("eventYear", yearCriteria))
        .filter((v: number | null) => typeof v === "number")
        .sort((a: number, b: number) => b - a) as number[];

    // Query galleries (NOTE the awaited find + typed lean)
    const raw = await Gallery.find(
        criteria,
        { name: 1, slug: 1, images: 1, tags: 1, eventMonth: 1, eventYear: 1, createdAt: 1 }
    )
        .sort({ eventYear: -1, eventMonth: -1, createdAt: -1 })
        .limit(60)
        .populate("tags", "name color")
        .lean<LeanGalleryCard[]>(); // <- populated tags as LeanTag[]

    const cards = raw.map((g) => {
        const id = g._id.toString();
        const thumb = Array.isArray(g.images) && g.images.length > 0 ? g.images[0] : "";
        const slug = typeof g.slug === "string" && g.slug.trim() ? g.slug.trim() : undefined;
        const tags = (g.tags ?? []).map((t) => ({
            id: t._id.toString(),
            name: t.name,
            color: t.color,
        }));
        return {
            id,
            slug,
            name: g.name ?? "(untitled)",
            thumb,
            href: `/galleries/${slug ?? id}`,
            m: g.eventMonth,
            y: g.eventYear,
            tags,
        };
    });

    return (
        <div className="space-y-4">
            <h1 className="retro-title">Galleries</h1>

            {/* Filter bar */}
            <form method="GET" className="grid gap-2 md:grid-cols-[150px_150px_1fr_auto_auto] items-end">
                <div>
                    <div className="retro-label mb-1">Month</div>
                    <select name="m" className="retro-input" defaultValue={validMonth ? String(validMonth) : ""}>
                        <option value="">All</option>
                        {MONTHS.map((mm) => (
                            <option key={mm.v} value={mm.v}>{mm.n}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <div className="retro-label mb-1">Year</div>
                    <select name="y" className="retro-input" defaultValue={validYear ? String(validYear) : ""}>
                        <option value="">All</option>
                        {years.map((yy) => (
                            <option key={yy} value={yy}>{yy}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <TagFilterDropdown
                        options={tagOptions.map(t => ({ id: t._id.toString(), name: t.name, color: t.color }))}
                        initialSelected={tagFilterIds}
                    />
                </div>
                <button type="submit" className="retro-btn">Filter</button>
                <Link href="/galleries" className="retro-btn">Clear</Link>
            </form>

            {/* Grid */}
            {cards.length === 0 ? (
                <div className="text-sm text-[var(--subt)]">No galleries match your filters.</div>
            ) : (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {cards.map((g) => (
                        <Link key={g.id} href={g.href} className="no-underline">
                            <Card className="p-0 overflow-hidden">
                                <div className="relative aspect-[4/3] bg-[var(--muted)]">
                                    {g.thumb ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={g.thumb} alt={g.name} className="w-full h-full object-cover" loading="lazy" />
                                    ) : (
                                        <div
                                            className="w-full h-full"
                                            style={{
                                                background:
                                                    "repeating-linear-gradient(45deg, var(--muted) 0 8px, rgba(0,0,0,.05) 8px 16px)",
                                            }}
                                        />
                                    )}
                                    {/* small chips */}
                                    {g.tags.length > 0 && (
                                        <div className="absolute left-1 bottom-1 flex flex-wrap gap-1">
                                            {g.tags.slice(0, 3).map((t) => (
                                                <span
                                                    key={t.id}
                                                    className="px-2 py-0.5 text-[10px] leading-tight border rounded-[2px]"
                                                    style={{
                                                        backgroundColor: t.color || "var(--surface)",
                                                        color: pickTextColor(t.color),
                                                        borderColor: "var(--border)",
                                                        boxShadow: "2px 2px 0 0 rgba(0,0,0,0.85)",
                                                    }}
                                                    title={t.name}
                                                >
                          {t.name}
                        </span>
                                            ))}
                                            {g.tags.length > 3 && (
                                                <span
                                                    className="px-2 py-0.5 text-[10px] leading-tight border rounded-[2px]"
                                                    style={{
                                                        backgroundColor: "var(--surface)",
                                                        color: "var(--text)",
                                                        borderColor: "var(--border)",
                                                        boxShadow: "2px 2px 0 0 rgba(0,0,0,0.85)",
                                                    }}
                                                >
                          +{g.tags.length - 3}
                        </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="p-3">
                                    <div className="font-medium leading-tight">{g.name}</div>
                                    {(g.m || g.y) && (
                                        <div className="text-xs text-[var(--subt)]">{formatEventDate(g.m, g.y)}</div>
                                    )}
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
