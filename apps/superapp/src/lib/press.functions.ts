/**
 * Rassegna stampa on the server: Google News RSS for the club and the two towns, cached 30 minutes in memory.
 * Titles, sources and links only. A network failure returns the last good list, or an empty one: never an error page.
 */
import { createServerFn } from "@tanstack/react-start";

import {
  aboutUs,
  googleNewsRssUrl,
  parseRss,
  PRESS_QUERIES,
  type PressItem,
} from "./press";

const TTL_MS = 30 * 60_000;
let cache: { at: number; items: PressItem[] } | null = null;

async function fetchQuery(q: string): Promise<PressItem[]> {
  try {
    const res = await fetch(googleNewsRssUrl(q), {
      signal: AbortSignal.timeout(8_000),
      headers: {
        "user-agent": "SCD-SuperApp/1.0 (+https://www.colicoderviese.it)",
      },
    });
    if (!res.ok) return [];
    return parseRss(await res.text(), 25);
  } catch {
    return [];
  }
}

export interface PressReview {
  items: PressItem[];
  fetchedAt: string | null;
}

export const getPressReview = createServerFn({ method: "GET" }).handler(
  async (): Promise<PressReview> => {
    if (cache && Date.now() - cache.at < TTL_MS)
      return {
        items: cache.items,
        fetchedAt: new Date(cache.at).toISOString(),
      };
    const lists = await Promise.all(PRESS_QUERIES.map(fetchQuery));
    const merged = aboutUs(lists.flat())
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
      .slice(0, 15);
    if (merged.length || !cache) cache = { at: Date.now(), items: merged };
    return { items: cache.items, fetchedAt: new Date(cache.at).toISOString() };
  },
);
