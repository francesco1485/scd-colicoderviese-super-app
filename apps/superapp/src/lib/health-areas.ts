/**
 * Infermeria and Nutrizionista (DG 15/10/2026 14:33 "infermeria, nutrizionista"; 16/10 "a pieno regime").
 * Pure rules shared by the pages (/infermeria, /nutrizionista), the server functions and the tests.
 * The database (supabase/migrations/20261016_r136_infermeria_nutrizione.sql; "Applica r136" 16/10/2026) enforces the
 * same fixed lists and access rules; these mirrors keep the screen honest and are pinned to the SQL by the tests.
 *
 * Health data rules (AGENTS.md principle 1, scd-sections "salute-minori" hard block, UD-043 / UD-047):
 * - the injuries register is DEFERRED until the consent design (minors' health data only to the person, the parent
 *   and the club doctor, with consent): Francesco 16/10/2026 "Senza infortuni per ora";
 * - the Infermeria holds certificate expiry dates (read-only), first-aid kits and defibrillators: no diagnosis,
 *   symptom, therapy or free-text note is ever stored;
 * - names are first name + surname initial;
 * - nothing here is logged, sent to the public pages or written in work-queue titles.
 * Engines: TEMPO (hours of the staff and secretariat), PERSONE (families trust the club with their children).
 */
import { tipProblems } from "./era-nutrition-tips";

/* ------------------------------------------------------------------ infermeria: sites and names */

export const SITES = [
  { id: "COLICO", label: "Colico" },
  { id: "DERVIO", label: "Dervio" },
] as const;
export type HealthSite = (typeof SITES)[number]["id"];

const ids = <T extends { id: string }>(xs: readonly T[]) => xs.map((x) => x.id) as string[];
export const isHealthSite = (x: unknown): x is HealthSite => typeof x === "string" && ids(SITES).includes(x);

export const labelOf = <T extends { id: string; label: string }>(xs: readonly T[], id: string | null | undefined): string =>
  xs.find((x) => x.id === id)?.label ?? "—";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const dayNumber = (iso: string) => Math.floor(Date.parse(`${iso}T12:00:00Z`) / 86_400_000);

/** "Mario R." from "Mario Rossi" (public-name rule); the database already shortens, this is the second lock. */
export function shortName(full: string | null | undefined): string {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0]!;
  const initial = parts[parts.length - 1]!.charAt(0).toUpperCase();
  const first = parts[0]!;
  return /^[A-ZÀ-Ý]\.$/.test(parts[parts.length - 1]!) ? `${first} ${parts[parts.length - 1]}` : `${first} ${initial}.`;
}

/** One row per athlete (first row wins): the database already answers so, this keeps KPIs from double counting. */
export function onePerAthlete<T extends { athleteId: string }>(rows: readonly T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((r) => (seen.has(r.athleteId) ? false : (seen.add(r.athleteId), true)));
}

/* ------------------------------------------------------------------ infermeria: kits and defibrillators */

export type CheckState = "mai" | "scaduto" | "in-scadenza" | "ok";

export const CHECK_LABEL: Readonly<Record<CheckState, string>> = {
  mai: "Data non inserita",
  scaduto: "Scaduto",
  "in-scadenza": "In scadenza",
  ok: "In regola",
};

/** State of a due date: unknown stays unknown ("mai"), never "ok". */
export function dueState(dueIso: string | null | undefined, todayIso: string, warnDays: number): CheckState {
  if (!dueIso || !ISO_DATE.test(dueIso)) return "mai";
  const left = dayNumber(dueIso) - dayNumber(todayIso);
  if (left < 0) return "scaduto";
  if (left <= warnDays) return "in-scadenza";
  return "ok";
}

/** Worst of several states (a defibrillator is as good as its worst part). */
export function worstState(states: readonly CheckState[]): CheckState {
  const order: CheckState[] = ["scaduto", "mai", "in-scadenza", "ok"];
  for (const s of order) if (states.includes(s)) return s;
  return "mai";
}

export const KIT_WARN_DAYS = 14;
export const AED_WARN_DAYS = 30;

export interface KitRow {
  id: string;
  site: HealthSite;
  kit: string;
  lastCheck: string | null;
  nextCheck: string | null;
}

export interface AedRow {
  id: string;
  site: HealthSite;
  device: string;
  padsExpiry: string | null;
  batteryExpiry: string | null;
  lastCheck: string | null;
}

export const kitState = (k: Pick<KitRow, "nextCheck">, today: string) => dueState(k.nextCheck, today, KIT_WARN_DAYS);
export const aedState = (a: Pick<AedRow, "padsExpiry" | "batteryExpiry">, today: string) =>
  worstState([dueState(a.padsExpiry, today, AED_WARN_DAYS), dueState(a.batteryExpiry, today, AED_WARN_DAYS)]);

const LABEL_RE = /^[\p{L}\p{N} .,'()/-]{2,60}$/u;

/** Kit or device label: short, no digits-only codes that could hide personal data, no symbols. */
export function equipmentLabelProblem(label: string): string | null {
  const t = label.trim();
  if (!LABEL_RE.test(t)) return "Nome da 2 a 60 caratteri, solo lettere, numeri e punteggiatura semplice.";
  return null;
}

export function kitProblem(k: { site: string; kit: string; lastCheck: string; nextCheck: string }): string | null {
  if (!isHealthSite(k.site)) return "Scegli la sede.";
  const l = equipmentLabelProblem(k.kit);
  if (l) return l;
  if (k.lastCheck && !ISO_DATE.test(k.lastCheck)) return "Data dell'ultimo controllo non valida.";
  if (k.nextCheck && !ISO_DATE.test(k.nextCheck)) return "Data del prossimo controllo non valida.";
  if (k.lastCheck && k.nextCheck && k.nextCheck < k.lastCheck) return "Il prossimo controllo viene dopo l'ultimo.";
  return null;
}

export function aedProblem(a: { site: string; device: string; padsExpiry: string; batteryExpiry: string; lastCheck: string }): string | null {
  if (!isHealthSite(a.site)) return "Scegli la sede.";
  const l = equipmentLabelProblem(a.device);
  if (l) return l;
  for (const d of [a.padsExpiry, a.batteryExpiry, a.lastCheck]) if (d && !ISO_DATE.test(d)) return "Data non valida.";
  return null;
}

/* ------------------------------------------------------------------ engine state */

/**
 * What the database answered. Unknown is never shown as zero:
 * - "applied": data read; - "not-applied": r136 functions missing; - "denied": the database said no (null);
 * - "error": any other failure; - "unknown": nothing was read (no session, staging preview).
 */
export type HealthEngine = "applied" | "not-applied" | "denied" | "error" | "unknown";

export const R136_PENDING = "Funzione in preparazione: serve applicare r136";
export const HEALTH_DENIED = "Non hai l'abilitazione per questa parte: chiedila alla Direzione.";
export const READ_FAILED = "Lettura non riuscita, riprova";
export const SAVED_RELOAD = "Salvato, ricarica la pagina";

/** The sentence for an engine state that is not "applied" (null when there is nothing to say). */
export function engineText(engine: HealthEngine): string | null {
  if (engine === "not-applied") return R136_PENDING;
  if (engine === "denied") return HEALTH_DENIED;
  if (engine === "error") return READ_FAILED;
  return null;
}

/* ------------------------------------------------------------------ nutrizionista */

/**
 * Age groups of the general guidance, from the athlete's birth year in the 2026/27 season (sports age = season start
 * year minus birth year, as the FIGC categories do). Labels and texts carry no digits (Era guard).
 */
export const NUTRITION_GROUPS = [
  { id: "piccoli", label: "Piccoli Amici e Primi Calci", minAge: 5, maxAge: 8 },
  { id: "pulcini-esordienti", label: "Pulcini ed Esordienti", minAge: 9, maxAge: 12 },
  { id: "giovanissimi-allievi", label: "Giovanissimi e Allievi", minAge: 13, maxAge: 16 },
  { id: "juniores-adulti", label: "Juniores e Prima Squadra", minAge: 17, maxAge: 99 },
] as const;
export type NutritionGroupId = (typeof NUTRITION_GROUPS)[number]["id"];

export const SEASON_START_YEAR = 2026;

export function nutritionGroupFor(birthYear: number | null | undefined, seasonStartYear = SEASON_START_YEAR): NutritionGroupId | null {
  if (!birthYear || !Number.isInteger(birthYear)) return null;
  const age = seasonStartYear - birthYear;
  return NUTRITION_GROUPS.find((g) => age >= g.minAge && age <= g.maxAge)?.id ?? null;
}

export interface Guidance {
  id: string;
  title: string;
  text: string;
}

/** General guidance per age group. Reviewed copy: no numbers, no diets, no body weight, no medicines or therapies. */
export const NUTRITION_GUIDANCE: Readonly<Record<NutritionGroupId, readonly Guidance[]>> = {
  piccoli: [
    { id: "merenda", title: "Una merenda semplice prima del campo", text: "Frutta, pane o uno yogurt bastano. Il gioco è il centro: niente merendine speciali per sportivi." },
    { id: "borraccia", title: "La borraccia è sempre nello zaino", text: "Acqua da casa, da bere nelle pause che il mister concede. Le bibite zuccherate restano per le feste." },
    { id: "tavola", title: "A tavola tutti insieme", text: "Mangiare con la famiglia, con calma e senza schermi, aiuta i piccoli a riconoscere fame e sazietà." },
  ],
  "pulcini-esordienti": [
    { id: "colazione", title: "La colazione prima della scuola", text: "Latte o yogurt, pane o cereali e un frutto: la carica arriva fino all'allenamento del pomeriggio." },
    { id: "dopo", title: "Dopo l'allenamento si recupera a cena", text: "Un pasto completo con pasta, pane o riso, una fonte di proteine e verdure rimette in moto il corpo." },
    { id: "acqua", title: "Bere prima di avere sete", text: "Un sorso prima, durante le pause e alla fine. Nelle giornate calde la borraccia si riempie di nuovo." },
  ],
  "giovanissimi-allievi": [
    { id: "crescita", title: "Si cresce e si gioca: servono energie", text: "In questi anni il corpo cambia in fretta. Saltare i pasti toglie forza in campo e attenzione a scuola." },
    { id: "spuntino", title: "Lo spuntino giusto nello zaino", text: "Frutta, pane, crackers o uno yogurt tra scuola e allenamento. Energy drink e bibite gassate non servono." },
    { id: "sonno", title: "Il sonno fa parte dell'allenamento", text: "Orari regolari e telefono spento un po' prima di dormire aiutano il recupero e la concentrazione." },
  ],
  "juniores-adulti": [
    { id: "gara", title: "Il pasto prima della gara", text: "Qualche ora prima, cibi semplici e conosciuti: pasta o riso conditi in modo leggero. Le novità si provano in allenamento." },
    { id: "recupero", title: "Recupero dopo partita", text: "Acqua subito, poi un pasto completo. Il riposo vale quanto la seduta in palestra." },
    { id: "varieta", title: "Varietà, non scorciatoie", text: "Frutta e verdura di colori diversi, legumi, pesce, carne, uova e latticini. Nessun prodotto sostituisce una tavola varia." },
  ],
};

export const NUTRITION_DISCLAIMER =
  "Consigli generali di Era, la nutrizionista del club, uguali per tutti i ragazzi della stessa fascia: mai piani personali. Per esigenze specifiche parlate con il pediatra o il medico di famiglia.";

/** Therapy and medicine words that never appear in the nutrition copy (on top of Era's guard). */
const THERAPY = /\b(farmac\w*|terapi\w*|medicin\w*|pillol\w*|compress[ae]|vitamin\w*|supplement\w*|prescri\w*|diagnos\w*|cur[ae]|curar\w*|dosi|dosaggi\w*|allergi\w*|intolleranz\w*)\b/i;

/** Problems of one guidance text: Era's guard (no digits, no diets, no body weight, no supplements) plus therapy words. */
export function guidanceProblems(text: string): string[] {
  const out = tipProblems(text);
  const hit = THERAPY.exec(text);
  if (hit) out.push(`therapy word: ${hit[0]}`);
  return out;
}

export interface FamilyChild {
  personId: string;
  /** First name + surname initial. */
  name: string;
  group: NutritionGroupId | null;
  teamCodes: readonly string[];
}

/**
 * The children whose guidance a family sees: ONLY members of the caller's own circle returned by scd_my_family (the
 * database scopes it to auth.uid()), minors or athletes with a team, never the caller themself unless an athlete.
 */
export function familyChildren(
  members: ReadonlyArray<{ personId: string; displayName: string; relationship: string; birthYear: number | null; minor: boolean | null; teamCodes: readonly string[] }>,
  seasonStartYear = SEASON_START_YEAR,
): FamilyChild[] {
  return members
    .filter((m) => (m.relationship !== "SELF" && m.minor === true) || m.teamCodes.length > 0)
    .map((m) => ({ personId: m.personId, name: shortName(m.displayName), group: nutritionGroupFor(m.birthYear, seasonStartYear), teamCodes: [...m.teamCodes] }));
}

/** Guidance groups shown to a family: the distinct groups of its own children, in age order. */
export function groupsForFamily(children: readonly Pick<FamilyChild, "group">[]): NutritionGroupId[] {
  const set = new Set(children.map((c) => c.group).filter((g): g is NutritionGroupId => g !== null));
  return NUTRITION_GROUPS.map((g) => g.id).filter((id) => set.has(id));
}

/** Work-queue title of a consultation request: the team only, never a name or a health detail. */
export function consultTitle(teamName: string | null | undefined): string {
  const t = (teamName ?? "").replace(/\s+/g, " ").trim();
  return `Richiesta consulenza nutrizionista · ${t || "squadra non indicata"}`;
}

export type ConsultOutcome = "RECEIVED" | "ALREADY" | "LIMIT" | "NOT_ALLOWED" | "NOT_SIGNED_IN" | "NOT_APPLIED" | "ERROR";

const CONSULT_OUTCOMES: readonly ConsultOutcome[] = ["RECEIVED", "ALREADY", "LIMIT", "NOT_ALLOWED", "NOT_SIGNED_IN", "NOT_APPLIED", "ERROR"];

export function asConsultOutcome(v: unknown): ConsultOutcome {
  return typeof v === "string" && (CONSULT_OUTCOMES as readonly string[]).includes(v) ? (v as ConsultOutcome) : "ERROR";
}

export const CONSULT_MESSAGE: Readonly<Record<ConsultOutcome, string>> = {
  RECEIVED: "Richiesta inviata. Vi ricontatta la nutrizionista del club per fissare la consulenza.",
  ALREADY: "C'è già una richiesta aperta per questo ragazzo: la nutrizionista la sta seguendo.",
  LIMIT: "Avete già inviato diverse richieste oggi. Riprovate domani.",
  NOT_ALLOWED: "Potete chiedere la consulenza solo per i vostri figli.",
  NOT_SIGNED_IN: "Entrate con il vostro account per chiedere una consulenza.",
  NOT_APPLIED: R136_PENDING,
  ERROR: "Richiesta non riuscita, riprovate più tardi.",
};

export interface NutritionRequestRow {
  id: string;
  title: string;
  status: "NEW" | "IN_PROGRESS" | "NEEDS_INFO" | "SNOOZED";
  createdAt: string;
  /** The adult to call back (guardian), never the child. */
  contact: string | null;
  mine: boolean;
}

export const REQUEST_STATUS_LABEL: Readonly<Record<NutritionRequestRow["status"], string>> = {
  NEW: "Nuova",
  IN_PROGRESS: "Presa in carico",
  NEEDS_INFO: "Servono informazioni",
  SNOOZED: "Rimandata",
};

/** Which view of /nutrizionista a verified session gets: staff list, family guidance, or nothing. */
export type NutritionView = "staff" | "family" | "access";

export function nutritionView(roles: ReadonlySet<string> | null): NutritionView {
  if (!roles || roles.size === 0) return "access";
  if (roles.has("direzione") || roles.has("nutrizionista")) return "staff";
  if (roles.has("famiglia") || roles.has("atleta")) return "family";
  return "access";
}
