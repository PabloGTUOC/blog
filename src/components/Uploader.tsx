"use client";

import type { ChangeEvent } from "react";

interface UploaderProps {
  onUploaded: (urls: string[]) => void;
  className?: string;
}

export default function Uploader({ onUploaded, className }: UploaderProps) {
  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.urls) && data.urls.length > 0) {
          onUploaded(data.urls);
        }
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      e.target.value = "";
    }
  };

  return (
    <input
      type="file"
      multiple
      onChange={handleChange}
      className={className}
    />
  );
}
