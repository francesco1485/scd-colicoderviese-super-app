/**
 * "Adotta un seggiolino" (C2, Francesco 14/10/2026; UD-113 "oggetti divisibili in unità (es. posti di una tribuna, ognuno
 * adottabile con riconoscimento sulla targhetta numerata)"): one seat, one nameplate, inside the existing Adotta flow.
 *
 * Pure rules for the seat map on /sostieni. The seats are the numbered units of the tribune item of the existing
 * catalogue (scd_adopt_items / scd_adopt_units of r101, read through getGivingPublic → parsePublic). Nothing here is a
 * second catalogue and nothing is seeded: with no catalogue item (r101 not applied, or the Direzione has not published
 * the tribune yet) every seat is "libero" and the count is an honest "0 di 60".
 *
 * Facts (supplier offer of 14/05/2026, now EXPIRED — documentation only, never shown as a current price):
 *   new tribune, 60 numbered seats; 54.500 € + IVA 22% = 66.490 €; delivery 90–180 days from the order.
 */
import type { PublicItem, PublicUnit, Visibility } from "./giving";

/* ------------------------------------------------------------------ campaign */

export const TRIBUNE_SEATS_TOTAL = 60;

/**
 * Amount per seat shown to the public. NULL while the supplier offer is expired: the page then says "Importo in
 * aggiornamento" and shows no number. It becomes 66.490 € / 60 ≈ 1.108 € (1.108,17 €) ONLY when the Direzione confirms an
 * updated quote; write the confirmed amount here (and the quote in the catalogue item) in the same change.
 */
export const TRIBUNE_SEAT_AMOUNT: number | null = null;

export const AMOUNT_PENDING = "Importo in aggiornamento";

/** Up to three people can share one seat (co-adoption); each one chooses how to appear on the plate. */
export const MAX_CO_ADOPTERS = 3;

/** Plate text for a donor who did not choose (or consent to) a public name. */
export const ANONYMOUS_PLATE = "Un amico della ColicoDerviese";
export const ANONYMOUS_PLATE_MANY = "Amici della ColicoDerviese";

/**
 * Co-adoption needs an r101 amendment before it can be accepted: the staged migration keeps one received donation per
 * unit (scd_donations_one_unit_idx) and refuses a pledge on an adopted unit. Until the Direzione approves that change the
 * map lets people pick only free seats; the model below (and its tests) already holds the max-3 rule.
 */
export const CO_ADOPTION_LIVE = false;

/**
 * Seat layout of the NEW tribune: a neutral, INDICATIVE arrangement ("disposizione indicativa") — the supplier drawing
 * is not in the app. Change it here only: sectors × rows × seats must stay TRIBUNE_SEATS_TOTAL.
 * (The existing grandstand in config/scd-facilities.v1.json is "2 settori x 5 file x 25 posti": a different structure.)
 */
export const TRIBUNE_LAYOUT = {
  sectors: [
    { id: "A", label: "Settore A" },
    { id: "B", label: "Settore B" },
  ],
  rowsPerSector: 3,
  seatsPerRow: 10,
  indicative: true,
} as const;

export const LAYOUT_NOTE = "Disposizione indicativa: la pianta definitiva arriva con il progetto della tribuna.";

export interface SeatRowLayout {
  sector: string;
  sectorLabel: string;
  /** 1 = the row nearest the pitch. */
  row: number;
  seats: number[];
}

/** Rows of the layout, seats numbered 1..N sector by sector, row by row (row 1 nearest the pitch). */
export function seatLayout(layout: typeof TRIBUNE_LAYOUT = TRIBUNE_LAYOUT): SeatRowLayout[] {
  const out: SeatRowLayout[] = [];
  let n = 1;
  for (const s of layout.sectors) {
    for (let r = 1; r <= layout.rowsPerSector; r++) {
      const seats: number[] = [];
      for (let k = 0; k < layout.seatsPerRow; k++) seats.push(n++);
      out.push({ sector: s.id, sectorLabel: s.label, row: r, seats });
    }
  }
  return out;
}

export function layoutTotal(layout: typeof TRIBUNE_LAYOUT = TRIBUNE_LAYOUT): number {
  return layout.sectors.length * layout.rowsPerSector * layout.seatsPerRow;
}

/** Where a seat is in the layout ("Settore A, fila 2"), null when the number is outside it. */
export function seatPlace(n: number, layout: typeof TRIBUNE_LAYOUT = TRIBUNE_LAYOUT): { sectorLabel: string; row: number } | null {
  const r = seatLayout(layout).find((x) => x.seats.includes(n));
  return r ? { sectorLabel: r.sectorLabel, row: r.row } : null;
}

/* ------------------------------------------------------------------ seat state */

export type SeatState = "LIBERO" | "PROMESSO" | "ADOTTATO";
export const SEAT_STATE_LABEL: Readonly<Record<SeatState, string>> = {
  LIBERO: "libero",
  PROMESSO: "promesso",
  ADOTTATO: "adottato",
};

/** One donor on one seat: a pledge (PROMESSA) or money the treasury recorded (RICEVUTA). */
export interface SeatHolder {
  status: "PROMESSA" | "RICEVUTA" | "ANNULLATA";
  visibility: Visibility;
  plateText: string | null;
  /** Explicit consent to print plateText on the nameplate. */
  plateConsent: boolean;
}

export interface Seat {
  n: number;
  holders: SeatHolder[];
}

const activeHolders = (hs: readonly SeatHolder[]) => hs.filter((h) => h.status !== "ANNULLATA");

/** adottato = at least one donation received; promesso = only open pledges; libero = nothing (or only cancelled). */
export function seatState(holders: readonly SeatHolder[]): SeatState {
  if (holders.some((h) => h.status === "RICEVUTA")) return "ADOTTATO";
  if (holders.some((h) => h.status === "PROMESSA")) return "PROMESSO";
  return "LIBERO";
}

/** Places still open on a seat for co-adopters (0..MAX_CO_ADOPTERS). */
export function seatRoom(holders: readonly SeatHolder[]): number {
  return Math.max(0, MAX_CO_ADOPTERS - activeHolders(holders).length);
}

export type CoAdoptionRefusal = "SEAT_FULL" | "UNKNOWN_SEAT";

/** Can one more person adopt this seat? Free seats always; shared seats while fewer than MAX_CO_ADOPTERS are active. */
export function coAdoptionCheck(seat: Seat | undefined): { ok: true } | { ok: false; reason: CoAdoptionRefusal } {
  if (!seat) return { ok: false, reason: "UNKNOWN_SEAT" };
  return seatRoom(seat.holders) > 0 ? { ok: true } : { ok: false, reason: "SEAT_FULL" };
}

/** Adds a holder, refusing the fourth active one (the rule the database must enforce once co-adoption is approved). */
export function addHolder(seat: Seat, h: SeatHolder): { ok: true; seat: Seat } | { ok: false; reason: CoAdoptionRefusal } {
  const c = coAdoptionCheck(seat);
  if (!c.ok) return c;
  return { ok: true, seat: { n: seat.n, holders: [...seat.holders, h] } };
}

/** Can the public pick this seat now? Free seats; shared ones only once co-adoption is live. */
export function seatSelectable(seat: Seat, coAdoptionLive: boolean = CO_ADOPTION_LIVE): boolean {
  const st = seatState(seat.holders);
  if (st === "LIBERO") return true;
  return coAdoptionLive && seatRoom(seat.holders) > 0;
}

/* ------------------------------------------------------------------ nameplate */

const tidy = (s: string | null) => (s ?? "").replace(/\s+/g, " ").trim();

/**
 * Nameplate lines of one seat. Only money the treasury received counts (a pledge never reaches the plate). A donor's
 * own text appears only with a public name AND explicit consent; everybody else is "Un amico della ColicoDerviese"
 * (several anonymous co-adopters share one line: "Amici della ColicoDerviese").
 */
export function plateLines(holders: readonly SeatHolder[]): string[] {
  const received = holders.filter((h) => h.status === "RICEVUTA");
  const named: string[] = [];
  let anonymous = 0;
  for (const h of received) {
    const t = tidy(h.plateText);
    if (h.visibility === "NOME_PUBBLICO" && h.plateConsent && t.length >= 2) named.push(t);
    else anonymous++;
  }
  if (anonymous === 1) named.push(ANONYMOUS_PLATE);
  if (anonymous > 1) named.push(ANONYMOUS_PLATE_MANY);
  return named;
}

/** The plate in one line, or null when nobody has adopted the seat yet. */
export function plateLabel(holders: readonly SeatHolder[]): string | null {
  const l = plateLines(holders);
  return l.length ? l.join(" · ") : null;
}

/** Screen-reader label: "Posto 12, libero" / "Posto 12, adottato: Famiglia Rossi". */
export function seatAriaLabel(seat: Seat): string {
  const st = seatState(seat.holders);
  const plate = st === "ADOTTATO" ? plateLabel(seat.holders) : null;
  const room = st !== "LIBERO" && CO_ADOPTION_LIVE ? seatRoom(seat.holders) : 0;
  return `Posto ${seat.n}, ${SEAT_STATE_LABEL[st]}${plate ? `: ${plate}` : ""}${room > 0 ? `, ancora ${room} ${room === 1 ? "posto" : "posti"} per adottarlo insieme` : ""}`;
}

/* ------------------------------------------------------------------ amount */

/** Never a number while the per-seat amount is not confirmed. */
export function seatAmountText(amount: number | null = TRIBUNE_SEAT_AMOUNT): string {
  if (amount === null || !(amount > 0)) return AMOUNT_PENDING;
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(amount);
}

/* ------------------------------------------------------------------ from the real read path */

/**
 * The tribune in the existing catalogue: category "Tribuna e impianto", numbered units, TRIBUNE_SEATS_TOTAL of them.
 * Null when the Direzione has not published it (or r101 is not applied).
 */
export function findTribuneItem(items: readonly PublicItem[]): PublicItem | null {
  return items.find((i) => i.category === "TRIBUNA_IMPIANTO" && i.unitsTotal === TRIBUNE_SEATS_TOTAL && i.unitLabel !== null) ?? null;
}

/**
 * Seats from the public units of the catalogue item. Received adopters with a plate text chose a public name and
 * consented (r101 stores plate text only with NOME_PUBBLICO); the others are anonymous. Open pledges become PROMESSA
 * holders (never on the plate). Missing units = free seats: never invented adopters.
 */
export function seatsFromUnits(units: readonly PublicUnit[] | null, total: number = TRIBUNE_SEATS_TOTAL): Seat[] {
  const byN = new Map((units ?? []).map((u) => [u.n, u]));
  const out: Seat[] = [];
  for (let n = 1; n <= total; n++) {
    const u = byN.get(n);
    const holders: SeatHolder[] = [];
    if (u) {
      const received = Math.min(MAX_CO_ADOPTERS, u.adopted ? Math.max(1, u.adopters) : u.adopters);
      const plates = u.plates.slice(0, received);
      for (const p of plates) holders.push({ status: "RICEVUTA", visibility: "NOME_PUBBLICO", plateText: p, plateConsent: true });
      for (let k = plates.length; k < received; k++) holders.push({ status: "RICEVUTA", visibility: "ANONIMO_PUBBLICO", plateText: null, plateConsent: false });
      const pledges = Math.min(MAX_CO_ADOPTERS - received, u.pledges);
      for (let k = 0; k < pledges; k++) holders.push({ status: "PROMESSA", visibility: "ANONIMO_PUBBLICO", plateText: null, plateConsent: false });
    }
    out.push({ n, holders });
  }
  return out;
}

export interface TribuneProgress {
  total: number;
  adopted: number;
  promised: number;
  free: number;
  /** 0..100 of adopted seats (received money only). */
  pct: number;
  label: string;
}

/** Honest count: adopted = seats with money received; promised are listed apart and never counted as adopted. */
export function tribuneProgress(seats: readonly Seat[]): TribuneProgress {
  let adopted = 0;
  let promised = 0;
  for (const s of seats) {
    const st = seatState(s.holders);
    if (st === "ADOTTATO") adopted++;
    else if (st === "PROMESSO") promised++;
  }
  const total = seats.length;
  const pct = total ? Math.floor((adopted * 100) / total) : 0;
  const label = `${adopted} di ${total} posti adottati${promised ? ` · ${promised} ${promised === 1 ? "promesso" : "promessi"}` : ""}`;
  return { total, adopted, promised, free: total - adopted - promised, pct, label };
}

/**
 * The item the existing pledge dialog opens when the tribune is not in the catalogue yet (r101 not applied: the dialog
 * answers "Da attivare" and sends nothing). Never used to submit: id is empty and status keeps it out of the catalogue.
 */
export function tribuneDraftItem(): PublicItem {
  return {
    id: "",
    code: "",
    title: "Seggiolino della nuova tribuna",
    category: "TRIBUNA_IMPIANTO",
    description: "",
    supplier: null,
    supplierCode: null,
    productUrl: null,
    photoPath: null,
    priceMode: "DA_PREVENTIVO_AGGIORNATO",
    priceTotal: null,
    priceNote: null,
    quoteExpired: true,
    status: "DA_ADOTTARE",
    campaign: null,
    unitLabel: "posto",
    unitsTotal: TRIBUNE_SEATS_TOTAL,
    unitPrice: null,
    contributions: 0,
    collected: null,
    units: Array.from({ length: TRIBUNE_SEATS_TOTAL }, (_, k) => ({ n: k + 1, adopted: false, plate: null, pledges: 0, adopters: 0, plates: [] })),
    adopters: [],
    anonymousAdopters: 0,
  };
}
