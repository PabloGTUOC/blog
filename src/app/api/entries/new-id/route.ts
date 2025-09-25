import { NextResponse } from 'next/server';
import { Types } from 'mongoose';

export const runtime = 'nodejs';

export function GET() {
    const id = new Types.ObjectId().toHexString();
    return NextResponse.json({ id });
}
