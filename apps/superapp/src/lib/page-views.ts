/**
 * "Numeri dell'app" (UD-167, Francesco 16/10/2026 22:34: «area dove dobbiamo sapere quanti accessi sono stati fatti,
 * quanti sono arrivati sopra all'app… capiamo come migliorare»). Pure rules, shared by the browser tracker, the server
 * functions and the page. Mirror of migration r141 (STAGED): the lists below are kept equal to the SQL by
 * page-views-migration.test.ts.
 *
 * What is counted: one +1 per public page opened, as a daily total per (page, source, device). Nothing is stored on
 * the device (no cookie, no localStorage, no identifier), no IP, no user id, no user agent. Unique visitors are NOT
 * counted. Internal and reserved areas are never counted.
 */

import type { WorkAreaGate } from "./access";

export const PAGE_SOURCES = [
  "direct",
  "instagram",
  "facebook",
  "tiktok",
  "whatsapp",
  "google",
  "qr",
  "other",
] as const;
export type PageSource = (typeof PAGE_SOURCES)[number];

export const PAGE_DEVICES = ["phone", "tablet", "desktop"] as const;
export type PageDevice = (typeof PAGE_DEVICES)[number];

/** Social sources (the "% da social" highlight). */
export const SOCIAL_SOURCES: readonly PageSource[] = [
  "instagram",
  "facebook",
  "tiktok",
  "whatsapp",
];

export const SOURCE_LABEL: Readonly<Record<PageSource, string>> = {
  direct: "Diretto o link salvato",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  google: "Google",
  qr: "QR code",
  other: "Altri siti",
};

export const DEVICE_LABEL: Readonly<Record<PageDevice, string>> = {
  phone: "Telefono",
  tablet: "Tablet",
  desktop: "Computer",
};

/**
 * First path segments never counted: the internal work areas and the reserved areas (families, staff, partners).
 * Same list as r141 scd_track_page_view.
 */
export const INTERNAL_PATH_PREFIXES: readonly string[] = [
  "gestionale",
  "direzione",
  "core",
  "accedi",
  "quadro",
  "segreteria",
  "tesoreria",
  "famiglia",
  "partner",
  "crm",
  "pulmini",
  "magazzino",
  "infermeria",
  "nutrizionista",
  "safeguarding",
  "la-mia-scd",
  "aree",
  "registrati",
  "elimina-account",
  "ledwall",
  "auth",
];

export const PATH_MAX = 120;
export const PATH_MAX_SEGMENTS = 8;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const NUMERIC = /^[0-9]+$/;
const PLAIN = /^[a-z0-9][a-z0-9._-]{0,59}$/;

/**
 * The path as the database stores it, or null when it is not counted. Same steps as r141: query string and hash cut,
 * must start with "/", at most 120 characters, lower case, empty segments dropped, uuid / numeric / unusual segments
 * -> ":id", at most 8 segments, internal areas excluded.
 */
export function normalisePagePath(
  raw: string | null | undefined,
): string | null {
  if (typeof raw !== "string") return null;
  const cut = raw.split("?")[0]!.split("#")[0]!;
  if (!cut.startsWith("/") || cut.length > PATH_MAX) return null;
  const segments = cut
    .toLowerCase()
    .split("/")
    .filter((s) => s !== "")
    .map((s) =>
      UUID.test(s) || NUMERIC.test(s) || !PLAIN.test(s) ? ":id" : s,
    );
  if (segments.length > PATH_MAX_SEGMENTS) return null;
  if (segments.length > 0 && INTERNAL_PATH_PREFIXES.includes(segments[0]!))
    return null;
  const path = `/${segments.join("/")}`;
  return path.length > PATH_MAX ? null : path;
}

/** utm_source values and referrer hosts mapped to a source. */
function sourceOfName(name: string): PageSource | null {
  const n = name.toLowerCase();
  if (n === "qr") return "qr";
  if (n === "ig" || n.includes("instagram")) return "instagram";
  if (
    n === "fb" ||
    n.includes("facebook") ||
    n === "fb.com" ||
    n.endsWith(".fb.com") ||
    n === "fb.me" ||
    n.endsWith(".fb.me")
  )
    return "facebook";
  if (n.includes("tiktok")) return "tiktok";
  if (
    n.includes("whatsapp") ||
    n === "wa" ||
    n === "wa.me" ||
    n.endsWith(".wa.me")
  )
    return "whatsapp";
  if (n.includes("google")) return "google";
  return null;
}

/**
 * Where the visit came from: `?src=qr` -> qr; else `utm_source`; else the referrer host (only another site counts:
 * the app's own host is a navigation inside the app, i.e. direct); else direct. Unknown named sources -> other.
 */
export function pageSourceFrom(input: {
  search: string;
  referrer: string;
  host: string;
}): PageSource {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(input.search);
  } catch {
    params = new URLSearchParams();
  }
  if ((params.get("src") ?? "").toLowerCase() === "qr") return "qr";
  const utm = (params.get("utm_source") ?? "").trim();
  if (utm) return sourceOfName(utm) ?? "other";
  if (!input.referrer) return "direct";
  let host: string;
  try {
    host = new URL(input.referrer).hostname.toLowerCase();
  } catch {
    return "direct";
  }
  if (!host || host === input.host.toLowerCase()) return "direct";
  return sourceOfName(host) ?? "other";
}

/** Device class from the viewport width: < 768 phone, < 1024 tablet, else desktop. */
export function deviceFromWidth(width: number): PageDevice {
  if (!Number.isFinite(width) || width < 768) return "phone";
  if (width < 1024) return "tablet";
  return "desktop";
}

/** Do Not Track or Global Privacy Control on: nothing is sent. */
export function trackingRefused(
  nav:
    | { doNotTrack?: string | null; globalPrivacyControl?: boolean }
    | null
    | undefined,
): boolean {
  if (!nav) return true;
  return nav.doNotTrack === "1" || nav.globalPrivacyControl === true;
}

/* ------------------------------------------------------------------ stats for the page */

export const STATS_PERIODS = [7, 30, 90] as const;
export type StatsPeriod = (typeof STATS_PERIODS)[number];

export interface PageViewRow {
  day: string;
  path: string;
  source: PageSource;
  device: PageDevice;
  views: number;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Rows of scd_app_stats, validated; anything unexpected is dropped. */
export function parseStatsRows(data: unknown): PageViewRow[] {
  if (!Array.isArray(data)) return [];
  const out: PageViewRow[] = [];
  for (const r of data) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const day = typeof o["day"] === "string" ? o["day"].slice(0, 10) : null;
    const path = typeof o["path"] === "string" ? o["path"] : null;
    const source = o["source"];
    const device = o["device"];
    const views =
      typeof o["views"] === "number" ? o["views"] : Number(o["views"]);
    if (!day || !ISO_DAY.test(day) || !path || !path.startsWith("/")) continue;
    if (
      !PAGE_SOURCES.includes(source as PageSource) ||
      !PAGE_DEVICES.includes(device as PageDevice)
    )
      continue;
    if (!Number.isInteger(views) || views < 0) continue;
    out.push({
      day,
      path,
      source: source as PageSource,
      device: device as PageDevice,
      views,
    });
  }
  return out;
}

export interface Share<K extends string> {
  key: K;
  views: number;
  /** Whole percent of the total (0 when the total is 0). */
  pct: number;
}

export interface AppStatsSummary {
  total: number;
  today: number;
  /** null when nothing was counted in the period (unknown, never a fake 0%). */
  socialPct: number | null;
  phonePct: number | null;
  topPages: { path: string; views: number }[];
  bySource: Share<PageSource>[];
  byDevice: Share<PageDevice>[];
  /** From the first day with data in the period to today; days without views after the first are real zeros. */
  trend: { day: string; views: number }[];
}

const pct = (n: number, of: number) =>
  of > 0 ? Math.round((n * 100) / of) : 0;

function addDaysIso(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Highlights, top pages, splits and daily trend of a period ending on `today` (Europe/Rome date). */
export function summarizeStats(
  rows: readonly PageViewRow[],
  today: string,
  days: number,
): AppStatsSummary {
  const from = addDaysIso(today, -(days - 1));
  const inside = rows.filter((r) => r.day >= from && r.day <= today);
  const total = inside.reduce((s, r) => s + r.views, 0);
  const sum = <K extends string>(keyOf: (r: PageViewRow) => K) => {
    const m = new Map<K, number>();
    for (const r of inside) m.set(keyOf(r), (m.get(keyOf(r)) ?? 0) + r.views);
    return m;
  };
  const pages = sum((r) => r.path);
  const sources = sum((r) => r.source);
  const devices = sum((r) => r.device);
  const perDay = sum((r) => r.day);
  const social = SOCIAL_SOURCES.reduce((s, k) => s + (sources.get(k) ?? 0), 0);

  const firstDay = [...perDay.keys()].sort()[0];
  const trend: { day: string; views: number }[] = [];
  if (firstDay)
    for (let d = firstDay; d <= today; d = addDaysIso(d, 1))
      trend.push({ day: d, views: perDay.get(d) ?? 0 });

  return {
    total,
    today: perDay.get(today) ?? 0,
    socialPct: total > 0 ? pct(social, total) : null,
    phonePct: total > 0 ? pct(devices.get("phone") ?? 0, total) : null,
    topPages: [...pages.entries()]
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views || a.path.localeCompare(b.path))
      .slice(0, 10),
    bySource: PAGE_SOURCES.map((key) => ({
      key,
      views: sources.get(key) ?? 0,
      pct: pct(sources.get(key) ?? 0, total),
    }))
      .filter((s) => s.views > 0)
      .sort((a, b) => b.views - a.views),
    byDevice: PAGE_DEVICES.map((key) => ({
      key,
      views: devices.get(key) ?? 0,
      pct: pct(devices.get(key) ?? 0, total),
    })),
    trend,
  };
}

/** Plain Italian name of a public path for the top-pages list ("/" -> "Home"). */
export function pageLabel(path: string): string {
  if (path === "/") return "Home";
  return path;
}

/* ------------------------------------------------------------------ page data */

export const NUMERI_OFF =
  "Funzione in preparazione: il conteggio parte quando la Direzione applica la migrazione r141.";
export const NUMERI_NO_SESSION =
  "Entra con il tuo account del club per vedere i numeri dell'app.";
export const NUMERI_DENIED = "I numeri dell'app li vede solo la Direzione.";
export const NUMERI_READ_FAILED = "Lettura non riuscita, riprova più tardi.";

export interface AppStatsDesk {
  gate: WorkAreaGate;
  period: StatsPeriod;
  /** Supabase configured and a signed-in session. */
  connected: boolean;
  /** r141 answered: the numbers below are real. */
  ready: boolean;
  /** null = not read (never a list of zeros pretending to be data). */
  summary: AppStatsSummary | null;
  /** Europe/Rome date the summary ends on. */
  today: string | null;
  message: string | null;
}

export function emptyAppStatsDesk(
  gate: WorkAreaGate,
  period: StatsPeriod = 30,
): AppStatsDesk {
  return {
    gate,
    period,
    connected: false,
    ready: false,
    summary: null,
    today: null,
    message: null,
  };
}
