"use client";

import { useState } from "react";

type Opt = { id: string; name: string; color?: string };

export default function TagFilterDropdown({
                                              options,
                                              initialSelected = [],
                                              name = "t",
                                              label = "Tags",
                                              className = "",
                                          }: {
    options: Opt[];
    initialSelected?: string[];
    name?: string;      // name for the GET param (we use "t")
    label?: string;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const [sel, setSel] = useState<string[]>(initialSelected);

    const toggle = (id: string) =>
        setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

    const clear = () => setSel([]);

    const summary =
        sel.length === 0
            ? "Any"
            : sel.length <= 2
                ? options.filter((o) => sel.includes(o.id)).map((o) => o.name).join(", ")
                : `${sel.length} selected`;

    return (
        <div className={`relative ${className}`}>
            <div className="retro-label mb-1">{label}</div>

            {/* Hidden inputs so the form submits selected tag ids as ?t=...&t=... */}
            {sel.map((id) => (
                <input key={id} type="hidden" name={name} value={id} />
            ))}

            <button type="button" className="retro-input flex items-center justify-between"
                    onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open}>
                <span className="truncate">{summary || "Any"}</span>
                <span aria-hidden>▾</span>
            </button>

            {open && (
                <div className="absolute z-20 mt-1 w-[260px] max-h-64 overflow-auto border bg-[var(--surface)]"
                     style={{ borderColor: "var(--border)", boxShadow: "4px 4px 0 rgba(0,0,0,.85)" }}>
                    <div className="p-2">
                        <div className="flex items-center justify-between mb-2 gap-2">
                            <strong className="text-sm">Select tags</strong>
                            <button type="button" className="retro-btn" onClick={clear}>Clear</button>
                        </div>
                        <ul className="grid gap-1">
                            {options.map((o) => (
                                <li key={o.id} className="flex items-center gap-2">
                                    <input
                                        id={`tag-${o.id}`}
                                        type="checkbox"
                                        checked={sel.includes(o.id)}
                                        onChange={() => toggle(o.id)}
                                    />
                                    <label htmlFor={`tag-${o.id}`} className="cursor-pointer">{o.name}</label>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-2 text-right">
                            <button type="button" className="retro-btn" onClick={() => setOpen(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
