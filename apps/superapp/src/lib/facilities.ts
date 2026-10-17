/**
 * Facility map contract (typed view of `config/scd-facilities.v1.json`).
 *
 * The JSON at the repository root is the single source: sites, spaces,
 * entrances and routes of the club with the provenance of every value.
 * This module types it, validates it and adds the pure logic the map needs:
 * open/closed status from opening hours in Europe/Rome, "in uso adesso" from
 * the weekly training board snapshot, the public-safe projection and the
 * ready-to-paste correction row for the Drive register.
 * Unknown values stay null and are rendered as "da inserire", never invented.
 */
import facilitiesJson from "../../../../config/scd-facilities.v1.json";

import type { TrainingSlot } from "./public-snapshots";
import { fromMinutes, parseRange } from "./quadro";

export type Audience = "public" | "staff" | "teams" | "referees" | "authorised_roles";
export type SpaceLayer = "campi" | "spogliatoi" | "servizi";
export type SpaceType =
  | "field"
  | "office"
  | "clubhouse"
  | "food"
  | "storage"
  | "first_aid"
  | "ticket_office"
  | "changing_room"
  | "referee_room"
  | "stand"
  | "athletics"
  | "beach_volley";
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const WEEKDAYS: readonly Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const AUDIENCES: readonly Audience[] = ["public", "staff", "teams", "referees", "authorised_roles"];
export const LAYERS: readonly SpaceLayer[] = ["campi", "spogliatoi", "servizi"];
const SPACE_TYPES: readonly SpaceType[] = [
  "field", "office", "clubhouse", "food", "storage", "first_aid", "ticket_office",
  "changing_room", "referee_room", "stand", "athletics", "beach_volley",
];

export interface Provenance {
  source: "master" | "board";
  ref?: string;
  verified: boolean;
}

export interface TimeRange {
  from: string;
  to: string;
}

/** Weekly opening hours. A day set to null is not filled in yet; [] means closed all day. */
export type OpeningHours = Partial<Record<Weekday, readonly TimeRange[] | null>>;

export interface SpaceAccess {
  audiences: readonly Audience[];
  roles?: readonly string[];
  source: string;
}

export interface SpaceRule {
  text: string;
  source: string;
}

export interface LayoutBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Space {
  id: string;
  site: string;
  name: string;
  type: SpaceType;
  layer: SpaceLayer;
  surface: string | null;
  size: { text: string; length_m: number | null; width_m: number | null } | null;
  /** Box on the site plan, in plan units. Positions are schematic (from the boards). */
  layout: LayoutBox | null;
  hours: OpeningHours | null;
  /** Ids of the site entrances to use, null when unknown. */
  entrances: readonly string[] | null;
  responsible_role: string | null;
  access: SpaceAccess | null;
  rules: readonly SpaceRule[];
  /** Column of the training board snapshot (C1, C2, SP1..SP4) feeding "in uso adesso". */
  quadro_key: "C1" | "C2" | "SP1" | "SP2" | "SP3" | "SP4" | null;
  board_code?: string;
  provenance: Provenance;
}

export interface Entrance {
  id: string;
  label: string;
  audience: Audience;
  x: number;
  y: number;
  provenance: Provenance;
}

export interface PlanRoute {
  id: string;
  label: string;
  audience: Audience;
  points: readonly (readonly [number, number])[];
  provenance: Provenance;
}

export interface Site {
  id: string;
  name: string;
  short: string;
  type: string;
  address: string | null;
  municipality: string;
  status: string;
  managed_by_scd: boolean;
  responsible_role: string | null;
  notes: string | null;
  board_label: string | null;
  provenance: Provenance;
  plan: { width: number; height: number; positions: "schematic"; note: string };
  entrances: readonly Entrance[] | null;
  routes: readonly PlanRoute[] | null;
}

export interface FacilitiesContract {
  schema: string;
  status: string;
  updated: string;
  purpose: string;
  source_registry_id: string;
  sources: {
    master: { label: string; drive_file_id: string; read_on: string };
    corrections_register: { label: string; url: string; columns: readonly string[] };
    [key: string]: unknown;
  };
  rules: readonly string[];
  sites: readonly Site[];
  spaces: readonly Space[];
}

export const FACILITIES = facilitiesJson as unknown as FacilitiesContract;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const isBox = (b: LayoutBox) => [b.x, b.y, b.w, b.h].every((n) => typeof n === "number" && Number.isFinite(n)) && b.w > 0 && b.h > 0;

/** Structural checks on the contract. Returns human-readable problems, empty when valid. */
export function validateFacilities(c: FacilitiesContract = FACILITIES): string[] {
  const problems: string[] = [];
  if (c.schema !== "scd.facilities.v1") problems.push(`schema "${c.schema}" is not scd.facilities.v1`);
  const siteIds = new Set<string>();
  const entranceIds = new Map<string, string>();
  for (const s of c.sites) {
    if (siteIds.has(s.id)) problems.push(`site id "${s.id}" is used twice`);
    siteIds.add(s.id);
    if (!/^SED-[A-Z]{3}$/.test(s.id)) problems.push(`site id "${s.id}" is not SED-XXX`);
    if (!(s.plan.width > 0 && s.plan.height > 0)) problems.push(`site "${s.id}" has no plan size`);
    for (const e of s.entrances ?? []) {
      if (entranceIds.has(e.id)) problems.push(`entrance id "${e.id}" is used twice`);
      entranceIds.set(e.id, s.id);
      if (!AUDIENCES.includes(e.audience)) problems.push(`entrance "${e.id}" has unknown audience "${e.audience}"`);
      if (e.x < 0 || e.y < 0 || e.x > s.plan.width || e.y > s.plan.height) problems.push(`entrance "${e.id}" is outside the plan`);
    }
    for (const r of s.routes ?? []) {
      if (!AUDIENCES.includes(r.audience)) problems.push(`route "${r.id}" has unknown audience "${r.audience}"`);
      if (r.points.length < 2) problems.push(`route "${r.id}" needs at least two points`);
    }
  }
  const spaceIds = new Set<string>();
  for (const sp of c.spaces) {
    if (spaceIds.has(sp.id)) problems.push(`space id "${sp.id}" is used twice`);
    spaceIds.add(sp.id);
    const site = c.sites.find((s) => s.id === sp.site);
    if (!site) {
      problems.push(`space "${sp.id}" belongs to a missing site "${sp.site}"`);
      continue;
    }
    if (!SPACE_TYPES.includes(sp.type)) problems.push(`space "${sp.id}" has unknown type "${sp.type}"`);
    if (!LAYERS.includes(sp.layer)) problems.push(`space "${sp.id}" has unknown layer "${sp.layer}"`);
    if (sp.provenance.source === "master" && !/^SPA-[A-Z]{3}-[A-Z0-9]+$/.test(sp.id)) problems.push(`master space "${sp.id}" is not SPA-XXX-YYY`);
    if (sp.provenance.source === "board" && sp.provenance.verified) problems.push(`board space "${sp.id}" cannot be verified`);
    if (sp.layout) {
      if (!isBox(sp.layout)) problems.push(`space "${sp.id}" has an invalid layout box`);
      else if (sp.layout.x < 0 || sp.layout.y < 0 || sp.layout.x + sp.layout.w > site.plan.width || sp.layout.y + sp.layout.h > site.plan.height)
        problems.push(`space "${sp.id}" is outside the plan of "${site.id}"`);
    }
    if (sp.hours) {
      for (const [day, ranges] of Object.entries(sp.hours)) {
        if (!WEEKDAYS.includes(day as Weekday)) problems.push(`space "${sp.id}" has hours for unknown day "${day}"`);
        for (const r of ranges ?? []) {
          if (!HHMM.test(r.from) || !HHMM.test(r.to)) problems.push(`space "${sp.id}" has a malformed time on ${day}`);
          else if (r.to <= r.from) problems.push(`space "${sp.id}" closes before it opens on ${day}`);
        }
      }
    }
    for (const e of sp.entrances ?? []) {
      if (entranceIds.get(e) !== sp.site) problems.push(`space "${sp.id}" uses an entrance "${e}" that is not on its site`);
    }
    if (sp.access) {
      if (sp.access.audiences.length === 0) problems.push(`space "${sp.id}" has an empty access list (use null for unknown)`);
      for (const a of sp.access.audiences) if (!AUDIENCES.includes(a)) problems.push(`space "${sp.id}" has unknown audience "${a}"`);
      if (!sp.access.source.trim()) problems.push(`space "${sp.id}" access has no source`);
    }
    for (const r of sp.rules) if (!r.source.trim()) problems.push(`space "${sp.id}" has a rule without source`);
  }
  return problems;
}

export function siteById(id: string, c: FacilitiesContract = FACILITIES): Site | undefined {
  return c.sites.find((s) => s.id === id);
}

export function spacesOf(siteId: string, c: FacilitiesContract = FACILITIES): Space[] {
  return c.spaces.filter((s) => s.site === siteId);
}

export function spaceById(id: string, c: FacilitiesContract = FACILITIES): Space | undefined {
  return c.spaces.find((s) => s.id === id);
}

/* ───────────────────────── Club clock (Europe/Rome) ───────────────────────── */

export interface ClubClock {
  /** YYYY-MM-DD in Europe/Rome. */
  date: string;
  weekday: Weekday;
  /** Minutes from midnight, Europe/Rome. */
  minutes: number;
}

const WEEKDAY_SHORT: Readonly<Record<string, Weekday>> = { Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "sat", Sun: "sun" };

/** Day and minute of the club (Europe/Rome) for an instant. */
export function clubClock(at: Date): ClubClock {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23",
  }).formatToParts(at);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    date: `${g("year")}-${g("month")}-${g("day")}`,
    weekday: WEEKDAY_SHORT[g("weekday")] ?? "mon",
    minutes: Number(g("hour")) * 60 + Number(g("minute")),
  };
}

/** Weekday key of the training board ("LUNEDÌ") for our weekday ids. */
export const QUADRO_DAY: Readonly<Record<Weekday, string>> = {
  mon: "LUNEDÌ", tue: "MARTEDÌ", wed: "MERCOLEDÌ", thu: "GIOVEDÌ", fri: "VENERDÌ", sat: "SABATO", sun: "DOMENICA",
};

export const WEEKDAY_LABEL: Readonly<Record<Weekday, string>> = {
  mon: "Lunedì", tue: "Martedì", wed: "Mercoledì", thu: "Giovedì", fri: "Venerdì", sat: "Sabato", sun: "Domenica",
};

/* ───────────────────────── Open / closed ───────────────────────── */

export type OpenState = "open" | "closed" | "unknown";

export interface SpaceStatus {
  state: OpenState;
  /** Short Italian text: "Aperto fino alle 19:00", "Chiuso · apre alle 17:00", "Orari da inserire". */
  label: string;
}

const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/**
 * Status of a space at a club instant from its weekly hours.
 * null hours or a day not filled in → "unknown" ("Orari da inserire"), never "chiuso".
 */
export function spaceStatus(hours: OpeningHours | null, clock: Pick<ClubClock, "weekday" | "minutes">): SpaceStatus {
  if (!hours) return { state: "unknown", label: "Orari da inserire" };
  const today = hours[clock.weekday];
  if (today === undefined || today === null) return { state: "unknown", label: `Orari di ${WEEKDAY_LABEL[clock.weekday].toLowerCase()} da inserire` };
  const ranges = [...today].sort((a, b) => toMin(a.from) - toMin(b.from));
  const now = ranges.find((r) => clock.minutes >= toMin(r.from) && clock.minutes < toMin(r.to));
  if (now) return { state: "open", label: `Aperto fino alle ${now.to}` };
  const next = ranges.find((r) => toMin(r.from) > clock.minutes);
  return { state: "closed", label: next ? `Chiuso · apre alle ${next.from}` : "Chiuso per oggi" };
}

/** "Lun 17:00–19:00 · Mar chiuso · Mer da inserire" style lines, one per day; null when no hours at all. */
export function hoursLines(hours: OpeningHours | null): { day: Weekday; text: string }[] | null {
  if (!hours) return null;
  return WEEKDAYS.map((day) => {
    const r = hours[day];
    if (r === undefined || r === null) return { day, text: "da inserire" };
    if (r.length === 0) return { day, text: "chiuso" };
    return { day, text: r.map((x) => `${x.from}–${x.to}`).join(", ") };
  });
}

/**
 * Public wording when the facilities master has no hours (B10): one honest line,
 * never invented hours and never the internal "da inserire" to-do on public pages.
 */
export const PUBLIC_HOURS_PENDING = "Orari in aggiornamento dalla società";

/** Status for public pages: the open/closed label only when hours exist; null when unknown. */
export function publicStatus(status: SpaceStatus): SpaceStatus | null {
  return status.state === "unknown" ? null : status;
}

/** Day lines for public pages: days not filled in read "in aggiornamento" instead of "da inserire". */
export function publicHoursLines(hours: OpeningHours | null): { day: Weekday; text: string }[] | null {
  const lines = hoursLines(hours);
  return lines ? lines.map((l) => (l.text === "da inserire" ? { ...l, text: "in aggiornamento" } : l)) : null;
}

/**
 * Public wording for facts the master does not have yet (B11): families read "in aggiornamento",
 * never the internal "da inserire" to-do. Staff keep the internal wording.
 */
export const PUBLIC_PENDING = "in aggiornamento";

/** Public wording for a position or route drawn from a design board and not yet checked on site (B11). */
export const PUBLIC_INDICATIVE = "indicativo";

/**
 * Source of a rule for public pages (B11): never a repository path, board name or master sheet code.
 * Facts from the club masters read "la società"; rules still to be checked read "la società, da confermare".
 */
export function publicRuleSource(source: string): string {
  return isProposed(source) || /\bblocker\b/i.test(source) ? "la società, da confermare" : "la società";
}

/** True when at least one space lacks hours for the given weekday (or lacks hours at all). */
export function hoursPending(spaces: readonly Pick<Space, "hours">[], weekday?: Weekday): boolean {
  return spaces.some((s) => {
    if (!s.hours) return true;
    if (!weekday) return WEEKDAYS.some((d) => s.hours![d] === undefined || s.hours![d] === null);
    return s.hours[weekday] === undefined || s.hours[weekday] === null;
  });
}

/* ───────────────────────── Who enters ───────────────────────── */

export const AUDIENCE_LABEL: Readonly<Record<Audience, string>> = {
  public: "pubblico",
  staff: "staff della società",
  teams: "squadre con il loro staff",
  referees: "solo arbitri",
  authorised_roles: "ruoli autorizzati",
};

const ROLE_IT: Readonly<Record<string, string>> = {
  "responsabile-magazzino": "responsabile magazzino",
  "responsabile-campi": "responsabile campi",
  "addetto-biglietteria": "addetti biglietteria",
};

/** Who may enter, in plain Italian; null when the contract does not say. */
export function whoMayEnter(access: SpaceAccess | null): string | null {
  if (!access) return null;
  const parts = access.audiences.map((a) => AUDIENCE_LABEL[a]);
  if (access.roles?.length) parts.push(...access.roles.map((r) => ROLE_IT[r] ?? r.replace(/-/g, " ")));
  const uniq = [...new Set(parts)];
  return uniq.join(", ");
}

export function isProposed(source: string): boolean {
  return /regola proposta|da verificare/i.test(source);
}

/* ───────────────────────── In use now (training board) ───────────────────────── */

export interface UseEntry {
  /** Group text as written in the training board. */
  group: string;
  timeLabel: string;
  start: number;
  end: number;
}

const occupied = (v: string | undefined) => !!v && v.trim() !== "" && v.trim() !== "—";
const QUADRO_KEYS = ["C1", "C2", "SP1", "SP2", "SP3", "SP4"] as const;

function slotRange(s: TrainingSlot): { start: number; end: number } {
  return parseRange(s.timeLabel) ?? { start: s.start, end: s.start };
}

/**
 * Who uses each training-board column (C1, C2, SP1..SP4) on a board day at a minute.
 * Several slots may overlap (e.g. 19:00–20:20 and 20:10–21:20): all are returned.
 */
export function usageAt(slots: readonly TrainingSlot[], quadroDay: string, minute: number): Map<string, UseEntry[]> {
  const out = new Map<string, UseEntry[]>();
  for (const s of slots) {
    if (s.day !== quadroDay) continue;
    const { start, end } = slotRange(s);
    if (!(minute >= start && minute < end)) continue;
    for (const key of QUADRO_KEYS) {
      const raw = key === "C1" || key === "C2" ? s.fields[key] : s.rooms[key];
      if (!occupied(raw)) continue;
      const list = out.get(key) ?? [];
      list.push({ group: raw.replace(/\s*\n\s*/g, " · ").trim(), timeLabel: s.timeLabel, start, end });
      out.set(key, list);
    }
  }
  return out;
}

/** Selectable times of a board day: each slot start, sorted, unique. */
export function slotTimes(slots: readonly TrainingSlot[], quadroDay: string): { minute: number; label: string }[] {
  const mins = [...new Set(slots.filter((s) => s.day === quadroDay).map((s) => slotRange(s).start))].sort((a, b) => a - b);
  return mins.map((m) => ({ minute: m, label: fromMinutes(m) }));
}

/* ───────────────────────── Public projection ───────────────────────── */

/**
 * What the public page may show: every space with its hours and public-safe
 * fields, only entrances and routes for the public, no training-board link
 * (no team or changing-room assignments) and no responsible roles.
 */
/** Plan note for public pages (B11): the master note names design boards and technical reports, families read this. */
export const PUBLIC_PLAN_NOTE = "Schema non in scala: serve a orientarsi, non è un rilievo.";

export function publicSite(site: Site): Site {
  return {
    ...site,
    plan: { ...site.plan, note: PUBLIC_PLAN_NOTE },
    responsible_role: null,
    entrances: site.entrances ? site.entrances.filter((e) => e.audience === "public") : null,
    routes: site.routes ? site.routes.filter((r) => r.audience === "public") : null,
  };
}

export function publicSpace(space: Space, site: Site): Space {
  const pub = publicSite(site);
  const allowed = new Set((pub.entrances ?? []).map((e) => e.id));
  return {
    ...space,
    quadro_key: null,
    responsible_role: null,
    entrances: space.entrances ? space.entrances.filter((e) => allowed.has(e)) : null,
  };
}

/* ───────────────────────── Corrections (Drive register row) ───────────────────────── */

export const CORRECTION_KINDS = [
  { id: "orari", label: "Orari di apertura" },
  { id: "ingresso", label: "Ingresso" },
  { id: "regola", label: "Regola d'uso" },
  { id: "responsabile", label: "Ruolo responsabile" },
  { id: "accesso", label: "Chi può entrare" },
  { id: "nuovo", label: "Nuova informazione" },
] as const;
export type CorrectionKind = (typeof CORRECTION_KINDS)[number]["id"];

export interface CorrectionInput {
  /** Day the row is prepared, YYYY-MM-DD (club date). */
  date: string;
  role: string;
  kind: CorrectionKind;
  spaceId: string;
  description: string;
  /** Optional YYYY-MM-DD. */
  deadline?: string | undefined;
  link?: string | undefined;
}

const clean = (s: string | undefined) => (s ?? "").replace(/[\t\r\n]+/g, " ").replace(/\s{2,}/g, " ").trim();
const itDate = (iso: string | undefined) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
};

/** Problems with a correction before it can be copied (empty when ready). */
export function correctionProblems(input: CorrectionInput, c: FacilitiesContract = FACILITIES): string[] {
  const p: string[] = [];
  if (!clean(input.role)) p.push("Indica il tuo ruolo (non il nome).");
  if (!spaceById(input.spaceId, c)) p.push("Scegli lo spazio.");
  if (clean(input.description).length < 5) p.push("Descrivi la correzione (almeno 5 caratteri).");
  if (input.link && clean(input.link) && !/^https?:\/\/\S+$/.test(clean(input.link))) p.push("Il link deve iniziare con http:// o https://.");
  if (input.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(input.deadline)) p.push("Scadenza non valida.");
  return p;
}

/**
 * One row for "00 - SCD INSERIMENTI E RICHIESTE A SKY (master)", in its column order:
 * Data, Inserito da (ruolo), Tipo, Area, Descrizione, Scadenza, Link o allegato, Stato, Esito, Lavorato il.
 */
export function correctionRow(input: CorrectionInput, c: FacilitiesContract = FACILITIES): string[] {
  const space = spaceById(input.spaceId, c);
  const site = space ? siteById(space.site, c) : undefined;
  const kind = CORRECTION_KINDS.find((k) => k.id === input.kind)?.label ?? input.kind;
  return [
    itDate(input.date),
    clean(input.role),
    `Impianti · ${kind}`,
    space && site ? `Impianti · ${site.short} · ${space.name} (${space.id})` : "Impianti",
    clean(input.description),
    itDate(input.deadline),
    clean(input.link),
    "NUOVA",
    "",
    "",
  ];
}

/** Tab-separated row, ready to paste into the first empty row of the register. */
export function correctionTsv(input: CorrectionInput, c: FacilitiesContract = FACILITIES): string {
  return correctionRow(input, c).join("\t");
}

export const REGISTER_URL = FACILITIES.sources.corrections_register.url;
