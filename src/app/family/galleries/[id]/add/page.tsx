import { createClient } from "@/utils/supabase/server";
import connect from "@/lib/mongodb";
import FamilyUser from "@/models/FamilyUser";
import Gallery from "@/models/Gallery";
import Tag from "@/models/Tag";
import FamilyLogin from "@/components/FamilyLogin";
import { Types } from "mongoose";
import Client from "./Client";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

type LeanGallery = { _id: Types.ObjectId; name: string; images: string[] };

export default async function AddPhotosPage({ params }: { params: Params }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return <FamilyLogin />;

    await connect();
    const dbUser = await FamilyUser.findOne({ email: user.email }).lean();
    if (dbUser?.status !== "approved") {
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
