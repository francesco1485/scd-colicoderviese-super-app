/**
 * Request machine ("macchina delle richieste", UD-154). Pure rules shared by the server functions, the pages and the
 * tests; the database (staged migration r133, supabase/migrations/20261015_r133_requests_machine.sql) enforces the
 * same rules on its own: nothing here grants anything.
 *
 * Flow of a friendly match (AMICHEVOLE, the only kind active today; TORNEO, PULMINO, CAMPO, VISITA reuse the same
 * table later):
 *   message to the Segreteria (read in the browser, never stored) -> draft (BOZZA) -> sent to the person who confirms
 *   (DA_CONFERMARE, 15 days, never after the match; any edit sends it back to BOZZA) -> CONFERMATA (internal calendar
 *   row, Segreteria tasks: copy into the Master Calendario, the only public source, and federal form) | RIFIUTATA |
 *   SCADUTA | ANNULLATA (also after confirmation: the internal row becomes CANCELLED).
 *
 * Engines: TEMPO (Segreteria and teams stop chasing each other by phone; the form is prefilled) and PERSONE
 * (families see the confirmed friendly in the calendar). Measure: requests per month, hours from draft to
 * confirmation, share expired, minutes per federal form.
 */
import { z } from "zod";

import { CLUB_PROFILE } from "./club-profile";
import { romeParts, romeToIso } from "./home-week";
import { KNOWN_POSITIONS } from "./session";

/* ------------------------------------------------------------------ vocabulary */

export const REQUEST_KINDS = ["AMICHEVOLE"] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];

export const REQUEST_CHANNELS = ["WHATSAPP", "EMAIL", "APP", "SEGRETERIA"] as const;
export type RequestChannel = (typeof REQUEST_CHANNELS)[number];
export const CHANNEL_LABEL: Readonly<Record<RequestChannel, string>> = {
  WHATSAPP: "WhatsApp",
  EMAIL: "E-mail",
  APP: "App",
  SEGRETERIA: "Segreteria",
};

export const REQUEST_STATUSES = ["BOZZA", "DA_CONFERMARE", "CONFERMATA", "RIFIUTATA", "SCADUTA", "ANNULLATA"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export const STATUS_LABEL: Readonly<Record<RequestStatus, string>> = {
  BOZZA: "Bozza",
  DA_CONFERMARE: "Da confermare",
  CONFERMATA: "Confermata",
  RIFIUTATA: "Non possibile",
  SCADUTA: "Scaduta",
  ANNULLATA: "Annullata",
};

export const FORM_STATUSES = ["DA_PREPARARE", "PRONTO", "FIRMATO", "INVIATO"] as const;
export type FormStatus = (typeof FORM_STATUSES)[number];
export const FORM_STATUS_LABEL: Readonly<Record<FormStatus, string>> = {
  DA_PREPARARE: "Modulo da preparare",
  PRONTO: "Modulo pronto da firmare",
  FIRMATO: "Modulo firmato",
  INVIATO: "Modulo inviato",
};

export const MATCH_SCOPES = ["LOCALE", "PROVINCIALE", "REGIONALE", "NAZIONALE", "INTERNAZIONALE", "ESTERO"] as const;
export type MatchScope = (typeof MATCH_SCOPES)[number];
export const SCOPE_LABEL: Readonly<Record<MatchScope, string>> = {
  LOCALE: "Locale",
  PROVINCIALE: "Provinciale",
  REGIONALE: "Regionale",
  NAZIONALE: "Nazionale (squadra di un'altra regione)",
  INTERNAZIONALE: "Internazionale in Italia (squadra estera)",
  ESTERO: "All'estero",
};

export const REQUEST_DAYS = 15;

/** Known facilities of the club: the only venues a request can carry (mirror of the r133 check). Away = null. */
export const VENUES = ["Colico · Campo 1", "Colico · Campo 2", "Colico", "Dervio"] as const;
export type Venue = (typeof VENUES)[number];
export const isVenue = (v: string | null | undefined): v is Venue => !!v && (VENUES as readonly string[]).includes(v);

/** Calendar groups that can ask for a friendly, with the label of the calendar master. */
export const REQUEST_TEAMS: ReadonlyArray<{ key: string; label: string }> = [
  { key: "prima", label: "Prima Squadra" },
  { key: "u19", label: "Juniores U19" },
  { key: "u16", label: "U16 · 2011" },
  { key: "u15", label: "U15 · Giovanissimi" },
  { key: "2014", label: "Esordienti 2014" },
  { key: "2015", label: "Esordienti 2015" },
  { key: "esordienti", label: "Esordienti (annata da indicare)" },
  { key: "pulcini", label: "Pulcini" },
  { key: "primicalci", label: "Primi Calci" },
  { key: "piccoli", label: "Piccoli Amici" },
];
export const teamLabel = (key: string | null | undefined) =>
  (key && REQUEST_TEAMS.find((t) => t.key === key)?.label) || "Squadra da indicare";

/* ------------------------------------------------------------------ who confirms (Francesco 15/10/2026 15:17) */

export interface ConfirmerRule {
  id: string;
  /** Plain Italian title of who confirms. */
  label: string;
  /** Registry position id that confirms. */
  position: string;
  /** Birth years covered (season 2026/27), null when the group is not by birth year. */
  birthYears: readonly [number, number] | null;
  groups: readonly string[];
}

/**
 * ONE place for the mapping "birth-year group -> who confirms" (UD-154). Francesco wrote "2015/2013 - 2011" for the
 * Direttore Sportivo Agonistica; 2015 is already under the Attivita di Base, so agonistica = 2011-2013.
 * Mirror: scd_request_group_confirmers() in r133 (a test keeps them equal). A position that is not in the registry
 * (session.ts KNOWN_POSITIONS) is NOT used by the database: for those groups only the Direzione confirms until
 * Francesco adds the position.
 */
export const REQUEST_CONFIRMERS: readonly ConfirmerRule[] = [
  {
    id: "attivita-base",
    label: "Responsabile Attività di Base",
    position: "responsabile-attivita-base",
    birthYears: [2014, 2021],
    groups: ["2014", "2015", "esordienti", "pulcini", "primicalci", "piccoli"],
  },
  {
    id: "ds-agonistica",
    label: "Direttore Sportivo Agonistica",
    position: "direttore-sportivo-agonistica",
    birthYears: [2011, 2013],
    groups: ["u16", "u15"],
  },
  {
    id: "ds-generale",
    label: "Direttore Sportivo Generale",
    position: "direttore-sportivo-generale",
    birthYears: null,
    groups: ["prima", "u19"],
  },
];

/** Who sees every request and is told of every step in the app (never by e-mail or message). */
export const REQUEST_WATCHERS: readonly string[] = ["direttore-generale", "coordinatore-attivita-sportiva"];

/** Positions that always see everything and may confirm on behalf (Direzione). */
export const REQUEST_DIRECTION: readonly string[] = ["direzione", "presidente"];

export function positionExists(position: string): boolean {
  return KNOWN_POSITIONS.includes(position);
}

export function confirmerFor(teamKey: string | null | undefined): ConfirmerRule | null {
  if (!teamKey) return null;
  return REQUEST_CONFIRMERS.find((r) => r.groups.includes(teamKey)) ?? null;
}

/** Positions the database accepts as confirmers of a group (only registry positions), null for unknown groups. */
export function dbConfirmerPositions(teamKey: string): string[] | null {
  const rule = confirmerFor(teamKey);
  if (!rule) return null;
  return positionExists(rule.position) ? [rule.position] : [];
}

/** Confirmer positions that do not exist yet (to be created by Francesco). */
export function missingConfirmerPositions(): ConfirmerRule[] {
  return REQUEST_CONFIRMERS.filter((r) => !positionExists(r.position));
}

/** Plain line "Conferma: …" for a group, honest when the position does not exist yet. */
export function confirmerLine(teamKey: string | null | undefined): string {
  const rule = confirmerFor(teamKey);
  if (!rule) return "Conferma: squadra da indicare";
  return positionExists(rule.position)
    ? `Conferma: ${rule.label} (o la Direzione)`
    : `Conferma: Direzione (ruolo ${rule.label} non ancora creato)`;
}

/** UI hint only (the database decides): may this session confirm requests of this group? */
export function mayConfirm(roles: ReadonlySet<string>, teamKey: string | null | undefined): boolean {
  const rule = confirmerFor(teamKey);
  if (!rule) return false;
  if (REQUEST_DIRECTION.some((p) => roles.has(p))) return true;
  return positionExists(rule.position) && roles.has(rule.position);
}

/** UI hint only: sees the whole board (Segreteria, Direzione, Direttore Generale, Coordinatore). */
export function seesEverything(roles: ReadonlySet<string>): boolean {
  return ["segreteria", ...REQUEST_DIRECTION, ...REQUEST_WATCHERS].some((p) => roles.has(p));
}

/** UI hint only: has a part in the machine (board or confirmation of at least one group). */
export function hasRequestRole(roles: ReadonlySet<string>): boolean {
  return seesEverything(roles) || REQUEST_CONFIRMERS.some((r) => positionExists(r.position) && roles.has(r.position));
}

/* ------------------------------------------------------------------ status rules (mirror of r133) */

export type RequestAction = "INVIA" | "MODIFICA" | "CONFERMA" | "RIFIUTA" | "ANNULLA" | "SCADE";

const TRANSITIONS: Readonly<Record<RequestAction, { from: readonly RequestStatus[]; to: RequestStatus }>> = {
  MODIFICA: { from: ["BOZZA", "DA_CONFERMARE"], to: "BOZZA" },
  INVIA: { from: ["BOZZA"], to: "DA_CONFERMARE" },
  CONFERMA: { from: ["DA_CONFERMARE"], to: "CONFERMATA" },
  RIFIUTA: { from: ["DA_CONFERMARE"], to: "RIFIUTATA" },
  ANNULLA: { from: ["BOZZA", "DA_CONFERMARE", "CONFERMATA"], to: "ANNULLATA" },
  SCADE: { from: ["DA_CONFERMARE"], to: "SCADUTA" },
};

/** Status after an action, or null when not allowed. MODIFICA always returns to BOZZA (a waiting request must be sent again). */
export function nextStatus(from: RequestStatus, action: RequestAction): RequestStatus | null {
  const t = TRANSITIONS[action];
  if (!t.from.includes(from)) return null;
  return t.to;
}

export function isOpen(status: RequestStatus): boolean {
  return status === "BOZZA" || status === "DA_CONFERMARE";
}

/** Federal form moves only forward, one step at a time. */
export function nextFormStatus(current: FormStatus | null): FormStatus | null {
  if (!current) return null;
  const i = FORM_STATUSES.indexOf(current);
  return i >= 0 && i < FORM_STATUSES.length - 1 ? FORM_STATUSES[i + 1]! : null;
}

/** Deadline to confirm when the request is sent: 15 days, never later than the match itself. */
export function confirmationExpiry(sentAtMs: number, matchStartsAtMs: number): number {
  return Math.min(sentAtMs + REQUEST_DAYS * 86_400_000, matchStartsAtMs);
}

/** Whole days left (ceil), 0 when expired; null when unknown. */
export function daysLeft(expiresAt: string | null, nowMs: number): number | null {
  if (!expiresAt) return null;
  const t = Date.parse(expiresAt);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.ceil((t - nowMs) / 86_400_000));
}

export function daysLeftLabel(days: number | null): string {
  if (days === null) return "termine non noto";
  if (days === 0) return "scade oggi";
  if (days === 1) return "1 giorno";
  return `${days} giorni`;
}

/* ------------------------------------------------------------------ privacy of free text (mirror of r133) */

/** Same patterns as scd_request_redact in r133 (a test keeps them equal). */
export const EMAIL_PATTERN = "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}";
export const PHONE_PATTERN = "(\\+|00)?[0-9]([ -]?[0-9]){8,}";

/** Phone numbers and e-mail addresses become [telefono] / [email] before anything is stored. */
export function redactContacts(text: string): string;
export function redactContacts(text: string | null | undefined): string | null;
export function redactContacts(text: string | null | undefined): string | null {
  if (text === null || text === undefined) return null;
  return text.replace(new RegExp(EMAIL_PATTERN, "g"), "[email]").replace(new RegExp(PHONE_PATTERN, "g"), "[telefono]");
}

export const FREE_TEXT_HINT = "Non incollare nomi di ragazzi, telefoni o e-mail. Il messaggio non viene salvato: restano solo i dati della bozza.";

/** Location of the internal calendar row (mirror of scd_request_decide): the known facility, or "Trasferta" + city. */
export function eventLocation(venue: string | null, homeAway: "CASA" | "FUORI" | null, opponentCity: string | null): string | null {
  if (homeAway === "FUORI") return opponentCity ? `Trasferta · ${opponentCity}` : "Trasferta";
  return isVenue(venue) ? venue : null;
}

/* ------------------------------------------------------------------ drafts (mirror of scd_request_clean) */

export interface DraftInput {
  teamKey?: string | null | undefined;
  date?: string | null | undefined;
  time?: string | null | undefined;
  venue?: string | null | undefined;
  homeAway?: "CASA" | "FUORI" | null | undefined;
  scope?: MatchScope | null | undefined;
  opponentText?: string | null | undefined;
  opponentClubId?: string | null | undefined;
  note?: string | null | undefined;
}

export interface CleanDraft {
  teamKey: string | null;
  startsAt: string | null;
  venue: string | null;
  homeAway: "CASA" | "FUORI" | null;
  scope: MatchScope | null;
  opponentText: string | null;
  opponentClubId: string | null;
  note: string | null;
}

const trimOrNull = (v: string | null | undefined, max: number) => {
  const s = (v ?? "").replace(/\s+/g, " ").trim();
  return s ? s.slice(0, max) : null;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validates a draft; `errors` are field -> plain Italian message. Date and time are Europe/Rome. */
export function validateDraft(d: DraftInput, nowMs: number): { ok: true; value: CleanDraft } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const teamKey = trimOrNull(d.teamKey, 20);
  if (teamKey && !confirmerFor(teamKey)) errors["teamKey"] = "Squadra non valida.";
  const date = trimOrNull(d.date, 10);
  const time = trimOrNull(d.time, 5);
  let startsAt: string | null = null;
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) errors["date"] = "Data non valida.";
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) errors["time"] = "Orario non valido (es. 15:30).";
  if (date && !time && !errors["date"]) errors["time"] = "Serve anche l'orario.";
  if (time && !date && !errors["time"]) errors["date"] = "Serve anche la data.";
  if (date && time && !errors["date"] && !errors["time"]) {
    startsAt = romeToIso(date, time);
    const t = Date.parse(startsAt);
    if (t < nowMs) errors["date"] = "La data è già passata.";
    else if (t > nowMs + 400 * 86_400_000) errors["date"] = "Data troppo lontana.";
  }
  const scope = d.scope ?? null;
  if (scope && !MATCH_SCOPES.includes(scope)) errors["scope"] = "Tipo di gara non valido.";
  if (teamKey === "piccoli" && scope && ["NAZIONALE", "INTERNAZIONALE", "ESTERO"].includes(scope))
    errors["scope"] = "Piccoli Amici: amichevoli nazionali e internazionali non ammesse (CU n.5 SGS).";
  const opponentClubId = trimOrNull(d.opponentClubId, 36);
  if (opponentClubId && !UUID.test(opponentClubId)) errors["opponentClubId"] = "Società non valida.";
  if (d.homeAway && d.homeAway !== "CASA" && d.homeAway !== "FUORI") errors["homeAway"] = "Casa o fuori.";
  const venue = trimOrNull(d.venue, 40);
  if (venue && d.homeAway !== "FUORI" && !isVenue(venue)) errors["venue"] = "Scegli un campo del club (o Fuori casa).";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      teamKey,
      startsAt,
      venue: d.homeAway === "FUORI" ? null : venue,
      homeAway: d.homeAway ?? null,
      scope,
      opponentText: trimOrNull(d.opponentText, 120),
      opponentClubId,
      note: trimOrNull(redactContacts(d.note), 300),
    },
  };
}

/** What a draft still misses before it can be sent to the person who confirms. */
/**
 * Groups that cannot be sent nor confirmed without the birth year: "esordienti" alone maps to no team of the Master
 * Calendario (tools/sync/calendar_public_payload.py CATEGORY_RULES needs 2014 or 2015). Mirror of r133.
 */
export const NEEDS_BIRTH_YEAR: readonly string[] = ["esordienti"];

/** What a draft still misses before it can be sent to the person who confirms (mirror of scd_request_send). */
export function missingToSend(r: Pick<RequestRow, "teamKey" | "startsAt" | "opponentText" | "club" | "homeAway">): string[] {
  const out: string[] = [];
  if (!r.teamKey) out.push("squadra");
  else if (NEEDS_BIRTH_YEAR.includes(r.teamKey)) out.push("annata Esordienti (2014 o 2015)");
  if (!r.startsAt) out.push("data e ora");
  if (!r.homeAway) out.push("casa o fuori");
  if (!r.opponentText && !r.club) out.push("avversaria");
  return out;
}

/* ------------------------------------------------------------------ rows from the database */

const clubSchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  figcMatricola: z.string().nullable().optional(),
  crestKey: z.string().nullable().optional(),
});
export type ClubRow = { id: string; name: string; city: string | null; province: string | null; figcMatricola: string | null; crestKey: string | null };

const rowSchema = z.object({
  id: z.string(),
  kind: z.enum(REQUEST_KINDS),
  channel: z.enum(REQUEST_CHANNELS),
  teamKey: z.string().nullable().optional(),
  startsAt: z.string().nullable().optional(),
  venue: z.string().nullable().optional(),
  homeAway: z.enum(["CASA", "FUORI"]).nullable().optional(),
  scope: z.enum(MATCH_SCOPES).nullable().optional(),
  note: z.string().nullable().optional(),
  opponentText: z.string().nullable().optional(),
  status: z.enum(REQUEST_STATUSES),
  expiresAt: z.string().nullable().optional(),
  sentAt: z.string().nullable().optional(),
  confirmedAt: z.string().nullable().optional(),
  decisionNote: z.string().nullable().optional(),
  eventId: z.string().nullable().optional(),
  formStatus: z.enum(FORM_STATUSES).nullable().optional(),
  calendarCopiedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  club: clubSchema.nullable().optional(),
  organization: z.string().nullable().optional(),
});

export interface RequestRow {
  id: string;
  kind: RequestKind;
  channel: RequestChannel;
  teamKey: string | null;
  startsAt: string | null;
  venue: string | null;
  homeAway: "CASA" | "FUORI" | null;
  scope: MatchScope | null;
  note: string | null;
  opponentText: string | null;
  status: RequestStatus;
  expiresAt: string | null;
  sentAt: string | null;
  confirmedAt: string | null;
  decisionNote: string | null;
  eventId: string | null;
  formStatus: FormStatus | null;
  calendarCopiedAt: string | null;
  createdAt: string;
  club: ClubRow | null;
}

const toClub = (c: z.infer<typeof clubSchema> | null | undefined): ClubRow | null =>
  c ? { id: c.id, name: c.name, city: c.city ?? null, province: c.province ?? null, figcMatricola: c.figcMatricola ?? null, crestKey: c.crestKey ?? null } : null;

export function toRequestRow(raw: unknown): RequestRow | null {
  const p = rowSchema.safeParse(raw);
  if (!p.success) return null;
  const r = p.data;
  return {
    id: r.id,
    kind: r.kind,
    channel: r.channel,
    teamKey: r.teamKey ?? null,
    startsAt: r.startsAt ?? null,
    venue: r.venue ?? null,
    homeAway: r.homeAway ?? null,
    scope: r.scope ?? null,
    note: r.note ?? null,
    opponentText: r.opponentText ?? null,
    status: r.status,
    expiresAt: r.expiresAt ?? null,
    sentAt: r.sentAt ?? null,
    confirmedAt: r.confirmedAt ?? null,
    decisionNote: r.decisionNote ?? null,
    eventId: r.eventId ?? null,
    formStatus: r.formStatus ?? null,
    calendarCopiedAt: r.calendarCopiedAt ?? null,
    createdAt: r.createdAt,
    club: toClub(r.club),
  };
}

/** Rows of a list function; malformed rows are dropped, never guessed. */
export function parseRequestRows(raw: unknown): RequestRow[] {
  return Array.isArray(raw) ? raw.map(toRequestRow).filter((r): r is RequestRow => r !== null) : [];
}

export function parseClubRows(raw: unknown): ClubRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((c) => clubSchema.safeParse(c)).filter((p) => p.success).map((p) => toClub(p.data)!);
}

export interface RequestNotice {
  at: string;
  action: string;
  note: string | null;
  requestId: string;
  teamKey: string | null;
  startsAt: string | null;
  status: RequestStatus;
  opponent: string | null;
}

const noticeSchema = z.object({
  at: z.string(),
  action: z.string(),
  note: z.string().nullable().optional(),
  requestId: z.string(),
  teamKey: z.string().nullable().optional(),
  startsAt: z.string().nullable().optional(),
  status: z.enum(REQUEST_STATUSES),
  opponent: z.string().nullable().optional(),
});

export function parseNotices(raw: unknown): RequestNotice[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((n) => noticeSchema.safeParse(n))
    .filter((p) => p.success)
    .map(({ data: n }) => ({ at: n.at, action: n.action, note: n.note ?? null, requestId: n.requestId, teamKey: n.teamKey ?? null, startsAt: n.startsAt ?? null, status: n.status, opponent: n.opponent ?? null }));
}

export const NOTICE_LABEL: Readonly<Record<string, string>> = {
  CREATA: "Bozza creata",
  MODIFICATA: "Richiesta modificata",
  INVIATA: "Inviata per la conferma",
  CONFERMATA: "Confermata",
  RIFIUTATA: "Non possibile",
  SCADUTA: "Scaduta senza conferma",
  ANNULLATA: "Annullata",
  MODULO: "Modulo federale aggiornato",
  CALENDARIO: "Copiata nel Master Calendario",
};

/** Plain error of a database code. */
export function requestError(code: string | null | undefined): string {
  switch (code) {
    case "forbidden":
      return "Non hai il ruolo per questa operazione.";
    case "team":
      return "Squadra non valida.";
    case "date":
      return "Data mancante o già passata.";
    case "club":
      return "Scegli la società avversaria dalla ricerca o aggiungila come nuova società.";
    case "incomplete":
      return "Mancano squadra, data e ora o avversaria.";
    case "expired":
      return "Il termine per confermare è scaduto: la Segreteria può preparare una nuova richiesta.";
    case "state":
      return "La richiesta è già stata gestita: aggiorna la pagina.";
    case "scope":
      return "Piccoli Amici: amichevoli nazionali e internazionali non ammesse.";
    case "team_year":
      return "Esordienti: indica l'annata (2014 o 2015) prima di mandare o confermare.";
    case "venue":
      return "Scegli un campo del club (Colico Campo 1 o 2, Colico, Dervio) oppure Fuori casa.";
    default:
      return "Operazione non riuscita, riprova.";
  }
}

/** Italian date and time of an ISO instant, Europe/Rome ("sab 24/10 · 15:00"). */
export function whenLabel(iso: string | null): string {
  if (!iso) return "data da indicare";
  const p = romeParts(iso);
  if (!p) return "data da indicare";
  const [y, m, d] = p.date.split("-").map(Number) as [number, number, number];
  const wd = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${wd} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")} · ${p.time}`;
}

export function itDay(day: string | null): string {
  if (!day) return "—";
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

/* ------------------------------------------------------------------ federal notice (CU n.1 and n.5 SGS 2026/27) */

/** Easter Sunday (Gregorian, anonymous algorithm). */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const shiftDay = (day: string, n: number) => {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

/** Italian national holidays of a year (no local patron saints). */
export function italianHolidays(year: number): Set<string> {
  const fixed = ["01-01", "01-06", "04-25", "05-01", "06-02", "08-15", "11-01", "12-08", "12-25", "12-26"];
  const out = new Set(fixed.map((md) => `${year}-${md}`));
  out.add(shiftDay(easterSunday(year), 1)); // Lunedì dell'Angelo
  return out;
}

export function isWorkingDay(day: string): boolean {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return wd !== 0 && wd !== 6 && !italianHolidays(y).has(day);
}

/** The working day that comes `n` working days before `day` (the match day itself is not counted). */
export function workingDaysBefore(day: string, n: number): string {
  let cur = day;
  let left = n;
  while (left > 0) {
    cur = shiftDay(cur, -1);
    if (isWorkingDay(cur)) left -= 1;
  }
  return cur;
}

export type NoticeCategory = "BASE" | "AGONISTICA" | "LND" | "UNKNOWN";

export function noticeCategory(teamKey: string | null | undefined): NoticeCategory {
  if (!teamKey) return "UNKNOWN";
  if (["2014", "2015", "esordienti", "pulcini", "primicalci", "piccoli"].includes(teamKey)) return "BASE";
  if (["u16", "u15"].includes(teamKey)) return "AGONISTICA";
  if (["prima", "u19"].includes(teamKey)) return "LND";
  return "UNKNOWN";
}

export interface NoticeRule {
  /** Last day to send the complete request (YYYY-MM-DD), null when the rule is not known or not allowed. */
  deadline: string | null;
  workingDays: number | null;
  status: "VERIFIED" | "UNVERIFIED" | "NOT_ALLOWED";
  /** Plain line for the page. */
  text: string;
  source: string | null;
}

const SGS_SOURCE = "CU n.1 SGS 2026/27 par. 9.7 e CU n.5 SGS par. 9";

/**
 * Federal notice period of a friendly (catalogue of 15/10/2026, moduli-federali): SGS regional/provincial/local
 * 3 working days for Esordienti, Pulcini, Primi Calci (and Piccoli Amici) and 5 for Giovanissimi/Allievi; national
 * 5; international in Italy and abroad 20. A complete request is the authorization. LND friendlies (Prima Squadra,
 * Juniores) are UNVERIFIED (CU n.1 CR Lombardia not read): no deadline is invented.
 */
export function noticeDeadline(teamKey: string | null | undefined, scope: MatchScope | null | undefined, matchDate: string | null): NoticeRule {
  const cat = noticeCategory(teamKey);
  if (cat === "LND")
    return { deadline: null, workingDays: null, status: "UNVERIFIED", text: "Regole LND da verificare (CU n.1 CR Lombardia non ancora letto).", source: null };
  if (cat === "UNKNOWN") return { deadline: null, workingDays: null, status: "UNVERIFIED", text: "Squadra da indicare per calcolare il preavviso.", source: null };
  const sc = scope ?? "REGIONALE";
  if (teamKey === "piccoli" && ["NAZIONALE", "INTERNAZIONALE", "ESTERO"].includes(sc))
    return { deadline: null, workingDays: null, status: "NOT_ALLOWED", text: "Piccoli Amici: amichevoli nazionali e internazionali non ammesse.", source: "CU n.5 SGS 2026/27 par. 4" };
  const n = sc === "INTERNAZIONALE" || sc === "ESTERO" ? 20 : sc === "NAZIONALE" ? 5 : cat === "BASE" ? 3 : 5;
  const deadline = matchDate ? workingDaysBefore(matchDate, n) : null;
  return {
    deadline,
    workingDays: n,
    status: "VERIFIED",
    text: `Preavviso federale: almeno ${n} giorni lavorativi prima${deadline ? ` (entro ${itDay(deadline)})` : ""}.`,
    source: SGS_SOURCE,
  };
}

/** "Conferma entro": the earlier of the 15-day expiry and the federal deadline (end of that Rome day). */
export function confirmBy(expiresAt: string | null, federal: NoticeRule): { day: string | null; reason: "SCADENZA" | "FEDERALE" | null } {
  const exp = expiresAt ? romeParts(expiresAt)?.date ?? null : null;
  if (federal.deadline && (!exp || federal.deadline < exp)) return { day: federal.deadline, reason: "FEDERALE" };
  return { day: exp, reason: exp ? "SCADENZA" : null };
}

/* ------------------------------------------------------------------ federal form (scheda richiesta gare amichevoli) */

/** Category box of the SGS friendly form for a calendar group; null = to tick by hand (not guessed). */
export const FORM_CATEGORY: Readonly<Record<string, string | null>> = {
  u16: "Under 16 (2011)",
  u15: "Under 15 (2012-2013)",
  "2014": "Under 13 (2014)",
  "2015": "Under 12 (2015)",
  esordienti: null,
  pulcini: null,
  primicalci: "Under 9 (2018-2019)",
  piccoli: "Altro: Piccoli Amici",
  prima: null,
  u19: null,
};

export const FORM_SOURCE = {
  name: "Scheda richiesta gare amichevoli (FIGC-SGS)",
  url: "https://files.figc.it/version/c:ZTVjYWI5NjctODg2NS00:ODQyMDU4ZmYtNjFmZS00/scheda_richiesta_amichevoli.pdf",
  rule: "https://files.figc.it/version/c:YmQ3NTczZjMtYTZlYi00:Y2JlYjZhNGQtNTAyZi00/CU_N_05_%20Guida_Organizzazione_Tornei_%202026_2027_.pdf",
  checkedAt: "2026-10-15",
} as const;

/** INFERRED from the club mailbox (authorizations received by e-mail on 11/09 and 09/10/2026): to be confirmed. */
export const FRIENDLY_OFFICE = { label: "Ufficio Tornei · CR Lombardia", email: "tornei.lombardia@lnd.it", status: "INFERRED" } as const;

export interface FormField {
  key: string;
  section: string;
  label: string;
  /** "request" = from the request, "club" = club profile, "hand" = filled by hand on paper (personal data, never stored). */
  from: "request" | "club" | "hand";
}

/**
 * Fields of the official SGS friendly form (catalogue 15/10/2026, procedure 1.1, VERIFIED on figc.it). Names, phone
 * numbers of the managers and of the Safeguarding officer are written by hand: the app does not store them per
 * request (the Safeguarding officer belongs in a club setting, still to create).
 */
export const FORM_FIELDS: readonly FormField[] = [
  { key: "committee", section: "Comitato destinatario", label: "Comitato / Delegazione", from: "request" },
  { key: "club_name", section: "Società richiedente", label: "Denominazione", from: "club" },
  { key: "club_federal_id", section: "Società richiedente", label: "Matricola", from: "club" },
  { key: "club_address", section: "Società richiedente", label: "Sede", from: "club" },
  { key: "club_email", section: "Società richiedente", label: "E-mail", from: "club" },
  { key: "club_phone", section: "Società richiedente", label: "Telefono", from: "hand" },
  { key: "match_level", section: "Gara", label: "Carattere della gara", from: "request" },
  { key: "home_team", section: "Gara", label: "Squadra di casa", from: "request" },
  { key: "away_team", section: "Gara", label: "Squadra ospite", from: "request" },
  { key: "away_team_federal_id", section: "Gara", label: "Matricola squadra ospite", from: "request" },
  { key: "match_date", section: "Gara", label: "Data", from: "request" },
  { key: "kickoff_time", section: "Gara", label: "Ora di inizio", from: "request" },
  { key: "venue", section: "Gara", label: "Impianto sportivo", from: "request" },
  { key: "category", section: "Gara", label: "Categoria", from: "request" },
  { key: "organizer_manager", section: "Responsabili", label: "Dirigente responsabile organizzazione (nome, telefono)", from: "hand" },
  { key: "opponent_manager", section: "Responsabili", label: "Dirigente responsabile squadra avversaria (nome, telefono)", from: "hand" },
  { key: "safeguarding_officer", section: "Responsabili", label: "Responsabile Safeguarding (nome, telefono)", from: "hand" },
];

export interface FormValue extends FormField {
  value: string | null;
}

/** Prefilled values of the form; null = blank line to fill by hand. Nothing is invented. */
export function formValues(r: RequestRow): FormValue[] {
  const p = r.startsAt ? romeParts(r.startsAt) : null;
  const us = `${CLUB_PROFILE.name} (${teamLabel(r.teamKey)})`;
  const them = r.club?.name ?? r.opponentText ?? null;
  const home = r.homeAway === "FUORI" ? them : r.homeAway === "CASA" ? us : null;
  const away = r.homeAway === "FUORI" ? us : r.homeAway === "CASA" ? them : null;
  const v: Record<string, string | null> = {
    committee: "Comitato Regionale Lombardia · Ufficio Tornei",
    club_name: CLUB_PROFILE.name,
    club_federal_id: CLUB_PROFILE.figcMatricola,
    club_address: CLUB_PROFILE.contacts.address,
    club_email: CLUB_PROFILE.contacts.email,
    club_phone: null,
    match_level: r.scope && ["LOCALE", "PROVINCIALE", "REGIONALE", "NAZIONALE"].includes(r.scope) ? SCOPE_LABEL[r.scope].split(" ")[0]! : null,
    home_team: home,
    away_team: away,
    away_team_federal_id: r.homeAway === "CASA" ? r.club?.figcMatricola ?? null : r.homeAway === "FUORI" ? CLUB_PROFILE.figcMatricola : null,
    match_date: p ? itDay(p.date) : null,
    kickoff_time: p?.time ?? null,
    venue: r.venue,
    category: r.teamKey ? FORM_CATEGORY[r.teamKey] ?? null : null,
    organizer_manager: null,
    opponent_manager: null,
    safeguarding_officer: null,
  };
  return FORM_FIELDS.map((f) => ({ ...f, value: v[f.key] ?? null }));
}

/** E-mail DRAFT to the Ufficio Tornei (the app never sends it: a person attaches the signed form and sends it). */
export function friendlyEmailDraft(r: RequestRow): { to: string; subject: string; body: string } {
  const p = r.startsAt ? romeParts(r.startsAt) : null;
  const them = r.club?.name ?? r.opponentText ?? "[avversaria]";
  const when = p ? `${itDay(p.date)} alle ${p.time}` : "[data e ora]";
  const subject = `Richiesta gara amichevole ${teamLabel(r.teamKey)} - ${CLUB_PROFILE.name} (matr. ${CLUB_PROFILE.figcMatricola})`;
  const body = [
    "Buongiorno,",
    "",
    `in allegato la scheda di richiesta della gara amichevole ${teamLabel(r.teamKey)} ${CLUB_PROFILE.name} - ${them}, ${when}, ${r.venue ?? "[impianto]"}.`,
    "",
    "Restiamo a disposizione per ogni chiarimento.",
    "Cordiali saluti",
    "",
    `Segreteria ${CLUB_PROFILE.name}`,
    CLUB_PROFILE.contacts.email,
  ].join("\n");
  return { to: FRIENDLY_OFFICE.email, subject, body };
}

/* ------------------------------------------------------------------ Segreteria task: copy into the Master Calendario */

/** Venue as the Master Calendario writes it ("COLICO - CAMPO 1"). */
const MASTER_VENUE: Readonly<Record<Venue, string>> = {
  "Colico · Campo 1": "COLICO - CAMPO 1",
  "Colico · Campo 2": "COLICO - CAMPO 2",
  Colico: "COLICO",
  Dervio: "DERVIO",
};

export interface MasterCell {
  /** Column name of the Master Calendario sheet (tools/sync/calendar_public_payload.py). */
  column: string;
  value: string;
}

const masterToken = (s: string, max: number) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, max);

/**
 * Stable EVENT_ID in Master style ("EVT-ES-20260919-ALTOLARIOCALCIO-CASA"): EVT-AMI-<team>-<yyyymmdd>-<OPPONENT>-<CASA|FUORI>.
 * Empty when a piece is unknown (the row is then not ready to paste).
 */
export function masterEventId(r: RequestRow): string {
  const p = r.startsAt ? romeParts(r.startsAt) : null;
  const opp = masterToken(r.club?.name ?? r.opponentText ?? "", 30);
  if (!r.teamKey || NEEDS_BIRTH_YEAR.includes(r.teamKey) || !p || !opp || !r.homeAway) return "";
  return `EVT-AMI-${masterToken(r.teamKey, 12)}-${p.date.replace(/-/g, "")}-${opp}-${r.homeAway}`;
}

/**
 * The exact row the Segreteria pastes into the Master Calendario (the only public calendar source). Column names are
 * those read by tools/sync/calendar_public_payload.py (event_of), and a test feeds this row to event_of itself; the
 * column ORDER of the sheet must be checked against the sheet (INFERRED): the page shows them as labelled cells.
 * Empty when the data is not known.
 */
export function masterCalendarRow(r: RequestRow): MasterCell[] {
  const p = r.startsAt ? romeParts(r.startsAt) : null;
  const away = r.homeAway === "FUORI";
  const venue = away ? (r.club?.city ? r.club.city.toUpperCase() : "") : isVenue(r.venue) ? MASTER_VENUE[r.venue] : "";
  return [
    { column: "EVENT_ID", value: masterEventId(r) },
    { column: "DATE", value: p ? itDay(p.date) : "" },
    { column: "TIME", value: p?.time ?? "" },
    { column: "CATEGORY", value: r.teamKey && !NEEDS_BIRTH_YEAR.includes(r.teamKey) ? teamLabel(r.teamKey) : "" },
    { column: "TYPE", value: "AMICHEVOLE" },
    { column: "HOME_AWAY", value: r.homeAway ?? "" },
    { column: "VENUE", value: venue },
    { column: "OPPONENT_EVENT", value: (r.club?.name ?? r.opponentText ?? "").toUpperCase() },
    { column: "SOURCE_TYPE", value: "SCD_INTERNAL" },
    { column: "MATCH_STATUS", value: "CLUB_EVENT" },
    { column: "TIME_STATUS", value: "CONFIRMED" },
    { column: "VENUE_STATUS", value: venue ? "CONFIRMED" : "TO_VERIFY" },
  ];
}

/** Tab-separated values of the row, ready to paste into the sheet (column order as listed). */
export function masterCalendarTsv(r: RequestRow): string {
  return masterCalendarRow(r)
    .map((c) => c.value.replace(/[\t\r\n]+/g, " "))
    .join("\t");
}
