import { NextResponse } from 'next/server';
import { getArtist, hasDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!hasDb()) return NextResponse.json({ error: 'no-database' }, { status: 503 });
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'bad id' }, { status: 400 });
  const data = await getArtist(id);
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(data);
}
