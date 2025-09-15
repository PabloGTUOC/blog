import { createClient } from "@/utils/supabase/server";
import connect from "@/lib/mongodb";
import FamilyUser from "@/models/FamilyUser";
import FamilyLogin from "@/components/FamilyLogin";
import Form from "./Form";

export const dynamic = "force-dynamic";

export default async function NewFamilyGallery() {
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

    return <Form />;
}
