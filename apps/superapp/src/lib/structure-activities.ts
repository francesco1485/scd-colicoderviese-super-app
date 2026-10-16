/**
 * "Attività in struttura" (/gestionale/struttura): what happens at the centres of Colico and Dervio besides official
 * matches. Pure logic, no network: the week view merges three sources without copying them into a new register:
 *   - trainings of the Quadro settimanale (Colico fields only: the quadro has no Dervio rows);
 *   - home matches of the Master Calendario snapshot (club and opponent club names, no people);
 *   - activities and duty shifts of r135 (scd_structure_activities, applied on SCD PULSE 16/10/2026).
 * Unknown stays null ("—"), never zero: KPIs of the shifts are null until r135 answers.
 * No personal data: the responsible is a role id of the registry, never a person's name. Tested in
 * structure-activities.test.ts; the vocabularies mirror the r135 SQL (structure-migration.test.ts).
 */
import { addDays, trainingRowsFor, weekRange } from "./board-data";
import { romeParts } from "./home-week";
import type { PublicEvent, TrainingSlot } from "./public-snapshots";

export const STRUCTURE_SITES = ["COLICO", "DERVIO"] as const;
export type StructureSite = (typeof STRUCTURE_SITES)[number];
export const STRUCTURE_AREAS = ["CAMPO", "SPOGLIATOI", "CLUB_HOUSE", "PALESTRA"] as const;
export type StructureArea = (typeof STRUCTURE_AREAS)[number];
export const STRUCTURE_KINDS = ["TURNO_VOLONTARIO", "APERTURA", "CHIUSURA", "ATTIVITA_SERALE", "EVENTO"] as const;
export type StructureKind = (typeof STRUCTURE_KINDS)[number];
export const STRUCTURE_STATUSES = ["PREVISTA", "ANNULLATA"] as const;
export type StructureStatus = (typeof STRUCTURE_STATUSES)[number];

/** Kinds that are duty shifts: they count as "scoperti" while nobody has taken them. */
export const SHIFT_KINDS: readonly StructureKind[] = ["TURNO_VOLONTARIO", "APERTURA", "CHIUSURA"];

/**
 * Who may read r135, per site (mirror of scd_structure_reader_site in the SQL, kept equal by a test).
 * The roles read every site. COLICO: the positions of the registry area "struttura". DERVIO: only the positions
 * Francesco named (UD-156, 16/10/2026 06:57 "Dervio decido io e responsabile attività di base e coordinatore attività
 * sportiva e presidente e segreteria sempre informata"); the Segreteria reads through its role.
 */
export const STRUCTURE_READER_ROLES = ["DIRECTION", "SECRETARIAT"] as const;
export const STRUCTURE_READER_POSITIONS_BY_SITE = {
  COLICO: [
    "presidente",
    "direttore-generale",
    "coordinatore-attivita-sportiva",
    "responsabile-attivita-base",
    "responsabile-struttura",
    "responsabile-struttura-colico",
    "responsabile-struttura-dervio",
    "responsabile-campi",
    "responsabile-club-house",
  ],
  DERVIO: ["presidente", "direttore-generale", "coordinatore-attivita-sportiva", "responsabile-attivita-base"],
} as const satisfies Record<StructureSite, readonly string[]>;
/** Positions that read at least one site (the "any site" gate scd_structure_reader and the registry area). */
export const STRUCTURE_READER_POSITIONS: readonly string[] = [
  ...new Set(STRUCTURE_SITES.flatMap((s) => [...STRUCTURE_READER_POSITIONS_BY_SITE[s]])),
];

/**
 * Sites whose r135 rows a caller reads, from the coarse database roles of the club membership and the positions of
 * the session. Same rule as scd_structure_reader_site; used only while the database cannot answer (function not reachable,
 * preview): when r135 answers, its readableSites wins.
 */
export function structureReadableSites(dbRoles: readonly string[], positions: ReadonlySet<string>): StructureSite[] {
  const role = dbRoles.some((r) => (STRUCTURE_READER_ROLES as readonly string[]).includes(r));
  return STRUCTURE_SITES.filter((s) => role || STRUCTURE_READER_POSITIONS_BY_SITE[s].some((p) => positions.has(p)));
}

/**
 * Sites the page opens. Colico's known data (Quadro trainings, home matches) is opened by the area gate itself, so
 * Colico is always open on the page (its r135 rows still come only from the database check). Dervio is reserved
 * (UD-156): open only to its readers; for everybody else the selector is disabled and says "riservato".
 */
export function viewableSites(readable: readonly StructureSite[]): StructureSite[] {
  return STRUCTURE_SITES.filter((s) => s === "COLICO" || readable.includes(s));
}

/** Window read by the page: from the Monday of last week to the Sunday three weeks ahead (35 days, r135 allows 42). */
export const WEEK_OFFSET_MIN = -1;
export const WEEK_OFFSET_MAX = 3;

export const SITE_LABEL: Readonly<Record<StructureSite, string>> = { COLICO: "Colico", DERVIO: "Dervio" };
export const AREA_LABEL: Readonly<Record<StructureArea, string>> = {
  CAMPO: "Campo",
  SPOGLIATOI: "Spogliatoi",
  CLUB_HOUSE: "Club House",
  PALESTRA: "Palestra",
};
export const KIND_LABEL: Readonly<Record<StructureKind | "ALLENAMENTO" | "GARA", string>> = {
  TURNO_VOLONTARIO: "Turno volontario",
  APERTURA: "Apertura",
  CHIUSURA: "Chiusura",
  ATTIVITA_SERALE: "Attività serale",
  EVENTO: "Evento",
  ALLENAMENTO: "Allenamento",
  GARA: "Gara in casa",
};

export interface StructureActivity {
  id: string;
  site: StructureSite;
  area: StructureArea;
  kind: StructureKind;
  title: string;
  startsAt: string;
  endsAt: string;
  /** Registry position id ("responsabile-struttura-colico"), or null when nobody is in charge yet. */
  responsibleRole: string | null;
  covered: boolean;
  status: StructureStatus;
  notes: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLE_ID = /^[a-z0-9-]{2,60}$/;
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === "string" && (list as readonly string[]).includes(v);
const validIso = (v: unknown): v is string => typeof v === "string" && !Number.isNaN(new Date(v).getTime());
const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/**
 * Answer of scd_structure_week: { readableSites, activities }. Rows of a site not in readableSites are dropped (the
 * database already filters them; this is a second lock). A malformed envelope (not an object, readableSites or
 * activities not an array) reads as "no site" and activities null: unknown, never an empty week.
 */
export function parseStructureWeekResult(input: unknown): { readableSites: StructureSite[]; activities: StructureActivity[] | null } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { readableSites: [], activities: null };
  const raw = (input as Record<string, unknown>)["readableSites"];
  const rows = (input as Record<string, unknown>)["activities"];
  if (!Array.isArray(raw) || !Array.isArray(rows)) return { readableSites: [], activities: null };
  const readableSites = STRUCTURE_SITES.filter((s) => raw.includes(s));
  const activities = parseStructureActivities(rows).filter((a) => readableSites.includes(a.site));
  return { readableSites, activities };
}

/** Rows of scd_structure_week: anything malformed is dropped (the browser never sees raw database output). */
export function parseStructureActivities(input: unknown): StructureActivity[] {
  if (!Array.isArray(input)) return [];
  const out: StructureActivity[] = [];
  for (const r of input as Array<Record<string, unknown>>) {
    if (!r || typeof r !== "object") continue;
    const title = text(r["title"], 80);
    if (typeof r["id"] !== "string" || !UUID.test(r["id"]) || !title) continue;
    if (!oneOf(STRUCTURE_SITES, r["site"]) || !oneOf(STRUCTURE_AREAS, r["area"]) || !oneOf(STRUCTURE_KINDS, r["kind"])) continue;
    if (!validIso(r["startsAt"]) || !validIso(r["endsAt"])) continue;
    const role = typeof r["responsibleRole"] === "string" && ROLE_ID.test(r["responsibleRole"]) ? r["responsibleRole"] : null;
    out.push({
      id: r["id"],
      site: r["site"],
      area: r["area"],
      kind: r["kind"],
      title,
      startsAt: r["startsAt"],
      endsAt: r["endsAt"],
      responsibleRole: role,
      covered: r["covered"] === true,
      status: r["status"] === "ANNULLATA" ? "ANNULLATA" : "PREVISTA",
      notes: text(r["notes"], 300),
    });
  }
  return out;
}

export type WeekItemKind = StructureKind | "ALLENAMENTO" | "GARA";
export type WeekItemSource = "QUADRO" | "CALENDARIO" | "STRUTTURA";

export interface WeekItem {
  id: string;
  site: StructureSite;
  /** ISO day in Europe/Rome. */
  date: string;
  /** "HH:MM" or "" when the source has no time. */
  start: string;
  end: string;
  kind: WeekItemKind;
  area: StructureArea;
  title: string;
  /** Place inside the site ("Campo 1") or the area label. */
  place: string;
  source: WeekItemSource;
  /** Shifts only: covered or not; null for trainings, matches and non-shift activities. */
  covered: boolean | null;
  responsibleRole: string | null;
  cancelled: boolean;
  notes: string | null;
}

export interface WeekDay {
  date: string;
  items: WeekItem[];
}

export interface StructureKpi {
  /**
   * Known activity in the week at both sites: trainings (Colico only, the Quadro has no Dervio rows), home matches and
   * (when readable) r135 activities. Not the total of the week: Dervio trainings are unknown.
   */
  activities: number;
  /** Shifts without anyone on them; null while r135 is not readable. */
  uncoveredShifts: number | null;
  /** Distinct evenings with a Club House activity; null while r135 is not readable. */
  clubHouseEvenings: number | null;
}

export interface StructureWeek {
  /** Sites the page opens (viewableSites): items of the other sites are not in `sites` nor in the KPIs. */
  viewable: StructureSite[];
  from: string;
  to: string;
  label: string;
  days: string[];
  sites: Record<StructureSite, WeekDay[]>;
  kpi: StructureKpi;
}

const FIELD_PLACE: Readonly<Record<"C1" | "C2", string>> = { C1: "Campo 1", C2: "Campo 2" };

/** "COLICO - CAMPO 1" -> site COLICO, place "Campo 1"; null when the venue is not one of the club's centres. */
export function homeVenue(venue: string): { site: StructureSite; place: string } | null {
  const m = /^\s*(colico|dervio)\b\s*(?:-\s*(.+))?$/i.exec(venue);
  if (!m) return null;
  const site: StructureSite = m[1]!.toLowerCase() === "colico" ? "COLICO" : "DERVIO";
  const rest = (m[2] ?? "").trim();
  const place = rest ? `${rest.charAt(0).toUpperCase()}${rest.slice(1).toLowerCase()}` : "Campo";
  return { site, place };
}

const isShift = (k: WeekItemKind): boolean => (SHIFT_KINDS as readonly string[]).includes(k);

/** One r135 row as a week item (Rome day and times). Null when its time cannot be read. */
export function activityItem(a: StructureActivity): WeekItem | null {
  const s = romeParts(a.startsAt);
  const e = romeParts(a.endsAt);
  if (!s || !e) return null;
  return {
    id: `str-${a.id}`,
    site: a.site,
    date: s.date,
    start: s.time,
    // An activity that ends after midnight shows its end time anyway (it belongs to the day it starts).
    end: e.time,
    kind: a.kind,
    area: a.area,
    title: a.title,
    place: AREA_LABEL[a.area],
    source: "STRUTTURA",
    covered: isShift(a.kind) ? a.covered : null,
    responsibleRole: a.responsibleRole,
    cancelled: a.status === "ANNULLATA",
    notes: a.notes,
  };
}

const byTime = (a: WeekItem, b: WeekItem) =>
  (a.start || "99").localeCompare(b.start || "99") || a.place.localeCompare(b.place, "it") || a.title.localeCompare(b.title, "it");

/**
 * The week (Mon-Sun) of `today` moved by `offset`, per site and per day, with the KPIs.
 * `activities` is null while r135 is not reachable or not readable: the shift KPIs stay unknown (null).
 */
export function buildStructureWeek(input: {
  today: string;
  offset: number;
  slots: readonly TrainingSlot[];
  events: readonly PublicEvent[];
  activities: readonly StructureActivity[] | null;
  /** Sites the caller may see (viewableSites); nothing of the other sites enters the week or its KPIs. */
  viewable: readonly StructureSite[];
}): StructureWeek {
  const w = weekRange(input.today, input.offset);
  const days = Array.from({ length: 7 }, (_, i) => addDays(w.from, i));
  const items: WeekItem[] = [];

  for (const iso of days) {
    for (const r of trainingRowsFor(iso, input.slots)) {
      items.push({
        id: `qua-${r.id}`,
        site: "COLICO",
        date: iso,
        start: r.time,
        end: r.end,
        kind: "ALLENAMENTO",
        area: "CAMPO",
        title: r.teams,
        place: FIELD_PLACE[r.field],
        source: "QUADRO",
        covered: null,
        responsibleRole: null,
        cancelled: false,
        notes: null,
      });
    }
  }

  for (const e of input.events) {
    if (e.homeAway !== "CASA" || e.date < w.from || e.date > w.to) continue;
    const v = homeVenue(e.venue);
    if (!v) continue;
    items.push({
      id: `cal-${e.id}`,
      site: v.site,
      date: e.date,
      start: e.time,
      end: "",
      kind: "GARA",
      area: "CAMPO",
      title: e.opponent ? `${e.category} · con ${e.opponent}` : e.category,
      place: v.place,
      source: "CALENDARIO",
      covered: null,
      responsibleRole: null,
      cancelled: false,
      notes: null,
    });
  }

  const own = (input.activities ?? []).map(activityItem).filter((x): x is WeekItem => x !== null && x.date >= w.from && x.date <= w.to);
  items.push(...own);

  const viewable = STRUCTURE_SITES.filter((s) => input.viewable.includes(s));
  const seen = items.filter((i) => viewable.includes(i.site));
  const sites = Object.fromEntries(
    STRUCTURE_SITES.map((site) => [
      site,
      days.map((date) => ({ date, items: seen.filter((i) => i.site === site && i.date === date).sort(byTime) })),
    ]),
  ) as Record<StructureSite, WeekDay[]>;

  const live = own.filter((i) => !i.cancelled && viewable.includes(i.site));
  const ready = input.activities !== null;
  return {
    viewable,
    from: w.from,
    to: w.to,
    label: w.label,
    days,
    sites,
    kpi: {
      activities: seen.filter((i) => !i.cancelled).length,
      uncoveredShifts: ready ? live.filter((i) => isShift(i.kind) && i.covered === false).length : null,
      clubHouseEvenings: ready
        ? new Set(live.filter((i) => i.area === "CLUB_HOUSE" && (i.kind === "ATTIVITA_SERALE" || i.start >= "18:00")).map((i) => i.date)).size
        : null,
    },
  };
}

/** Range of dates the server reads from r135 for the page (Monday of WEEK_OFFSET_MIN to Sunday of WEEK_OFFSET_MAX). */
export function structureWindow(today: string): { from: string; to: string } {
  return { from: weekRange(today, WEEK_OFFSET_MIN).from, to: weekRange(today, WEEK_OFFSET_MAX).to };
}

/** Count of known, not cancelled items of one site in the week (raw number, not a display value: see siteBadge). */
export function siteCount(week: StructureWeek, site: StructureSite): number {
  return week.sites[site].reduce((n, d) => n + d.items.filter((i) => !i.cancelled).length, 0);
}

/** Sites whose trainings are not in the Quadro settimanale: their activity count is never complete. */
export const SITES_WITHOUT_TRAININGS: readonly StructureSite[] = ["DERVIO"];

/** Visible word of a site the caller may not see (UD-156): never 0, never "—". */
export const SITE_RESERVED = "riservato";

export interface SiteBadge {
  /** Visible value: a number of known activities, "—" when the activity of the site is not known, "riservato". */
  value: string;
  /** Visible qualifier next to the number ("solo gare", "parziale"), or null when the count is complete. */
  note: string | null;
  /** Screen-reader text that completes the badge (e.g. "dato non completo"), or null. */
  srText: string | null;
}

/**
 * Badge of the site switch. Colico shows its count (Quadro trainings, home matches, r135 rows when readable).
 * Dervio has no training rows in the Quadro, so its activity is unknown: it never shows 0. Without any known item it
 * shows "—" ("dato non completo"); with home matches only it shows the number with "solo gare"; with other known rows
 * (r135) it shows the number with "parziale" because the trainings are still missing. A site the caller may not see
 * (Dervio outside its readers, UD-156) shows "riservato".
 */
export function siteBadge(week: StructureWeek, site: StructureSite): SiteBadge {
  if (!week.viewable.includes(site)) {
    return { value: SITE_RESERVED, note: null, srText: "sede riservata a Direzione, Segreteria, presidente, coordinatore attività sportiva e responsabile attività di base" };
  }
  const n = siteCount(week, site);
  if (!SITES_WITHOUT_TRAININGS.includes(site)) return { value: String(n), note: null, srText: null };
  if (n === 0) return { value: "—", note: null, srText: "dato non completo" };
  const live = week.sites[site].flatMap((d) => d.items).filter((i) => !i.cancelled);
  const onlyMatches = live.every((i) => i.kind === "GARA");
  return {
    value: String(n),
    note: onlyMatches ? "solo gare" : "parziale",
    srText: "dato non completo: allenamenti non presenti nel quadro",
  };
}

/* ------------------------------------------------------------------------------------------------------------------
 * Writing (migration r137, STAGED until Francesco writes "applica r137").
 * UD-159 (Francesco 16/10/2026 08:53): the activities are decided in the gestionale by the Direttore Generale and the
 * Presidente. Writers = DIRECTION role, or positions presidente / direttore-generale (mirror of scd_structure_writer,
 * kept equal by structure-write-migration.test.ts). UD-156: every insert, change or cancellation leaves an in-app
 * notice for the Segreteria in the work queue (/gestionale/coda): the database does it, never the browser.
 * ---------------------------------------------------------------------------------------------------------------- */

export const STRUCTURE_WRITER_ROLES = ["DIRECTION"] as const;
export const STRUCTURE_WRITER_POSITIONS = ["presidente", "direttore-generale"] as const;

/**
 * Session rule for the writers (same as scd_structure_writer). Used only to decide whether to explain that writing is
 * not active yet; the form opens only when the database itself says canWrite (structureWriteState).
 */
export function structureCanWrite(dbRoles: readonly string[], positions: ReadonlySet<string>): boolean {
  return (
    dbRoles.some((r) => (STRUCTURE_WRITER_ROLES as readonly string[]).includes(r)) ||
    STRUCTURE_WRITER_POSITIONS.some((p) => positions.has(p))
  );
}

/**
 * Whether the page offers writing:
 *   "on"          the database (scd_structure_write_access) says this person may write: the form is shown;
 *   "not-applied" the function is missing (r137 not applied): writers by session see "Scrittura non ancora attiva";
 *   "unavailable" the check failed: writers by session see "Scrittura non disponibile ora";
 *   "off"         not a writer (or no session): nothing is shown.
 * Fail closed: only "on" shows the form.
 */
export type StructureWriteState = "on" | "not-applied" | "unavailable" | "off";
export type StructureWriteProbe = { canWrite: boolean } | "missing" | "error" | null;

export function structureWriteState(sessionWriter: boolean, probe: StructureWriteProbe): StructureWriteState {
  if (probe && typeof probe === "object") return probe.canWrite === true ? "on" : "off";
  if (!sessionWriter) return "off";
  if (probe === "missing") return "not-applied";
  if (probe === "error") return "unavailable";
  return "off";
}

/** Answer of scd_structure_write_access: anything but {canWrite: true} is "no". */
export function parseWriteAccess(input: unknown): { canWrite: boolean } {
  return { canWrite: !!input && typeof input === "object" && (input as Record<string, unknown>)["canWrite"] === true };
}

/** Form values (Europe/Rome day and times). An end not after the start means the next day (at most 24 hours). */
export interface StructureDraft {
  site: StructureSite;
  area: StructureArea;
  kind: StructureKind;
  title: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:MM" */
  start: string;
  end: string;
  responsibleRole: string | null;
  covered: boolean;
  notes: string | null;
}

export type StructureWriteCode =
  | "input"
  | "site"
  | "area"
  | "kind"
  | "title"
  | "contact"
  | "notes"
  | "role"
  | "date"
  | "date_range"
  | "time"
  | "reason"
  | "not_found"
  | "cancelled";

/** Plain Italian message for every code of r137 (and of the same checks in the browser). */
export const STRUCTURE_WRITE_MESSAGES: Readonly<Record<StructureWriteCode, string>> = {
  input: "Dati non validi: controlla il modulo e riprova.",
  site: "Scegli la sede: Colico o Dervio.",
  area: "Scegli dove: campo, spogliatoi, Club House o palestra.",
  kind: "Scegli il tipo di attività.",
  title: "Il titolo deve avere da 2 a 80 caratteri.",
  contact: "Non scrivere numeri di telefono o indirizzi e-mail: indica solo il ruolo.",
  notes: "Le note possono avere al massimo 300 caratteri.",
  role: "Il responsabile si indica con un ruolo dell'elenco, mai con un nome.",
  date: "Giorno non valido.",
  date_range: "Il giorno deve essere tra 7 giorni fa e un anno da oggi.",
  time: "Orari non validi: inizio e fine devono essere diversi (una fine prima dell'inizio vale per il giorno dopo).",
  reason: "Il motivo può avere al massimo 300 caratteri.",
  not_found: "Attività non trovata: forse è stata cambiata da un'altra persona. Ricarica la pagina.",
  cancelled: "L'attività è già annullata e non si può più modificare.",
};

export function isStructureWriteCode(v: unknown): v is StructureWriteCode {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(STRUCTURE_WRITE_MESSAGES, v);
}

const MAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE = /(\+|00)?[0-9]([ ./-]?[0-9]){8,}/;
const HHMM = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const hasContact = (s: string) => MAIL.test(s) || PHONE.test(s);

function validDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/**
 * Same checks as scd_structure_activity_clean (r137), in the same order, so the form answers before the round trip.
 * The database checks again: this never replaces it. `today` is the club day (Europe/Rome).
 */
export function validateStructureDraft(
  input: Partial<Record<keyof StructureDraft, unknown>>,
  today: string,
): { ok: true; value: StructureDraft } | { ok: false; code: StructureWriteCode } {
  const fail = (code: StructureWriteCode) => ({ ok: false as const, code });
  const { site, area, kind } = input;
  if (!oneOf(STRUCTURE_SITES, site)) return fail("site");
  if (!oneOf(STRUCTURE_AREAS, area)) return fail("area");
  if (!oneOf(STRUCTURE_KINDS, kind)) return fail("kind");
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (title.length < 2 || title.length > 80) return fail("title");
  if (hasContact(title)) return fail("contact");
  const notes = typeof input.notes === "string" && input.notes.trim() ? input.notes.trim() : null;
  if (notes && notes.length > 300) return fail("notes");
  if (notes && hasContact(notes)) return fail("contact");
  const role = typeof input.responsibleRole === "string" && input.responsibleRole.trim() ? input.responsibleRole.trim() : null;
  if (role && !ROLE_ID.test(role)) return fail("role");
  if (input.covered !== undefined && input.covered !== null && typeof input.covered !== "boolean") return fail("input");
  const date = typeof input.date === "string" ? input.date : "";
  if (!validDate(date)) return fail("date");
  if (date < addDays(today, -7) || date > addDays(today, 366)) return fail("date_range");
  const start = typeof input.start === "string" ? input.start : "";
  const end = typeof input.end === "string" ? input.end : "";
  if (!HHMM.test(start) || !HHMM.test(end) || start === end) return fail("time");
  return {
    ok: true,
    value: { site, area, kind, title, date, start, end, responsibleRole: role, covered: input.covered === true, notes },
  };
}

/** Cancellation reason: optional, at most 300 characters, no phone numbers or e-mail addresses. */
export function validateCancelReason(reason: unknown): { ok: true; value: string | null } | { ok: false; code: StructureWriteCode } {
  const r = typeof reason === "string" && reason.trim() ? reason.trim() : null;
  if (r && r.length > 300) return { ok: false, code: "reason" };
  if (r && hasContact(r)) return { ok: false, code: "contact" };
  return { ok: true, value: r };
}

/** Form values of a registered activity (Rome day and times), to edit it. */
export function draftFromActivity(a: StructureActivity): StructureDraft | null {
  const s = romeParts(a.startsAt);
  const e = romeParts(a.endsAt);
  if (!s || !e) return null;
  return {
    site: a.site,
    area: a.area,
    kind: a.kind,
    title: a.title,
    date: s.date,
    start: s.time,
    end: e.time,
    responsibleRole: a.responsibleRole,
    covered: a.covered,
    notes: a.notes,
  };
}

/** Empty form for a new activity on `date` at `site`. */
export function emptyDraft(site: StructureSite, date: string): StructureDraft {
  return { site, area: "CAMPO", kind: "TURNO_VOLONTARIO", title: "", date, start: "18:00", end: "20:00", responsibleRole: null, covered: false, notes: null };
}

/** Roles offered as "responsabile" in the form: the positions that run the centres (never a person). */
export const STRUCTURE_RESPONSIBLE_OPTIONS: readonly string[] = STRUCTURE_READER_POSITIONS_BY_SITE.COLICO;

/** Plain messages of the write path (shown by the page; the server returns them). */
export const STRUCTURE_WRITE_OFF =
  "Scrittura non ancora attiva: l'inserimento delle attività si apre quando la Direzione approva l'aggiornamento del registro.";
export const STRUCTURE_WRITE_UNAVAILABLE = "Scrittura non disponibile ora, riprova più tardi.";
export const STRUCTURE_WRITE_DENIED = "Non puoi cambiare le attività: le decidono la Direzione, il Presidente e il Direttore generale.";
export const STRUCTURE_WRITE_FAILED = "Salvataggio non riuscito, riprova più tardi.";
export const STRUCTURE_WRITE_NO_SESSION = "Accesso non valido: entra con il tuo account del club.";
export const STRUCTURE_NOTICED = " La Segreteria è stata avvisata nella coda del gestionale.";

export interface StructureWriteOutcome {
  ok: boolean;
  message: string;
}

/** Text shown with the form: the Segreteria is always informed (UD-156). */
export const STRUCTURE_SEGRETERIA_NOTICE =
  "La Segreteria riceve un avviso nella coda del gestionale a ogni inserimento, modifica o annullamento.";
