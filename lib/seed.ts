import { CATALOG } from './catalog';
import { ensureSchema, sql } from './db';
import { commonsImage, extractFacts, wikiPlainText, wikiSummary, wikidataArtist, wikidataPaintings } from './wiki';

export type SeedReport = {
  artist: string;
  status: 'ok' | 'skipped' | 'error';
  paintings?: number;
  note?: string;
};

export async function seedPeriods() {
  await ensureSchema();
  const q = sql();
  for (let i = 0; i < CATALOG.length; i++) {
    const p = CATALOG[i];
    const s = await wikiSummary(p.wikiTitle);
    await q`INSERT INTO periods (slug, name, start_year, end_year, description, wiki_url, position)
      VALUES (${p.slug}, ${p.name}, ${p.start}, ${p.end}, ${s?.extract || null}, ${s?.url || null}, ${i})
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, start_year = EXCLUDED.start_year, end_year = EXCLUDED.end_year,
        description = COALESCE(EXCLUDED.description, periods.description), wiki_url = EXCLUDED.wiki_url, position = EXCLUDED.position`;
  }
}

export async function seedArtist(periodSlug: string, wikiTitle: string, maxPaintings = 14): Promise<SeedReport> {
  const q = sql();
  const period = ((await q`SELECT id FROM periods WHERE slug = ${periodSlug}`) as { id: number }[])[0];
  if (!period) return { artist: wikiTitle, status: 'error', note: 'period not seeded yet' };

  const summary = await wikiSummary(wikiTitle);
  if (!summary?.qid) return { artist: wikiTitle, status: 'skipped', note: 'no Wikipedia article or no Wikidata item' };

  const wd = await wikidataArtist(summary.qid);
  let portrait: string | null = summary.thumbnail || null;
  if (wd.portraitFile) {
    const img = await commonsImage(wd.portraitFile);
    if (img) portrait = img.thumb;
  }

  const artistRows = (await q`INSERT INTO artists (period_id, wiki_title, name, qid, birth_year, death_year, bio, portrait_url, wiki_url)
    VALUES (${period.id}, ${wikiTitle}, ${summary.title}, ${summary.qid}, ${wd.birth ?? null}, ${wd.death ?? null}, ${summary.extract}, ${portrait}, ${summary.url})
    ON CONFLICT (wiki_title) DO UPDATE SET period_id = EXCLUDED.period_id, name = EXCLUDED.name, qid = EXCLUDED.qid, birth_year = EXCLUDED.birth_year,
      death_year = EXCLUDED.death_year, bio = EXCLUDED.bio, portrait_url = EXCLUDED.portrait_url, wiki_url = EXCLUDED.wiki_url, seeded_at = now()
    RETURNING id`) as { id: number }[];
  const artistId = artistRows[0].id;
  await q`DELETE FROM paintings WHERE artist_id = ${artistId}`;

  const candidates = await wikidataPaintings(summary.qid, maxPaintings);
  let position = 0;
  for (const c of candidates) {
    const img = await commonsImage(c.file);
    if (!img || img.width < 400) continue;
    let story: string | null = c.description || null;
    let facts: string[] = [];
    let wikiUrl: string | null = null;
    if (c.enTitle) {
      const ps = await wikiSummary(c.enTitle);
      if (ps) {
        story = ps.extract;
        wikiUrl = ps.url;
        const plain = await wikiPlainText(c.enTitle);
        facts = extractFacts(plain, ps.extract);
      }
    }
    await q`INSERT INTO paintings (artist_id, qid, title, year, image_url, thumb_url, width, height, license, story, fun_facts, wiki_url, commons_file, position)
      VALUES (${artistId}, ${c.qid}, ${c.label}, ${c.year ?? null}, ${img.full}, ${img.thumb}, ${img.width}, ${img.height}, ${img.license || null},
        ${story}, ${JSON.stringify(facts)}, ${wikiUrl}, ${c.file}, ${position++})`;
  }
  return { artist: summary.title, status: 'ok', paintings: position, note: position < 8 ? 'fewer than 8 public-domain images on Commons' : undefined };
}
