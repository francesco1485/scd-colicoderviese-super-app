/**
 * "Numeri dell'app" server side (UD-167, migration r141 STAGED: NOT APPLIED). Used only by the server functions of
 * page-views.functions.ts.
 *
 * recordPageView: +1 for a public page through a STATELESS Supabase client with the publishable key (no cookies read
 * or written, so it never touches the visitor's session); scd_track_page_view validates everything again. Nothing
 * happens without Supabase keys, on the dev server or in the staging preview; every error is swallowed (until r141
 * is applied the call simply fails).
 *
 * readAppStats: the Direzione's read (scd_app_stats checks the role in the database). Until r141 answers, the page
 * says "Funzione in preparazione" and shows no number (unknown is never zero).
 */
import { createServerClient } from "@supabase/ssr";

import { workAreaView } from "./access";
import { sessionView } from "./auth.functions";
import { romeParts } from "./home-week";
import { stagingPreviewEnabled } from "./impianti-access";
import {
  NUMERI_DENIED,
  NUMERI_NO_SESSION,
  NUMERI_OFF,
  NUMERI_READ_FAILED,
  emptyAppStatsDesk,
  normalisePagePath,
  parseStatsRows,
  summarizeStats,
  type AppStatsDesk,
  type PageDevice,
  type PageSource,
  type StatsPeriod,
} from "./page-views";
import { serverSupabase, supabaseEnv } from "./supabase.server";

export async function recordPageView(data: {
  path: string;
  source: PageSource;
  device: PageDevice;
}): Promise<{ ok: boolean }> {
  try {
    if (
      !import.meta.env.PROD ||
      stagingPreviewEnabled(process.env, import.meta.env.PROD)
    )
      return { ok: false };
    const path = normalisePagePath(data.path);
    const env = supabaseEnv();
    if (!path || !env) return { ok: false };
    const sb = createServerClient(env.url, env.publishableKey, {
      cookies: { getAll: () => [], setAll: () => {} },
    });
    const { error } = await sb.rpc("scd_track_page_view", {
      p_path: path,
      p_source: data.source,
      p_device: data.device,
    });
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}

/** PostgREST / Postgres codes meaning "the function does not exist yet" (r141 not applied). */
const MISSING = new Set(["PGRST202", "42883"]);

export async function readAppStats(period: StatsPeriod): Promise<AppStatsDesk> {
  const s = await sessionView();
  const roles = s.user ? new Set(s.roles) : null;
  const gate = workAreaView("numeri", {
    preview: stagingPreviewEnabled(process.env, import.meta.env.PROD),
    sessionRoles: roles,
  });
  const base = emptyAppStatsDesk(gate, period);
  if (gate.view !== "page") return base;
  const sb = s.configured && s.user ? serverSupabase() : null;
  if (!sb) return { ...base, message: NUMERI_NO_SESSION };
  const { data: rows, error } = await sb.rpc("scd_app_stats", {
    p_days: period,
  });
  if (error) {
    const code = (error as { code?: string }).code ?? "unknown";
    if (MISSING.has(code))
      return { ...base, connected: true, message: NUMERI_OFF };
    if (code === "42501")
      return { ...base, connected: true, message: NUMERI_DENIED };
    console.warn(`[numeri] scd_app_stats non riuscita: codice ${code}`);
    return { ...base, connected: true, message: NUMERI_READ_FAILED };
  }
  const today = romeParts(new Date().toISOString())?.date ?? null;
  if (!today) return { ...base, connected: true, message: NUMERI_READ_FAILED };
  return {
    ...base,
    connected: true,
    ready: true,
    today,
    summary: summarizeStats(parseStatsRows(rows), today, period),
  };
}
