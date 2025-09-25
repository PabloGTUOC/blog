// components/Uploader.tsx
"use client";

import type { ChangeEvent } from "react";

interface UploaderProps {
    onUploaded: (urls: string[]) => void;
    className?: string;
    to?: string;                 // <— where to POST (default /api/upload)
    accept?: string;             // e.g. "image/jpeg,image/png"
    multiple?: boolean;          // default true
    disabled?: boolean;
    targetType?: "entries" | "blogs";
    targetId?: string;
}

export default function Uploader({
                                     onUploaded,
                                     className,
                                     to = "/api/upload",
                                     accept = "image/*",
                                     multiple = true,
                                     disabled = false,
                                     targetType,
                                     targetId,
                                 }: UploaderProps) {
    const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) return;
        if (targetType && !targetId) {
            console.error("Uploader: targetId is required when targetType is provided");
            e.target.value = "";
            return;
        }

        const formData = new FormData();
        files.forEach((file) => formData.append("files", file)); // key must be "files"
        if (targetType) formData.append("targetType", targetType);
        if (targetId) formData.append("targetId", targetId);

        try {
            const res = await fetch(to, { method: "POST", body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Upload failed");
            if (Array.isArray(data.urls) && data.urls.length > 0) onUploaded(data.urls);
        } catch (err) {
            console.error("Upload failed", err);
        } finally {
            e.target.value = "";
        }
    };

    return (
        <input
            type="file"
            multiple={multiple}
            accept={accept}
            onChange={handleChange}
            className={className}
            disabled={disabled}
        />
    );
}
