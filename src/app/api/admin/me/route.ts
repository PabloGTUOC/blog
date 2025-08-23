import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.ADMIN_JWT_SECRET as string;

export async function GET() {
    const token = cookies().get("admin_token")?.value;
    if (!token) return NextResponse.json({ authenticated: false }, { status: 401 });
    try {
        const payload = jwt.verify(token, JWT_SECRET) as { username: string };
        return NextResponse.json({ authenticated: true, username: payload.username });
    } catch {
        return NextResponse.json({ authenticated: false }, { status: 401 });
    }
}
