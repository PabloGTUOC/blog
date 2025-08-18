// src/components/ui/Card.tsx
import * as React from "react";
import clsx from "clsx";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={clsx("retro-card p-3", className)} {...props} />;
}
