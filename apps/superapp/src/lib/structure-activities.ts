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
