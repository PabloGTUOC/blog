import { createClient } from "@/utils/supabase/server";
import connect from "@/lib/mongodb";
import FamilyUser from "@/models/FamilyUser";
import FamilyLogin from "@/components/FamilyLogin";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useState } from "react";

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

function Form() {
    "use client";
    const [name, setName] = useState("");
    const [files, setFiles] = useState<FileList | null>(null);
    const [previews, setPreviews] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);

    const onPickFiles: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        const fs = e.target.files;
        setFiles(fs);
        if (fs && fs.length) {
            const urls = Array.from(fs).map((f) => URL.createObjectURL(f));
            setPreviews(urls);
        }
    };

    const submit: React.FormEventHandler = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const form = new FormData();
            form.set("name", name);
            if (files) Array.from(files).forEach((f) => form.append("files", f));
            const res = await fetch("/api/family/galleries", { method: "POST", body: form });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Create failed");
            setName("");
            setFiles(null);
            setPreviews([]);
            alert("Gallery created");
        } catch (err) {
            console.error(err);
            alert(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-3">
            <h1 className="retro-title">New Family Gallery</h1>
            <Card className="space-y-2">
                <form onSubmit={submit} className="grid gap-2">
                    <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                    <input type="file" multiple accept="image/*" onChange={onPickFiles} />
                    {previews.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {previews.map((src, i) => (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img key={i} src={src} alt="preview" className="w-24 h-24 object-cover" />
                            ))}
                        </div>
                    )}
                    <Button variant="primary" type="submit" disabled={busy}>
                        {busy ? "Saving…" : "Save Gallery"}
                    </Button>
                </form>
            </Card>
        </div>
    );
}
