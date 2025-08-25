"use client";

import type { ChangeEvent } from "react";

interface UploaderProps {
  onUploaded: (urls: string[]) => void;
  className?: string;
}

export default function Uploader({ onUploaded, className }: UploaderProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const urls = files.map((f) => URL.createObjectURL(f));
    if (urls.length > 0) onUploaded(urls);
    e.target.value = "";
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
