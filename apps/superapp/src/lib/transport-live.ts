/**
 * "Pulmino in diretta" phase 1 (r110): pure rules shared by the driver panel on /pulmini, the family card and the
 * server functions. Mirrors supabase/migrations/20261015_r110_transport_live.sql.
 *
 * Decisions (Direzione 2026-10-15): every driver is a volunteer; the driver's phone shares the position; no map, text
 * only (distance and estimated arrival, always "stima"); one position every 15 s; points deleted within 24 h; session
 * log 90 days; automatic close 60 minutes after the planned end of the run (or after 60 minutes without positions).
 * No name of a person ever passes through this module.
 */

export const LIVE_ENGINE = "r110";
export const PING_INTERVAL_MS = 15_000;
/** The database refuses a point less than 10 s after the previous one; the phone sends every 15 s. */
export const MIN_PING_GAP_MS = 10_000;
export const FAMILY_REFRESH_MS = 20_000;
export const POINT_RETENTION_HOURS = 24;
export const SESSION_LOG_DAYS = 90;
export const AUTO_CLOSE_MINUTES = 60;
export const MAX_ACCURACY_M = 500;
export const MAX_FIX_AGE_MS = 2 * 60_000;
export const MAX_FIX_FUTURE_MS = 30_000;
/** Straight-line distance × road factor = rough road distance (mountain-lake roads: never exact, hence "stima"). */
export const ROAD_FACTOR = 1.3;
export const DEFAULT_SPEED_KMH = 40;
export const MIN_SPEED_KMH = 15;
export const MAX_SPEED_KMH = 80;
/** Version of the volunteer driver's acknowledgement text stored with the first start (scd_transport_live_drivers). */
export const DRIVER_ACK_VERSION = "pulmino-diretta-v1";

/**
 * Arrival points the driver can choose at start, used for distance and "stima" of arrival. Coordinates stay null until
 * the exact meeting points are verified (real maps of Colico/Dervio belong to the PC chat, AGENTS.md SCD:SESSIONI):
 * with a null point the families see status and last update, never an invented distance.
 */
export interface ArrivalPoint {
  key: "COLICO" | "DERVIO";
  label: string;
  lat: number | null;
  lng: number | null;
}
export const ARRIVAL_POINTS: readonly ArrivalPoint[] = [
  { key: "COLICO", label: "Centro sportivo di Colico", lat: null, lng: null },
  { key: "DERVIO", label: "Centro sportivo di Dervio", lat: null, lng: null },
];
export type ArrivalKey = ArrivalPoint["key"];
export const ARRIVAL_KEYS = ARRIVAL_POINTS.map((p) => p.key) as [ArrivalKey, ...ArrivalKey[]];

export function arrivalPoint(key: string | null | undefined): ArrivalPoint | null {
  return ARRIVAL_POINTS.find((p) => p.key === key) ?? null;
}

/** Copy of the acknowledgement the volunteer confirms on the phone before the first shared run. */
export const DRIVER_ACK_TEXT: readonly string[] = [
  "Guidi come volontario: la posizione del tuo telefono serve solo a dire alle famiglie dei ragazzi confermati su questa trasferta dov'è il pulmino.",
  "La posizione parte quando premi “Inizia corsa” e si ferma con “Termina corsa” o da sola 60 minuti dopo l'arrivo previsto.",
  "Le famiglie vedono solo stato, ultimo aggiornamento, distanza e arrivo stimato: nessuna mappa. I punti si cancellano entro 24 ore, il registro della corsa dopo 90 giorni.",
];

/* ------------------------------------------------------------------ ping payload */

export interface PingPayload {
  sessionId: string;
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  recordedAt: string;
}

export type PingProblem = "INVALID" | "INACCURATE" | "STALE";

const PING_KEYS: ReadonlySet<string> = new Set(["sessionId", "lat", "lng", "accuracy", "speed", "heading", "recordedAt"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Allowlist validation of one position sent by the phone: only the seven known keys, numbers in range, accuracy within
 * MAX_ACCURACY_M, fix not older than 2 minutes and not in the future. Anything else is refused (nothing is stored).
 */
export function validatePing(input: unknown, now = Date.now()): { ok: true; value: PingPayload } | { ok: false; problem: PingProblem } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, problem: "INVALID" };
  const o = input as Record<string, unknown>;
  for (const k of Object.keys(o)) if (!PING_KEYS.has(k)) return { ok: false, problem: "INVALID" };
  const { sessionId, lat, lng, accuracy, recordedAt } = o;
  const speed = o["speed"] ?? null;
  const heading = o["heading"] ?? null;
  if (typeof sessionId !== "string" || !UUID_RE.test(sessionId)) return { ok: false, problem: "INVALID" };
  if (!finite(lat) || lat < -90 || lat > 90 || !finite(lng) || lng < -180 || lng > 180) return { ok: false, problem: "INVALID" };
  if (speed !== null && (!finite(speed) || speed < 0 || speed > 70)) return { ok: false, problem: "INVALID" };
  if (heading !== null && (!finite(heading) || heading < 0 || heading > 360)) return { ok: false, problem: "INVALID" };
  if (!finite(accuracy) || accuracy < 0) return { ok: false, problem: "INVALID" };
  if (accuracy > MAX_ACCURACY_M) return { ok: false, problem: "INACCURATE" };
  if (typeof recordedAt !== "string" || recordedAt.length > 40) return { ok: false, problem: "INVALID" };
  const at = Date.parse(recordedAt);
  if (!Number.isFinite(at)) return { ok: false, problem: "INVALID" };
  if (at < now - MAX_FIX_AGE_MS || at > now + MAX_FIX_FUTURE_MS) return { ok: false, problem: "STALE" };
  return {
    ok: true,
    value: { sessionId: sessionId.toLowerCase(), lat, lng, accuracy, speed, heading, recordedAt: new Date(at).toISOString() },
  };
}

/** The position of a browser fix as the payload above (GeolocationPosition-like input, no DOM types needed). */
export function pingFromFix(
  sessionId: string,
  fix: { coords: { latitude: number; longitude: number; accuracy: number; speed: number | null; heading: number | null }; timestamp: number },
): PingPayload {
  const speed = fix.coords.speed;
  const heading = fix.coords.heading;
  return {
    sessionId,
    lat: fix.coords.latitude,
    lng: fix.coords.longitude,
    accuracy: Math.round(fix.coords.accuracy),
    speed: finite(speed) && speed >= 0 ? Math.min(70, speed) : null,
    heading: finite(heading) && heading >= 0 && heading <= 360 ? heading : null,
    recordedAt: new Date(fix.timestamp).toISOString(),
  };
}

/* ------------------------------------------------------------------ rate limit */

/** Client side: send the next point only when the previous one is at least PING_INTERVAL_MS old. */
export function shouldSendPing(lastSentAt: number | null, now = Date.now(), interval = PING_INTERVAL_MS): boolean {
  return lastSentAt === null || now - lastSentAt >= interval;
}

/** Server side: at most one point per key (session) every `gapMs`; mirrors the 10 s rule of scd_transport_live_ping. */
export function createPingLimiter(gapMs = MIN_PING_GAP_MS, maxKeys = 2000) {
  const last = new Map<string, number>();
  return (key: string, now = Date.now()): boolean => {
    const prev = last.get(key);
    if (prev !== undefined && now - prev < gapMs) return false;
    last.set(key, now);
    if (last.size > maxKeys) for (const [k, t] of last) if (now - t >= gapMs) last.delete(k);
    return true;
  };
}

/* ------------------------------------------------------------------ distance and estimate */

export interface LatLng {
  lat: number;
  lng: number;
}

/** Great-circle distance in km (haversine, mean Earth radius 6371 km). Same formula as scd_transport_live_km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface ArrivalEstimate {
  /** Straight-line km to the arrival point. */
  distanceKm: number;
  /** Rounded minutes, at least 1. Always an estimate. */
  minutes: number;
  /** True when the van is within 300 m of the arrival point. */
  arriving: boolean;
  label: "stima";
}

/**
 * Estimated arrival from the straight-line distance: road distance ≈ distance × ROAD_FACTOR, speed = recent average
 * speed of the van clamped to [15, 80] km/h, or 40 km/h when unknown. Null when the distance is unknown.
 */
export function estimateArrival(distanceKm: number | null | undefined, avgSpeedKmh?: number | null): ArrivalEstimate | null {
  if (!finite(distanceKm) || distanceKm < 0) return null;
  const speed = finite(avgSpeedKmh) && avgSpeedKmh > 0 ? Math.min(MAX_SPEED_KMH, Math.max(MIN_SPEED_KMH, avgSpeedKmh)) : DEFAULT_SPEED_KMH;
  const minutes = Math.max(1, Math.round(((distanceKm * ROAD_FACTOR) / speed) * 60));
  return { distanceKm, minutes, arriving: distanceKm < 0.3, label: "stima" };
}

/* ------------------------------------------------------------------ expiry */

/** Planned end of a run (Europe/Rome wall clock): return estimate, else departure + 4 h (as scd_transport_plan_run). */
export function plannedEndMinutes(departure: string, returnEstimate: string | null | undefined): number | null {
  const m = (t: string | null | undefined) => (t && /^([01]\d|2[0-3]):[0-5]\d$/.test(t) ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) : null);
  const start = m(departure);
  if (start === null) return null;
  const end = m(returnEstimate);
  return end === null || end <= start ? start + 240 : end;
}

/** Is a session still live? Same rule as scd_transport_live_is_open. */
export function isSessionOpen(s: { expiresAt: string; startedAt: string; lastPingAt: string | null }, now = Date.now()): boolean {
  const exp = Date.parse(s.expiresAt);
  const last = Date.parse(s.lastPingAt ?? s.startedAt);
  if (!Number.isFinite(exp) || !Number.isFinite(last)) return false;
  return now < exp && now - last < AUTO_CLOSE_MINUTES * 60_000;
}

/* ------------------------------------------------------------------ labels */

const nf1 = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

export function distanceLabel(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  if (km < 10) return `${nf1.format(km)} km`;
  return `${Math.round(km)} km`;
}

export function etaLabel(e: ArrivalEstimate): string {
  if (e.arriving) return "in arrivo (stima)";
  if (e.minutes < 60) return `circa ${e.minutes} min (stima)`;
  const h = Math.floor(e.minutes / 60);
  const mm = e.minutes % 60;
  return `circa ${h} h${mm ? ` ${mm} min` : ""} (stima)`;
}

export function agoLabel(iso: string | null, now = Date.now()): string {
  if (!iso) return "nessun aggiornamento";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "nessun aggiornamento";
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return `aggiornato ${s} s fa`;
  const m = Math.round(s / 60);
  if (m < 60) return `aggiornato ${m} min fa`;
  return "aggiornamento vecchio";
}

export type LiveState = "NON_PARTITO" | "IN_VIAGGIO" | "CONCLUSO";
export const LIVE_STATE_LABEL: Readonly<Record<LiveState, string>> = {
  NON_PARTITO: "Non ancora partito",
  IN_VIAGGIO: "In viaggio",
  CONCLUSO: "Corsa conclusa",
};

/* ------------------------------------------------------------------ view parsing (allowlist) */

export interface DriverRun {
  runId: string;
  title: string;
  kind: string;
  departure: string;
  returnEstimate: string | null;
  destination: string | null;
  meetingPoint: string | null;
  session: { id: string; startedAt: string; lastPingAt: string | null; expiresAt: string; targetLabel: string | null } | null;
}

export interface LiveRun {
  runId: string;
  title: string;
  departure: string;
  state: LiveState;
  lastUpdate: string | null;
  targetLabel: string | null;
  distanceKm: number | null;
  avgSpeedKmh: number | null;
}

export interface LiveView {
  office: boolean;
  driver: { acknowledged: boolean; runs: DriverRun[] } | null;
  live: LiveRun[];
}

const str = (v: unknown, max = 200): string | null => (typeof v === "string" && v.length > 0 ? v.slice(0, max) : null);
const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return finite(n) ? n : null;
};
const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object") : []);
const STATES: ReadonlySet<string> = new Set(["NON_PARTITO", "IN_VIAGGIO", "CONCLUSO"]);

/** Parse scd_transport_live_view: only the fields above survive (coordinates of the office view are dropped here). */
export function parseLiveView(data: unknown): LiveView | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const d = data as Record<string, unknown>;
  if (d["engine"] !== LIVE_ENGINE) return null;
  const drv = d["driver"] && typeof d["driver"] === "object" ? (d["driver"] as Record<string, unknown>) : null;
  const driverRuns: DriverRun[] = drv
    ? arr(drv["runs"]).flatMap((r) => {
        const runId = str(r["runId"], 40);
        const departure = str(r["departure"], 5);
        if (!runId || !departure) return [];
        const s = r["session"] && typeof r["session"] === "object" ? (r["session"] as Record<string, unknown>) : null;
        const sid = s ? str(s["id"], 40) : null;
        const startedAt = s ? str(s["startedAt"], 40) : null;
        const expiresAt = s ? str(s["expiresAt"], 40) : null;
        return [{
          runId,
          title: str(r["title"], 160) ?? "Corsa",
          kind: str(r["kind"], 20) ?? "TRASFERTA",
          departure,
          returnEstimate: str(r["returnEstimate"], 5),
          destination: str(r["destination"], 200),
          meetingPoint: str(r["meetingPoint"], 160),
          session: s && sid && startedAt && expiresAt
            ? { id: sid, startedAt, expiresAt, lastPingAt: str(s["lastPingAt"], 40), targetLabel: str(s["targetLabel"], 60) }
            : null,
        }];
      })
    : [];
  const live: LiveRun[] = arr(d["live"]).flatMap((r) => {
    const runId = str(r["runId"], 40);
    const departure = str(r["departure"], 5);
    const state = str(r["state"], 20);
    if (!runId || !departure || !state || !STATES.has(state)) return [];
    const open = state === "IN_VIAGGIO";
    return [{
      runId,
      title: str(r["title"], 160) ?? "Corsa",
      departure,
      state: state as LiveState,
      lastUpdate: open ? str(r["lastUpdate"], 40) : null,
      targetLabel: str(r["targetLabel"], 60),
      distanceKm: open ? num(r["distanceKm"]) : null,
      avgSpeedKmh: open ? num(r["avgSpeedKmh"]) : null,
    }];
  });
  return { office: d["office"] === true, driver: drv ? { acknowledged: drv["acknowledged"] === true, runs: driverRuns } : null, live };
}

/* ------------------------------------------------------------------ errors */

export type LiveCode =
  | "NOT_ACTIVE"
  | "SIGNED_OUT"
  | "BUSY"
  | "ERROR"
  | "forbidden"
  | "not_assigned"
  | "outside_window"
  | "ack_required"
  | "already_live"
  | "driver_busy"
  | "invalid"
  | "inaccurate"
  | "stale"
  | "too_soon"
  | "expired"
  | "closed"
  | "not_found";

export function liveErrorText(code: string | null | undefined): string {
  switch (code) {
    case "NOT_ACTIVE":
      return "Funzione in preparazione: serve l'OK della Direzione per attivarla. Non viene condiviso nulla.";
    case "SIGNED_OUT":
      return "Entra con il tuo account.";
    case "BUSY":
    case "too_soon":
      return "Posizione già inviata da pochi secondi.";
    case "forbidden":
    case "not_assigned":
      return "Questa corsa non è assegnata a te.";
    case "outside_window":
      return "Si può iniziare solo il giorno della corsa, da un'ora prima della partenza.";
    case "ack_required":
      return "Prima di iniziare conferma di aver letto come funziona la condivisione.";
    case "already_live":
      return "Questa corsa è già in diretta da un altro telefono.";
    case "driver_busy":
      return "Hai già un'altra corsa in diretta: terminala prima.";
    case "inaccurate":
      return "Posizione poco precisa: non inviata. Controlla che il GPS sia attivo.";
    case "stale":
      return "Posizione vecchia: non inviata.";
    case "expired":
    case "closed":
      return "La condivisione è terminata.";
    case "not_found":
      return "Corsa non trovata: ricarica la pagina.";
    case "invalid":
      return "Dati di posizione non validi.";
    default:
      return "Operazione non riuscita. Riprova tra poco.";
  }
}
