/**
 * «Prima pagina» on the server (UD-187, r145): one public database read, scd_public_front_page, for the server's Rome
 * day; the answer passes the whitelist parser (front-page.ts) before it reaches the page. Before r145 is applied, or
 * when the database does not answer, the page gets an empty front page and shows nothing (fail closed, no invented
 * story).
 */
import { createServerFn } from "@tanstack/react-start";

import { EMPTY_FRONT_PAGE, parseFrontPage, type FrontPage } from "./front-page";
import { serverRomeDay } from "./public-window";
import { serverSupabase } from "./supabase.server";

const ORG_SLUG = "scd-colicoderviese";

type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
};

/** Reads the front page of one Rome day through any client that exposes rpc. */
export async function readFrontPage(day: string, sb: RpcClient | null): Promise<FrontPage> {
  if (!sb || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return EMPTY_FRONT_PAGE;
  try {
    const { data, error } = await sb.rpc("scd_public_front_page", { p_org_slug: ORG_SLUG, p_day: day });
    return error ? EMPTY_FRONT_PAGE : parseFrontPage(data);
  } catch {
    return EMPTY_FRONT_PAGE;
  }
}

export const getFrontPage = createServerFn({ method: "GET" }).handler(
  async (): Promise<FrontPage> => readFrontPage(serverRomeDay(process.env, Date.now()), serverSupabase()),
);
