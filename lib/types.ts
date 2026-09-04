export type Artist = {
  id: number;
  period_id: number;
  period_slug?: string;
  name: string;
  wiki_title: string;
  birth_year: number | null;
  death_year: number | null;
  bio: string | null;
  portrait_url: string | null;
  wiki_url: string | null;
  painting_count?: number;
};

export type Period = {
  id: number;
  slug: string;
  name: string;
  start_year: number;
  end_year: number;
  description: string | null;
  wiki_url: string | null;
  artists: Artist[];
};

export type Painting = {
  id: number;
  title: string;
  year: number | null;
  image_url: string;
  thumb_url: string;
  width: number | null;
  height: number | null;
  license: string | null;
  story: string | null;
  fun_facts: string[];
  wiki_url: string | null;
};

export function lifespan(a: { birth_year: number | null; death_year: number | null }) {
  if (a.birth_year && a.death_year) return `${a.birth_year} to ${a.death_year}`;
  if (a.birth_year) return `born ${a.birth_year}`;
  return '';
}

/** The year an artist is placed at on the timeline: the middle of their working life. */
export function activeYear(a: { birth_year: number | null; death_year: number | null }, fallback: number) {
  if (a.birth_year && a.death_year) return Math.round((a.birth_year + 22 + a.death_year) / 2);
  if (a.birth_year) return a.birth_year + 35;
  return fallback;
}
