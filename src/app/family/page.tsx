// src/app/family/page.tsx
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import connect from "@/lib/mongodb";
import Gallery from "@/models/Gallery";
import Tag from "@/models/Tag";
import FamilyUser from "@/models/FamilyUser";
import "@/models/Tag";
import { Card } from "@/components/ui/Card";
import FamilyLogin from "@/components/FamilyLogin";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type LeanTag = { _id: Types.ObjectId; name: string; color?: string };

const MONTHS = [
    { v: 1, n: "Jan" }, { v: 2, n: "Feb" }, { v: 3, n: "Mar" },
    { v: 4, n: "Apr" }, { v: 5, n: "May" }, { v: 6, n: "Jun" },
    { v: 7, n: "Jul" }, { v: 8, n: "Aug" }, { v: 9, n: "Sep" },
    { v: 10, n: "Oct" }, { v: 11, n: "Nov" }, { v: 12, n: "Dec" },
];
function formatEventDate(m?: number, y?: number) {
    const names = ["", "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    if (m && y) return `${names[m]} ${y}`;
    if (m) return names[m];
    if (y) return String(y);
    return "";
}

export default async function FamilyPage({ searchParams }: { searchParams: SearchParams }) {
    // ✅ use SSR client + getUser (session can be null)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // If not signed in, show the Google login prompt
    if (!user?.email) return <FamilyLogin />;

    await connect();

    // Upsert a FamilyUser and enforce defaults
    const dbUser = await FamilyUser.findOneAndUpdate(
        { email: user.email },
        {
            $setOnInsert: {
                name: (user.user_metadata as { full_name?: string } | null)?.full_name || user.email,
                status: "pending",
            },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    // Gate: only approved can proceed
    if (dbUser.status === "blocked") {
        return (
            <div className="space-y-4">
                <h1 className="retro-title">Family</h1>
                <div className="text-sm text-[var(--subt)]">Your access has been blocked.</div>
            </div>
        );
    }
    if (dbUser.status !== "approved") {
        return (
            <div className="space-y-4">
                <h1 className="retro-title">Family</h1>
                <div className="text-sm text-[var(--subt)]">Your access request is pending approval.</div>
            </div>
        );
    }

    const sp = await searchParams;

    const familyTag = await Tag.findOne({ name: /^family$/i })
        .select("_id name")
        .lean<{ _id: Types.ObjectId; name: string } | null>();
    const familyId = familyTag?._id;
    if (!familyId) {
        return (
            <div className="space-y-4">
                <h1 className="retro-title">Family</h1>
                <div className="text-sm text-[var(--subt)]">
                    Create a tag named “family” and assign it to galleries to see them here.
                </div>
            </div>
        );
    }

    // Filters
    const m = Number(sp.m ?? "");
    const y = Number(sp.y ?? "");
    const validMonth = Number.isInteger(m) && m >= 1 && m <= 12 ? m : undefined;
    const validYear = Number.isInteger(y) && y >= 1900 && y <= 3000 ? y : undefined;

    const filters: Record<string, unknown>[] = [{ tags: familyId }];
    if (validMonth) filters.push({ eventMonth: validMonth });
    if (validYear) filters.push({ eventYear: validYear });
    const criteria = { $and: filters };

    const years = (await Gallery.distinct("eventYear", { tags: familyId }))
        .filter((v: number | null) => typeof v === "number")
        .sort((a: number, b: number) => b - a) as number[];

    const raw = await Gallery.find(
        criteria,
        { name: 1, images: 1, tags: 1, eventMonth: 1, eventYear: 1, createdAt: 1 }
    )
        .sort({ eventYear: -1, eventMonth: -1, createdAt: -1 })
        .limit(60)
        .populate("tags", "name color")
        .lean<{ _id: Types.ObjectId; name: string; images: string[]; eventMonth?: number; eventYear?: number; tags?: (Types.ObjectId | LeanTag)[] }[]>();

    const cards = raw.map((g) => {
        const id = g._id.toString();
        const thumb = Array.isArray(g.images) && g.images.length > 0 ? g.images[0] : "";
        const tags =
            Array.isArray(g.tags)
                ? (g.tags.map((t) =>
                    typeof t === "object" ? { id: t._id.toString(), name: t.name, color: t.color } : null
                ).filter(Boolean) as { id: string; name: string; color?: string }[])
                : [];
        return { id, name: g.name ?? "(untitled)", thumb, href: `/galleries/${id}`, m: g.eventMonth, y: g.eventYear, tags };
    });

    return (
        <div className="space-y-4">
            <h1 className="retro-title">Family</h1>
            <Link href="/family/galleries/new" className="retro-btn">New Gallery</Link>

            {/* Filter bar */}
            <form method="GET" className="grid gap-2 md:grid-cols-[150px_150px_auto_auto] items-end">
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
                <button type="submit" className="retro-btn">Filter</button>
                <a href="/family" className="retro-btn">Clear</a>
            </form>

            {/* Grid */}
            {cards.length === 0 ? (
                <div className="text-sm text-[var(--subt)]">No family galleries match your filters.</div>
            ) : (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {cards.map((g) => (
                        <div key={g.id}>
                            <Link href={g.href} className="no-underline">
                                <Card className="p-0 overflow-hidden">
                                    <div className="relative aspect-[4/3] bg-[var(--muted)]">
                                        {g.thumb ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={g.thumb} alt={g.name} className="w-full h-full object-cover" loading="lazy" />
                                        ) : (
                                            <div className="w-full h-full" style={{ background: "repeating-linear-gradient(45deg, var(--muted) 0 8px, rgba(0,0,0,.05) 8px 16px)" }} />
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
                            <Link href={`/family/galleries/${g.id}/add`} className="block mt-1 text-xs underline">
                                Add photos
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
