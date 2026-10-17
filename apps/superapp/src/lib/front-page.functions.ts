/**
 * «Prima pagina» on the server (UD-187, UD-188). Reads the one public file the Super Giornalista commits every morning to
 * the data branch data/front-page (same channel as data/calendar-public): no database write from the agent
 * (scd-sicurezza review 17/10/2026). The file passes a size cap, JSON parse and the whitelist parser (front-page.ts:
 * today's Rome day only, VERIFIED items only, internal links only, personal-data net). Any failure gives an empty front
 * page and the block is not shown (fail closed, no invented story).
 *
 * The Direzione's switch (UD-188, r120) is read from SCD PULSE (scd_public_front_page_hidden) and applied on every
 * request (30 s cache). Before r120 is applied the function does not exist: no switch, the page shows as written. Any
 * other error reading the switch hides the whole front page (a story the Direzione switched off never comes back
 * because the database did not answer).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  EMPTY_FRONT_PAGE,
  FRONT_PAGE_MAX_BYTES,
  applyHidden,
  frontItems,
  parseFrontFile,
  parseHidden,
  type FrontItem,
  type FrontPage,
} from "./front-page";
import { serverRomeDay } from "./public-window";
import { serverSupabase } from "./supabase.server";

export const FRONT_PAGE_URL =
  "https://raw.githubusercontent.com/francesco1485/scd-colicoderviese-super-app/data/front-page/front-page.json";
const ORG_SLUG = "scd-colicoderviese";

const TTL_OK = 5 * 60_000;
const TTL_FAIL = 60_000;
const TTL_SWITCH = 30_000;

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>;
};

let cache: { at: number; ttl: number; day: string; page: FrontPage } | null = null;
let switchCache: { at: number; day: string; hidden: string[] | null } | null = null;

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

/**
 * Ids switched off for `day`. [] when nothing is off or r120 is not applied yet (function missing, PostgREST PGRST202
 * or Postgres 42883); null when the switch could not be read (the caller then hides the whole page).
 */
export async function readHidden(day: string, sb: RpcClient | null): Promise<string[] | null> {
  if (!sb) return [];
  try {
    const { data, error } = await sb.rpc("scd_public_front_page_hidden", { p_org_slug: ORG_SLUG, p_day: day });
    if (error) return error.code === "PGRST202" || error.code === "42883" ? [] : null;
    return parseHidden(data);
  } catch {
    return null;
  }
}

async function cachedHidden(day: string, nowMs: number, sb: RpcClient | null): Promise<string[] | null> {
  if (switchCache && switchCache.day === day && nowMs - switchCache.at < TTL_SWITCH) return switchCache.hidden;
  const hidden = await readHidden(day, sb);
  switchCache = { at: nowMs, day, hidden };
  return hidden;
}

/** Test hook: forget the cached copies. */
export function resetFrontPageCache(): void {
  cache = null;
  switchCache = null;
}

/** The page as the public sees it: file of the day minus what the Direzione switched off. */
export async function publicFrontPage(day: string, nowMs: number, sb: RpcClient | null, fetchImpl: FetchLike = fetch): Promise<FrontPage> {
  const page = await cachedFrontPage(day, nowMs, fetchImpl);
  if (frontItems(page).length === 0) return page;
  const hidden = await cachedHidden(day, nowMs, sb);
  return hidden === null ? EMPTY_FRONT_PAGE : applyHidden(page, hidden);
}

/** The front page and the Rome day it belongs to (the header date always matches the content, QA day included). */
export const getFrontPage = createServerFn({ method: "GET" }).handler(async (): Promise<{ day: string; page: FrontPage }> => {
  const now = Date.now();
  const day = serverRomeDay(process.env, now);
  return { day, page: await publicFrontPage(day, now, serverSupabase()) };
});

export interface FrontPageDesk {
  day: string;
  /** Every item of today's file, in display order, switched off or not. */
  items: FrontItem[];
  /** Ids switched off ("*" = the whole page); null when the switch could not be read. */
  hidden: string[] | null;
}

/** For the Direzione desk: today's items and the switch state, read fresh (no cache). */
export const getFrontPageDesk = createServerFn({ method: "GET" }).handler(async (): Promise<FrontPageDesk | null> => {
  const { sessionView } = await import("./auth.functions");
  const s = await sessionView();
  if (!s.user || !s.roles.includes("direzione")) return null;
  const now = Date.now();
  const day = serverRomeDay(process.env, now);
  const page = await readFrontPage(day);
  return { day, items: frontItems(page), hidden: await readHidden(day, serverSupabase()) };
});

const switchSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  itemId: z.string().regex(/^(\*|[a-z0-9][a-z0-9-]{0,63})$/),
  hidden: z.boolean(),
});

/** The Direzione switches one story (or "*", the whole page) off or on; the database checks the DIRECTION role. */
export const setFrontPageHidden = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof switchSchema>) => switchSchema.parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const { sessionView } = await import("./auth.functions");
    const s = await sessionView();
    const sb = s.configured && s.user ? serverSupabase() : null;
    if (!sb) return { ok: false, message: "Accesso non valido." };
    const { error } = await sb.rpc("scd_front_page_set_hidden", {
      p_org_slug: ORG_SLUG,
      p_day: data.day,
      p_item_id: data.itemId,
      p_hidden: data.hidden,
    });
    if (error) {
      if (error.code === "PGRST202" || error.code === "42883")
        return { ok: false, message: "Interruttore non ancora attivo: serve «applica r120»." };
      return { ok: false, message: /not allowed/.test(error.message ?? "") ? "Solo la Direzione può spegnere le notizie." : "Non riuscito, riprova." };
    }
    switchCache = null;
    return {
      ok: true,
      message: data.hidden
        ? data.itemId === "*"
          ? "Prima pagina spenta: entro un minuto non si vede più."
          : "Notizia spenta: entro un minuto non si vede più."
        : "Riaccesa: entro un minuto torna visibile.",
    };
  });
