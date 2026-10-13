/**
 * Kit partner (UD-109, Direzione 13/10/2026 17:45–17:47): inside the sponsor management area, for every partner a
 * ready kit that shows "subito di cosa stiamo parlando" — dedicated LED wall, Sky in match kit with the partner logo
 * (internal proposal), the four club kits with the partner logo and the official crest in front, the week's
 * calendar card and the live-stream bar "offerti da" the partner — so an offer (new or renewal) is complete.
 *
 * Pure data and geometry, no window/document/network at module level (SSR safe). Tested in partner-kit.test.ts.
 * The client-side drawing for the PNG export lives in partner-kit-render.ts and uses the same geometry.
 *
 * Rules:
 * - one subject interface for the three origins: the season sponsors (src/lib/sponsors.ts), a CRM record (today the
 *   contract names of CRM_PIPELINE; later CRM rows with an official logo) and a local logo picked on the device for a
 *   prospect (object URL, never uploaded or stored);
 * - a name is shown only when it is certain: otherwise the neutral label "Partner" (never an invented name);
 * - the crest is the official file, never redrawn; kits come from the club identity board; Sky carries the partner
 *   logo only as an internal proposal ("Proposta · non pubblicare senza approvazione");
 * - the calendar card uses only the official fixtures (same snapshot as the home): date, time, team label, opponent,
 *   home/away, venue. No player names, no faces.
 */
import { SPONSOR_ART } from "./logo-art.gen";
import { isLowRes } from "./logo-fit";
import type { PublicEvent, PublicGroup } from "./public-snapshots";
import { SPONSORS, type Sponsor } from "./sponsors";
import { CRM_PIPELINE } from "./work-areas";

/* ------------------------------------------------------------------ subject */

export type PartnerKitSource = "sponsors" | "crm" | "local";

/** Who the kit is for: one shape for the season sponsors, CRM records and a prospect's local logo. */
export interface PartnerKitSubject {
  /** Route id: sponsor slug, "crm-<slug>" for a CRM record, "locale" for the device-only prospect. */
  id: string;
  name: string | null;
  /** True only when the name is certain (sponsor list verified, CRM contract register, or typed by staff). */
  nameVerified: boolean;
  /** Logo file (same-origin path or blob: object URL); null when the official logo has not been collected yet. */
  logoSrc: string | null;
  /** Intrinsic size of the logo when known (cut-out registry); used to flag low-resolution files. */
  logoSize: { w: number; h: number; sourceWidth?: number } | null;
  source: PartnerKitSource;
  /** Sponsor slug the subject maps to (spot video, LED cut-out), when there is one. */
  sponsorSlug: string | null;
}

/** A CRM row as the future CRM import will provide it (logo only when an official file was collected). */
export interface CrmPartnerRecord {
  id: string;
  name: string | null;
  logoSrc: string | null;
}

/** Neutral label used whenever the name is not certain (Direzione: never an invented name). */
export const NEUTRAL_PARTNER_LABEL = "Partner";

/** Name to print on the kit pages: the certain name, otherwise "Partner". */
export function kitSubjectLabel(s: Pick<PartnerKitSubject, "name" | "nameVerified">): string {
  const n = s.name?.trim();
  return n && s.nameVerified ? n : NEUTRAL_PARTNER_LABEL;
}

/** URL-safe slug ("Officine Pedroncelli" -> "officine-pedroncelli"). */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const CRM_ID_PREFIX = "crm-";
export const LOCAL_SUBJECT_ID = "locale";

/**
 * Short names of the contract register (CRM_PIPELINE) that are the same company as a season sponsor with an official
 * logo. INFERRED from identical short names on the club's sponsor board (e.g. "MDS" = "MDS Impianti"); every other
 * CRM name keeps its own kit without a logo until the official file is collected.
 */
export const CRM_SPONSOR_ALIASES: Readonly<Record<string, string>> = {
  ATV: "atv",
  ATL: "atl-iveco",
  MDS: "mds-impianti",
  Consilia: "consilia-studio",
  "Attività di Recupero": "attivita-di-recupero",
  Essegi: "essegi-legno",
};

/** Cut-out (trimmed transparent) file of a sponsor when present, otherwise the official file. */
export function sponsorLogo(s: Pick<Sponsor, "slug" | "src">): { src: string; size: PartnerKitSubject["logoSize"] } {
  const art = SPONSOR_ART[s.slug];
  return art ? { src: art.src, size: { w: art.w, h: art.h, ...(art.sourceWidth ? { sourceWidth: art.sourceWidth } : {}) } } : { src: s.src, size: null };
}

export function subjectFromSponsor(s: Sponsor): PartnerKitSubject {
  const logo = sponsorLogo(s);
  return {
    id: s.slug,
    name: s.name,
    nameVerified: s.nameVerified && !!s.name,
    logoSrc: logo.src,
    logoSize: logo.size,
    source: "sponsors",
    sponsorSlug: s.slug,
  };
}

/** Kit id of a CRM contract name: the sponsor slug when the alias table maps it, otherwise "crm-<slug>". */
export function crmKitId(name: string, sponsors: readonly Sponsor[] = SPONSORS): string {
  const slug = CRM_SPONSOR_ALIASES[name];
  if (slug && sponsors.some((s) => s.slug === slug)) return slug;
  return `${CRM_ID_PREFIX}${slugify(name)}`;
}

/** A CRM row: name from the contract register (certain), logo only when the CRM carries an official file. */
export function subjectFromCrmRecord(r: CrmPartnerRecord): PartnerKitSubject {
  const name = r.name?.trim() || null;
  return {
    id: r.id.startsWith(CRM_ID_PREFIX) ? r.id : `${CRM_ID_PREFIX}${slugify(r.id)}`,
    name,
    nameVerified: !!name,
    logoSrc: r.logoSrc && isSafeLogoSrc(r.logoSrc) ? r.logoSrc : null,
    logoSize: null,
    source: "crm",
    sponsorSlug: null,
  };
}

/** Only same-origin media paths or device object URLs may be drawn (canvas export stays untainted). */
export function isSafeLogoSrc(src: string): boolean {
  return /^\/media\/[A-Za-z0-9_./-]+\.(webp|png|jpe?g|svg)$/i.test(src) || /^blob:/.test(src);
}

/** Prospect from a logo picked on this device: nothing leaves the browser; the typed name is the staff's own. */
export function localSubject(name: string, objectUrl: string | null): PartnerKitSubject {
  const n = name.trim().slice(0, 80) || null;
  return {
    id: LOCAL_SUBJECT_ID,
    name: n,
    nameVerified: !!n,
    logoSrc: objectUrl && /^blob:/.test(objectUrl) ? objectUrl : null,
    logoSize: null,
    source: "local",
    sponsorSlug: null,
  };
}

/** Same subject with a device-only logo in place of the registered one (better file received by e-mail, etc.). */
export function withLocalLogo(s: PartnerKitSubject, objectUrl: string | null): PartnerKitSubject {
  if (!objectUrl || !/^blob:/.test(objectUrl)) return s;
  return { ...s, logoSrc: objectUrl, logoSize: null };
}

export interface ResolveContext {
  sponsors?: readonly Sponsor[];
  /** Contract names of the CRM register (CRM_PIPELINE active + to renew). */
  crmNames?: readonly string[];
  /** Future CRM rows with id and official logo. */
  crmRecords?: readonly CrmPartnerRecord[];
}

export const crmPipelineNames = (): string[] => [...CRM_PIPELINE.active, ...CRM_PIPELINE.expiredToRenew];

/**
 * Subject of a kit route id. Order: season sponsor slug, CRM record id, CRM contract name. Unknown id -> null
 * (the page shows "partner non trovato", never a made-up subject).
 */
export function resolvePartnerSubject(id: string, ctx: ResolveContext = {}): PartnerKitSubject | null {
  const sponsors = ctx.sponsors ?? SPONSORS;
  const key = id.trim().toLowerCase();
  if (!key || key.length > 96) return null;
  const sponsor = sponsors.find((s) => s.slug === key);
  if (sponsor) return subjectFromSponsor(sponsor);
  if (!key.startsWith(CRM_ID_PREFIX)) return null;
  const record = (ctx.crmRecords ?? []).find((r) => subjectFromCrmRecord(r).id === key);
  if (record) return subjectFromCrmRecord(record);
  const name = (ctx.crmNames ?? crmPipelineNames()).find((n) => `${CRM_ID_PREFIX}${slugify(n)}` === key);
  if (name) return subjectFromCrmRecord({ id: key, name, logoSrc: null });
  return null;
}

/** True when the logo is a known low-resolution file (ask the partner for the vector/HD file). */
export function subjectLogoLowRes(s: Pick<PartnerKitSubject, "logoSize">): boolean {
  return !!s.logoSize && isLowRes({ src: "", w: s.logoSize.w, h: s.logoSize.h, ...(s.logoSize.sourceWidth ? { sourceWidth: s.logoSize.sourceWidth } : {}) });
}

/* ------------------------------------------------------------------ assets */

/** Official crest (never redrawn): 480x628 with alpha. */
export const KIT_CREST = { src: "/media/brand/logo-scd.png", w: 480, h: 628 } as const;

/** "Stemma in primo piano": the crest a little larger than the normal chest crest of the board. */
export const CREST_PROMINENCE = 1.3;

/** 12 s 9:16 LED spot of a season sponsor (720x1280, silent), with its poster. */
export function spotFor(slug: string | null, sponsors: readonly Sponsor[] = SPONSORS): { src: string; poster: string } | null {
  if (!slug || !sponsors.some((s) => s.slug === slug)) return null;
  return { src: `/media/sponsor/spot/${slug}.mp4`, poster: `/media/sponsor/spot/poster/${slug}.webp` };
}

/** A zone on a base image, in percent of the image: centre and maximum box. */
export interface Zone {
  cx: number;
  cy: number;
  maxW: number;
  maxH: number;
}

export type KitId = "home" | "away" | "orange" | "goalkeeper";

export interface KitBase {
  id: KitId | "sky";
  label: string;
  src: string;
  w: number;
  h: number;
  sponsor: Zone;
  /** Chest crest position (percent of the image, h = crest height). Absent on Sky: his kit already has the crest. */
  crest?: { cx: number; cy: number; h: number };
  /** White patch behind the logo on coloured kits, so any logo reads (white kits need none). */
  plate: boolean;
}

/**
 * Kit panels cropped from the club identity board (Direzione upload 13/10/2026, board 05448a4a) and Sky in white
 * match kit with the ATV chest logo removed (crest untouched). Anchors measured on the files (anchors.json).
 */
export const KIT_BASES: readonly KitBase[] = [
  { id: "home", label: "Home", src: "/media/sponsor/kit/kit-home.webp", w: 680, h: 770, sponsor: { cx: 42.65, cy: 30.65, maxW: 29.41, maxH: 7.79 }, crest: { cx: 54.41, cy: 20.26, h: 7.79 }, plate: false },
  { id: "away", label: "Away", src: "/media/sponsor/kit/kit-away.webp", w: 700, h: 770, sponsor: { cx: 48.0, cy: 30.65, maxW: 28.57, maxH: 7.79 }, crest: { cx: 60.57, cy: 20.26, h: 7.79 }, plate: true },
  { id: "orange", label: "Orange", src: "/media/sponsor/kit/kit-orange.webp", w: 720, h: 730, sponsor: { cx: 46.67, cy: 28.77, maxW: 27.78, maxH: 8.22 }, crest: { cx: 58.33, cy: 17.81, h: 8.22 }, plate: true },
  { id: "goalkeeper", label: "Portiere", src: "/media/sponsor/kit/kit-goalkeeper.webp", w: 760, h: 740, sponsor: { cx: 43.42, cy: 27.03, maxW: 26.32, maxH: 8.11 }, crest: { cx: 53.95, cy: 17.03, h: 8.11 }, plate: true },
];

export const SKY_BASE: KitBase = {
  id: "sky",
  label: "Sky",
  src: "/media/sponsor/kit/sky-partner-base.webp",
  w: 447,
  h: 900,
  sponsor: { cx: 45.86, cy: 40.0, maxW: 33.56, maxH: 6.22 },
  plate: false,
};

export const PROPOSAL_LABEL = "Proposta · non pubblicare senza approvazione";

/* ---------------------------------------------------------------- geometry */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PercentRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const r4 = (v: number) => Math.round(v * 10_000) / 10_000;

/** Zone rectangle in image pixels. */
export function zonePx(zone: Zone, img: { w: number; h: number }): Rect {
  const w = (zone.maxW / 100) * img.w;
  const h = (zone.maxH / 100) * img.h;
  return { x: (zone.cx / 100) * img.w - w / 2, y: (zone.cy / 100) * img.h - h / 2, w, h };
}

/** Largest rectangle of the given aspect (w/h) centred inside a box (object-fit: contain). */
export function fitContain(aspect: number, box: Rect): Rect {
  if (!(aspect > 0) || !(box.w > 0) || !(box.h > 0)) return { x: box.x + box.w / 2, y: box.y + box.h / 2, w: 0, h: 0 };
  let w = box.w;
  let h = w / aspect;
  if (h > box.h) {
    h = box.h;
    w = h * aspect;
  }
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}

/** Plate padding as a share of the zone height. */
export const PLATE_PAD = 0.14;

/**
 * Logo (and optional white plate) inside a zone, in image pixels: the logo is contained in the zone (minus the plate
 * padding when there is a plate) and centred; the plate hugs the logo.
 */
export function logoPlacement(aspect: number, zone: Rect, plate: boolean): { logo: Rect; plate: Rect | null } {
  if (!plate) return { logo: fitContain(aspect, zone), plate: null };
  const pad = zone.h * PLATE_PAD;
  const inner: Rect = { x: zone.x + pad, y: zone.y + pad, w: Math.max(0, zone.w - 2 * pad), h: Math.max(0, zone.h - 2 * pad) };
  const logo = fitContain(aspect, inner);
  return { logo, plate: { x: logo.x - pad, y: logo.y - pad, w: logo.w + 2 * pad, h: logo.h + 2 * pad } };
}

/** Pixel rectangle -> CSS percent of the image (absolute positioning over the base). */
export function toPercent(r: Rect, img: { w: number; h: number }): PercentRect {
  return { left: r4((r.x / img.w) * 100), top: r4((r.y / img.h) * 100), width: r4((r.w / img.w) * 100), height: r4((r.h / img.h) * 100) };
}

/** Official crest rectangle on a kit, enlarged by CREST_PROMINENCE around the board's crest centre. */
export function crestPx(base: Pick<KitBase, "w" | "h" | "crest">, prominence: number = CREST_PROMINENCE): Rect | null {
  if (!base.crest) return null;
  const h = (base.crest.h / 100) * base.h * prominence;
  const w = h * (KIT_CREST.w / KIT_CREST.h);
  return { x: (base.crest.cx / 100) * base.w - w / 2, y: (base.crest.cy / 100) * base.h - h / 2, w, h };
}

export const percentStyle = (p: PercentRect) => ({
  left: `${p.left}%`,
  top: `${p.top}%`,
  width: `${p.width}%`,
  height: `${p.height}%`,
});

/* ---------------------------------------------------------------- calendar */

export type CalendarFormat = "4x5" | "9x16";

export const CALENDAR_FORMATS: Readonly<Record<CalendarFormat, { w: number; h: number; rows: number; label: string }>> = {
  "4x5": { w: 1080, h: 1350, rows: 7, label: "Post 1080×1350" },
  "9x16": { w: 1080, h: 1920, rows: 11, label: "Storia 1080×1920" },
};

export interface CalendarRow {
  id: string;
  date: string;
  time: string;
  /** Team label of the master ("U15", "Prima", "Esordienti 2014"). */
  team: string;
  opponent: string;
  homeAway: "CASA" | "FUORI" | "";
  venue: string;
  confirmed: boolean;
}

/** Same allowlist as the anonymous calendar (public-access.ts isFixture): only games, never trainings or notes. */
const GAME_TYPE_RE = /^(CAMPIONATO|COPPA|TORNEO|AMICHEVOLE|GARA|PARTITA|PLAY[ -]?OFF|PLAY[ -]?OUT|RECUPERO|FINALE)\b/i;

const addDaysIso = (iso: string, n: number): string => {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n, 12)).toISOString().slice(0, 10);
};

/** Short team label from the master label (same rules as the home: universe.ts teamFromGroup). */
export function teamShort(label: string): string {
  if (/prima squadra/i.test(label)) return "Prima";
  if (/juniores/i.test(label)) return "U19";
  const u = label.match(/\bU(\d{2})\b/);
  if (u) return `U${u[1]}`;
  const year = label.match(/(?<!\d)20[0-2]\d(?!\d)/);
  if (/esordienti/i.test(label)) return year ? `Esordienti ${year[0]}` : "Esordienti";
  if (/pulcini/i.test(label)) return "Pulcini";
  if (/primi calci/i.test(label)) return "Primi Calci";
  if (/piccoli amici/i.test(label)) return "Piccoli Amici";
  return label.split("·")[0]!.trim();
}

/**
 * Games of the next seven days (today included, not yet finished at `nowHHMM` when today), every team, home and
 * away, in time order. Withdrawn/cancelled entries and non-games are left out.
 */
export function weekCalendarRows(
  events: readonly PublicEvent[],
  groups: readonly Pick<PublicGroup, "id" | "label">[],
  today: string,
  nowHHMM = "00:00",
): CalendarRow[] {
  const last = addDaysIso(today, 6);
  return events
    .filter((e) => GAME_TYPE_RE.test(e.type.trim()) && !/RITIRAT|ANNULLAT|CANCEL|WITHDRAWN/i.test(e.status ?? ""))
    .filter((e) => e.date >= today && e.date <= last && (e.date > today || !e.time || e.time >= nowHHMM))
    .map((e) => {
      const g = groups.find((x) => x.id === e.group);
      return {
        id: e.id,
        date: e.date,
        time: e.time,
        team: teamShort(g?.label ?? e.category),
        opponent: e.opponent.trim() || "Avversario da definire",
        homeAway: e.homeAway === "CASA" || e.homeAway === "FUORI" ? e.homeAway : "",
        venue: e.venue,
        confirmed: e.timeConfirmed && e.venueConfirmed,
      } satisfies CalendarRow;
    })
    .sort((a, b) => (a.date + (a.time || "99:99")).localeCompare(b.date + (b.time || "99:99")));
}

/** Rows that fit a format and how many are left out ("+N altre gare sul calendario"). */
export function rowsForFormat(rows: readonly CalendarRow[], format: CalendarFormat): { shown: CalendarRow[]; more: number } {
  const max = CALENDAR_FORMATS[format].rows;
  if (rows.length <= max) return { shown: [...rows], more: 0 };
  return { shown: rows.slice(0, max - 1), more: rows.length - (max - 1) };
}

/** "13 – 19 ottobre 2026" for the card header. */
export function weekRangeLabel(today: string): string {
  const last = addDaysIso(today, 6);
  const f = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", ...o }).format(new Date(`${iso}T12:00:00Z`));
  const sameMonth = today.slice(0, 7) === last.slice(0, 7);
  return sameMonth
    ? `${f(today, { day: "numeric" })} – ${f(last, { day: "numeric", month: "long", year: "numeric" })}`
    : `${f(today, { day: "numeric", month: "long" })} – ${f(last, { day: "numeric", month: "long", year: "numeric" })}`;
}

/** "SAB 18 OTT" chip of a day. */
export function dayChipLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", ...o }).format(d).replace(".", "");
  return `${f({ weekday: "short" })} ${f({ day: "numeric" })} ${f({ month: "short" })}`.toUpperCase();
}

/* -------------------------------------------------------------- live stream */

/** Live-stream frame (1920x1080): the score bug area stays free; the partner bar sits at the bottom. */
export const LIVE_FRAME = { w: 1920, h: 1080 } as const;
export const LIVE_SCORE_SAFE: Rect = { x: 48, y: 40, w: 560, h: 120 };
export const LIVE_BAR: Rect = { x: 0, y: 948, w: 1920, h: 132 };
export const LIVE_PARTNER_PLATE: Rect = { x: 1280, y: 966, w: 592, h: 96 };

/* ------------------------------------------------------------------ export */

export type ExportKey = "ledwall" | "sky" | KitId | "calendar-4x5" | "calendar-9x16" | "live";

export interface ExportItem {
  key: ExportKey;
  label: string;
  filename: string;
  w: number;
  h: number;
}

/** Scale of the kit/Sky exports: the bases are ~700 px wide, the logo is drawn sharp from its own file. */
export const KIT_EXPORT_SCALE = 2;

/** Every image of the kit with its file name (same order as the page). */
export function exportPlan(s: Pick<PartnerKitSubject, "id" | "name" | "source">): ExportItem[] {
  const stem = s.source === "local" ? slugify(s.name ?? "") || "nuovo-partner" : slugify(s.id) || "partner";
  const base = `scd-kit-${stem}`;
  return [
    { key: "ledwall", label: "Ledwall a bordo campo", filename: `${base}-ledwall.png`, w: 1920, h: 1080 },
    { key: "sky", label: "Sky con il logo (proposta)", filename: `${base}-sky-proposta.png`, w: SKY_BASE.w * KIT_EXPORT_SCALE, h: SKY_BASE.h * KIT_EXPORT_SCALE },
    ...KIT_BASES.map((k) => ({ key: k.id as ExportKey, label: `Divisa ${k.label} (proposta)`, filename: `${base}-divisa-${k.id}.png`, w: k.w * KIT_EXPORT_SCALE, h: k.h * KIT_EXPORT_SCALE })),
    { key: "calendar-4x5", label: "Calendario · post 1080×1350", filename: `${base}-calendario-1080x1350.png`, w: 1080, h: 1350 },
    { key: "calendar-9x16", label: "Calendario · storia 1080×1920", filename: `${base}-calendario-1080x1920.png`, w: 1080, h: 1920 },
    { key: "live", label: "Diretta · barra partner 1920×1080", filename: `${base}-diretta-1920x1080.png`, w: 1920, h: 1080 },
  ];
}

/** What the partner receives, for the printable offer summary. No amounts (never invented). */
export function offerItems(s: Pick<PartnerKitSubject, "sponsorSlug">): string[] {
  const items = [
    "Logo sul ledwall a bordo campo, in rotazione con gli altri partner (4 secondi per passaggio, spazio del club ogni 6 partner).",
    "Logo sulla divisa da gara di Sky, la mascotte del club (proposta interna da approvare).",
    "Logo sulle divise Home, Away, Orange e Portiere, con lo stemma ufficiale in primo piano (proposta).",
    "Calendario settimanale delle gare per i social, nei formati post 1080×1350 e storia 1080×1920, con la barra \"Calendario offerto da\".",
    "Barra del partner nelle dirette delle gare (1920×1080), senza coprire il punteggio.",
  ];
  if (spotFor(s.sponsorSlug)) items.splice(1, 0, "Spot verticale 9:16 di 12 secondi per il ledwall e i social.");
  return items;
}
