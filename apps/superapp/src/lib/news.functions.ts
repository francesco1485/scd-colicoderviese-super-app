/**
 * News adapters on the server (UD-110): the club website feed (colicoderviese.it, WordPress RSS) and the mixed home
 * highlight (press + site + club feed, lib/news-mix.ts). Titles, source and link only; the article text stays on the
 * original site. Every network read is cached 30 minutes and time-boxed: a failure returns the last good list or an
 * empty one, never an error page.
 */
import { createServerFn } from "@tanstack/react-start";

import type { FeedItem } from "./club.types";
import { mixNews, teamTagOf, type NewsItem } from "./news-mix";
import { parseRss, type PressItem } from "./press";
import { serverRomeDay } from "./public-window";

/** Official club website feed (source SCD_OFFICIAL_SITE, manifest source_registry). */
export const SITE_FEED_URL = "https://www.colicoderviese.it/feed/";
export const SITE_SOURCE_LABEL = "colicoderviese.it";
const TTL_MS = 30 * 60_000;
const BUDGET_MS = 1_200;

let siteCache: { at: number; items: PressItem[] } | null = null;

function withBudget<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      () => {
        clearTimeout(t);
        resolve(fallback);
      },
    );
  });
}

async function readSiteFeed(): Promise<PressItem[]> {
  if (siteCache && Date.now() - siteCache.at < TTL_MS) return siteCache.items;
  try {
    const res = await fetch(SITE_FEED_URL, {
      signal: AbortSignal.timeout(8_000),
      headers: {
        "user-agent": "SCD-SuperApp/1.0 (+https://www.colicoderviese.it)",
      },
    });
    if (!res.ok) throw new Error(String(res.status));
    const items = parseRss(await res.text(), 20, false)
      .filter((i) => /^https:\/\/(www\.)?colicoderviese\.it\//.test(i.url))
      .map((i) => ({ ...i, source: SITE_SOURCE_LABEL }));
    siteCache = { at: Date.now(), items };
  } catch {
    if (!siteCache) siteCache = { at: Date.now(), items: [] };
  }
  return siteCache.items;
}

export interface SiteNews {
  items: PressItem[];
}

/** Recent articles of the club website (for /rassegna-stampa). */
export const getSiteNews = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteNews> => ({ items: await readSiteFeed() }),
);

export const toNews = (p: PressItem, kind: "press" | "site"): NewsItem => ({
  id: `${kind}:${p.url}`,
  title: p.title,
  url: p.url,
  source: p.source || (kind === "site" ? SITE_SOURCE_LABEL : "Testata"),
  sourceKind: kind,
  publishedAt: p.publishedAt,
  tag: teamTagOf(p.title),
  external: true,
});

/** Public club-feed news with a link (R20 public.feed): internal routes or https articles only. */
export function clubFeedNews(items: readonly FeedItem[]): NewsItem[] {
  return items
    .filter(
      (f) => f.kind === "news" && f.audience.includes("public") && !!f.link,
    )
    .filter(
      (f) => /^https:\/\//.test(f.link!) || /^\/[a-z0-9-/]*$/i.test(f.link!),
    )
    .map((f) => ({
      id: `club:${f.id}`,
      title: f.title,
      url: f.link!,
      source: f.source ?? "S.C.D. ColicoDerviese",
      sourceKind: "club" as const,
      publishedAt: f.startAt,
      tag: f.category ?? teamTagOf(f.title),
      external: /^https:\/\//.test(f.link!),
    }));
}

export interface HomeNews {
  /** Mixed, filtered highlight for the home (max 5). */
  items: NewsItem[];
  /** Press headlines found (all, unfiltered): decides the "Dicono di noi" vetrina slot. */
  pressCount: number;
}

export const getHomeNews = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomeNews> => {
    const [{ getPressReview }, { getPublicFeed }] = await Promise.all([
      import("./press.functions"),
      import("./club.functions"),
    ]);
    const [press, site, feed] = await Promise.all([
      withBudget(getPressReview(), BUDGET_MS, { items: [], fetchedAt: null }),
      withBudget(readSiteFeed(), BUDGET_MS, [] as PressItem[]),
      withBudget(
        getPublicFeed().then((f) => f.items),
        BUDGET_MS,
        [] as FeedItem[],
      ),
    ]);
    const nowMs = Date.now();
    const day = serverRomeDay(process.env, nowMs);
    return {
      items: mixNews(
        {
          press: press.items.map((p) => toNews(p, "press")),
          site: site.map((p) => toNews(p, "site")),
          club: clubFeedNews(feed),
        },
        { day, nowMs },
      ),
      pressCount: press.items.length,
    };
  },
);
