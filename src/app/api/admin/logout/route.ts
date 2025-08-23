import { NextResponse } from "next/server";

export async function POST() {
    const res = NextResponse.json({ message: "ok" });
    res.cookies.set({ name: "admin_token", value: "", path: "/", maxAge: 0 });
    return res;
}
