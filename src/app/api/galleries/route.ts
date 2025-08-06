import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connect from '@/lib/mongodb';
import Gallery from '@/models/Gallery';

export async function GET() {
  await connect();
  const galleries = await Gallery.find();
  return NextResponse.json(galleries);
}

export async function POST(req: Request) {
  await connect();
  const data = await req.json();
  if (data.password) {
    data.passwordHash = await bcrypt.hash(data.password, 10);
    delete data.password;
  }
  const gallery = await Gallery.create(data);
  return NextResponse.json(gallery, { status: 201 });
}
