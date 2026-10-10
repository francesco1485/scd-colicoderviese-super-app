/**
 * Validazione stretta della copia pubblica (mirror Drive, sola lettura) del calendario.
 * Pura e senza rete: usata dal ponte server e dai test. Rifiuta tutto ciò che non è nell'allowlist.
 */
import bundled from "@/data/calendario-snapshot-20261009.json";

export const MIRROR_SCHEMA = "scd-calendar-public-v3";
export const MIRROR_AUDIENCE = "PUBLIC_READ_ONLY_SNAPSHOT";
export const CANONICAL_SOURCE_ID = "1eXS-kY5PCHFg4CXiAErNAKtIVEMIKgWs";
export const MIRROR_SEASON = "2026/27";
export const MAX_BYTES = 600 * 1024;
export const BUNDLED_SOURCE_AT = (bundled as { source_modified_at: string }).source_modified_at;

const EVENT_KEYS = new Set(["id", "date", "time", "end", "category", "group", "type", "home_away", "venue", "opponent", "round", "source", "notice", "match_status", "is_variation", "verification"]);
const VERIFY_KEYS = ["time_confirmed", "venue_confirmed", "facility_review_required"] as const;
const BAD_TEXT = [
  /<\/?[a-z!]/i, // tag HTML / script
  /[\u0000-\u0008\u000b-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/, // controlli Unicode
  /[^\s@]+@[^\s@]+\.[a-z]{2,}/i, // email
  /(\+39|0039)\s?\d/, /(?<!\d)3\d{2}[\s.-]?\d{6,7}(?!\d)/, // telefono
  /\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/i, // codice fiscale
  /\btarga\b|\bautista\b|\btelefono\b|\bcellulare\b|\biban\b/i,
  /docs\.google\.com\/spreadsheets|1eXS-kY5PCHFg4CXiAErNAKtIVEMIKgWs/, // mai link al master
];
const WITHDRAWN = /RITIRAT|ANNULLAT|CANCEL|WITHDRAWN/i;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const okText = (v: unknown, max = 500) => typeof v === "string" && v.length <= max && !BAD_TEXT.some((r) => r.test(v));
const validDate = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v);

export type MirrorCheck = { ok: true } | { ok: false; reason: string };

export function validateMirror(raw: unknown): MirrorCheck {
  const fail = (reason: string): MirrorCheck => ({ ok: false, reason });
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail("root non oggetto");
  const r = raw as Record<string, unknown>;
  if (r["schema"] !== MIRROR_SCHEMA) return fail("schema");
  if (r["audience"] !== MIRROR_AUDIENCE) return fail("audience");
  if (r["source_file_id"] !== CANONICAL_SOURCE_ID) return fail("source_file_id");
  if (r["season"] !== MIRROR_SEASON) return fail("season");
  const at = typeof r["source_modified_at"] === "string" ? Date.parse(r["source_modified_at"]) : NaN;
  if (Number.isNaN(at)) return fail("source_modified_at");
  if (at < Date.parse(BUNDLED_SOURCE_AT)) return fail("più vecchio della copia di sicurezza");
  const groups = r["groups"];
  if (!groups || typeof groups !== "object" || Array.isArray(groups)) return fail("groups");
  for (const [id, g] of Object.entries(groups as Record<string, any>)) {
    if (!/^[a-z0-9_-]{1,40}$/i.test(id) || !g || typeof g !== "object") return fail(`group ${id}`);
    if (!okText(g.label, 120)) return fail(`group label ${id}`);
    if (g.color !== undefined && !/^#[0-9a-f]{6}$/i.test(String(g.color))) return fail(`group color ${id}`);
    if (g.logo !== undefined && g.logo !== null && g.logo !== "" && !/^SCD_[A-Z0-9_]+\.png$/.test(String(g.logo))) return fail(`group logo ${id}`);
  }
  const events = r["events"];
  if (!Array.isArray(events) || events.length < 1 || events.length > 1000) return fail("events");
  const ids = new Set<string>();
  for (const e of events as any[]) {
    if (!e || typeof e !== "object" || Array.isArray(e)) return fail("evento non oggetto");
    const unknown = Object.keys(e).filter((k) => !EVENT_KEYS.has(k));
    if (unknown.length) return fail(`campi non ammessi: ${unknown.join(",")}`);
    if (!okText(e.id, 120) || !e.id) return fail("id");
    if (ids.has(e.id)) return fail(`id duplicato ${e.id}`);
    ids.add(e.id);
    if (!validDate(e.date)) return fail(`data ${e.id}`);
    if (!(e.time === "" || TIME.test(e.time))) return fail(`ora ${e.id}`);
    if (e.end !== undefined && !(e.end === "" || TIME.test(e.end))) return fail(`fine ${e.id}`);
    if (typeof e.group !== "string" || !Object.hasOwn(groups, e.group)) return fail(`group ${e.id}`);
    if (e.home_away !== "CASA" && e.home_away !== "FUORI") return fail(`casa/fuori ${e.id}`);
    for (const k of ["category", "type", "venue", "opponent", "round", "source", "match_status"]) {
      if (e[k] !== undefined && !okText(e[k])) return fail(`${k} ${e.id}`);
    }
    if (WITHDRAWN.test(String(e.match_status ?? ""))) return fail(`ritirato ${e.id}`);
    if (e.is_variation !== undefined && typeof e.is_variation !== "boolean") return fail(`variazione ${e.id}`);
    if (e.notice !== undefined && !(Array.isArray(e.notice) && e.notice.length <= 10 && e.notice.every((n: unknown) => okText(n, 300)))) return fail(`notice ${e.id}`);
    const v = e.verification;
    if (!v || typeof v !== "object" || Object.keys(v).some((k) => !(VERIFY_KEYS as readonly string[]).includes(k)) || !VERIFY_KEYS.every((k) => typeof v[k] === "boolean")) return fail(`verification ${e.id}`);
  }
  return { ok: true };
}
