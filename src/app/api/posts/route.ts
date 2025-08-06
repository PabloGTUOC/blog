import { NextResponse } from 'next/server';
import connect from '@/lib/mongodb';
import Post from '@/models/Post';

export async function GET() {
  await connect();
  const posts = await Post.find().populate('gallery');
  return NextResponse.json(posts);
}

export async function POST(req: Request) {
  await connect();
  const data = await req.json();
  const post = await Post.create(data);
  return NextResponse.json(post, { status: 201 });
}
