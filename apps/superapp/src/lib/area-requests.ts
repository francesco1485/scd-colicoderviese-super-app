/**
 * Area requests of the cast (UD-114): the Club House "richiesta d'ordine per feste e iniziative" and the dish polls
 * of "Lo chef". Pure helpers, no I/O, shared by the form (browser) and the server functions.
 *
 * Flow (Direzione 14/10/2026, UD-111 / UD-114): request in the app -> a person of the Club House confirms -> payment
 * at the club till (SQUBY/SumUp). The app never confirms an order by itself and never takes a payment. Allergies and
 * intolerances are health data: they are never written in the form, they are told in person to the Club House staff.
 *
 * Storage is the staged migration supabase/migrations/20261014_r103_area_requests.sql (NOT APPLIED). Until it is
 * applied the server answers "off" and the form fails closed: it prepares the message for the secretariat instead of
 * pretending the request was sent (same pattern as the requests engine, lib/requests.ts requestMessage).
 */

export type AreaRequestArea = "club-house";
export type AreaRequestKind = "ORDINE_FESTA";
export type AreaRequestStatus = "NUOVA" | "IN_CARICO" | "CONFERMATA" | "NON_POSSIBILE" | "ANNULLATA";

export const AREA_REQUEST_STATUS_LABEL: Readonly<Record<AreaRequestStatus, string>> = {
  NUOVA: "Inviata, in attesa",
  IN_CARICO: "Presa in carico",
  CONFERMATA: "Confermata da una persona: si paga alla cassa",
  NON_POSSIBILE: "Non possibile",
  ANNULLATA: "Annullata",
};

export const CONTACT_PREFS = ["app", "email", "telefono"] as const;
export type ContactPref = (typeof CONTACT_PREFS)[number];

export const CONTACT_PREF_LABEL: Readonly<Record<ContactPref, string>> = {
  app: "Risposta qui nell'app",
  email: "E-mail del mio account",
  telefono: "Telefonata al numero che la segreteria ha già",
};

export const OCCASIONS = ["Compleanno", "Festa di squadra", "Iniziativa del club", "Altro"] as const;
export type Occasion = (typeof OCCASIONS)[number];

export const ORDER_LIMITS = {
  whatMin: 3,
  whatMax: 300,
  peopleMin: 1,
  peopleMax: 500,
  /** How far ahead a request may be (days). */
  horizonDays: 365,
} as const;

export interface OrderRequestInput {
  what: string;
  /** Day of the party (YYYY-MM-DD, Europe/Rome). */
  when: string;
  /** Optional time (HH:MM). */
  time?: string | undefined;
  people: number | string;
  contact: string;
  occasion?: string | undefined;
}

export interface OrderRequest {
  what: string;
  when: string;
  time: string | null;
  people: number;
  contact: ContactPref;
  occasion: Occasion;
}

export type OrderField = "what" | "when" | "time" | "people" | "contact" | "occasion";

export type OrderValidation = { ok: true; value: OrderRequest } | { ok: false; errors: Partial<Record<OrderField, string>> };

/** Health data never goes in the form: allergies and intolerances are told in person. */
export const HEALTH_RE = /\b(allerg\w*|intolleran\w*|celiac\w*|celiachia|anafilass\w*|diabet\w*|lattosio|glutine)\b/i;

/** Payment data never goes in the form (cards, IBAN): payments happen at the till. */
const PAYMENT_RE = /\b(?:\d[ -]?){13,19}\b|\bIT\s?\d{2}\s?[A-Z]/i;

function addDaysIso(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function validIsoDay(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/**
 * Validates a Club House order request. `today` is the Rome day of the server or the browser; the day of the party
 * may not be in the past nor more than a year ahead.
 */
export function validateOrderRequest(input: OrderRequestInput, today: string): OrderValidation {
  const errors: Partial<Record<OrderField, string>> = {};
  const what = (input.what ?? "").replace(/\s+/g, " ").trim();
  if (what.length < ORDER_LIMITS.whatMin) errors.what = "Scrivi cosa ti serve, per esempio: torta e bibite per la merenda.";
  else if (what.length > ORDER_LIMITS.whatMax) errors.what = `Massimo ${ORDER_LIMITS.whatMax} caratteri: i dettagli li concordi con la Club House.`;
  else if (HEALTH_RE.test(what)) errors.what = "Allergie e intolleranze non si scrivono qui: dille di persona al personale della Club House.";
  else if (PAYMENT_RE.test(what)) errors.what = "Niente dati di pagamento: si paga alla cassa del club dopo la conferma.";

  const when = (input.when ?? "").trim();
  if (!validIsoDay(when)) errors.when = "Scegli il giorno della festa.";
  else if (when < today) errors.when = "Il giorno è già passato.";
  else if (when > addDaysIso(today, ORDER_LIMITS.horizonDays)) errors.when = "Si può chiedere al massimo un anno prima.";

  const time = (input.time ?? "").trim();
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) errors.time = "Orario non valido (per esempio 16:30).";

  const peopleNum = typeof input.people === "number" ? input.people : Number(String(input.people ?? "").trim());
  if (!Number.isInteger(peopleNum) || peopleNum < ORDER_LIMITS.peopleMin || peopleNum > ORDER_LIMITS.peopleMax)
    errors.people = `Indica quante persone, da ${ORDER_LIMITS.peopleMin} a ${ORDER_LIMITS.peopleMax}.`;

  const contact = (CONTACT_PREFS as readonly string[]).includes(input.contact) ? (input.contact as ContactPref) : null;
  if (!contact) errors.contact = "Scegli come preferisci essere ricontattato.";

  const occasionRaw = input.occasion ?? "Altro";
  const occasion = (OCCASIONS as readonly string[]).includes(occasionRaw) ? (occasionRaw as Occasion) : null;
  if (!occasion) errors.occasion = "Scegli l'occasione.";

  if (Object.keys(errors).length || !contact || !occasion) return { ok: false, errors };
  return { ok: true, value: { what, when, time: time || null, people: peopleNum, contact, occasion } };
}

function itDay(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/** Message ready for the Club House when the requests store is not active yet (copied by the person). */
export function orderRequestMessage(r: OrderRequest): string {
  return [
    "Richiesta d'ordine per la Club House (da confermare)",
    `Occasione: ${r.occasion}`,
    `Giorno: ${itDay(r.when)}${r.time ? ` ore ${r.time}` : ""}`,
    `Persone: ${r.people}`,
    `Cosa serve: ${r.what}`,
    `Ricontatto: ${CONTACT_PREF_LABEL[r.contact]}`,
    "Pagamento alla cassa del club dopo la conferma. Allergie e intolleranze le dico di persona.",
  ].join("\n");
}

/* ─────────────────────────────── database payloads ─────────────────────────────── */

export interface MyAreaRequest {
  id: string;
  createdAt: string;
  status: AreaRequestStatus;
  occasion: string;
  when: string;
  time: string | null;
  people: number;
  what: string;
  answer: string | null;
}

export interface BoardAreaRequest extends MyAreaRequest {
  /** Display name of the requester as the database returns it (office only). */
  requester: string;
  contact: ContactPref;
}

export interface AreaPollOption {
  key: string;
  label: string;
  /** Votes, only when the database returns them (after voting or when the poll is closed). */
  votes: number | null;
}

export interface AreaPoll {
  id: string;
  question: string;
  closesAt: string | null;
  options: AreaPollOption[];
  myVote: string | null;
  closed: boolean;
}

const STATUSES = new Set<AreaRequestStatus>(["NUOVA", "IN_CARICO", "CONFERMATA", "NON_POSSIBILE", "ANNULLATA"]);

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function parseRequestRow(x: Record<string, unknown>): MyAreaRequest | null {
  const id = str(x["id"]);
  const status = str(x["status"]) as AreaRequestStatus;
  const p = (x["payload"] && typeof x["payload"] === "object" ? x["payload"] : {}) as Record<string, unknown>;
  if (!id || !STATUSES.has(status)) return null;
  const people = Number(p["people"]);
  return {
    id,
    createdAt: str(x["createdAt"]),
    status,
    occasion: str(p["occasion"]) || "Altro",
    when: str(p["when"]),
    time: str(p["time"]) || null,
    people: Number.isFinite(people) ? people : 0,
    what: str(p["what"]),
    answer: str(x["answer"]) || null,
  };
}

/** scd_my_area_requests output (array of rows); anything malformed is dropped. */
export function parseMyAreaRequests(raw: unknown): MyAreaRequest[] {
  return (Array.isArray(raw) ? raw : []).flatMap((x) => {
    const r = x && typeof x === "object" ? parseRequestRow(x as Record<string, unknown>) : null;
    return r ? [r] : [];
  });
}

/** scd_area_requests_board output (office). */
export function parseBoardAreaRequests(raw: unknown): BoardAreaRequest[] {
  return (Array.isArray(raw) ? raw : []).flatMap((x) => {
    if (!x || typeof x !== "object") return [];
    const o = x as Record<string, unknown>;
    const r = parseRequestRow(o);
    if (!r) return [];
    const p = (o["payload"] && typeof o["payload"] === "object" ? o["payload"] : {}) as Record<string, unknown>;
    const contact = (CONTACT_PREFS as readonly string[]).includes(str(p["contact"])) ? (str(p["contact"]) as ContactPref) : "app";
    return [{ ...r, requester: str(o["requester"]) || "Socio", contact }];
  });
}

/** scd_area_open_polls output. */
export function parseAreaPolls(raw: unknown): AreaPoll[] {
  return (Array.isArray(raw) ? raw : []).flatMap((x) => {
    if (!x || typeof x !== "object") return [];
    const o = x as Record<string, unknown>;
    const id = str(o["id"]);
    const question = str(o["question"]);
    const options = (Array.isArray(o["options"]) ? o["options"] : []).flatMap((y) => {
      if (!y || typeof y !== "object") return [];
      const q = y as Record<string, unknown>;
      const key = str(q["key"]);
      const label = str(q["label"]);
      const votes = typeof q["votes"] === "number" && Number.isFinite(q["votes"]) ? (q["votes"] as number) : null;
      return key && label ? [{ key, label, votes }] : [];
    });
    if (!id || !question || options.length < 2) return [];
    const myVote = str(o["myVote"]) || null;
    return [{ id, question, closesAt: str(o["closesAt"]) || null, options, myVote: myVote && options.some((op) => op.key === myVote) ? myVote : null, closed: o["closed"] === true }];
  });
}

/** Database outcome codes of r103 in plain Italian. */
export function areaRequestError(code: string | null | undefined): string {
  switch (code) {
    case "forbidden":
      return "Le richieste d'ordine le fanno gli adulti o l'account della famiglia.";
    case "invalid":
      return "Controlla i campi del modulo e riprova.";
    case "closed":
      return "Il sondaggio è chiuso.";
    case "option":
      return "Scelta non valida.";
    default:
      return "Non salvato: riprova tra poco o scrivi alla segreteria.";
  }
}
