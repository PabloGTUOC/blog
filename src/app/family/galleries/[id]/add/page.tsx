import Gallery from "@/models/Gallery";
import Tag from "@/models/Tag";
import FamilyLogin from "@/components/FamilyLogin";
import { Types } from "mongoose";
import { getApprovedFamilyUser } from "@/lib/familyAuth";
import connect from "@/lib/mongodb";
import Client from "./Client";

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

    await connect();

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
