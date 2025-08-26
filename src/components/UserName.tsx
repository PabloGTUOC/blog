"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
type Metadata = { full_name?: string };

export default function UserName() {
    const [name, setName] = useState("guest");

    useEffect(() => {
        const load = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (user) {
                const full = (user.user_metadata as Metadata)?.full_name;
                setName(full || user.email || "guest");
            }
        };
        load();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            const user = session?.user;
            if (user) {
                const full = (user.user_metadata as Metadata)?.full_name;
                setName(full || user.email || "guest");
            } else {
                setName("guest");
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return <span className="text-sm text-[var(--subt)]">{name}</span>;
}

