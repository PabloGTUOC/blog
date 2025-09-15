// src/app/page.tsx
import connect from "@/lib/mongodb";
import Entry from "@/models/Entry";
import { Card } from "@/components/ui/Card";
import { Types } from "mongoose";

type LeanEntry = {
    _id: Types.ObjectId;
    title: string;
    caption: string;
    imageUrl: string;
    publishedAt?: Date;
    createdAt?: Date;
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function formatDate(date?: Date | string | null) {
    if (!date) return "";
    const value = typeof date === "string" ? new Date(date) : date;
    if (!(value instanceof Date) || Number.isNaN(value.valueOf())) return "";
    return DATE_FORMATTER.format(value);
}

export default async function Home() {
    await connect();

    const rawEntries = await Entry.find({}, { title: 1, caption: 1, imageUrl: 1, publishedAt: 1, createdAt: 1 })
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(30)
        .lean<LeanEntry[]>();

    const entries = rawEntries.map((entry) => ({
        id: entry._id.toString(),
        title: entry.title ?? "(untitled)",
        caption: entry.caption ?? "",
        imageUrl: entry.imageUrl ?? "",
        publishedAt: entry.publishedAt ?? entry.createdAt ?? null,
    }));

    return (
        <div className="space-y-4">
            <h1 className="retro-title">Latest Entries</h1>

            {entries.length === 0 ? (
                <div className="text-sm text-[var(--subt)]">No entries yet. Check back soon!</div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {entries.map((entry) => (
                        <Card key={entry.id} className="overflow-hidden flex flex-col">
                            <div className="relative aspect-[4/3] w-full bg-[var(--muted)]">
                                {entry.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={entry.imageUrl}
                                        alt={entry.title}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div
                                        className="w-full h-full"
                                        style={{
                                            background:
                                                "repeating-linear-gradient(45deg, var(--muted) 0 8px, rgba(0,0,0,.05) 8px 16px)",
                                        }}
                                    />
                                )}
                            </div>
                            <div className="p-4 space-y-2 flex-1 flex flex-col">
                                <div>
                                    <div className="font-semibold text-lg leading-tight">{entry.title}</div>
                                    {entry.publishedAt && (
                                        <div className="text-xs text-[var(--subt)] uppercase tracking-wide">
                                            {formatDate(entry.publishedAt)}
                                        </div>
                                    )}
                                </div>
                                <p className="text-sm text-[var(--text)] whitespace-pre-line flex-1">{entry.caption}</p>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
