/**
 * "Lotteria dello sport" (Direzione 14/10/2026, UD-115): a short charity initiative of the S.C.D. ColicoDerviese that
 * ends with a day dedicated to all sports; ALL proceeds go to works on the calcetto pitch of the parish church.
 * Name, dates, prices, prizes and partners are decided later by the Direzione: nothing here has a default value.
 *
 * Pure logic only (no I/O): setup validation with the legal caps, numbering plan, compliance deadlines, forbidden
 * prizes, 10% withholding, ticket reconciliation, void tickets, draw outcome, regolamento and verbale drafts, funds.
 * Shared by the back office (/direzione/lotteria), the public page (/eventi/lotteria-dello-sport) and the tests.
 *
 * Legal frame: D.P.R. 26 ottobre 2001 n. 430 (manifestazioni di sorte locali), checked on 14/10/2026 on two secondary
 * sources (LEGAL_SOURCES). The app shows it as a CHECKLIST to verify with SUAP / Prefettura / commercialista, never
 * as legal certainty. Amounts are integer euro cents.
 */

export const CLUB_NAME = "S.C.D. ColicoDerviese";
export const BENEFICIARY_DEFAULT_PURPOSE =
  "Tutto il ricavato è devoluto per i lavori sul campo di calcetto della chiesa patronale.";

export type LotteryKind = "LOTTERIA" | "TOMBOLA" | "PESCA";
export const LOTTERY_KINDS: readonly LotteryKind[] = [
  "LOTTERIA",
  "TOMBOLA",
  "PESCA",
];
export const KIND_LABEL: Readonly<Record<LotteryKind, string>> = {
  LOTTERIA: "Lotteria",
  TOMBOLA: "Tombola",
  PESCA: "Pesca di beneficenza",
};

/** Lotteria: total value of the tickets issued (D.P.R. 430/2001 art. 13). */
export const LOTTERY_TICKETS_CAP_CENTS = 5_164_569;
/** Pesca di beneficenza: cap on proceeds. */
export const PESCA_PROCEEDS_CAP_CENTS = 5_164_569;
/** Tombola: cap on the total value of prizes. */
export const TOMBOLA_PRIZES_CAP_CENTS = 1_291_142;
/** Withholding on the total value of the prizes (bought or donated). */
export const WITHHOLDING_RATE_PERCENT = 10;
/** Communications to Prefetto and Sindaco (SUAP) at least this many days before the draw. */
export const COMMUNICATION_LEAD_DAYS = 30;
export const SALE_PROVINCE = "Lecco";

export const LEGAL_CHECKED_ON = "2026-10-14";
export const LEGAL_SOURCES: readonly string[] = [
  "D.P.R. 26 ottobre 2001, n. 430 (manifestazioni di sorte locali), artt. 13–14",
  "Comune di Sesto Fiorentino, scheda «Lotterie, tombole e pesche di beneficenza» (comune.sesto-fiorentino.fi.it, aggiornata il 17/03/2026)",
  "Volontariato Torino, scheda sulle manifestazioni di sorte locali (volontariatotorino.it)",
];
export const LEGAL_DISCLAIMER =
  "Promemoria operativo, non parere legale: ogni voce va verificata con SUAP, Prefettura di Lecco e commercialista prima di procedere.";

// ---------------------------------------------------------------------------------------------------------------
// Days and money

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDay(v: string | null | undefined): v is string {
  if (!v) return false;
  const m = ISO_DAY.exec(v);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return (
    t.getUTCFullYear() === y &&
    t.getUTCMonth() === mo - 1 &&
    t.getUTCDate() === d
  );
}

export function addDays(day: string, n: number): string {
  const t = new Date(`${day}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) /
      86_400_000,
  );
}

/** Day 16 of the month after `day` (F24 deadline for the withholding). */
export function sixteenthOfNextMonth(day: string): string {
  const [y, m] = day.split("-").map(Number) as [number, number];
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-16`;
}

/** "lunedì 14 dicembre 2026". */
export function longDay(day: string | null | undefined): string {
  if (!isDay(day)) return "";
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${day}T12:00:00Z`));
}

/** "14/12/2026". */
export function shortDay(day: string | null | undefined): string {
  if (!isDay(day)) return "";
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

const EURO = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "51.645,69 €" (it-IT); null → "". */
export function formatEuro(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents))
    return "";
  return EURO.format(cents / 100).replace(/[\u00a0\u202f]/g, " ");
}

/** "2,50" / "2.50" / "1.200,00" / "€ 3" → cents; null when not a non-negative amount with at most 2 decimals. */
export function parseEuroToCents(input: string): number | null {
  let s = input.replace(/[€\s]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [int, dec = ""] = s.split(".");
  return Number(int) * 100 + Number(dec.padEnd(2, "0"));
}

/** Integer percentage of an amount, rounded half up to the cent. */
export function percentOf(cents: number, percent: number): number {
  return Math.round((cents * percent) / 100);
}

// ---------------------------------------------------------------------------------------------------------------
// Setup

export type DrawOrder = "DAL_PRIMO" | "DALL_ULTIMO";
export const DRAW_ORDER_LABEL: Readonly<Record<DrawOrder, string>> = {
  DAL_PRIMO: "dal 1° premio all'ultimo",
  DALL_ULTIMO: "dall'ultimo premio al 1°",
};

export interface LotterySetup {
  kind: LotteryKind;
  /** Public name; "" = still to decide. */
  title: string;
  beneficiary: string;
  saleFrom: string | null;
  saleUntil: string | null;
  drawDate: string | null;
  /** "HH:MM" or null. */
  drawTime: string | null;
  drawPlace: string;
  /** Comune where the draw happens (its Sindaco receives the communication via SUAP). */
  drawComune: string;
  sportDay: string | null;
  sportDayPlace: string;
  ticketPriceCents: number | null;
  ticketsTotal: number | null;
  prizesDisplayPlace: string;
  prizeDeliveryPlace: string;
  prizeDeliveryUntil: string | null;
  /** Where tickets are sold in person (public page). No online sale. */
  salePoints: string;
  drawOrder: DrawOrder | null;
  /** Optional fundraising goal set by the Direzione; null = no goal shown. */
  goalCents: number | null;
}

export function emptySetup(kind: LotteryKind = "LOTTERIA"): LotterySetup {
  return {
    kind,
    title: "",
    beneficiary: BENEFICIARY_DEFAULT_PURPOSE,
    saleFrom: null,
    saleUntil: null,
    drawDate: null,
    drawTime: null,
    drawPlace: "",
    drawComune: "",
    sportDay: null,
    sportDayPlace: "",
    ticketPriceCents: null,
    ticketsTotal: null,
    prizesDisplayPlace: "",
    prizeDeliveryPlace: "",
    prizeDeliveryUntil: null,
    salePoints: "",
    drawOrder: null,
    goalCents: null,
  };
}

export interface SeriesRange {
  series: string;
  first: number;
  last: number;
}

export interface Issue {
  field: string;
  message: string;
}

export interface SetupCheck {
  /** Blocking problems: the setup cannot be saved. */
  errors: Issue[];
  /** To look at, not blocking. */
  warnings: Issue[];
  /** Fields still empty ("da definire"); not an error. */
  missing: string[];
  /** Price × quantity, null while one of the two is missing. */
  totalCents: number | null;
  /** Legal cap applying to the ticket total for this kind (null for tombola, whose cap is on prizes). */
  capCents: number | null;
}

export const SERIES_CODE = /^[A-Z]{1,3}$/;

export function seriesCount(s: SeriesRange): number {
  return s.last - s.first + 1;
}

/** Ticket total value = price × quantity, or null when unknown. */
export function ticketsTotalCents(
  setup: Pick<LotterySetup, "ticketPriceCents" | "ticketsTotal">,
): number | null {
  if (setup.ticketPriceCents === null || setup.ticketsTotal === null)
    return null;
  return setup.ticketPriceCents * setup.ticketsTotal;
}

export function ticketCapFor(kind: LotteryKind): number | null {
  if (kind === "LOTTERIA") return LOTTERY_TICKETS_CAP_CENTS;
  if (kind === "PESCA") return PESCA_PROCEEDS_CAP_CENTS;
  return null;
}

/** Largest quantity of tickets that stays within the cap at the given price. */
export function maxTicketsAt(
  priceCents: number,
  kind: LotteryKind,
): number | null {
  const cap = ticketCapFor(kind);
  if (cap === null || priceCents <= 0) return null;
  return Math.floor(cap / priceCents);
}

/** Checks a series plan: valid codes, ranges, no duplicates or overlaps, total equal to the tickets issued. */
export function checkSeries(
  series: readonly SeriesRange[],
  ticketsTotal: number | null,
): Issue[] {
  const out: Issue[] = [];
  const codes = new Set<string>();
  for (const s of series) {
    if (!SERIES_CODE.test(s.series))
      out.push({
        field: "series",
        message: `Serie "${s.series}": usa da 1 a 3 lettere maiuscole (es. A).`,
      });
    if (codes.has(s.series))
      out.push({ field: "series", message: `Serie ${s.series} ripetuta.` });
    codes.add(s.series);
    if (
      !Number.isInteger(s.first) ||
      !Number.isInteger(s.last) ||
      s.first < 1 ||
      s.last < s.first
    )
      out.push({
        field: "series",
        message: `Serie ${s.series}: numerazione non valida (dal ${s.first} al ${s.last}).`,
      });
  }
  if (ticketsTotal !== null && series.length > 0) {
    const sum = series.reduce((a, s) => a + Math.max(0, seriesCount(s)), 0);
    if (sum !== ticketsTotal)
      out.push({
        field: "series",
        message: `Le serie contano ${sum} biglietti, ma i biglietti emessi sono ${ticketsTotal}.`,
      });
  }
  return out;
}

/** Equal series of `perSeries` tickets (A, B, … Z, AA, …), numbered 1…perSeries; the last one may be shorter. */
export function suggestSeries(
  ticketsTotal: number,
  perSeries: number,
): SeriesRange[] {
  if (
    !Number.isInteger(ticketsTotal) ||
    !Number.isInteger(perSeries) ||
    ticketsTotal < 1 ||
    perSeries < 1
  )
    return [];
  const out: SeriesRange[] = [];
  let left = ticketsTotal;
  let i = 0;
  while (left > 0 && i < 702) {
    const n = Math.min(perSeries, left);
    out.push({ series: seriesCode(i), first: 1, last: n });
    left -= n;
    i += 1;
  }
  return left > 0 ? [] : out;
}

function seriesCode(i: number): string {
  const A = 65;
  return i < 26
    ? String.fromCharCode(A + i)
    : String.fromCharCode(A + Math.floor(i / 26) - 1) +
        String.fromCharCode(A + (i % 26));
}

const MISSING_LABEL: ReadonlyArray<[keyof LotterySetup, string]> = [
  ["title", "nome dell'iniziativa"],
  ["saleFrom", "inizio vendita"],
  ["saleUntil", "fine vendita"],
  ["drawDate", "data dell'estrazione"],
  ["drawTime", "ora dell'estrazione"],
  ["drawPlace", "luogo dell'estrazione"],
  ["drawComune", "comune dell'estrazione"],
  ["sportDay", "giornata dello sport"],
  ["sportDayPlace", "luogo della giornata dello sport"],
  ["ticketPriceCents", "prezzo del biglietto"],
  ["ticketsTotal", "biglietti emessi"],
  ["prizesDisplayPlace", "dove sono esposti i premi"],
  ["prizeDeliveryPlace", "dove si ritirano i premi"],
  ["prizeDeliveryUntil", "entro quando si ritirano i premi"],
  ["salePoints", "dove si comprano i biglietti"],
  ["drawOrder", "ordine di estrazione dei premi"],
];

/** Hard validation of the setup (cap, dates order, numbers) plus what is still to decide. */
export function checkSetup(
  setup: LotterySetup,
  series: readonly SeriesRange[] = [],
): SetupCheck {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const capCents = ticketCapFor(setup.kind);
  const missing = MISSING_LABEL.filter(([k]) => {
    const v = setup[k];
    return v === null || (typeof v === "string" && v.trim() === "");
  }).map(([, label]) => label);
  if (!setup.beneficiary.trim())
    errors.push({
      field: "beneficiary",
      message: "Scrivi a chi va il ricavato.",
    });

  if (
    setup.ticketPriceCents !== null &&
    (!Number.isInteger(setup.ticketPriceCents) || setup.ticketPriceCents <= 0)
  )
    errors.push({
      field: "ticketPriceCents",
      message: "Il prezzo del biglietto deve essere maggiore di zero.",
    });
  if (
    setup.ticketsTotal !== null &&
    (!Number.isInteger(setup.ticketsTotal) || setup.ticketsTotal <= 0)
  )
    errors.push({
      field: "ticketsTotal",
      message:
        "I biglietti emessi devono essere un numero intero maggiore di zero.",
    });

  const totalCents = ticketsTotalCents(setup);
  if (totalCents !== null && capCents !== null && totalCents > capCents) {
    const max = maxTicketsAt(setup.ticketPriceCents!, setup.kind);
    errors.push({
      field: "ticketsTotal",
      message: `Totale ${formatEuro(totalCents)}: supera il limite di legge di ${formatEuro(capCents)}${
        max !== null
          ? ` (a questo prezzo al massimo ${max.toLocaleString("it-IT")} biglietti)`
          : ""
      }.`,
    });
  }

  for (const k of [
    "saleFrom",
    "saleUntil",
    "drawDate",
    "sportDay",
    "prizeDeliveryUntil",
  ] as const) {
    const v = setup[k];
    if (v !== null && !isDay(v))
      errors.push({ field: k, message: "Data non valida." });
  }
  if (
    setup.drawTime !== null &&
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(setup.drawTime)
  )
    errors.push({ field: "drawTime", message: "Ora non valida (usa HH:MM)." });
  const d = (v: string | null) => (isDay(v) ? v : null);
  const [sf, su, dd, pd] = [
    d(setup.saleFrom),
    d(setup.saleUntil),
    d(setup.drawDate),
    d(setup.prizeDeliveryUntil),
  ];
  if (sf && su && sf > su)
    errors.push({
      field: "saleUntil",
      message: "La vendita finisce prima di iniziare.",
    });
  if (su && dd && su > dd)
    errors.push({
      field: "saleUntil",
      message: "La vendita deve chiudersi entro il giorno dell'estrazione.",
    });
  if (sf && dd && sf > dd)
    errors.push({
      field: "saleFrom",
      message: "La vendita inizia dopo l'estrazione.",
    });
  if (dd && pd && pd < dd)
    errors.push({
      field: "prizeDeliveryUntil",
      message: "Il ritiro dei premi non può finire prima dell'estrazione.",
    });
  if (
    setup.goalCents !== null &&
    (!Number.isInteger(setup.goalCents) || setup.goalCents <= 0)
  )
    errors.push({
      field: "goalCents",
      message: "L'obiettivo, se indicato, deve essere maggiore di zero.",
    });

  errors.push(...checkSeries(series, setup.ticketsTotal));
  if (series.length === 0 && setup.ticketsTotal !== null)
    warnings.push({
      field: "series",
      message:
        "Manca il piano di numerazione (serie e numeri) dei registri a matrice.",
    });
  if (setup.kind === "LOTTERIA")
    warnings.push({
      field: "kind",
      message: `Biglietti venduti solo nella provincia di ${SALE_PROVINCE}.`,
    });
  if (setup.kind === "PESCA")
    warnings.push({
      field: "kind",
      message:
        "Pesca di beneficenza: vendita solo nel territorio del comune (da verificare con il SUAP).",
    });
  if (setup.kind === "TOMBOLA")
    warnings.push({
      field: "kind",
      message: `Tombola: premi fino a ${formatEuro(TOMBOLA_PRIZES_CAP_CENTS)} in totale e cauzione (da verificare).`,
    });
  return { errors, warnings, missing, totalCents, capCents };
}

// ---------------------------------------------------------------------------------------------------------------
// Compliance checklist

export type ComplianceStatus =
  "DA_FARE" | "IN_CORSO" | "FATTO" | "NON_RICHIESTO";
export const COMPLIANCE_STATUSES: readonly ComplianceStatus[] = [
  "DA_FARE",
  "IN_CORSO",
  "FATTO",
  "NON_RICHIESTO",
];
export const COMPLIANCE_STATUS_LABEL: Readonly<
  Record<ComplianceStatus, string>
> = {
  DA_FARE: "Da fare",
  IN_CORSO: "In corso",
  FATTO: "Fatto",
  NON_RICHIESTO: "Non richiesto",
};

type Anchor = "draw" | "saleFrom" | "prizeDelivery" | "f24" | "none";

export interface ComplianceItemDef {
  code: string;
  title: string;
  detail: string;
  /** Who usually handles it (plain text). */
  who: string;
  anchor: Anchor;
  /** Days added to the anchor (negative = before). */
  offsetDays: number;
  /** "VERIFICARE": the sources disagree or it depends on the local office: shown as "verificare se richiesta". */
  certainty: "FONTE" | "VERIFICARE";
  kinds: readonly LotteryKind[];
  /** Has a field for a protocol number / reference. */
  hasProtocol: boolean;
}

const ALL: readonly LotteryKind[] = LOTTERY_KINDS;

export const COMPLIANCE_ITEMS: readonly ComplianceItemDef[] = [
  {
    code: "REGOLAMENTO",
    title: "Regolamento approvato dalla Direzione",
    detail:
      "Art. 14: quantità e natura dei premi, quantità e prezzo dei biglietti, luogo di esposizione dei premi, luogo e data dell'estrazione e della consegna dei premi. Va allegato alle comunicazioni.",
    who: "Direzione",
    anchor: "draw",
    offsetDays: -COMMUNICATION_LEAD_DAYS,
    certainty: "FONTE",
    kinds: ALL,
    hasProtocol: false,
  },
  {
    code: "COM_PREFETTO",
    title: "Comunicazione al Prefetto di Lecco",
    detail:
      "Almeno 30 giorni prima dell'estrazione, con il regolamento. Le variazioni vanno comunicate in tempo.",
    who: "Direzione / legale rappresentante",
    anchor: "draw",
    offsetDays: -COMMUNICATION_LEAD_DAYS,
    certainty: "FONTE",
    kinds: ALL,
    hasProtocol: true,
  },
  {
    code: "COM_SINDACO_SUAP",
    title: "Comunicazione al Sindaco del comune dell'estrazione (tramite SUAP)",
    detail:
      "Almeno 30 giorni prima dell'estrazione, con il regolamento. Chiedere come verrà indicato l'incaricato del Sindaco per l'estrazione.",
    who: "Direzione / legale rappresentante",
    anchor: "draw",
    offsetDays: -COMMUNICATION_LEAD_DAYS,
    certainty: "FONTE",
    kinds: ALL,
    hasProtocol: true,
  },
  {
    code: "COM_ADM",
    title: "Comunicazione all'Agenzia delle Dogane e dei Monopoli",
    detail:
      "Citata da fonti meno recenti (30 giorni prima). Verificare con il SUAP o la Prefettura se è ancora richiesta.",
    who: "Direzione",
    anchor: "draw",
    offsetDays: -COMMUNICATION_LEAD_DAYS,
    certainty: "VERIFICARE",
    kinds: ALL,
    hasProtocol: true,
  },
  {
    code: "CAUZIONE_TOMBOLA",
    title: "Cauzione per la tombola",
    detail: `Tombola: premi fino a ${formatEuro(TOMBOLA_PRIZES_CAP_CENTS)} in totale e cauzione a garanzia. Importo e modalità da verificare con il SUAP.`,
    who: "Tesoreria",
    anchor: "draw",
    offsetDays: -COMMUNICATION_LEAD_DAYS,
    certainty: "VERIFICARE",
    kinds: ["TOMBOLA"],
    hasProtocol: true,
  },
  {
    code: "REGISTRI",
    title: "Biglietti stampati in registri a matrice",
    detail:
      "Ogni biglietto con serie e numero progressivo, come nel piano di numerazione. Pronti prima dell'inizio della vendita.",
    who: "Segreteria / Tesoreria",
    anchor: "saleFrom",
    offsetDays: -1,
    certainty: "FONTE",
    kinds: ["LOTTERIA", "PESCA"],
    hasProtocol: false,
  },
  {
    code: "VENDITA_TERRITORIO",
    title: `Vendita solo nella provincia di ${SALE_PROVINCE}`,
    detail:
      "Per la lotteria i biglietti si vendono solo in provincia; per la pesca di beneficenza solo nel comune. Niente vendita online, niente pagamenti in app.",
    who: "Venditori (staff maggiorenne)",
    anchor: "saleFrom",
    offsetDays: 0,
    certainty: "FONTE",
    kinds: ["LOTTERIA", "PESCA"],
    hasProtocol: false,
  },
  {
    code: "RITIRO_REGISTRI",
    title: "Ritiro di registri e biglietti invenduti prima dell'estrazione",
    detail:
      "Tutti i blocchi assegnati tornano alla società; i biglietti non restituiti sono nulli.",
    who: "Tesoreria",
    anchor: "draw",
    offsetDays: 0,
    certainty: "FONTE",
    kinds: ["LOTTERIA", "PESCA"],
    hasProtocol: false,
  },
  {
    code: "ANNUNCIO_NULLI",
    title: "Annuncio dei biglietti nulli prima dell'estrazione",
    detail:
      "Si annuncia al pubblico, prima di estrarre, l'elenco delle serie e dei numeri non restituiti (nulli).",
    who: "Direzione",
    anchor: "draw",
    offsetDays: 0,
    certainty: "FONTE",
    kinds: ["LOTTERIA"],
    hasProtocol: false,
  },
  {
    code: "INCARICATO_SINDACO",
    title: "Estrazione alla presenza dell'incaricato del Sindaco",
    detail:
      "Senza l'incaricato l'estrazione non si fa. Concordare per tempo data, ora e luogo.",
    who: "Direzione",
    anchor: "draw",
    offsetDays: 0,
    certainty: "FONTE",
    kinds: ALL,
    hasProtocol: false,
  },
  {
    code: "VERBALE",
    title: "Verbale di estrazione e chiusura firmato e inviato",
    detail:
      "Firmato dall'incaricato del Sindaco e inviato a Prefetto e SUAP. La bozza si genera dalla scheda Estrazione.",
    who: "Direzione",
    anchor: "draw",
    offsetDays: 0,
    certainty: "FONTE",
    kinds: ALL,
    hasProtocol: true,
  },
  {
    code: "RITENUTA_F24",
    title: `Ritenuta del ${WITHHOLDING_RATE_PERCENT}% sul valore dei premi (F24)`,
    detail:
      "Sul valore totale dei premi, acquistati o donati, entro il 16 del mese successivo all'estrazione (se festivo, primo giorno lavorativo). Da verificare con il commercialista.",
    who: "Tesoreria / commercialista",
    anchor: "f24",
    offsetDays: 0,
    certainty: "VERIFICARE",
    kinds: ALL,
    hasProtocol: true,
  },
  {
    code: "CONSEGNA_PREMI",
    title: "Consegna dei premi",
    detail: "Nel luogo ed entro la data scritti nel regolamento.",
    who: "Direzione",
    anchor: "prizeDelivery",
    offsetDays: 0,
    certainty: "FONTE",
    kinds: ALL,
    hasProtocol: false,
  },
];

export interface ComplianceRecord {
  status: ComplianceStatus;
  /** Protocol number / reference (text: no documents are stored). */
  protocol: string;
  doneOn: string | null;
  note: string;
}

export const EMPTY_COMPLIANCE: ComplianceRecord = {
  status: "DA_FARE",
  protocol: "",
  doneOn: null,
  note: "",
};

export type DueState =
  | "FATTO"
  | "NON_RICHIESTO"
  | "SCADUTO"
  | "IN_SCADENZA"
  | "IN_TEMPO"
  | "SENZA_DATA";

export interface ComplianceRow extends ComplianceItemDef {
  record: ComplianceRecord;
  dueDate: string | null;
  /** Days from today to the due date (negative = late). */
  daysLeft: number | null;
  dueState: DueState;
}

function anchorDay(setup: LotterySetup, a: Anchor): string | null {
  switch (a) {
    case "draw":
      return isDay(setup.drawDate) ? setup.drawDate : null;
    case "saleFrom":
      return isDay(setup.saleFrom) ? setup.saleFrom : null;
    case "prizeDelivery":
      return isDay(setup.prizeDeliveryUntil) ? setup.prizeDeliveryUntil : null;
    case "f24":
      return isDay(setup.drawDate)
        ? sixteenthOfNextMonth(setup.drawDate)
        : null;
    default:
      return null;
  }
}

/** Due date of an item, computed from the setup (null while its anchor date is missing). */
export function dueDateOf(
  def: Pick<ComplianceItemDef, "anchor" | "offsetDays">,
  setup: LotterySetup,
): string | null {
  const base = anchorDay(setup, def.anchor);
  return base === null ? null : addDays(base, def.offsetDays);
}

/** "Within this many days" counts as close. */
export const DUE_SOON_DAYS = 7;

/** The checklist for the setup's kind, with computed deadlines and their state on `today`. */
export function complianceSchedule(
  setup: LotterySetup,
  records: Readonly<Record<string, ComplianceRecord | undefined>>,
  today: string,
): ComplianceRow[] {
  return COMPLIANCE_ITEMS.filter((d) => d.kinds.includes(setup.kind)).map(
    (d) => {
      const record = records[d.code] ?? EMPTY_COMPLIANCE;
      const dueDate = dueDateOf(d, setup);
      const daysLeft =
        dueDate && isDay(today) ? daysBetween(today, dueDate) : null;
      let dueState: DueState;
      if (record.status === "FATTO") dueState = "FATTO";
      else if (record.status === "NON_RICHIESTO") dueState = "NON_RICHIESTO";
      else if (daysLeft === null) dueState = "SENZA_DATA";
      else if (daysLeft < 0) dueState = "SCADUTO";
      else if (daysLeft <= DUE_SOON_DAYS) dueState = "IN_SCADENZA";
      else dueState = "IN_TEMPO";
      return { ...d, record, dueDate, daysLeft, dueState };
    },
  );
}

/** Latest draw date that still leaves 30 days for the communications, if they are sent on `today`. */
export function earliestDrawDate(today: string): string {
  return addDays(today, COMMUNICATION_LEAD_DAYS);
}

// ---------------------------------------------------------------------------------------------------------------
// Prizes

export type PrizeCategory = "BENE" | "SERVIZIO";
export type PrizeOrigin = "DONATO" | "ACQUISTATO";
export const PRIZE_CATEGORY_LABEL: Readonly<Record<PrizeCategory, string>> = {
  BENE: "Bene",
  SERVIZIO: "Servizio",
};
export const PRIZE_ORIGIN_LABEL: Readonly<Record<PrizeOrigin, string>> = {
  DONATO: "Donato",
  ACQUISTATO: "Acquistato",
};

export interface Prize {
  id: string;
  /** 1 = first prize. */
  rank: number;
  description: string;
  category: PrizeCategory;
  origin: PrizeOrigin;
  /** Slug of a current sponsor (src/lib/sponsors.ts, assets in the registry) or null. */
  sponsorSlug: string | null;
  /** Donor written by hand when it is not a registered sponsor (no logo shown). */
  donorText: string;
  declaredValueCents: number | null;
}

export interface PrizeVerdict {
  level: "forbidden" | "check";
  reason: string;
}

function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’`]/g, "'");
}

const FORBIDDEN: ReadonlyArray<[RegExp, string]> = [
  [
    /\b(denaro|contant[ie]|soldi|banconot[ae]|premio in euro|euro in contanti|cash)\b/,
    "Premi in denaro non ammessi.",
  ],
  [
    /\b(lingott[oi]|barr[ae] d'(oro|argento)|(oro|argento|platino) in barr[ae]|metall[oi] prezios[oi] in barr[ae])\b/,
    "Metalli preziosi in barre non ammessi.",
  ],
  [
    /\b(titol[oi] (di stato|azionari|obbligazionari)|azioni (di|della|societarie)|obbligazion[ei]|btp|buon[oi] (del tesoro|fruttifer[oi]|postal[ei]))\b/,
    "Titoli, azioni e obbligazioni non ammessi.",
  ],
  [
    /\b(cart[ae] di credito|cart[ae] di debito|cart[ae] prepagat[ae]|prepagat[ae]|bancomat)\b/,
    "Carte di credito o prepagate non ammesse.",
  ],
  [
    /\b(assegn[oi]( circolar[ei]| bancar[io])?|bonific[oi]|librett[oi] (di risparmio|postal[ei])|conto corrente|deposito bancario|polizz[ae] di (investimento|capitalizzazione))\b/,
    "Strumenti bancari o finanziari non ammessi.",
  ],
];

const CHECK: ReadonlyArray<[RegExp, string]> = [
  [
    /\b(buon[oi] (acquisto|spesa|regalo|sconto)|gift ?card|voucher|cart[ae] regalo|ricaric[ae])\b/,
    "Buoni e carte regalo: verificare con il commercialista che non siano equiparabili a denaro.",
  ],
];

/** Forbidden-category check on the prize text: goods and services only (no money, bars, securities, cards, bank instruments). */
export function prizeVerdict(description: string): PrizeVerdict | null {
  const t = fold(description);
  for (const [re, reason] of FORBIDDEN)
    if (re.test(t)) return { level: "forbidden", reason };
  for (const [re, reason] of CHECK)
    if (re.test(t)) return { level: "check", reason };
  return null;
}

export function checkPrize(p: Omit<Prize, "id">): Issue[] {
  const out: Issue[] = [];
  if (!p.description.trim())
    out.push({ field: "description", message: "Descrivi il premio." });
  if (p.description.length > 300)
    out.push({
      field: "description",
      message: "Descrizione troppo lunga (max 300 caratteri).",
    });
  const v = prizeVerdict(p.description);
  if (v?.level === "forbidden")
    out.push({ field: "description", message: v.reason });
  if (!Number.isInteger(p.rank) || p.rank < 1)
    out.push({ field: "rank", message: "La posizione del premio parte da 1." });
  if (
    p.declaredValueCents !== null &&
    (!Number.isInteger(p.declaredValueCents) || p.declaredValueCents < 0)
  )
    out.push({ field: "declaredValueCents", message: "Valore non valido." });
  return out;
}

export interface PrizeTotals {
  count: number;
  /** Sum of the declared values known so far. */
  totalCents: number;
  /** Prizes without a declared value: the total is partial. */
  withoutValue: number;
  /** 10% of the known total. */
  withholdingCents: number;
  complete: boolean;
  /** Tombola only: over the prize cap? */
  overTombolaCap: boolean;
  duplicateRanks: number[];
  forbidden: number;
}

export function prizeTotals(
  prizes: readonly Prize[],
  kind: LotteryKind,
): PrizeTotals {
  const totalCents = prizes.reduce(
    (a, p) => a + (p.declaredValueCents ?? 0),
    0,
  );
  const withoutValue = prizes.filter(
    (p) => p.declaredValueCents === null,
  ).length;
  const seen = new Map<number, number>();
  for (const p of prizes) seen.set(p.rank, (seen.get(p.rank) ?? 0) + 1);
  return {
    count: prizes.length,
    totalCents,
    withoutValue,
    withholdingCents: percentOf(totalCents, WITHHOLDING_RATE_PERCENT),
    complete: prizes.length > 0 && withoutValue === 0,
    overTombolaCap: kind === "TOMBOLA" && totalCents > TOMBOLA_PRIZES_CAP_CENTS,
    duplicateRanks: [...seen.entries()]
      .filter(([, n]) => n > 1)
      .map(([r]) => r)
      .sort((a, b) => a - b),
    forbidden: prizes.filter(
      (p) => prizeVerdict(p.description)?.level === "forbidden",
    ).length,
  };
}

export function sortPrizes(prizes: readonly Prize[]): Prize[] {
  return [...prizes].sort(
    (a, b) =>
      a.rank - b.rank || a.description.localeCompare(b.description, "it"),
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Ticket register

export type BlockStatus = "ASSEGNATO" | "RESTITUITO" | "NON_RESTITUITO";
export const BLOCK_STATUS_LABEL: Readonly<Record<BlockStatus, string>> = {
  ASSEGNATO: "Assegnato (fuori)",
  RESTITUITO: "Restituito",
  NON_RESTITUITO: "Non restituito",
};

export interface NumberRange {
  from: number;
  to: number;
}

export interface TicketBlock {
  id: string;
  series: string;
  from: number;
  to: number;
  /** Staff member, adult (names of adults only: no minors sell tickets). */
  seller: string;
  sellerAdultConfirmed: boolean;
  assignedOn: string | null;
  status: BlockStatus;
  /** Unsold tickets handed back with the register (only for RESTITUITO). */
  unsold: NumberRange[];
  /** Money handed over by the seller, if recorded. */
  collectedCents: number | null;
  note: string;
}

export function rangeCount(r: NumberRange): number {
  return r.to - r.from + 1;
}

function overlaps(a: NumberRange, b: NumberRange): boolean {
  return a.from <= b.to && b.from <= a.to;
}

/** "12-15, 20, 31-40" → ranges (sorted); null when malformed. */
export function parseRanges(text: string): NumberRange[] | null {
  const t = text.trim();
  if (!t) return [];
  const out: NumberRange[] = [];
  for (const part of t.split(/[,;\s]+/).filter(Boolean)) {
    const m = /^(\d+)(?:[-–](\d+))?$/.exec(part);
    if (!m) return null;
    const from = Number(m[1]);
    const to = m[2] ? Number(m[2]) : from;
    if (to < from) return null;
    out.push({ from, to });
  }
  return out.sort((a, b) => a.from - b.from);
}

export function formatRanges(rs: readonly NumberRange[]): string {
  return rs
    .map((r) => (r.from === r.to ? String(r.from) : `${r.from}-${r.to}`))
    .join(", ");
}

/** Validation of one block against the series plan and the other blocks. */
export function checkBlock(
  block: Omit<TicketBlock, "id"> & { id?: string },
  series: readonly SeriesRange[],
  others: readonly TicketBlock[],
): Issue[] {
  const out: Issue[] = [];
  const s = series.find((x) => x.series === block.series);
  if (!s)
    out.push({
      field: "series",
      message: `La serie ${block.series || "?"} non è nel piano di numerazione.`,
    });
  if (
    !Number.isInteger(block.from) ||
    !Number.isInteger(block.to) ||
    block.from < 1 ||
    block.to < block.from
  )
    out.push({ field: "from", message: "Numeri del blocco non validi." });
  else if (s && (block.from < s.first || block.to > s.last))
    out.push({
      field: "from",
      message: `Il blocco esce dalla serie ${s.series} (${s.first}–${s.last}).`,
    });
  if (!block.seller.trim())
    out.push({
      field: "seller",
      message: "Scrivi a chi è affidato il blocco.",
    });
  if (!block.sellerAdultConfirmed)
    out.push({
      field: "seller",
      message: "Conferma che chi vende è maggiorenne e dello staff.",
    });
  for (const o of others) {
    if (o.id === block.id || o.series !== block.series) continue;
    if (overlaps(o, block))
      out.push({
        field: "from",
        message: `Si sovrappone al blocco ${o.series} ${o.from}–${o.to} (${o.seller}).`,
      });
  }
  if (block.status !== "RESTITUITO" && block.unsold.length > 0)
    out.push({
      field: "unsold",
      message: "Gli invenduti si segnano solo quando il blocco è restituito.",
    });
  const sorted = [...block.unsold].sort((a, b) => a.from - b.from);
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i]!;
    if (r.from < block.from || r.to > block.to)
      out.push({
        field: "unsold",
        message: `Invenduti ${formatRanges([r])} fuori dal blocco.`,
      });
    if (i > 0 && overlaps(sorted[i - 1]!, r))
      out.push({ field: "unsold", message: "Invenduti ripetuti." });
  }
  if (
    block.collectedCents !== null &&
    (!Number.isInteger(block.collectedCents) || block.collectedCents < 0)
  )
    out.push({ field: "collectedCents", message: "Importo non valido." });
  return out;
}

export interface VoidBlock {
  series: string;
  from: number;
  to: number;
  seller: string;
  count: number;
}

export interface Reconciliation {
  issued: number;
  assigned: number;
  /** Tickets never handed to a seller (stayed with the club, unsold). */
  notAssigned: number;
  notAssignedRanges: Array<{ series: string } & NumberRange>;
  /** Blocks still out: reconciliation not finished. */
  stillOut: number;
  stillOutBlocks: number;
  returnedUnsold: number;
  sold: number;
  /** Tickets of blocks not returned: void. Announced before the draw. */
  voidCount: number;
  voidBlocks: VoidBlock[];
  expectedCents: number | null;
  collectedCents: number;
  /** collected − expected (negative = missing money); null while price unknown or blocks missing amounts. */
  differenceCents: number | null;
  readyForDraw: boolean;
}

function subtractRanges(
  whole: NumberRange,
  parts: readonly NumberRange[],
): NumberRange[] {
  let out: NumberRange[] = [whole];
  for (const p of [...parts].sort((a, b) => a.from - b.from)) {
    const next: NumberRange[] = [];
    for (const r of out) {
      if (!overlaps(r, p)) {
        next.push(r);
        continue;
      }
      if (p.from > r.from) next.push({ from: r.from, to: p.from - 1 });
      if (p.to < r.to) next.push({ from: p.to + 1, to: r.to });
    }
    out = next;
  }
  return out;
}

/** Reconciliation of the registers before the draw. */
export function reconcile(
  series: readonly SeriesRange[],
  blocks: readonly TicketBlock[],
  priceCents: number | null,
): Reconciliation {
  const issued = series.reduce((a, s) => a + seriesCount(s), 0);
  const assigned = blocks.reduce((a, b) => a + rangeCount(b), 0);
  const notAssignedRanges = series.flatMap((s) =>
    subtractRanges(
      { from: s.first, to: s.last },
      blocks.filter((b) => b.series === s.series),
    ).map((r) => ({ series: s.series, ...r })),
  );
  const out = blocks.filter((b) => b.status === "ASSEGNATO");
  const returned = blocks.filter((b) => b.status === "RESTITUITO");
  const voids = blocks.filter((b) => b.status === "NON_RESTITUITO");
  const returnedUnsold = returned.reduce(
    (a, b) => a + b.unsold.reduce((x, r) => x + rangeCount(r), 0),
    0,
  );
  const sold = returned.reduce((a, b) => a + rangeCount(b), 0) - returnedUnsold;
  const collectedCents = blocks.reduce(
    (a, b) => a + (b.collectedCents ?? 0),
    0,
  );
  const expectedCents = priceCents === null ? null : sold * priceCents;
  const allAmounts = returned.every((b) => b.collectedCents !== null);
  return {
    issued,
    assigned,
    notAssigned: notAssignedRanges.reduce((a, r) => a + rangeCount(r), 0),
    notAssignedRanges,
    stillOut: out.reduce((a, b) => a + rangeCount(b), 0),
    stillOutBlocks: out.length,
    returnedUnsold,
    sold,
    voidCount: voids.reduce((a, b) => a + rangeCount(b), 0),
    voidBlocks: voids
      .map((b) => ({
        series: b.series,
        from: b.from,
        to: b.to,
        seller: b.seller,
        count: rangeCount(b),
      }))
      .sort((a, b) => a.series.localeCompare(b.series) || a.from - b.from),
    expectedCents,
    collectedCents,
    differenceCents:
      expectedCents === null || !allAmounts
        ? null
        : collectedCents - expectedCents,
    readyForDraw: blocks.length > 0 && out.length === 0,
  };
}

export type TicketState =
  | "VALIDO"
  | "NULLO"
  | "INVENDUTO"
  | "FUORI_BLOCCO"
  | "NON_EMESSO"
  | "DA_RICONCILIARE";
export const TICKET_STATE_LABEL: Readonly<Record<TicketState, string>> = {
  VALIDO: "Biglietto venduto: vince",
  NULLO: "Biglietto nullo (blocco non restituito): si ripete l'estrazione",
  INVENDUTO: "Biglietto invenduto: si ripete l'estrazione",
  FUORI_BLOCCO: "Biglietto mai consegnato ai venditori: si ripete l'estrazione",
  NON_EMESSO: "Serie o numero non emessi: controllare e ripetere",
  DA_RICONCILIARE:
    "Blocco ancora fuori: completare il ritiro dei registri prima di estrarre",
};

/** What a drawn series/number means for the draw. */
export function ticketState(
  series: readonly SeriesRange[],
  blocks: readonly TicketBlock[],
  s: string,
  n: number,
): TicketState {
  const range = series.find((x) => x.series === s);
  if (!range || !Number.isInteger(n) || n < range.first || n > range.last)
    return "NON_EMESSO";
  const block = blocks.find((b) => b.series === s && n >= b.from && n <= b.to);
  if (!block) return "FUORI_BLOCCO";
  if (block.status === "ASSEGNATO") return "DA_RICONCILIARE";
  if (block.status === "NON_RESTITUITO") return "NULLO";
  if (block.unsold.some((r) => n >= r.from && n <= r.to)) return "INVENDUTO";
  return "VALIDO";
}

// ---------------------------------------------------------------------------------------------------------------
// Draw

export interface DrawEntry {
  id: string;
  /** 1, 2, 3… in the order of extraction. */
  order: number;
  series: string;
  number: number;
  state: TicketState;
  /** Prize assigned when the ticket is valid. */
  prizeId: string | null;
  /** "HH:MM" when recorded. */
  at: string | null;
}

/** Prizes still to assign, in the order chosen by the regolamento (null order = by rank). */
export function remainingPrizes(
  prizes: readonly Prize[],
  draws: readonly DrawEntry[],
  order: DrawOrder | null,
): Prize[] {
  const taken = new Set(
    draws
      .filter((d) => d.state === "VALIDO" && d.prizeId)
      .map((d) => d.prizeId),
  );
  const left = sortPrizes(prizes).filter((p) => !taken.has(p.id));
  return order === "DALL_ULTIMO" ? left.reverse() : left;
}

export interface DrawProposal {
  state: TicketState;
  /** Prize the valid ticket wins (the next one in order), null otherwise. */
  prize: Prize | null;
  duplicate: boolean;
}

/** Outcome of a drawn ticket before it is recorded. A number already drawn is flagged and never wins twice. */
export function proposeDraw(
  series: readonly SeriesRange[],
  blocks: readonly TicketBlock[],
  prizes: readonly Prize[],
  draws: readonly DrawEntry[],
  order: DrawOrder | null,
  s: string,
  n: number,
): DrawProposal {
  const duplicate = draws.some((d) => d.series === s && d.number === n);
  const state = ticketState(series, blocks, s, n);
  const prize =
    state === "VALIDO" && !duplicate
      ? (remainingPrizes(prizes, draws, order)[0] ?? null)
      : null;
  return { state, prize, duplicate };
}

export interface Winner {
  rank: number;
  prize: string;
  series: string;
  number: number;
}

/** Winning tickets by prize rank (public list once the Direzione confirms). */
export function winners(
  prizes: readonly Prize[],
  draws: readonly DrawEntry[],
): Winner[] {
  const byId = new Map(prizes.map((p) => [p.id, p]));
  return draws
    .filter((d) => d.state === "VALIDO" && d.prizeId && byId.has(d.prizeId))
    .map((d) => {
      const p = byId.get(d.prizeId!)!;
      return {
        rank: p.rank,
        prize: p.description,
        series: d.series,
        number: d.number,
      };
    })
    .sort((a, b) => a.rank - b.rank);
}

export function drawComplete(
  prizes: readonly Prize[],
  draws: readonly DrawEntry[],
): boolean {
  return prizes.length > 0 && remainingPrizes(prizes, draws, null).length === 0;
}

// ---------------------------------------------------------------------------------------------------------------
// Funds

export type LedgerKind = "INCASSO" | "COSTO";
export const LEDGER_KIND_LABEL: Readonly<Record<LedgerKind, string>> = {
  INCASSO: "Incasso",
  COSTO: "Costo",
};

export interface LedgerEntry {
  id: string;
  kind: LedgerKind;
  label: string;
  amountCents: number;
  entryDate: string;
  cancelled: boolean;
}

export interface FundsSummary {
  proceedsCents: number;
  costsCents: number;
  /** Net destined to the calcetto pitch of the parish church. */
  netCents: number;
  entries: number;
  /** 0–100 when a goal exists, else null. */
  goalPercent: number | null;
}

export function checkLedgerEntry(
  e: Omit<LedgerEntry, "id" | "cancelled">,
): Issue[] {
  const out: Issue[] = [];
  if (!e.label.trim())
    out.push({ field: "label", message: "Scrivi la descrizione." });
  if (e.label.length > 200)
    out.push({ field: "label", message: "Descrizione troppo lunga." });
  if (!Number.isInteger(e.amountCents) || e.amountCents <= 0)
    out.push({
      field: "amountCents",
      message: "L'importo deve essere maggiore di zero.",
    });
  if (!isDay(e.entryDate))
    out.push({ field: "entryDate", message: "Data non valida." });
  return out;
}

export function fundsSummary(
  entries: readonly LedgerEntry[],
  goalCents: number | null = null,
): FundsSummary {
  const live = entries.filter((e) => !e.cancelled);
  const proceedsCents = live
    .filter((e) => e.kind === "INCASSO")
    .reduce((a, e) => a + e.amountCents, 0);
  const costsCents = live
    .filter((e) => e.kind === "COSTO")
    .reduce((a, e) => a + e.amountCents, 0);
  const netCents = proceedsCents - costsCents;
  const goalPercent =
    goalCents && goalCents > 0
      ? Math.max(0, Math.min(100, Math.floor((netCents * 100) / goalCents)))
      : null;
  return {
    proceedsCents,
    costsCents,
    netCents,
    entries: live.length,
    goalPercent,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Public window and countdown

export interface PublicWindowDays {
  showFrom: string;
  showUntil: string;
}

/** Public from the day the Direzione publishes to the last day of prize delivery (or sport day / draw). */
export function publicWindow(
  setup: LotterySetup,
  publishedOn: string | null,
): PublicWindowDays | null {
  if (!isDay(publishedOn)) return null;
  const end = [setup.prizeDeliveryUntil, setup.sportDay, setup.drawDate]
    .filter(isDay)
    .sort()
    .pop();
  return {
    showFrom: publishedOn,
    showUntil: end && end >= publishedOn ? end : publishedOn,
  };
}

export interface Countdown {
  days: number;
  label: string;
}

/** "Mancano 12 giorni" / "Domani" / "Oggi"; null when the day passed or is unknown. */
export function countdown(
  today: string,
  target: string | null,
): Countdown | null {
  if (!isDay(today) || !isDay(target)) return null;
  const days = daysBetween(today, target);
  if (days < 0) return null;
  return {
    days,
    label:
      days === 0 ? "È oggi" : days === 1 ? "Domani" : `Mancano ${days} giorni`,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Drafts: regolamento and verbale (plain Markdown, for Direzione review: never sent anywhere by the app)

const blank = (label: string) => `[da completare: ${label}]`;
const or = (v: string | null | undefined, label: string) =>
  v && v.trim() ? v.trim() : blank(label);
const dayOr = (v: string | null | undefined, label: string) =>
  isDay(v) ? longDay(v) : blank(label);

export function regolamentoMissing(
  setup: LotterySetup,
  series: readonly SeriesRange[],
  prizes: readonly Prize[],
): string[] {
  const out = checkSetup(setup, series).missing;
  if (series.length === 0) out.push("serie e numerazione dei biglietti");
  if (prizes.length === 0) out.push("elenco dei premi");
  return out;
}

/** Italian draft of the regolamento with the art. 14 contents. Unknown values stay as visible "[da completare]". */
export function buildRegolamento(
  setup: LotterySetup,
  series: readonly SeriesRange[],
  prizes: readonly Prize[],
  today: string,
): string {
  const kind = KIND_LABEL[setup.kind];
  const title = setup.title.trim() || blank("nome dell'iniziativa");
  const total = ticketsTotalCents(setup);
  const sorted = sortPrizes(prizes);
  const lines: string[] = [];
  lines.push(`# Regolamento — ${title}`);
  lines.push("");
  lines.push(
    `**Bozza per la Direzione.** Da verificare con SUAP, Prefettura di Lecco e commercialista prima dell'invio. Generata dall'app il ${shortDay(today)}.`,
  );
  lines.push("");
  lines.push("## Art. 1 — Promotore");
  lines.push(
    `${CLUB_NAME}, associazione sportiva dilettantistica senza fini di lucro, con sede in ${blank("sede legale")}, codice fiscale ${blank("codice fiscale")}, legale rappresentante ${blank("nome del legale rappresentante")}.`,
  );
  lines.push("");
  lines.push("## Art. 2 — Tipo di manifestazione e finalità");
  lines.push(
    `${kind} ai sensi del D.P.R. 26 ottobre 2001, n. 430. Finalità: ${or(setup.beneficiary, "destinazione del ricavato")}`,
  );
  if (setup.sportDay)
    lines.push(
      `L'iniziativa si conclude con la giornata dedicata a tutti gli sport: ${dayOr(setup.sportDay, "data")}, ${or(setup.sportDayPlace, "luogo")}.`,
    );
  lines.push("");
  lines.push("## Art. 3 — Biglietti");
  lines.push(
    `Sono emessi ${setup.ticketsTotal !== null ? setup.ticketsTotal.toLocaleString("it-IT") : blank("numero di biglietti")} biglietti al prezzo di ${setup.ticketPriceCents !== null ? formatEuro(setup.ticketPriceCents) : blank("prezzo")} ciascuno, per un valore complessivo di ${total !== null ? formatEuro(total) : blank("valore complessivo")}.`,
  );
  if (series.length > 0) {
    lines.push(
      `I biglietti sono staccati da registri a matrice, con serie e numero progressivo: ${series.map((s) => `serie ${s.series} dal n. ${s.first} al n. ${s.last}`).join("; ")}.`,
    );
  } else {
    lines.push(
      `I biglietti sono staccati da registri a matrice, con serie e numero progressivo: ${blank("serie e numerazione")}.`,
    );
  }
  if (setup.kind !== "TOMBOLA")
    lines.push(
      `La vendita si svolge solo nella provincia di ${SALE_PROVINCE}${setup.kind === "PESCA" ? `, nel territorio del comune di ${or(setup.drawComune, "comune")}` : ""}, dal ${dayOr(setup.saleFrom, "inizio vendita")} al ${dayOr(setup.saleUntil, "fine vendita")}, presso: ${or(setup.salePoints, "punti vendita")}. Non è prevista vendita online.`,
    );
  lines.push("");
  lines.push("## Art. 4 — Premi");
  if (sorted.length === 0) {
    lines.push(blank("elenco dei premi (quantità e natura)"));
  } else {
    lines.push(`Sono in palio ${sorted.length} premi, solo beni e servizi:`);
    for (const p of sorted)
      lines.push(
        `${p.rank}. ${p.description}${p.declaredValueCents !== null ? ` — valore dichiarato ${formatEuro(p.declaredValueCents)}` : ` — ${blank("valore")}`}`,
      );
  }
  lines.push(
    `I premi sono esposti presso: ${or(setup.prizesDisplayPlace, "luogo di esposizione dei premi")}.`,
  );
  lines.push("");
  lines.push("## Art. 5 — Estrazione");
  lines.push(
    `L'estrazione si svolge il ${dayOr(setup.drawDate, "data dell'estrazione")}${setup.drawTime ? ` alle ore ${setup.drawTime}` : ` alle ore ${blank("ora")}`}, presso ${or(setup.drawPlace, "luogo dell'estrazione")}, comune di ${or(setup.drawComune, "comune")}, alla presenza dell'incaricato del Sindaco.`,
  );
  lines.push(
    `I premi sono estratti ${setup.drawOrder ? DRAW_ORDER_LABEL[setup.drawOrder] : blank("ordine di estrazione")}.`,
  );
  lines.push(
    "Prima dell'estrazione sono ritirati tutti i registri e i biglietti invenduti. I biglietti non restituiti sono nulli: serie e numeri sono annunciati al pubblico prima dell'estrazione. Se viene estratto un biglietto nullo o invenduto, l'estrazione si ripete.",
  );
  lines.push(
    "Al termine è redatto il verbale di estrazione e chiusura, firmato dall'incaricato del Sindaco e inviato al Prefetto e al Sindaco (SUAP).",
  );
  lines.push("");
  lines.push("## Art. 6 — Pubblicazione e consegna dei premi");
  lines.push(
    `I numeri vincenti sono pubblicati dalla ${CLUB_NAME} dopo la conferma della Direzione. I premi si ritirano presso ${or(setup.prizeDeliveryPlace, "luogo di consegna")} entro il ${dayOr(setup.prizeDeliveryUntil, "termine di ritiro")}, presentando il biglietto vincente integro.`,
  );
  lines.push(
    `Premi non ritirati entro il termine: ${blank("destinazione dei premi non ritirati")}.`,
  );
  lines.push("");
  lines.push("## Art. 7 — Variazioni");
  lines.push(
    "Ogni variazione è comunicata in tempo al Prefetto e al Sindaco (SUAP) e resa nota al pubblico.",
  );
  lines.push("");
  lines.push(`Luogo e data: ${blank("luogo")}, ${blank("data")}`);
  lines.push("");
  lines.push("Il legale rappresentante ______________________________");
  return lines.join("\n");
}

export interface VerbaleInput {
  setup: LotterySetup;
  series: readonly SeriesRange[];
  blocks: readonly TicketBlock[];
  prizes: readonly Prize[];
  draws: readonly DrawEntry[];
}

/** Draft of the "verbale di estrazione e chiusura" with spaces for the delegate's signature. */
export function buildVerbale({
  setup,
  series,
  blocks,
  prizes,
  draws,
}: VerbaleInput): string {
  const r = reconcile(series, blocks, setup.ticketPriceCents);
  const title = setup.title.trim() || blank("nome dell'iniziativa");
  const ordered = [...draws].sort((a, b) => a.order - b.order);
  const byId = new Map(prizes.map((p) => [p.id, p]));
  const L: string[] = [];
  L.push(`# Verbale di estrazione e chiusura — ${title}`);
  L.push("");
  L.push(
    `**Bozza generata dall'app: da verificare, completare e firmare.** ${KIND_LABEL[setup.kind]} promossa da ${CLUB_NAME} ai sensi del D.P.R. 430/2001.`,
  );
  L.push("");
  L.push(
    `L'anno ${isDay(setup.drawDate) ? setup.drawDate.slice(0, 4) : "______"}, il giorno ${dayOr(setup.drawDate, "data")}, alle ore ${setup.drawTime ?? "______"}, presso ${or(setup.drawPlace, "luogo")}, comune di ${or(setup.drawComune, "comune")}, alla presenza di:`,
  );
  L.push("");
  L.push(
    "- incaricato del Sindaco: ______________________________ (documento ______________________)",
  );
  L.push(
    "- per il promotore, il legale rappresentante o suo delegato: ______________________________",
  );
  L.push("");
  L.push("si procede alle operazioni di chiusura ed estrazione.");
  L.push("");
  L.push("## 1. Chiusura della vendita");
  L.push(
    `- Biglietti emessi: ${r.issued.toLocaleString("it-IT")}${series.length ? ` (${series.map((s) => `serie ${s.series} n. ${s.first}–${s.last}`).join("; ")})` : ""}`,
  );
  L.push(`- Biglietti venduti: ${r.sold.toLocaleString("it-IT")}`);
  L.push(
    `- Biglietti invenduti restituiti: ${r.returnedUnsold.toLocaleString("it-IT")}`,
  );
  L.push(
    `- Biglietti mai consegnati ai venditori: ${r.notAssigned.toLocaleString("it-IT")}`,
  );
  L.push(
    `- Biglietti nulli (registri non restituiti): ${r.voidCount.toLocaleString("it-IT")}`,
  );
  if (r.stillOutBlocks > 0)
    L.push(
      `- ATTENZIONE: ${r.stillOutBlocks} blocchi risultano ancora fuori. Completare il ritiro prima di estrarre.`,
    );
  L.push("");
  L.push(
    "Prima dell'estrazione è stato annunciato al pubblico che i seguenti biglietti, non restituiti, sono nulli:",
  );
  if (r.voidBlocks.length === 0) L.push("- nessuno");
  for (const v of r.voidBlocks)
    L.push(
      `- serie ${v.series}, dal n. ${v.from} al n. ${v.to} (${v.count} biglietti)`,
    );
  L.push("");
  L.push("## 2. Estrazione");
  L.push(
    `Ordine di estrazione: ${setup.drawOrder ? DRAW_ORDER_LABEL[setup.drawOrder] : "______"}.`,
  );
  L.push("");
  L.push("| # | Serie | Numero | Esito | Premio |");
  L.push("|---|---|---|---|---|");
  if (ordered.length === 0)
    L.push("| — | — | — | nessuna estrazione registrata | — |");
  for (const d of ordered) {
    const p = d.prizeId ? byId.get(d.prizeId) : undefined;
    const esito =
      d.state === "VALIDO"
        ? "vincente"
        : d.state === "NULLO"
          ? "nullo, si ripete"
          : d.state === "INVENDUTO"
            ? "invenduto, si ripete"
            : "non valido, si ripete";
    L.push(
      `| ${d.order} | ${d.series} | ${d.number} | ${esito} | ${p ? `${p.rank}° — ${p.description.replace(/\|/g, "/")}` : "—"} |`,
    );
  }
  L.push("");
  const left = remainingPrizes(prizes, draws, null);
  if (left.length > 0)
    L.push(
      `Premi ancora da estrarre: ${left.map((p) => `${p.rank}°`).join(", ")}.`,
    );
  L.push("");
  L.push("## 3. Chiusura");
  L.push(
    `I premi sono consegnati presso ${or(setup.prizeDeliveryPlace, "luogo di consegna")} entro il ${dayOr(setup.prizeDeliveryUntil, "termine")}. Il presente verbale è inviato al Prefetto di ${SALE_PROVINCE} e al Sindaco del comune di ${or(setup.drawComune, "comune")} (SUAP).`,
  );
  L.push("");
  L.push("Letto, confermato e sottoscritto.");
  L.push("");
  L.push("L'incaricato del Sindaco ______________________________");
  L.push("");
  L.push(
    "Il legale rappresentante del promotore ______________________________",
  );
  return L.join("\n");
}

// ---------------------------------------------------------------------------------------------------------------
// Alternatives (info cards)

export interface AlternativeCard {
  kind: LotteryKind;
  title: string;
  points: readonly string[];
}

export const ALTERNATIVES: readonly AlternativeCard[] = [
  {
    kind: "LOTTERIA",
    title: "Lotteria",
    points: [
      `Biglietti venduti solo in provincia di ${SALE_PROVINCE}`,
      `Valore totale dei biglietti fino a ${formatEuro(LOTTERY_TICKETS_CAP_CENTS)}`,
      "Estrazione in pubblico con l'incaricato del Sindaco",
      "Adatta a una raccolta di qualche settimana con premi dei partner",
    ],
  },
  {
    kind: "TOMBOLA",
    title: "Tombola",
    points: [
      `Premi fino a ${formatEuro(TOMBOLA_PRIZES_CAP_CENTS)} in totale`,
      "Cauzione a garanzia dei premi (da verificare con il SUAP)",
      "Si gioca in una serata, con cartelle",
    ],
  },
  {
    kind: "PESCA",
    title: "Pesca di beneficenza",
    points: [
      `Ricavato fino a ${formatEuro(PESCA_PROCEEDS_CAP_CENTS)}`,
      "Vendita solo nel territorio del comune",
      "Adatta a un banco durante la giornata dello sport",
    ],
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Whole state (back office, simulation and database share this shape)

export interface LotteryState {
  id: string | null;
  setup: LotterySetup;
  series: SeriesRange[];
  compliance: Record<string, ComplianceRecord>;
  prizes: Prize[];
  blocks: TicketBlock[];
  draws: DrawEntry[];
  ledger: LedgerEntry[];
  publishedOn: string | null;
  winnersConfirmedOn: string | null;
}

export function emptyState(): LotteryState {
  return {
    id: null,
    setup: emptySetup(),
    series: [],
    compliance: {},
    prizes: [],
    blocks: [],
    draws: [],
    ledger: [],
    publishedOn: null,
    winnersConfirmedOn: null,
  };
}

/** Public projection: only what the public page may show (no seller names, no values, winners only once confirmed). */
export interface PublicLottery {
  kind: LotteryKind;
  title: string;
  beneficiary: string;
  saleFrom: string | null;
  saleUntil: string | null;
  drawDate: string | null;
  drawTime: string | null;
  drawPlace: string;
  sportDay: string | null;
  sportDayPlace: string;
  ticketPriceCents: number | null;
  salePoints: string;
  prizesDisplayPlace: string;
  prizeDeliveryPlace: string;
  prizeDeliveryUntil: string | null;
  prizes: Array<{
    rank: number;
    description: string;
    sponsorSlug: string | null;
  }>;
  winners: Winner[] | null;
  funds: {
    netCents: number;
    goalCents: number | null;
    goalPercent: number | null;
  };
  publishedOn: string;
}

export function toPublic(state: LotteryState): PublicLottery | null {
  if (!state.publishedOn) return null;
  const s = state.setup;
  const f = fundsSummary(state.ledger, s.goalCents);
  return {
    kind: s.kind,
    title: s.title,
    beneficiary: s.beneficiary,
    saleFrom: s.saleFrom,
    saleUntil: s.saleUntil,
    drawDate: s.drawDate,
    drawTime: s.drawTime,
    drawPlace: s.drawPlace,
    sportDay: s.sportDay,
    sportDayPlace: s.sportDayPlace,
    ticketPriceCents: s.ticketPriceCents,
    salePoints: s.salePoints,
    prizesDisplayPlace: s.prizesDisplayPlace,
    prizeDeliveryPlace: s.prizeDeliveryPlace,
    prizeDeliveryUntil: s.prizeDeliveryUntil,
    prizes: sortPrizes(state.prizes).map((p) => ({
      rank: p.rank,
      description: p.description,
      sponsorSlug: p.sponsorSlug,
    })),
    winners: state.winnersConfirmedOn
      ? winners(state.prizes, state.draws)
      : null,
    funds: {
      netCents: Math.max(0, f.netCents),
      goalCents: s.goalCents,
      goalPercent: f.goalPercent,
    },
    publishedOn: state.publishedOn,
  };
}

/** Local id for simulation rows. */
export function localId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
