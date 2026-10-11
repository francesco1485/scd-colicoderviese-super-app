/**
 * Call-ups with "Ci sarò" (UD-062, r62). Pure helpers shared by the mister page (send, see answers)
 * and the family page (answer). The database decides who may send or answer; these helpers only
 * shape input and output.
 */

export type CallupResponse = "PENDING" | "CONFIRMED" | "DECLINED";
export type SendOutcome = "SENT" | "CERTIFICATE" | "REGISTRATION" | "NOT_IN_TEAM" | "ERROR";

export const RESPONSE_LABEL: Readonly<Record<CallupResponse, string>> = {
  PENDING: "In attesa",
  CONFIRMED: "Ci sarà",
  DECLINED: "Non ci sarà",
};

/** Same words seen by the family when they answer. */
export const MY_RESPONSE_LABEL: Readonly<Record<CallupResponse, string>> = {
  PENDING: "Da confermare",
  CONFIRMED: "Ci sarò",
  DECLINED: "Non ci sarò",
};

export const OUTCOME_LABEL: Readonly<Record<SendOutcome, string>> = {
  SENT: "Convocato",
  CERTIFICATE: "Certificato medico non valido il giorno della gara",
  REGISTRATION: "Tesseramento FIGC non approvato",
  NOT_IN_TEAM: "Non è in rosa per questa squadra",
  ERROR: "Non inviato, riprova",
};

export function asResponse(v: string): CallupResponse {
  return v === "CONFIRMED" || v === "DECLINED" ? v : "PENDING";
}

export function asOutcome(v: string): SendOutcome {
  return v === "SENT" || v === "CERTIFICATE" || v === "REGISTRATION" || v === "NOT_IN_TEAM" ? v : "ERROR";
}

export interface ResponseCounts {
  total: number;
  confirmed: number;
  declined: number;
  pending: number;
}

export function responseCounts(rows: ReadonlyArray<{ response: CallupResponse }>): ResponseCounts {
  const c: ResponseCounts = { total: rows.length, confirmed: 0, declined: 0, pending: 0 };
  for (const r of rows) {
    if (r.response === "CONFIRMED") c.confirmed += 1;
    else if (r.response === "DECLINED") c.declined += 1;
    else c.pending += 1;
  }
  return c;
}

export function outcomeCounts(rows: ReadonlyArray<{ outcome: SendOutcome }>): Record<SendOutcome, number> {
  const c: Record<SendOutcome, number> = { SENT: 0, CERTIFICATE: 0, REGISTRATION: 0, NOT_IN_TEAM: 0, ERROR: 0 };
  for (const r of rows) c[r.outcome] += 1;
  return c;
}

export const CLUB_NAME = "ColicoDerviese";

/** "Home - Away" title of a calendar match, from SCD's point of view. */
export function matchTitle(opponent: string, homeAway: string): { title: string; home: string; away: string } {
  const opp = opponent.trim() || "Avversario da definire";
  const home = homeAway === "FUORI" ? opp : CLUB_NAME;
  const away = homeAway === "FUORI" ? CLUB_NAME : opp;
  return { title: `${home} - ${away}`, home, away };
}

export interface CallupInput {
  date: string;
  meetingTime: string;
  meetingPlace: string;
  kitNote: string;
  athleteIds: readonly string[];
}

/** Errors in Italian, empty when the input can be sent. */
export function validateCallupInput(i: CallupInput): string[] {
  const errors: string[] = [];
  if (i.athleteIds.length === 0) errors.push("Scegli almeno un ragazzo.");
  if (i.athleteIds.length > 40) errors.push("Al massimo 40 convocati per gara.");
  if (i.meetingTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(i.meetingTime)) errors.push("Orario di ritrovo non valido (es. 13:45).");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.date)) errors.push("Data della gara non valida.");
  if (i.meetingPlace.length > 160) errors.push("Luogo di ritrovo troppo lungo.");
  if (i.kitNote.length > 300) errors.push("Nota troppo lunga.");
  return errors;
}

/** Postgres timestamptz literal in Rome time, or null when no meeting time was given. */
export function meetingAtLiteral(date: string, meetingTime: string): string | null {
  return meetingTime ? `${date} ${meetingTime}:00 Europe/Rome` : null;
}

const ROME_TIME = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" });
const ROME_DAY = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", weekday: "long", day: "numeric", month: "long" });

export function romeTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : ROME_TIME.format(d);
}

export function romeDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : ROME_DAY.format(d);
}

/** Call-ups already sent whose athlete the mister has unticked: they are withdrawn on "Invia" (r68). */
export function callupsToWithdraw(sent: ReadonlyArray<{ callupId: string; athleteId: string }>, picked: ReadonlySet<string>): string[] {
  return sent.filter((c) => !picked.has(c.athleteId)).map((c) => c.callupId);
}

/** Label of the send button: what will happen when the mister presses it. */
export function sendButtonLabel(toSend: number, toWithdraw: number): string {
  if (toSend === 0 && toWithdraw === 0) return "Invia convocazione";
  if (toSend === 0) return `Togli ${toWithdraw} dalla convocazione`;
  return toWithdraw > 0 ? `Invia convocazione (${toSend}) · togli ${toWithdraw}` : `Invia convocazione (${toSend})`;
}
