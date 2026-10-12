/**
 * Rassegna stampa (UD-094): solo titoli, testata e link, mai il testo degli articoli né pagine scansionate (diritto
 * d'autore). Lettura pura di un feed RSS (Google News) e scelta degli articoli che parlano davvero di noi.
 */

export interface PressItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string | null;
}

const ENTITY: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#39": "'",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e.startsWith("#x"))
      return String.fromCodePoint(parseInt(e.slice(2), 16));
    if (e.startsWith("#"))
      return String.fromCodePoint(parseInt(e.slice(1), 10));
    return ENTITY[e.toLowerCase()] ?? m;
  });
}

function tag(block: string, name: string): string | null {
  const m = block.match(
    new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"),
  );
  if (!m) return null;
  return decodeEntities(
    m[1]!.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim(),
  );
}

/** Parses an RSS 2.0 feed (Google News shape) into items; anything odd is skipped, never thrown. */
export function parseRss(xml: string, limit = 20): PressItem[] {
  const out: PressItem[] = [];
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  for (const block of items) {
    const rawTitle = tag(block, "title");
    const url = tag(block, "link");
    if (!rawTitle || !url || !/^https?:\/\//.test(url)) continue;
    // Google News titles end with " - Testata".
    const dash = rawTitle.lastIndexOf(" - ");
    const suffix = dash > 0 ? rawTitle.slice(dash + 3).trim() : "";
    const source = tag(block, "source") ?? suffix;
    // Cut the " - Testata" suffix when it is the source (Google News always appends it).
    const title =
      suffix && (suffix === source || !tag(block, "source"))
        ? rawTitle.slice(0, dash).trim()
        : rawTitle;
    const date = tag(block, "pubDate");
    const ts = date ? Date.parse(date) : NaN;
    out.push({
      title,
      url,
      source,
      publishedAt: Number.isFinite(ts) ? new Date(ts).toISOString() : null,
    });
    if (out.length >= limit) break;
  }
  return out;
}

const ABOUT_US = /colico\s*derviese|colicoderviese|\bcolico\b|\bdervio\b/i;
const NOISE =
  /meteo|incidente|cronaca nera|omicidio|arrest|furto|rapina|droga/i;

/** Keeps the articles that name the club or the two towns and are not crime or weather news. */
export function aboutUs(items: readonly PressItem[]): PressItem[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    if (!ABOUT_US.test(i.title) || NOISE.test(i.title)) return false;
    const k = i.title.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export const PRESS_QUERIES: readonly string[] = [
  '"ColicoDerviese"',
  '"Colico Derviese" calcio',
  "Colico calcio Promozione",
  "Dervio calcio giovanile",
];

export function googleNewsRssUrl(query: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=it&gl=IT&ceid=IT:it`;
}
