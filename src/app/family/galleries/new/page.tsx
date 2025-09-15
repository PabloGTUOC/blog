import FamilyLogin from "@/components/FamilyLogin";
import Form from "./Form";
import { getApprovedFamilyUser } from "@/lib/familyAuth";

export const dynamic = "force-dynamic";

export default async function NewFamilyGallery() {
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

    return <Form />;
}
