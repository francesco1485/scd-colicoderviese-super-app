/**
 * "Numeri dell'app" server side (UD-167, migration r141 STAGED: NOT APPLIED). Used only by the server functions of
 * page-views.functions.ts.
 *
 * recordPageView: +1 for a public page through the server's service-role client (comm/sync.server.ts serviceSupabase,
 * SCD_SUPABASE_SECRET_KEY, never in the browser): r141 grants scd_track_page_view to service_role only, so nobody can
 * inflate the counters with the public key. Per-IP limit 60/minute in memory, keyed by a salted hash (the IP is never
 * stored or logged). Nothing happens without the service key, on the dev server or in the staging preview; errors
 * are swallowed, and once r141 is live a failure logs only its error code.
 *
 * readAppStats: the Direzione's read (scd_app_stats checks the role in the database). Until r141 answers, the page
 * says "Funzione in preparazione" and shows no number (unknown is never zero).
 */
import { createHash, randomBytes } from "node:crypto";

import { createRateLimiter } from "./access-requests";
import { serviceSupabase } from "./comm/sync.server";
import { clientIp } from "./request-ip.server";

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
import { serverSupabase } from "./supabase.server";

type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ error: unknown }>;
};

/** At most 60 counted pages per minute from one address (per server instance). */
export const TRACK_LIMIT_PER_MINUTE = 60;
const allow = createRateLimiter(TRACK_LIMIT_PER_MINUTE, 60 * 1000);
/** Per-process random salt: the limiter key is a hash, so not even the memory of the server keeps the raw IP. */
const SALT = randomBytes(16).toString("hex");
const ipKey = (ip: string) =>
  createHash("sha256").update(SALT).update(ip).digest("hex").slice(0, 32);

/** PostgREST / Postgres codes meaning "the function does not exist yet" (r141 not applied). */
const MISSING = new Set(["PGRST202", "42883"]);

export async function recordPageView(
  data: { path: string; source: PageSource; device: PageDevice },
  deps: {
    ip?: () => string;
    client?: () => RpcClient | null;
    production?: boolean;
  } = {},
): Promise<{ ok: boolean }> {
  try {
    const production = deps.production ?? import.meta.env.PROD;
    if (!production || stagingPreviewEnabled(process.env, production))
      return { ok: false };
    const path = normalisePagePath(data.path);
    if (!path) return { ok: false };
    if (!allow(ipKey((deps.ip ?? clientIp)()))) return { ok: false };
    // Service role only (r141 grants scd_track_page_view to service_role): without SCD_SUPABASE_SECRET_KEY the
    // counter stays off.
    const sb = (deps.client ?? serviceSupabase)();
    if (!sb) return { ok: false };
    const { error } = await sb.rpc("scd_track_page_view", {
      p_path: path,
      p_source: data.source,
      p_device: data.device,
    });
    if (error) {
      const code = (error as { code?: string }).code ?? "unknown";
      // Before r141 the function is missing: silent. Once live, only the error code is logged (never path, IP or user).
      if (!MISSING.has(code))
        console.warn(
          `[numeri] scd_track_page_view non riuscita: codice ${code}`,
        );
      return { ok: false };
    }
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

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

/**
 * «Niente pagine vuote» (AGENTS.md permanent command 5): the /gestionale entry appears only when the numeri gate opens
 * AND scd_app_stats answers for this session (r141 live, Direzione). Any error = no entry.
 */
export async function numeriLive(): Promise<boolean> {
  try {
    const s = await sessionView();
    const roles = s.user ? new Set(s.roles) : null;
    const gate = workAreaView("numeri", {
      preview: false,
      sessionRoles: roles,
    });
    if (gate.view !== "page") return false;
    const sb = s.configured && s.user ? serverSupabase() : null;
    if (!sb) return false;
    const { error } = await sb.rpc("scd_app_stats", { p_days: 1 });
    return !error;
  } catch {
    return false;
  }
}
