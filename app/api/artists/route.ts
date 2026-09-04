import { NextResponse } from 'next/server';
import { getPeriodsWithArtists, hasDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!hasDb()) return NextResponse.json({ artists: [] });
  const period = new URL(req.url).searchParams.get('period');
  const periods = await getPeriodsWithArtists();
  const artists = periods.filter(p => !period || p.slug === period).flatMap(p => p.artists);
  return NextResponse.json({ artists });
}
