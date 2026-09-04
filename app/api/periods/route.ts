import { NextResponse } from 'next/server';
import { getPeriodsWithArtists, hasDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!hasDb()) return NextResponse.json({ periods: [], reason: 'no-database' });
  try {
    const periods = await getPeriodsWithArtists();
    return NextResponse.json({ periods });
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (/does not exist/i.test(msg)) return NextResponse.json({ periods: [], reason: 'not-seeded' });
    return NextResponse.json({ periods: [], reason: 'error' }, { status: 500 });
  }
}
