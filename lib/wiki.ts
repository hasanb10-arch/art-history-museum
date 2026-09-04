// Everything here talks to Wikipedia, Wikidata and Wikimedia Commons.
// No text is invented: extracts are copied from the articles as-is.

// Wikimedia asks for a descriptive User-Agent with a way to reach the operator.
const UA = 'ArtHistoryMuseum/1.0 (https://github.com/hasanb10-arch/art-history-museum; educational project)';

export class HttpError extends Error {
  status: number;
  constructor(status: number, url: string) {
    super(`${status} ${url.split('?')[0]}`);
    this.status = status;
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** fetch JSON with a per-request timeout and a couple of retries on throttling / transient errors. */
async function getJSON(url: string, init?: RequestInit, timeoutMs = 15_000): Promise<any> {
  let lastErr: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { 'User-Agent': UA, 'Api-User-Agent': UA, Accept: 'application/json', ...(init?.headers || {}) },
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) return res.json();
      if (res.status === 404) throw new HttpError(404, url);
      lastErr = new HttpError(res.status, url);
      // 429 / 5xx: back off and try again; anything else is final
      if (res.status !== 429 && res.status < 500) throw lastErr;
      const retryAfter = Number(res.headers.get('retry-after')) || 0;
      await sleep(Math.min(8000, retryAfter * 1000 || 800 * (attempt + 1)));
    } catch (e: any) {
      if (e instanceof HttpError && (e.status === 404 || (e.status !== 429 && e.status < 500))) throw e;
      lastErr = e;
      await sleep(500 * (attempt + 1));
    }
  }
  throw lastErr;
}

/** Run an async mapper over items with at most `limit` in flight at once (order preserved). */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

export type Summary = {
  title: string;
  extract: string;
  url: string;
  qid?: string;
  thumbnail?: string;
  original?: string;
};

/** Same data via the classic Action API (used when the REST summary endpoint is unavailable or throttled). */
async function actionSummary(title: string): Promise<Summary | null> {
  const d = await getJSON(
    `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageprops|pageimages&exintro=1&explaintext=1&ppprop=wikibase_item|disambiguation&piprop=thumbnail|original&pithumbsize=640&redirects=1&format=json&formatversion=2&origin=*&titles=${encodeURIComponent(title)}`,
  );
  const page = d.query?.pages?.[0];
  if (!page || page.missing || page.pageprops?.disambiguation !== undefined || !page.extract) return null;
  return {
    title: page.title,
    extract: String(page.extract).trim(),
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(String(page.title).replace(/ /g, '_'))}`,
    qid: page.pageprops?.wikibase_item,
    thumbnail: page.thumbnail?.source,
    original: page.original?.source,
  };
}

/**
 * Lead-section summary of an English Wikipedia article.
 * Returns null only when the article genuinely does not exist (or is a disambiguation page);
 * network / throttling problems are thrown so the caller can report them instead of "skipping".
 */
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
  } catch (e: any) {
    if (e instanceof HttpError && e.status === 404) return null;
    // REST endpoint unavailable (403/429/5xx/timeout): fall back to the Action API before giving up.
    return actionSummary(title);
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
  // Direct "instance of: painting" only. The transitive P31/P279* form is far too slow for prolific
  // artists (Leonardo, Michelangelo, Rembrandt) and made the query service time out.
  const sparql = `
    SELECT ?item ?itemLabel ?itemDescription (SAMPLE(?img) AS ?image) (MIN(?date) AS ?inception) (SAMPLE(?art) AS ?article) WHERE {
      ?item wdt:P170 wd:${qid}; wdt:P31 wd:Q3305213; wdt:P18 ?img.
      OPTIONAL { ?item wdt:P571 ?date. }
      OPTIONAL { ?art schema:about ?item; schema:isPartOf <https://en.wikipedia.org/>. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    GROUP BY ?item ?itemLabel ?itemDescription
    ORDER BY DESC(BOUND(?article)) ?inception
    LIMIT ${limit * 2}`;
  const d = await getJSON(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`, undefined, 25_000);
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
