/**
 * Pulmini · richieste delle famiglie per le trasferte (r84). Pure helpers shared by /famiglia and /pulmini.
 * A request is tied to an away match of the official calendar copy (same event id the trips use) and to a person of
 * the family circle. The office confirms or answers "non possibile"; a seat is planned on the trip, never here.
 */

/**
 * «Presa visione» of a confirmed seat lives in migration r113 (STAGED). Switch to true in the same change that
 * follows «applica r113»: until then the family card does not offer the button and the office shows no ack chip.
 */
export const TRANSPORT_ACK_LIVE = false;

export const DIRECTIONS = ["ANDATA_RITORNO", "ANDATA", "RITORNO"] as const;
export type Direction = (typeof DIRECTIONS)[number];
export const DIRECTION_LABEL: Readonly<Record<Direction, string>> = {
  ANDATA_RITORNO: "Andata e ritorno",
  ANDATA: "Solo andata",
  RITORNO: "Solo ritorno",
};

export const REQUEST_STATES = ["RICHIESTA", "CONFERMATA", "NON_POSSIBILE", "ANNULLATA"] as const;
export type RequestState = (typeof REQUEST_STATES)[number];
export const REQUEST_LABEL: Readonly<Record<RequestState, string>> = {
  RICHIESTA: "Richiesta inviata",
  CONFERMATA: "Posto confermato",
  NON_POSSIBILE: "Non possibile",
  ANNULLATA: "Annullata",
};

export interface StopOption { id: string; line: string | null; town: string | null; place: string | null }

export interface MyRequest {
  id: string;
  eventId: string;
  date: string;
  teamCode: string;
  event: string | null;
  personId: string;
  direction: Direction;
  stopId: string | null;
  stop: string | null;
  note: string | null;
  status: RequestState;
  decisionNote: string | null;
  /** The family took «presa visione» of the confirmed seat (r113); false while r113 is not applied. */
  acknowledged: boolean;
}

export interface OfficeRequest {
  id: string;
  eventId: string;
  date: string;
  teamCode: string;
  event: string | null;
  name: string;
  direction: Direction;
  stop: string | null;
  line: string | null;
  note: string | null;
  status: RequestState;
  decisionNote: string | null;
  /** The family took «presa visione» of the confirmed seat (r113); false while r113 is not applied. */
  acknowledged: boolean;
}

/** An away match a family can ask a seat for (from the calendar copy). */
export interface AwayMatch { eventId: string; date: string; time: string; teamCode: string; opponent: string; venue: string }

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const isDir = (v: unknown): v is Direction => typeof v === "string" && (DIRECTIONS as readonly string[]).includes(v);
const isState = (v: unknown): v is RequestState => typeof v === "string" && (REQUEST_STATES as readonly string[]).includes(v);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function base(r: Raw) {
  const id = str(r["id"]);
  const eventId = str(r["eventId"]);
  const date = str(r["date"]);
  const teamCode = str(r["teamCode"]);
  if (!id || !eventId || !date || !DATE.test(date) || !teamCode) return null;
  return {
    id, eventId, date, teamCode,
    event: str(r["event"]),
    direction: isDir(r["direction"]) ? r["direction"] : "ANDATA_RITORNO",
    stop: str(r["stop"]),
    note: str(r["note"]),
    status: isState(r["status"]) ? r["status"] : "RICHIESTA",
    decisionNote: str(r["decisionNote"]),
    // Only a confirmed seat can be acknowledged; anything else from the database is ignored (fail-closed).
    acknowledged: r["acknowledged"] === true && r["status"] === "CONFERMATA",
  } as const;
}

export function parseMyRequests(v: unknown): MyRequest[] {
  if (!Array.isArray(v)) return [];
  return v.map(obj).flatMap((r) => {
    if (!r) return [];
    const b = base(r);
    const personId = str(r["personId"]);
    return b && personId ? [{ ...b, personId, stopId: str(r["stopId"]) }] : [];
  });
}

export function parseOfficeRequests(v: unknown): OfficeRequest[] | null {
  if (!Array.isArray(v)) return null;
  return v.map(obj).flatMap((r) => {
    if (!r) return [];
    const b = base(r);
    const name = str(r["name"]);
    return b && name ? [{ ...b, name, line: str(r["line"]) }] : [];
  });
}

export function parseStops(v: unknown): StopOption[] {
  if (!Array.isArray(v)) return [];
  return v.map(obj).flatMap((r) => {
    const id = r ? str(r["id"]) : null;
    return r && id ? [{ id, line: str(r["line"]), town: str(r["town"]), place: str(r["place"]) }] : [];
  });
}

export function stopLabel(s: StopOption): string {
  return [s.place, s.town].filter(Boolean).join(", ") || s.line || "Fermata";
}

/** Calendar group id for a team code (scd_teams uses "piccoliamici", the calendar "piccoli"). */
export function calendarGroupFor(teamCode: string): string {
  return teamCode === "piccoliamici" ? "piccoli" : teamCode;
}

/** Next away matches of the given teams within `days` days from `today` (inclusive), in time order. */
export function awayMatchesFor<E extends { id: string; date: string; time: string; group: string; homeAway: string; opponent: string; venue: string }>(
  events: readonly E[], teamCodes: readonly string[], today: string, days = 21,
): AwayMatch[] {
  const groups = new Map(teamCodes.map((c) => [calendarGroupFor(c), c]));
  const end = addDays(today, days);
  return events
    .filter((e) => e.homeAway === "FUORI" && groups.has(e.group) && e.date >= today && e.date <= end && e.id)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .map((e) => ({ eventId: e.id, date: e.date, time: e.time, teamCode: groups.get(e.group) as string, opponent: e.opponent, venue: e.venue }));
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Requests grouped by calendar event for the office, with counts of what still waits for an answer. */
export function groupByEvent(items: readonly OfficeRequest[]): Array<{ eventId: string; date: string; teamCode: string; event: string | null; items: OfficeRequest[]; waiting: number; confirmed: number }> {
  const map = new Map<string, OfficeRequest[]>();
  for (const r of items) map.set(r.eventId, [...(map.get(r.eventId) ?? []), r]);
  return [...map.entries()].map(([eventId, list]) => ({
    eventId,
    date: list[0]!.date,
    teamCode: list[0]!.teamCode,
    event: list.find((x) => x.event)?.event ?? null,
    items: list,
    waiting: list.filter((x) => x.status === "RICHIESTA").length,
    confirmed: list.filter((x) => x.status === "CONFERMATA").length,
  })).sort((a, b) => a.date.localeCompare(b.date) || a.teamCode.localeCompare(b.teamCode));
}

const ERRORS: Readonly<Record<string, string>> = {
  missing: "Mancano dati della partita: ricarica la pagina.",
  forbidden: "Puoi chiedere il pulmino solo per te o per i tuoi figli collegati al tuo account.",
  past: "La partita è già passata.",
  direction: "Scegli andata, ritorno o entrambi.",
  stop: "Fermata non valida: scegline una dall'elenco.",
  confirmed: "Il posto è già confermato: per cambiare scrivi al Responsabile servizio pulmini.",
  not_found: "Richiesta non trovata: ricarica la pagina.",
  cancelled: "La famiglia ha annullato la richiesta.",
  note_required: "Scrivi il motivo, così la famiglia capisce.",
  decision: "Scelta non valida.",
  not_confirmed: "La presa visione si dà solo su un posto confermato.",
  unavailable: "Presa visione in attivazione: per ora rispondi al Responsabile servizio pulmini nella chat della squadra.",
};
export function requestError(code: string | null | undefined): string {
  return (code && ERRORS[code]) || "Operazione non riuscita. Riprova tra poco.";
}
