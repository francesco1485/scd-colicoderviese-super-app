/**
 * Mixed news block of the public home (UD-110, Direzione 13/10/2026 19:03: "nelle news anche altre notizie di altre
 * annate, con spinta ad altri giornali, poi eventualmente qualche articolo da social e articoli dal sito recenti").
 *
 * Pure functions (SSR safe). Sources, all real and attributed, each item links to the original:
 * - "press": newspaper headlines (Google News RSS on the club and the two towns, lib/press.ts, incl. youth queries);
 * - "site":  recent articles of the club website colicoderviese.it (WordPress RSS, lib/site-news.functions.ts);
 * - "club":  public news of the club feed (R20 public.feed) when it carries an article link.
 * Social posts (Instagram/Facebook) have no authorised adapter yet (manifest: LINK_ONLY_UNTIL_AUTHORIZED_FRESHNESS_
 * ADAPTER): they are not mixed in.
 * Rules: never invented; negative headlines (defeats, withdrawals, sanctions…) stay out of the home highlight and
 * remain on /rassegna-stampa; only recent items (freshness by publication date); daily rotation of the source order
 * so the block changes every day.
 */
import { dayNumber } from "./ledwall-rotation";

export type NewsSourceKind = "press" | "site" | "club";

export interface NewsItem {
  id: string;
  title: string;
  /** Original article (https) or an internal route for club items. */
  url: string;
  /** Newspaper / site name as published. */
  source: string;
  sourceKind: NewsSourceKind;
  publishedAt: string | null;
  /** Team / age group named in the title (e.g. "Juniores"), null when none is named. */
  tag: string | null;
  external: boolean;
}

export const NEWS_SOURCE_LABEL: Readonly<Record<NewsSourceKind, string>> = {
  press: "Dai giornali",
  site: "Dal sito del club",
  club: "Dal club",
};

/** Headlines kept out of the home highlight (they stay on /rassegna-stampa). */
const NEGATIVE =
  /sconfitt|\bk\.?o\.?\b|\bperd(e|ono)\b|\bpers[ao]\b|battut|crollo|\bcade\b|cadono|ritir|doloros|squalific|retroced|polemic|rissa|sanzion|stangat|esonero|beffa|disfatta|tracollo|umiliat|\bko\b/i;

export function isNegativeHeadline(title: string): boolean {
  return NEGATIVE.test(title);
}

/** Age groups / teams as they appear in Italian football headlines, most specific first. */
const TAGS: readonly [RegExp, string][] = [
  [/\bprima squadra\b|\bpromozione\b/i, "Prima Squadra"],
  [/\bjuniores\b|\bunder\s*19\b|\bu19\b/i, "Juniores"],
  [/\ballievi\b|\bunder\s*1[78]\b|\bu1[78]\b/i, "Allievi"],
  [/\bunder\s*1[56]\b|\bu1[56]\b|\bgiovanissimi\b/i, "Giovanissimi"],
  [/\besordienti\b/i, "Esordienti"],
  [/\bpulcini\b/i, "Pulcini"],
  [/\bprimi calci\b|\bpiccoli amici\b|\bscuola calcio\b/i, "Scuola Calcio"],
  [/\bfemminil|\bfemale\b|\bwomen\b/i, "Femminile"],
  [/\bgiovanil/i, "Settore giovanile"],
];

export function teamTagOf(title: string): string | null {
  for (const [re, tag] of TAGS) if (re.test(title)) return tag;
  return null;
}

const normTitle = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Item is recent enough: published within maxAgeDays of nowMs (unknown date → not recent: UNKNOWN ≠ fresh). */
export function isRecent(
  item: Pick<NewsItem, "publishedAt">,
  nowMs: number,
  maxAgeDays: number,
): boolean {
  if (!item.publishedAt) return false;
  const t = Date.parse(item.publishedAt);
  if (!Number.isFinite(t)) return false;
  return t <= nowMs + 3_600_000 && nowMs - t <= maxAgeDays * 86_400_000;
}

export interface MixOptions {
  day: string;
  nowMs: number;
  max?: number;
  maxAgeDays?: number;
}

/**
 * Home highlight: valid, recent, non-negative items, de-duplicated by title, newest first per source, then
 * interleaved source by source starting from a source that changes every day.
 */
export function mixNews(
  lists: Readonly<Record<NewsSourceKind, readonly NewsItem[]>>,
  opts: MixOptions,
): NewsItem[] {
  const { day, nowMs, max = 5, maxAgeDays = 45 } = opts;
  const seen = new Set<string>();
  const order: NewsSourceKind[] = ["press", "site", "club"];
  const queues = order.map((k) =>
    [...(lists[k] ?? [])]
      .filter(
        (i) =>
          i.title.trim() && i.url && (!i.external || /^https:\/\//.test(i.url)),
      )
      .filter(
        (i) => !isNegativeHeadline(i.title) && isRecent(i, nowMs, maxAgeDays),
      )
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
      .filter((i) => {
        const k2 = normTitle(i.title);
        if (seen.has(k2)) return false;
        seen.add(k2);
        return true;
      }),
  );
  const d = dayNumber(day);
  const start = Number.isFinite(d)
    ? ((d % order.length) + order.length) % order.length
    : 0;
  const out: NewsItem[] = [];
  const limit = Math.max(0, Math.floor(max));
  for (
    let round = 0;
    out.length < limit && queues.some((q) => q.length > round);
    round++
  ) {
    for (let j = 0; j < order.length && out.length < limit; j++) {
      const item = queues[(start + j) % order.length]![round];
      if (item) out.push(item);
    }
  }
  return out;
}
