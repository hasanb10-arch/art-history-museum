// Everything here talks to Wikipedia, Wikidata and Wikimedia Commons.
// No text is invented: extracts are copied from the articles as-is.

const UA = 'ArtHistoryMuseum/1.0 (educational project; contact via repository)';

async function getJSON(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, {
    ...init,
    headers: { 'User-Agent': UA, Accept: 'application/json', ...(init?.headers || {}) },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

export type Summary = {
  title: string;
  extract: string;
  url: string;
  qid?: string;
  thumbnail?: string;
  original?: string;
};

/** Lead-section summary of an English Wikipedia article. */
export async function wikiSummary(title: string): Promise<Summary | null> {
  try {
    const d = await getJSON(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`);
    if (d.type === 'disambiguation' || !d.extract) return null;
    return {
      title: d.title,
      extract: d.extract,
      url: d.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      qid: d.wikibase_item,
      thumbnail: d.thumbnail?.source,
      original: d.originalimage?.source,
    };
  } catch {
    return null;
  }
}

/** Full plain-text of an article, used only to pull verbatim "fun fact" sentences from later sections. */
export async function wikiPlainText(title: string): Promise<string> {
  try {
    const d = await getJSON(
      `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exsectionformat=plain&redirects=1&format=json&origin=*&titles=${encodeURIComponent(title)}`,
    );
    const pages = d.query?.pages || {};
    const first = Object.values(pages)[0] as any;
    return first?.extract || '';
  } catch {
    return '';
  }
}

const FACT_HINTS = ['stolen', 'theft', 'sold', 'auction', 'record', 'discover', 'restor', 'x-ray', 'hidden', 'controvers',
  'commission', 'destroyed', 'forger', 'lost', 'damag', 'vandal', 'million', 'attack', 'rediscover', 'attribut', 'underdrawing',
  'infrared', 'reveal', 'legend', 'rumou', 'rumor', 'myster', 'copy', 'copies', 'replica', 'exhibit', 'loan'];

/** Up to n verbatim sentences from sections after the lead that read like "did you know" facts. */
export function extractFacts(plain: string, lead: string, n = 4): string[] {
  const body = plain.slice(Math.max(0, plain.indexOf(lead.slice(0, 60)) + lead.length));
  const sentences = body
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z"'])/)
    .map(s => s.trim())
    .filter(s => s.length > 60 && s.length < 260 && !/^==/.test(s));
  const scored = sentences
    .map(s => ({ s, score: FACT_HINTS.reduce((a, h) => a + (s.toLowerCase().includes(h) ? 1 : 0), 0) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const out: string[] = [];
  for (const { s } of scored) {
    if (out.length >= n) break;
    if (!out.some(o => o.slice(0, 40) === s.slice(0, 40))) out.push(s);
  }
  return out;
}

export type WdArtist = {
  qid: string;
  birth?: number;
  death?: number;
  portraitFile?: string;
};

/** Birth/death years and portrait file from Wikidata for an artist QID. */
export async function wikidataArtist(qid: string): Promise<WdArtist> {
  const sparql = `
    SELECT ?birth ?death ?image WHERE {
      OPTIONAL { wd:${qid} wdt:P569 ?birth. }
      OPTIONAL { wd:${qid} wdt:P570 ?death. }
      OPTIONAL { wd:${qid} wdt:P18 ?image. }
    } LIMIT 1`;
  const d = await getJSON(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`);
  const b = d.results?.bindings?.[0] || {};
  const year = (v?: { value: string }) => (v ? parseInt(v.value.slice(0, 4).replace(/^\+/, ''), 10) : undefined);
  return {
    qid,
    birth: year(b.birth),
    death: year(b.death),
    portraitFile: b.image ? decodeURIComponent(b.image.value.split('/').pop() || '') : undefined,
  };
}

export type WdPainting = {
  qid: string;
  label: string;
  year?: number;
  file: string;          // Commons file name
  enTitle?: string;      // English Wikipedia article title if one exists
  description?: string;  // Wikidata short description
};

/** Paintings (P31 painting) by the artist that have a Commons image, preferring ones with an English article. */
export async function wikidataPaintings(qid: string, limit = 16): Promise<WdPainting[]> {
  const sparql = `
    SELECT ?item ?itemLabel ?itemDescription ?image (MIN(?date) AS ?inception) ?article WHERE {
      ?item wdt:P170 wd:${qid}; wdt:P31/wdt:P279* wd:Q3305213; wdt:P18 ?image.
      OPTIONAL { ?item wdt:P571 ?date. }
      OPTIONAL { ?article schema:about ?item; schema:isPartOf <https://en.wikipedia.org/>. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    GROUP BY ?item ?itemLabel ?itemDescription ?image ?article
    ORDER BY DESC(BOUND(?article)) ?inception
    LIMIT ${limit * 3}`;
  const d = await getJSON(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`);
  const rows: any[] = d.results?.bindings || [];
  const seen = new Set<string>();
  const out: WdPainting[] = [];
  for (const r of rows) {
    const id = r.item.value.split('/').pop();
    if (seen.has(id)) continue;
    seen.add(id);
    const label: string = r.itemLabel?.value || '';
    if (!label || /^Q\d+$/.test(label)) continue;
    out.push({
      qid: id,
      label,
      year: r.inception ? parseInt(r.inception.value.slice(0, 4), 10) : undefined,
      file: decodeURIComponent(r.image.value.split('/').pop() || ''),
      enTitle: r.article ? decodeURIComponent(r.article.value.split('/wiki/').pop() || '').replace(/_/g, ' ') : undefined,
      description: r.itemDescription?.value,
    });
    if (out.length >= limit) break;
  }
  // articles first, then by date
  return out.sort((a, b) => Number(!!b.enTitle) - Number(!!a.enTitle) || (a.year || 0) - (b.year || 0));
}

export type CommonsImage = { thumb: string; full: string; width: number; height: number; license?: string };

/** Resolve a Commons file to direct upload.wikimedia.org URLs (CORS-enabled) with a 1600px thumbnail. */
export async function commonsImage(file: string): Promise<CommonsImage | null> {
  try {
    const d = await getJSON(
      `https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1600&format=json&origin=*&titles=${encodeURIComponent('File:' + file)}`,
    );
    const page: any = Object.values(d.query?.pages || {})[0];
    const ii = page?.imageinfo?.[0];
    if (!ii?.url) return null;
    return {
      thumb: ii.thumburl || ii.url,
      full: ii.url,
      width: ii.width,
      height: ii.height,
      license: ii.extmetadata?.LicenseShortName?.value,
    };
  } catch {
    return null;
  }
}
