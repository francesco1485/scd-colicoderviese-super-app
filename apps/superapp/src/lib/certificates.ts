/**
 * Medical certificate register (r66, UD-065). Pure rules for /segreteria/certificati.
 * The date lives only in scd_athletes.medical_certificate_expires_at; a date imported from the
 * registration form is "dichiarato" until the secretariat checks the paper certificate.
 * The database (scd_set_certificate) enforces the same date range and the office-only write.
 */
import { certificateState, type CertState } from "./people";

export type CertStatus = "DECLARED" | "VERIFIED";
export type CertKind = "AGONISTICO" | "NON_AGONISTICO";

export const KIND_LABEL: Readonly<Record<CertKind, string>> = { AGONISTICO: "Agonistico", NON_AGONISTICO: "Non agonistico" };
export const STATUS_LABEL: Readonly<Record<CertStatus, string>> = { DECLARED: "dichiarato dalla famiglia", VERIFIED: "controllato dalla segreteria" };

export interface CertRow {
  athleteId: string;
  name: string;
  birthYear: number | null;
  minor: boolean;
  teamCode: string | null;
  teamName: string | null;
  registrationStatus: string | null;
  expiresAt: string | null;
  status: CertStatus | null;
  kind: CertKind | null;
  checkedAt: string | null;
}

export interface CertDbRow {
  athlete_id: string;
  display_name: string | null;
  birth_year: number | null;
  is_minor: boolean | null;
  team_code: string | null;
  team_name: string | null;
  registration_status: string | null;
  expires_at: string | null;
  status: string | null;
  kind: string | null;
  checked_at: string | null;
}

const isStatus = (v: string | null): v is CertStatus => v === "DECLARED" || v === "VERIFIED";
const isKind = (v: string | null): v is CertKind => v === "AGONISTICO" || v === "NON_AGONISTICO";

export function toCertRow(r: CertDbRow): CertRow {
  return {
    athleteId: r.athlete_id,
    name: (r.display_name ?? "").trim() || "—",
    birthYear: r.birth_year,
    minor: Boolean(r.is_minor),
    teamCode: r.team_code,
    teamName: r.team_name,
    registrationStatus: r.registration_status,
    expiresAt: r.expires_at,
    status: r.expires_at && isStatus(r.status) ? r.status : null,
    kind: r.expires_at && isKind(r.kind) ? r.kind : null,
    checkedAt: r.checked_at,
  };
}

export const rowKey = (r: Pick<CertRow, "athleteId" | "teamCode">) => `${r.athleteId}:${r.teamCode ?? "-"}`;

/** What the secretariat has to do for this athlete, in priority order. */
export type CertTodo = "manca" | "scaduto" | "in-scadenza" | "da-controllare" | "a-posto";

export function certTodo(r: Pick<CertRow, "expiresAt" | "status">, todayIso: string): CertTodo {
  const s: CertState = certificateState(r.expiresAt, todayIso);
  if (s === "sconosciuto") return "manca";
  if (s === "scaduto") return "scaduto";
  if (s === "in-scadenza") return "in-scadenza";
  return r.status === "VERIFIED" ? "a-posto" : "da-controllare";
}

export const TODO_LABEL: Readonly<Record<CertTodo, string>> = {
  manca: "Manca la data",
  scaduto: "Scaduto",
  "in-scadenza": "Scade entro 30 giorni",
  "da-controllare": "Da controllare",
  "a-posto": "A posto",
};

export const TODO_ORDER: readonly CertTodo[] = ["scaduto", "manca", "in-scadenza", "da-controllare", "a-posto"];

export interface CertFilter {
  q?: string | undefined;
  team?: string | undefined;
  todo?: CertTodo | "da-fare" | "tutti" | undefined;
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function filterCerts(rows: readonly CertRow[], f: CertFilter, todayIso: string): CertRow[] {
  const q = fold((f.q ?? "").trim());
  const todo = f.todo ?? "da-fare";
  return rows.filter((r) => {
    if (f.team && r.teamCode !== f.team) return false;
    const t = certTodo(r, todayIso);
    if (todo === "da-fare" && t === "a-posto") return false;
    if (todo !== "da-fare" && todo !== "tutti" && t !== todo) return false;
    if (q && !fold(`${r.name} ${r.teamName ?? ""} ${r.birthYear ?? ""}`).includes(q)) return false;
    return true;
  });
}

/** Counts per athlete (an athlete in two teams counts once). */
export function certCounts(rows: readonly CertRow[], todayIso: string): Record<CertTodo, number> & { total: number } {
  const seen = new Map<string, CertTodo>();
  for (const r of rows) if (!seen.has(r.athleteId)) seen.set(r.athleteId, certTodo(r, todayIso));
  const c = { manca: 0, scaduto: 0, "in-scadenza": 0, "da-controllare": 0, "a-posto": 0, total: seen.size };
  for (const t of seen.values()) c[t] += 1;
  return c;
}

export interface TeamProgress {
  code: string;
  name: string;
  total: number;
  ok: number;
}

/** Teams in register order with how many athletes can play today (valid date, any status). */
export function teamProgress(rows: readonly CertRow[], todayIso: string): TeamProgress[] {
  const m = new Map<string, TeamProgress>();
  for (const r of rows) {
    if (!r.teamCode) continue;
    const t = m.get(r.teamCode) ?? { code: r.teamCode, name: r.teamName ?? r.teamCode, total: 0, ok: 0 };
    t.total += 1;
    const s = certificateState(r.expiresAt, todayIso);
    if (s === "ok" || s === "in-scadenza") t.ok += 1;
    m.set(r.teamCode, t);
  }
  return [...m.values()];
}

const DAY = 86_400_000;

/** Same window as scd_set_certificate: from 3 years ago to 2 years ahead. Null = no date (clear). */
export function validateCertDate(iso: string, todayIso: string): string | null {
  if (iso === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "Data non valida.";
  const d = Date.parse(`${iso}T00:00:00Z`);
  const t = Date.parse(`${todayIso}T00:00:00Z`);
  if (Number.isNaN(d) || Number.isNaN(t)) return "Data non valida.";
  const [y, m, dd] = iso.split("-").map(Number) as [number, number, number];
  const back = new Date(Date.UTC(y, m - 1, dd));
  if (back.getUTCMonth() !== m - 1 || back.getUTCDate() !== dd) return "Data non valida.";
  const today = new Date(t);
  const min = Date.UTC(today.getUTCFullYear() - 3, today.getUTCMonth(), today.getUTCDate());
  const max = Date.UTC(today.getUTCFullYear() + 2, today.getUTCMonth(), today.getUTCDate());
  if (d < min) return "Data troppo vecchia: controlla l'anno.";
  if (d > max) return "Un certificato non dura più di un anno: controlla l'anno.";
  return null;
}

/** Days from today to the expiry (negative = expired), or null. */
export function daysLeft(expiresAt: string | null, todayIso: string): number | null {
  if (!expiresAt) return null;
  const d = Date.parse(`${expiresAt}T00:00:00Z`);
  const t = Date.parse(`${todayIso}T00:00:00Z`);
  return Number.isNaN(d) || Number.isNaN(t) ? null : Math.round((d - t) / DAY);
}
