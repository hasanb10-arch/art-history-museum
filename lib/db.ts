import { neon } from '@neondatabase/serverless';

// The connection string is read from the environment and never logged or returned.
export function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return neon(url);
}

export function hasDb() {
  return !!process.env.DATABASE_URL;
}

export async function ensureSchema() {
  const q = sql();
  await q`CREATE TABLE IF NOT EXISTS periods (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    start_year INT NOT NULL,
    end_year INT NOT NULL,
    description TEXT,
    wiki_url TEXT,
    position INT NOT NULL DEFAULT 0
  )`;
  await q`CREATE TABLE IF NOT EXISTS artists (
    id SERIAL PRIMARY KEY,
    period_id INT REFERENCES periods(id) ON DELETE CASCADE,
    wiki_title TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    qid TEXT,
    birth_year INT,
    death_year INT,
    bio TEXT,
    portrait_url TEXT,
    wiki_url TEXT,
    seeded_at TIMESTAMPTZ DEFAULT now()
  )`;
  await q`CREATE TABLE IF NOT EXISTS paintings (
    id SERIAL PRIMARY KEY,
    artist_id INT REFERENCES artists(id) ON DELETE CASCADE,
    qid TEXT,
    title TEXT NOT NULL,
    year INT,
    image_url TEXT NOT NULL,
    thumb_url TEXT NOT NULL,
    width INT,
    height INT,
    license TEXT,
    story TEXT,
    fun_facts JSONB DEFAULT '[]',
    wiki_url TEXT,
    commons_file TEXT,
    position INT NOT NULL DEFAULT 0
  )`;
  await q`CREATE INDEX IF NOT EXISTS paintings_artist_idx ON paintings(artist_id)`;
  await q`CREATE INDEX IF NOT EXISTS artists_period_idx ON artists(period_id)`;
}

export type PeriodRow = {
  id: number; slug: string; name: string; start_year: number; end_year: number; description: string | null; wiki_url: string | null; position: number;
};
export type ArtistRow = {
  id: number; period_id: number; wiki_title: string; name: string; qid: string | null; birth_year: number | null; death_year: number | null;
  bio: string | null; portrait_url: string | null; wiki_url: string | null; painting_count?: number; period_slug?: string;
};
export type PaintingRow = {
  id: number; artist_id: number; qid: string | null; title: string; year: number | null; image_url: string; thumb_url: string;
  width: number | null; height: number | null; license: string | null; story: string | null; fun_facts: string[]; wiki_url: string | null; position: number;
};

export async function getPeriodsWithArtists(): Promise<(PeriodRow & { artists: ArtistRow[] })[]> {
  const q = sql();
  const periods = (await q`SELECT * FROM periods ORDER BY position, start_year`) as PeriodRow[];
  const artists = (await q`
    SELECT a.*, p.slug AS period_slug, (SELECT COUNT(*) FROM paintings x WHERE x.artist_id = a.id)::int AS painting_count
    FROM artists a JOIN periods p ON p.id = a.period_id
    ORDER BY a.birth_year NULLS LAST`) as ArtistRow[];
  return periods.map(p => ({ ...p, artists: artists.filter(a => a.period_id === p.id) }));
}

export async function getArtist(id: number): Promise<{ artist: ArtistRow; period: PeriodRow; paintings: PaintingRow[] } | null> {
  const q = sql();
  const rows = (await q`SELECT * FROM artists WHERE id = ${id}`) as ArtistRow[];
  if (!rows[0]) return null;
  const period = ((await q`SELECT * FROM periods WHERE id = ${rows[0].period_id}`) as PeriodRow[])[0];
  const paintings = (await q`SELECT * FROM paintings WHERE artist_id = ${id} ORDER BY position, year NULLS LAST`) as PaintingRow[];
  return { artist: rows[0], period, paintings };
}
