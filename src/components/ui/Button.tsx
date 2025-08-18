// src/components/ui/Button.tsx
"use client";
import * as React from "react";
import clsx from "clsx";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "default" | "primary";
};
export function Button({ className, variant = "default", ...props }: Props) {
    return (
        <button
            className={clsx(
                "retro-btn",
                variant === "primary" && "retro-btn-primary",
                className
            )}
            {...props}
        />
    );
}
