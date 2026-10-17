/**
 * «Prima pagina» on the server (UD-187). Reads the one public file the Super Giornalista commits every morning to the
 * data branch data/front-page (same channel as data/calendar-public): no database, no secret, no write path from the
 * agent into SCD PULSE (scd-sicurezza review 17/10/2026). The file passes a size cap, JSON parse and the whitelist
 * parser (front-page.ts: today's Rome day only, VERIFIED items only, internal links only, personal-data net). Any
 * failure gives an empty front page and the block is not shown (fail closed, no invented story).
 */
import { createServerFn } from "@tanstack/react-start";

import { EMPTY_FRONT_PAGE, FRONT_PAGE_MAX_BYTES, parseFrontFile, type FrontPage } from "./front-page";
import { serverRomeDay } from "./public-window";

export const FRONT_PAGE_URL =
  "https://raw.githubusercontent.com/francesco1485/scd-colicoderviese-super-app/data/front-page/front-page.json";

const TTL_OK = 5 * 60_000;
const TTL_FAIL = 60_000;

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

let cache: { at: number; ttl: number; day: string; page: FrontPage } | null = null;

/** Reads and parses the front-page file for `today`; never throws. */
export async function readFrontPage(today: string, fetchImpl: FetchLike = fetch): Promise<FrontPage> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) return EMPTY_FRONT_PAGE;
  try {
    // raw.githubusercontent serves the file directly: no redirect is followed (Node runtime, as calendar-bridge).
    const res = await fetchImpl(FRONT_PAGE_URL, {
      redirect: "error",
      signal: AbortSignal.timeout(4000),
      headers: { accept: "application/json" },
    });
    if (!res.ok) return EMPTY_FRONT_PAGE;
    if (Number(res.headers.get("content-length") ?? 0) > FRONT_PAGE_MAX_BYTES) return EMPTY_FRONT_PAGE;
    const text = await res.text();
    if (text.length > FRONT_PAGE_MAX_BYTES) return EMPTY_FRONT_PAGE;
    return parseFrontFile(JSON.parse(text), today);
  } catch {
    return EMPTY_FRONT_PAGE;
  }
}

/** Cached read: 5 minutes after a good answer, 1 minute after a failure, always re-read when the Rome day changes. */
export async function cachedFrontPage(today: string, nowMs: number, fetchImpl: FetchLike = fetch): Promise<FrontPage> {
  if (cache && cache.day === today && nowMs - cache.at < cache.ttl) return cache.page;
  const page = await readFrontPage(today, fetchImpl);
  const empty = !page.apertura && page.brevi.length === 0 && !page.domanda && page.altre.length === 0;
  cache = { at: nowMs, ttl: empty ? TTL_FAIL : TTL_OK, day: today, page };
  return page;
}

/** Test hook: forget the cached copy. */
export function resetFrontPageCache(): void {
  cache = null;
}

/** The front page and the Rome day it belongs to (the header date always matches the content, QA day included). */
export const getFrontPage = createServerFn({ method: "GET" }).handler(async (): Promise<{ day: string; page: FrontPage }> => {
  const now = Date.now();
  const day = serverRomeDay(process.env, now);
  return { day, page: await cachedFrontPage(day, now) };
});
