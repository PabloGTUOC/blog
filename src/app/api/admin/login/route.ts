import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import connect from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";

const JWT_SECRET = process.env.ADMIN_JWT_SECRET as string;

export async function POST(req: Request) {
    const { username, password } = await req.json();
    if (!username || !password) {
        return NextResponse.json({ message: "Missing credentials" }, { status: 400 });
    }

    await connect();
    const user = await AdminUser.findOne({ username });
    if (!user) {
        return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "1d" });
    const res = NextResponse.json({ message: "ok" });
    res.cookies.set({ name: "admin_token", value: token, httpOnly: true, sameSite: "lax", path: "/" });
    return res;
}
