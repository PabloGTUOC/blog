// src/components/ui/Input.tsx
import * as React from "react";
import clsx from "clsx";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input className={clsx("retro-input", className)} {...props} />;
}
