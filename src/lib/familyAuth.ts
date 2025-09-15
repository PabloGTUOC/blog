import { createClient } from "@/utils/supabase/server";
import connect from "@/lib/mongodb";
import FamilyUser from "@/models/FamilyUser";
import { Types } from "mongoose";

export type FamilyAuthError = "unauthorized" | "pending" | "blocked";

export interface FamilyUserDoc {
    _id: Types.ObjectId;
    email: string;
    name?: string;
    status: "pending" | "approved" | "blocked";
}

export async function getApprovedFamilyUser(opts: { upsert?: boolean } = {}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
        return { error: "unauthorized" as FamilyAuthError };
    }

    await connect();
    let dbUser: FamilyUserDoc | null;
    if (opts.upsert) {
        dbUser = await FamilyUser.findOneAndUpdate(
            { email: user.email },
            {
                $setOnInsert: {
                    name: (user.user_metadata as { full_name?: string } | null)?.full_name || user.email,
                    status: "pending",
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        ).lean<FamilyUserDoc>();
    } else {
        dbUser = await FamilyUser.findOne({ email: user.email }).lean<FamilyUserDoc | null>();
    }

    if (!dbUser) {
        return { error: "unauthorized" as FamilyAuthError };
    }
    if (dbUser.status === "blocked") {
        return { error: "blocked" as FamilyAuthError };
    }
    if (dbUser.status !== "approved") {
        return { error: "pending" as FamilyAuthError };
    }
    return { user: dbUser };
}
