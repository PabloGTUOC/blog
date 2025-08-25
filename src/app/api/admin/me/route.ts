import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.ADMIN_JWT_SECRET!;

export async function GET() {
    const cookieStore = await cookies();                 // ✅ await
    const token = cookieStore.get("admin_token")?.value; // ✅ safe read
    if (!token) return NextResponse.json({ authenticated: false }, { status: 401 });

    try {
        const payload = jwt.verify(token, JWT_SECRET) as { username: string };
        return NextResponse.json({ authenticated: true, username: payload.username });
    } catch {
        return NextResponse.json({ authenticated: false }, { status: 401 });
    }
}
