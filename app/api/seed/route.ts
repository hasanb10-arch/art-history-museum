import { NextResponse } from 'next/server';
import { ALL_ARTISTS } from '@/lib/catalog';
import { hasDb } from '@/lib/db';
import { seedArtist, seedPeriods } from '@/lib/seed';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(req: Request) {
  const secret = process.env.SEED_SECRET;
  return !!secret && req.headers.get('x-seed-secret') === secret;
}

/** GET: the seeding plan (list of artists). POST {step:'periods'} or {artist, period}: seed one unit. */
export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({ artists: ALL_ARTISTS, database: hasDb() });
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!hasDb()) return NextResponse.json({ error: 'DATABASE_URL is not set' }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  try {
    if (body.step === 'periods') {
      await seedPeriods();
      return NextResponse.json({ ok: true });
    }
    const unit = ALL_ARTISTS.find(a => a.title === body.artist && a.period === body.period);
    if (!unit) return NextResponse.json({ error: 'unknown artist' }, { status: 400 });
    const report = await seedArtist(unit.period, unit.title);
    return NextResponse.json(report);
  } catch (e: any) {
    return NextResponse.json({ artist: body.artist, status: 'error', note: String(e?.message || e).slice(0, 200) }, { status: 500 });
  }
}
