"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import Uploader from "@/components/Uploader";

export default function Client({ id, name, initialImages }: { id: string; name: string; initialImages: string[] }) {
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
