import Gallery from "@/models/Gallery";
import Tag from "@/models/Tag";
import FamilyLogin from "@/components/FamilyLogin";
import { Card } from "@/components/ui/Card";
import Uploader from "@/components/Uploader";
import { useState } from "react";
import { Types } from "mongoose";
import { getApprovedFamilyUser } from "@/lib/familyAuth";

export const dynamic = "force-dynamic";
type LeanGallery = { _id: Types.ObjectId; name: string; images: string[] };

export default async function AddPhotosPage({ params }: { params: { id: string } }) {
    const { id } = params;
    const { error } = await getApprovedFamilyUser();
    if (error === "unauthorized") return <FamilyLogin />;
    if (error === "blocked") {
        return (
            <div className="space-y-4">
                <h1 className="retro-title">Family</h1>
                <div className="text-sm text-[var(--subt)]">Your access has been blocked.</div>
            </div>
        );
    }
    if (error) {
        return (
            <div className="space-y-4">
                <h1 className="retro-title">Family</h1>
                <div className="text-sm text-[var(--subt)]">Your access request is pending approval.</div>
            </div>
        );
    }

    const familyTag = await Tag.findOne({ name: /^family$/i }).select("_id").lean<{ _id: Types.ObjectId } | null>();
    const g = await Gallery.findOne({ _id: id, tags: familyTag?._id }).lean<LeanGallery | null>();
    if (!g) {
        return (
            <div className="space-y-4">
                <h1 className="retro-title">Family</h1>
                <div className="text-sm text-[var(--subt)]">Gallery not found.</div>
            </div>
        );
    }

    return <Client id={id} name={g.name} initialImages={g.images} />;
}

function Client({ id, name, initialImages }: { id: string; name: string; initialImages: string[] }) {
    "use client";
    const [images, setImages] = useState(initialImages);
    return (
        <div className="space-y-3">
            <h1 className="retro-title">Add Photos – {name}</h1>
            <Card className="space-y-2 p-4">
                <Uploader
                    multiple
                    accept="image/*"
                    to={`/api/family/galleries/${id}/upload`}
                    onUploaded={(urls) => setImages((prev) => [...prev, ...urls])}
                />
                {images.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {images.map((src, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={src} alt="img" className="w-24 h-24 object-cover" />
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}
