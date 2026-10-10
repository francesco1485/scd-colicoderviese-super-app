/** Ponte server-side verso l'UNICA copia pubblica JSON allowlistata. Mai il master. */
import { loadCalendar } from "./public-snapshots";
import { MAX_BYTES, validateMirror } from "./calendar-mirror";

/** Interruttore: false = solo copia di sicurezza inclusa nell'app. */
export const MIRROR_ENABLED = true;
export const MIRROR_FILE_ID = "1xSQ2MClw7LlIeWhJCSXllmCMQMrXYPn5";
export const MIRROR_URLS = [
  `https://drive.usercontent.google.com/download?id=${MIRROR_FILE_ID}&export=download&confirm=t`,
  `https://drive.google.com/uc?export=download&id=${MIRROR_FILE_ID}`,
];
export const TTL_OK = 5 * 60_000;
export const TTL_FAIL = 60_000;
/** Intervallo minimo tra due controlli forzati dal bottone "Verifica". */
export const FORCE_MIN_INTERVAL = 30_000;

/**
 * origin: "mirror" = copia validata appena letta; "stale" = ultima copia validata in memoria
 * (lettura successiva fallita); "fallback" = copia inclusa nell'app.
 */
export type CalendarResult = ReturnType<typeof loadCalendar> & {
  origin: "mirror" | "stale" | "fallback";
  reason: string | null;
  throttled?: boolean;
};

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

async function readBounded(res: Response): Promise<string> {
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > MAX_BYTES) throw new Error("risposta troppo grande");
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) { await reader.cancel(); throw new Error("risposta troppo grande"); }
    chunks.push(value);
  }
  const buf = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { buf.set(c, o); o += c.byteLength; }
  return new TextDecoder().decode(buf);
}

export async function fetchMirror(urls: string[], fetchImpl: FetchLike = fetch): Promise<CalendarResult> {
  let reason = "copia pubblica non raggiungibile";
  for (const url of urls) {
    try {
      const res = await fetchImpl(url, { redirect: "follow", signal: AbortSignal.timeout(6000), headers: { accept: "application/json" } });
      if (!res.ok) { reason = `HTTP ${res.status}`; continue; }
      const ct = res.headers.get("content-type") ?? "";
      if (/text\/html/i.test(ct)) { reason = "pagina HTML invece di JSON"; continue; }
      let raw: unknown;
      try { raw = JSON.parse(await readBounded(res)); } catch (e) { reason = e instanceof Error && /grande/.test(e.message) ? e.message : "JSON non valido"; continue; }
      const check = validateMirror(raw);
      if (!check.ok) { reason = `rifiutata: ${check.reason}`; continue; }
      return { ...loadCalendar(raw), origin: "mirror", reason: null };
    } catch {
      reason = "copia pubblica non raggiungibile";
    }
  }
  return { ...loadCalendar(), origin: "fallback", reason };
}

/**
 * Cache in memoria della SINGOLA istanza server (limite: istanze diverse hanno cache diverse).
 * - TTL 5 min se valida, 1 min se in errore.
 * - lastGood: l'ultima copia validata non viene mai persa per un errore di rete/HTML/dato rifiutato.
 * - Monotonia: una copia valida ma più vecchia di lastGood non la sostituisce.
 * - Una sola lettura in corso alla volta (niente stampede); forzatura al massimo ogni 30 s.
 */
export function createCachedSource(urls: string[], fetchImpl?: FetchLike, now: () => number = Date.now) {
  let cache: { at: number; value: CalendarResult } | null = null;
  let lastGood: CalendarResult | null = null;
  let lastFetchAt = -Infinity;
  let inflight: Promise<CalendarResult> | null = null;

  async function refreshNow(t: number): Promise<CalendarResult> {
    lastFetchAt = t;
    const got = await fetchMirror(urls, fetchImpl);
    let value: CalendarResult;
    if (got.origin === "mirror") {
      if (lastGood && Date.parse(got.sourceModifiedAt) < Date.parse(lastGood.sourceModifiedAt)) value = lastGood;
      else value = lastGood = got;
    } else if (lastGood) {
      value = { ...lastGood, origin: "stale", reason: got.reason };
    } else value = got;
    cache = { at: t, value };
    return value;
  }

  return async (opts: { force?: boolean } = {}): Promise<CalendarResult> => {
    const t = now();
    if (inflight) return inflight;
    const fresh = cache && t - cache.at < (cache.value.origin === "mirror" ? TTL_OK : TTL_FAIL);
    if (fresh && cache && !opts.force) return cache.value;
    if (fresh && cache && opts.force && t - lastFetchAt < FORCE_MIN_INTERVAL) return { ...cache.value, throttled: true };
    inflight = refreshNow(t).finally(() => { inflight = null; });
    return inflight;
  };
}

let shared: ((opts?: { force?: boolean }) => Promise<CalendarResult>) | null = null;
export async function getCalendar(opts: { force?: boolean } = {}): Promise<CalendarResult> {
  if (!MIRROR_ENABLED) return { ...loadCalendar(), origin: "fallback", reason: "ponte disattivato" };
  shared ??= createCachedSource(MIRROR_URLS);
  return shared(opts);
}
