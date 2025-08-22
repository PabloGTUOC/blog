import { NextResponse } from 'next/server';
import connect from '@/lib/mongodb';
import FamilyUser from '@/models/FamilyUser';

export async function GET(req: Request) {
  await connect();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  const status = searchParams.get('status')?.trim();

  const criteria: Record<string, unknown> = {};
  if (status) criteria.status = status;
  if (q) {
    criteria.$or = [
      { email: { $regex: q, $options: 'i' } },
      { name: { $regex: q, $options: 'i' } },
    ];
  }

  const users = await FamilyUser.find(criteria).sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json(users);
}

export async function PATCH(req: Request) {
  await connect();
  const { id, action } = await req.json();
  const status = action === 'approve' ? 'approved' : action === 'block' ? 'blocked' : null;
  if (!status) {
    return NextResponse.json({ error: 'invalid action' }, { status: 400 });
  }
  const user = await FamilyUser.findByIdAndUpdate(id, { status }, { new: true }).lean();
  return NextResponse.json(user);
}
