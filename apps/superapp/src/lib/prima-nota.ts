/**
 * Prima nota (Direzione 13/10/2026): the "contabilità ordinaria" view of an ASD in regime 398/91, built on the
 * existing ledger rows (scd_ledger_entries through scd_ledger_board). Pure functions only:
 *  - chronological register with running balance COMPUTED from the opening balance of the statement (never typed);
 *  - centro di costo and nature (istituzionale / commerciale) PROPOSED by rules, with confidence: never confirmed here;
 *  - cash traceability flags (>= 1.000 €), month totals, CSV of the month and the monthly closing checklist.
 * No IBAN, no fiscal code and no athlete name ever enters this module's outputs meant for export.
 */
import {
  CATEGORY_LABEL,
  MATCH_LABEL,
  type LedgerEntry,
  type MatchState,
} from "./ledger";

/* ------------------------------------------------------------------ accounts */

export type AccountId = "sumup" | "banca" | "cassa";
export const ACCOUNT_LABEL: Readonly<Record<AccountId, string>> = {
  sumup: "Conto SumUp",
  banca: "Banca",
  cassa: "Cassa contanti",
};

/**
 * Account of a ledger row from scd_ledger_entries.account (e.g. "SUMUP_…", "CASSA_…", any other = bank).
 * Rows without the field come from the only register loaded today, the SumUp business account.
 */
export function accountOf(
  e: Pick<LedgerEntry, "kind"> & { account?: string | null },
): AccountId {
  const a = (e.account ?? "").toUpperCase();
  if (/^CASSA|CONTANT/.test(a) || /^CASSA/.test(e.kind.toUpperCase()))
    return "cassa";
  if (a === "" || a.startsWith("SUMUP")) return "sumup";
  return "banca";
}

/* --------------------------------------------------------- centri e natura */

export type Nature =
  "istituzionale" | "commerciale" | "neutro" | "da-classificare";
export const NATURE_LABEL: Readonly<Record<Nature, string>> = {
  istituzionale: "Istituzionale",
  commerciale: "Commerciale",
  neutro: "Giroconto",
  "da-classificare": "Da classificare",
};

export const COST_CENTERS = [
  "quote",
  "fondo-solidale",
  "pulmini",
  "sponsor",
  "biglietteria",
  "club-house-colico",
  "club-house-dervio",
  "club-house",
  "incassi-pos",
  "materiale-sportivo",
  "servizi-online",
  "federazione",
  "utenze-impianti",
  "fornitori",
  "compensi-staff",
  "rimborsi",
  "oneri-bancari",
  "giroconto-cassa",
  "da-classificare",
] as const;
export type CostCenter = (typeof COST_CENTERS)[number];

export const CENTER_LABEL: Readonly<Record<CostCenter, string>> = {
  quote: "Quote",
  "fondo-solidale": "Fondo Solidale",
  pulmini: "Pulmini",
  sponsor: "Sponsor",
  biglietteria: "Biglietteria",
  "club-house-colico": "Club House Colico",
  "club-house-dervio": "Club House Dervio",
  "club-house": "Club House (sede da indicare)",
  "incassi-pos": "Incassi POS e link",
  "materiale-sportivo": "Materiale sportivo",
  "servizi-online": "Servizi online",
  federazione: "Federazione",
  "utenze-impianti": "Utenze e impianti",
  fornitori: "Fornitori (categoria da indicare)",
  "compensi-staff": "Compensi e staff",
  rimborsi: "Rimborsi spese",
  "oneri-bancari": "Oneri bancari",
  "giroconto-cassa": "Giroconto banca → cassa",
  "da-classificare": "Da classificare",
};

export type Confidence = "alta" | "media" | "bassa";
export const CONFIDENCE_LABEL: Readonly<Record<Confidence, string>> = {
  alta: "alta",
  media: "media",
  bassa: "bassa",
};

export interface Proposal {
  center: CostCenter;
  nature: Nature;
  confidence: Confidence;
  /** Plain-language reason shown next to the "proposto" chip. */
  reason: string;
  /** Always "PROPOSTO": a person confirms in a later step (needs a DB column). */
  state: "PROPOSTO";
}

const P = (
  center: CostCenter,
  nature: Nature,
  confidence: Confidence,
  reason: string,
): Proposal => ({ center, nature, confidence, reason, state: "PROPOSTO" });

const RX = {
  sponsor: /\bsponsor|pubblicit|sponsorizz|partnership/i,
  ticket: /bigliett|ingress[oi]\b|biglietteria/i,
  clubHouse: /club\s*-?\s*house|\bbar\b|ristor|cucina|bevand/i,
  dervio: /dervio/i,
  colico: /colico/i,
  sport:
    /sport|legea|nike|kappa|erre(a|à)|joma|macron|kit\b|abbigliam|palloni|attrezz/i,
  food: /bevand|aliment|caff[eè]|birr|food|metro\b|cash\s*&?\s*carry|gelat|panific|salumi/i,
  utility:
    /enel|energia|luce|\bgas\b|acqua|utenz|a2a|hera|edison|telecom|tim\b|fastweb|vodafone|manutenz|pulizi/i,
  federation: /figc|lnd|\bcrl\b|federaz|sgs\b|aia\b/i,
  software:
    /google|microsoft|canva|adobe|apple|zoom|dropbox|aruba|register\.it|hosting|domin/i,
};

function siteCenter(text: string): { center: CostCenter; known: boolean } {
  if (RX.dervio.test(text)) return { center: "club-house-dervio", known: true };
  if (RX.colico.test(text)) return { center: "club-house-colico", known: true };
  return { center: "club-house", known: false };
}

/**
 * Rules (Direzione 13/10): quote = istituzionale; sponsor, biglietteria, bar club house = commerciale;
 * pulmini and Fondo Solidale on their own centres; suppliers by category; cash withdrawals are giroconti.
 * Text rules on counterparty/note win over the category for non-family rows, because the category of the
 * intake job is coarse ("Entrata da classificare", "Fornitori").
 */
export function proposeClassification(
  e: Pick<
    LedgerEntry,
    | "category"
    | "counterparty"
    | "note"
    | "family"
    | "amount"
    | "kind"
    | "linkKind"
    | "linkLabel"
  >,
): Proposal {
  const text = [
    e.counterparty,
    e.note,
    e.linkKind === "SUPPLIER" ? e.linkLabel : null,
  ]
    .filter(Boolean)
    .join(" ");
  const incoming = e.amount > 0;

  if (!e.family && text) {
    if (incoming && RX.sponsor.test(text))
      return P(
        "sponsor",
        "commerciale",
        "alta",
        "Controparte o nota indicano una sponsorizzazione: entrata commerciale.",
      );
    if (incoming && RX.ticket.test(text))
      return P(
        "biglietteria",
        "commerciale",
        "alta",
        "Incasso della biglietteria: entrata commerciale.",
      );
    if (RX.clubHouse.test(text) && !RX.sport.test(text)) {
      const s = siteCenter(text);
      return P(
        s.center,
        "commerciale",
        s.known ? "alta" : "media",
        s.known
          ? "Club House: attività commerciale (bar e cucina)."
          : "Club House: attività commerciale; indicare la sede (Colico o Dervio).",
      );
    }
  }

  switch (e.category) {
    case "QUOTA":
      return P(
        "quote",
        "istituzionale",
        e.family ? "alta" : "media",
        "Quota associativa e di frequenza: entrata istituzionale.",
      );
    case "FONDO_SOLIDALE":
      return P(
        "fondo-solidale",
        "istituzionale",
        "alta",
        "Versamento al Fondo Solidale: istituzionale, centro dedicato.",
      );
    case "PULMINO":
    case "ADESIONE_PULMINO":
      return P(
        "pulmini",
        "istituzionale",
        "media",
        "Servizio pulmini per i tesserati: istituzionale se riservato agli associati; confermare con il commercialista.",
      );
    case "INCASSI_SUMUP":
      return P(
        "incassi-pos",
        "commerciale",
        "bassa",
        "Accredito SumUp di incassi POS o link: di solito bar o biglietti, ma può contenere quote pagate con link. Attribuire.",
      );
    case "CLUB_HOUSE_ACQUISTI": {
      const s = siteCenter(text);
      return P(
        s.center,
        "commerciale",
        s.known ? "alta" : "media",
        "Acquisto per il bar della Club House: costo dell'attività commerciale.",
      );
    }
    case "FORNITORE": {
      if (RX.food.test(text)) {
        const s = siteCenter(text);
        return P(
          s.center,
          "commerciale",
          "media",
          "Fornitore di alimenti e bevande: costo della Club House.",
        );
      }
      if (RX.sport.test(text))
        return P(
          "materiale-sportivo",
          "istituzionale",
          "media",
          "Fornitore di materiale sportivo: costo istituzionale.",
        );
      if (RX.utility.test(text))
        return P(
          "utenze-impianti",
          "istituzionale",
          "bassa",
          "Utenze e impianti: costo promiscuo, quota commerciale da ripartire con il commercialista.",
        );
      return P(
        "fornitori",
        "istituzionale",
        "bassa",
        "Fornitore senza categoria: indicare la categoria per il centro di costo.",
      );
    }
    case "ACQUISTI_MATERIALE":
      return P(
        "materiale-sportivo",
        "istituzionale",
        "media",
        "Acquisto di materiale per l'attività sportiva.",
      );
    case "SOFTWARE_SERVIZI":
      return P(
        "servizi-online",
        "istituzionale",
        RX.software.test(text) ? "alta" : "media",
        "Servizio online della società.",
      );
    case "FEDERAZIONE":
      return P(
        "federazione",
        "istituzionale",
        "alta",
        "Pagamento a Federazione o Lega: istituzionale.",
      );
    case "PRELIEVO_CONTANTI":
      return P(
        "giroconto-cassa",
        "neutro",
        "alta",
        "Prelievo: passa dal conto alla cassa, non è un costo. In cassa va giustificato ogni uso.",
      );
    case "STAFF_E_SPESE":
      return P(
        "compensi-staff",
        "istituzionale",
        "media",
        "Compensi e spese dello staff: verificare il contratto (lavoro sportivo o volontariato).",
      );
    case "RIMBORSO":
      return P(
        "rimborsi",
        "istituzionale",
        "media",
        "Rimborso spese: ai volontari solo rimborsi documentati.",
      );
    case "ENTRATA_DA_CLASSIFICARE":
      return e.family
        ? P(
            "quote",
            "istituzionale",
            "bassa",
            "Bonifico da famiglia senza causale chiara: probabilmente quota; verificare.",
          )
        : P(
            "da-classificare",
            "da-classificare",
            "bassa",
            "Entrata senza causale riconosciuta: classificare a mano.",
          );
    default:
      if (RX.federation.test(text))
        return P(
          "federazione",
          "istituzionale",
          "media",
          "La controparte è Federazione o Lega.",
        );
      if (RX.sport.test(text))
        return P(
          "materiale-sportivo",
          "istituzionale",
          "bassa",
          "La controparte sembra un fornitore sportivo.",
        );
      return P(
        "da-classificare",
        "da-classificare",
        "bassa",
        "Movimento senza regola: classificare a mano.",
      );
  }
}

/* ------------------------------------------------------------- traceability */

export const CASH_LIMIT = 1000;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** True for a cash movement (cash account or cash withdrawal/deposit) of 1.000 € or more. */
export function isCashMovement(
  e: Pick<LedgerEntry, "kind" | "category"> & { account?: string | null },
): boolean {
  return (
    accountOf(e) === "cassa" ||
    /PRELIEV|CONTANT|VERSAMENTO_CONTANTI/i.test(`${e.kind} ${e.category}`)
  );
}

export function cashFlag(
  e: Pick<LedgerEntry, "kind" | "category" | "amount"> & {
    account?: string | null;
  },
): boolean {
  return isCashMovement(e) && Math.abs(e.amount) >= CASH_LIMIT - 0.005;
}

/** Days whose cash movements add up to 1.000 € or more although each one is below: possible splitting. */
export function cashSplitDays(
  items: readonly (Pick<
    LedgerEntry,
    "kind" | "category" | "amount" | "bookedAt"
  > & { account?: string | null })[],
): { day: string; total: number; count: number }[] {
  const by = new Map<string, { total: number; count: number; big: boolean }>();
  for (const e of items) {
    if (!isCashMovement(e)) continue;
    const day = romeDay(e.bookedAt);
    const cur = by.get(day) ?? { total: 0, count: 0, big: false };
    cur.total = round2(cur.total + Math.abs(e.amount));
    cur.count += 1;
    cur.big = cur.big || cashFlag(e);
    by.set(day, cur);
  }
  return [...by.entries()]
    .filter(([, v]) => v.count > 1 && !v.big && v.total >= CASH_LIMIT - 0.005)
    .map(([day, v]) => ({ day, total: v.total, count: v.count }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

/* ------------------------------------------------------------- dates */

/** Calendar day in Europe/Rome of an ISO timestamp ("2026-10-01T00:30:00+02:00" -> "2026-10-01"). */
export function romeDay(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("year")}-${g("month")}-${g("day")}`;
}
export const romeMonth = (iso: string) => romeDay(iso).slice(0, 7);

/* ------------------------------------------------------------- register */

export interface PrimaNotaRow {
  entry: LedgerEntry;
  day: string;
  month: string;
  account: AccountId;
  direction: "entrata" | "uscita";
  /** Short causale built from category, months and counterparty (never the athlete name). */
  causale: string;
  proposal: Proposal;
  /** Running balance computed from the opening balance and every amount and fee before it. */
  computedBalance: number | null;
  /** Bank balance printed on the statement, when present. */
  bankBalance: number | null;
  /** Computed and printed balance differ by more than one cent. */
  balanceMismatch: boolean;
  cashFlag: boolean;
  toReconcile: boolean;
  documentUrl: string | null;
}

/** Ascending order; rows of the same instant keep the statement order (the board lists newest first). */
export function chronological<E extends Pick<LedgerEntry, "bookedAt">>(
  items: readonly E[],
): E[] {
  return items
    .map((e, i) => ({ e, i, t: Date.parse(e.bookedAt) }))
    .sort((a, b) => a.t - b.t || b.i - a.i)
    .map((x) => x.e);
}

/**
 * Opening balance of an account: the printed balance of its first movement minus that movement (amount − fee).
 * Null when the statement carries no balance: the running balance then starts from 0 and says so.
 */
export function openingBalance(
  sortedAsc: readonly Pick<LedgerEntry, "amount" | "fee" | "balance">[],
): number | null {
  const first = sortedAsc[0];
  if (!first || first.balance === null) return null;
  return round2(first.balance - first.amount + first.fee);
}

export function causaleOf(
  e: Pick<
    LedgerEntry,
    "category" | "months" | "counterparty" | "family" | "linkKind"
  >,
): string {
  const parts = [CATEGORY_LABEL[e.category] ?? e.category];
  if (e.months.length) parts.push(e.months.join(" e "));
  // Counterparty only for non-family rows (suppliers, services): never the name of a family or athlete.
  if (!e.family && e.counterparty) parts.push(e.counterparty);
  return parts.join(" · ");
}

const DOC_URL = /^(https:\/\/|\/)[^\s]*$/;

/** Builds the register for every account, with running balances per account. Input order does not matter. */
export function buildPrimaNota(items: readonly LedgerEntry[]): {
  rows: PrimaNotaRow[];
  openings: Partial<Record<AccountId, number | null>>;
} {
  const byAccount = new Map<AccountId, LedgerEntry[]>();
  for (const e of chronological(items)) {
    const a = accountOf(e);
    byAccount.set(a, [...(byAccount.get(a) ?? []), e]);
  }
  const rows: PrimaNotaRow[] = [];
  const openings: Partial<Record<AccountId, number | null>> = {};
  for (const [account, list] of byAccount) {
    const opening = openingBalance(list);
    openings[account] = opening;
    let run = opening ?? 0;
    for (const e of list) {
      run = round2(run + e.amount - e.fee);
      const doc = e.documentUrl ?? null;
      rows.push({
        entry: e,
        day: romeDay(e.bookedAt),
        month: romeMonth(e.bookedAt),
        account,
        direction: e.amount >= 0 ? "entrata" : "uscita",
        causale: causaleOf(e),
        proposal: proposeClassification(e),
        computedBalance: opening === null && e.balance === null ? null : run,
        bankBalance: e.balance,
        balanceMismatch:
          e.balance !== null &&
          opening !== null &&
          Math.abs(e.balance - run) > 0.005,
        cashFlag: cashFlag(e),
        toReconcile:
          e.matchState === "DA_ABBINARE" || e.matchState === "PROPOSTO",
        documentUrl: doc && DOC_URL.test(doc) ? doc : null,
      });
    }
  }
  rows.sort(
    (a, b) => Date.parse(a.entry.bookedAt) - Date.parse(b.entry.bookedAt) || 0,
  );
  return { rows, openings };
}

/* ------------------------------------------------------------- filters */

export interface PrimaNotaFilter {
  month: string | "tutti";
  account: AccountId | "tutti";
  direction: "entrata" | "uscita" | "tutti";
  nature: Nature | "tutti";
  center: CostCenter | "tutti";
  toReconcile: boolean;
}

export const EMPTY_FILTER: PrimaNotaFilter = {
  month: "tutti",
  account: "tutti",
  direction: "tutti",
  nature: "tutti",
  center: "tutti",
  toReconcile: false,
};

export function filterRows(
  rows: readonly PrimaNotaRow[],
  f: PrimaNotaFilter,
): PrimaNotaRow[] {
  return rows.filter(
    (r) =>
      (f.month === "tutti" || r.month === f.month) &&
      (f.account === "tutti" || r.account === f.account) &&
      (f.direction === "tutti" || r.direction === f.direction) &&
      (f.nature === "tutti" || r.proposal.nature === f.nature) &&
      (f.center === "tutti" || r.proposal.center === f.center) &&
      (!f.toReconcile || r.toReconcile),
  );
}

export function monthsOf(rows: readonly PrimaNotaRow[]): string[] {
  return [...new Set(rows.map((r) => r.month))].sort();
}

/* ------------------------------------------------------------- totals */

export interface MonthTotals {
  month: string;
  movements: number;
  incoming: number;
  outgoing: number;
  fees: number;
  net: number;
  /** Computed balance before the first movement of the month and after the last one (per account summed). */
  opening: number | null;
  closing: number | null;
  institutionalIn: number;
  commercialIn: number;
  commercialOut: number;
  unclassifiedIn: number;
  lowConfidence: number;
  toReconcile: number;
  toMatch: number;
  proposed: number;
  cashFlags: number;
  mismatches: number;
  byCenter: {
    center: CostCenter;
    nature: Nature;
    count: number;
    incoming: number;
    outgoing: number;
  }[];
}

export function monthTotals(
  allRows: readonly PrimaNotaRow[],
  month: string,
): MonthTotals {
  const rows = allRows.filter((r) => r.month === month);
  const t: MonthTotals = {
    month,
    movements: rows.length,
    incoming: 0,
    outgoing: 0,
    fees: 0,
    net: 0,
    opening: null,
    closing: null,
    institutionalIn: 0,
    commercialIn: 0,
    commercialOut: 0,
    unclassifiedIn: 0,
    lowConfidence: 0,
    toReconcile: 0,
    toMatch: 0,
    proposed: 0,
    cashFlags: 0,
    mismatches: 0,
    byCenter: [],
  };
  const centers = new Map<
    CostCenter,
    {
      center: CostCenter;
      nature: Nature;
      count: number;
      incoming: number;
      outgoing: number;
    }
  >();
  for (const r of rows) {
    const a = r.entry.amount;
    if (a >= 0) t.incoming += a;
    else t.outgoing += -a;
    t.fees += r.entry.fee;
    if (a > 0 && r.proposal.nature === "istituzionale") t.institutionalIn += a;
    if (a > 0 && r.proposal.nature === "commerciale") t.commercialIn += a;
    if (a < 0 && r.proposal.nature === "commerciale") t.commercialOut += -a;
    if (a > 0 && r.proposal.nature === "da-classificare") t.unclassifiedIn += a;
    if (r.proposal.confidence === "bassa") t.lowConfidence++;
    if (r.toReconcile) t.toReconcile++;
    if (r.entry.matchState === "DA_ABBINARE") t.toMatch++;
    if (r.entry.matchState === "PROPOSTO") t.proposed++;
    if (r.cashFlag) t.cashFlags++;
    if (r.balanceMismatch) t.mismatches++;
    const c = centers.get(r.proposal.center) ?? {
      center: r.proposal.center,
      nature: r.proposal.nature,
      count: 0,
      incoming: 0,
      outgoing: 0,
    };
    c.count++;
    if (a >= 0) c.incoming = round2(c.incoming + a);
    else c.outgoing = round2(c.outgoing - a);
    centers.set(r.proposal.center, c);
  }
  // Opening/closing: per account, balance before the first and after the last row of the month.
  const accounts = new Set(allRows.map((r) => r.account));
  let open = 0,
    close = 0,
    known = false;
  for (const acc of accounts) {
    const list = allRows.filter((r) => r.account === acc);
    const before = list.filter((r) => r.month < month);
    const upto = list.filter((r) => r.month <= month);
    const lastBefore = before[before.length - 1];
    const lastUpto = upto[upto.length - 1];
    const firstIn = list.find((r) => r.month === month);
    const o = lastBefore
      ? lastBefore.computedBalance
      : firstIn && firstIn.computedBalance !== null
        ? round2(
            firstIn.computedBalance - firstIn.entry.amount + firstIn.entry.fee,
          )
        : null;
    const c = lastUpto ? lastUpto.computedBalance : null;
    if (o !== null || c !== null) known = true;
    open += o ?? 0;
    close += c ?? o ?? 0;
  }
  t.opening = known ? round2(open) : null;
  t.closing = known ? round2(close) : null;
  t.incoming = round2(t.incoming);
  t.outgoing = round2(t.outgoing);
  t.fees = round2(t.fees);
  t.net = round2(t.incoming - t.outgoing - t.fees);
  t.institutionalIn = round2(t.institutionalIn);
  t.commercialIn = round2(t.commercialIn);
  t.commercialOut = round2(t.commercialOut);
  t.unclassifiedIn = round2(t.unclassifiedIn);
  t.byCenter = [...centers.values()].sort(
    (a, b) => b.incoming + b.outgoing - (a.incoming + a.outgoing),
  );
  return t;
}

/** Commercial income from the start of the season (1 July) to the end of `month`: the 398/91 ceiling is 400.000 €. */
export const COMMERCIAL_CEILING_398 = 400_000;
export function seasonCommercialIn(
  allRows: readonly PrimaNotaRow[],
  month: string,
): number {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const start = `${m >= 7 ? y : y - 1}-07`;
  return round2(
    allRows
      .filter(
        (r) =>
          r.month >= start &&
          r.month <= month &&
          r.entry.amount > 0 &&
          r.proposal.nature === "commerciale",
      )
      .reduce((s, r) => s + r.entry.amount, 0),
  );
}

/* ------------------------------------------------------------- CSV */

const csvCell = (v: string | number | null): string => {
  if (v === null) return "";
  const s = typeof v === "number" ? v.toFixed(2).replace(".", ",") : v;
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const CSV_HEADER = [
  "Data",
  "Conto",
  "Tipo",
  "Causale",
  "Centro di costo (proposto)",
  "Natura (proposta)",
  "Confidenza",
  "Entrata",
  "Uscita",
  "Commissione",
  "Saldo calcolato",
  "Saldo estratto",
  "Contanti >= 1.000",
  "Abbinamento",
  "Riferimento",
  "Documento",
  "Codice movimento",
];

/** CSV (separator ";", decimal comma) of the given rows, for the accountant. Athlete names are never exported. */
export function primaNotaCsv(rows: readonly PrimaNotaRow[]): string {
  const lines = [CSV_HEADER.join(";")];
  for (const r of rows) {
    const e = r.entry;
    const day = r.day.split("-").reverse().join("/");
    lines.push(
      [
        day,
        ACCOUNT_LABEL[r.account],
        r.direction,
        r.causale,
        CENTER_LABEL[r.proposal.center],
        NATURE_LABEL[r.proposal.nature],
        r.proposal.confidence,
        e.amount > 0 ? e.amount : null,
        e.amount < 0 ? -e.amount : null,
        e.fee ? e.fee : null,
        r.computedBalance,
        r.bankBalance,
        r.cashFlag ? "SI" : "",
        MATCH_LABEL[e.matchState as MatchState] ?? e.matchState,
        e.linkRef,
        r.documentUrl,
        e.code,
      ]
        .map(csvCell)
        .join(";"),
    );
  }
  return `\ufeff${lines.join("\r\n")}\r\n`;
}

/* ------------------------------------------------------------- closing */

/** Riepilogo for the accountant and registro IVA minori: by the 15th of the following month. */
export function closingDeadline(month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-15`;
}

export type CheckState = "ok" | "da-fare" | "attenzione" | "non-disponibile";

export interface ClosingCheck {
  id: string;
  label: string;
  state: CheckState;
  detail: string;
  value: string | null;
}

export interface CompClosing {
  available: boolean;
  people: number;
  netTotal: number;
  paid: number;
  paidTotal: number;
  toPay: number;
  missingIban: number;
  volunteerIssues: number;
}

export interface SupplierClosing {
  available: boolean;
  overdue: number;
  overdueTotal: number;
  dueNext: number;
  dueNextTotal: number;
}

const eur = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});
const fmt = (n: number) => eur.format(n);
/** "1 movimento" / "3 movimenti". */
export const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

export function closingChecklist(
  t: MonthTotals,
  splitDays: number,
  comp: CompClosing,
  sup: SupplierClosing,
  today: string,
): ClosingCheck[] {
  const deadline = closingDeadline(t.month);
  const late = today > deadline;
  return [
    {
      id: "riconciliazione",
      label: "Movimenti riconciliati",
      state: t.toReconcile === 0 ? "ok" : "da-fare",
      detail:
        t.toReconcile === 0
          ? "Tutti i bonifici del mese sono abbinati e verificati."
          : `${t.toMatch} da abbinare, ${t.proposed} abbinati da verificare in Movimenti.`,
      value: String(t.toReconcile),
    },
    {
      id: "saldi",
      label: "Saldi calcolati = estratto",
      state: t.mismatches === 0 ? "ok" : "attenzione",
      detail:
        t.mismatches === 0
          ? "Il saldo calcolato movimento per movimento coincide con l'estratto."
          : `${plural(t.mismatches, "movimento", "movimenti")} con saldo diverso dall'estratto: controllare righe mancanti o doppie.`,
      value: String(t.mismatches),
    },
    {
      id: "contanti",
      label: "Contanti da 1.000 € in su",
      state: t.cashFlags + splitDays === 0 ? "ok" : "attenzione",
      detail:
        t.cashFlags + splitDays === 0
          ? "Nessun movimento in contanti da 1.000 € o più."
          : `${plural(t.cashFlags, "movimento", "movimenti")} in contanti da 1.000 € o più${splitDays ? `, ${plural(splitDays, "giorno", "giorni")} con più prelievi che insieme superano 1.000 €` : ""}: servono pagamenti tracciabili e giustificativo.`,
      value: String(t.cashFlags + splitDays),
    },
    {
      id: "classificazione",
      label: "Centri di costo e natura",
      state: t.lowConfidence === 0 ? "ok" : "da-fare",
      detail:
        t.lowConfidence === 0
          ? "Tutte le proposte hanno confidenza alta o media."
          : `${plural(t.lowConfidence, "movimento", "movimenti")} con proposta a bassa confidenza da confermare a mano.`,
      value: String(t.lowConfidence),
    },
    {
      id: "commerciale",
      label: "Entrate commerciali del mese",
      state: t.unclassifiedIn > 0 ? "attenzione" : "ok",
      detail: `Base per IVA forfettaria (398/91) e registro IVA minori: ${fmt(t.commercialIn)} proposti come commerciali${t.unclassifiedIn > 0 ? `, più ${fmt(t.unclassifiedIn)} di entrate ancora da classificare` : ""}.`,
      value: fmt(t.commercialIn),
    },
    {
      id: "compensi",
      label: "Compensi del mese",
      state: !comp.available
        ? "non-disponibile"
        : comp.missingIban + comp.volunteerIssues > 0
          ? "attenzione"
          : comp.toPay > 0
            ? "da-fare"
            : "ok",
      detail: !comp.available
        ? "Compensi non leggibili con questo accesso."
        : `${plural(comp.people, "persona", "persone")}, netto ${fmt(comp.netTotal)}; pagati ${comp.paid} (${fmt(comp.paidTotal)}), da pagare ${comp.toPay}. IBAN da confermare: ${comp.missingIban}. Volontari con voci non documentate: ${comp.volunteerIssues}.`,
      value: comp.available ? fmt(comp.netTotal) : null,
    },
    {
      id: "fornitori",
      label: "Fornitori in scadenza",
      state: !sup.available
        ? "non-disponibile"
        : sup.overdue > 0
          ? "attenzione"
          : sup.dueNext > 0
            ? "da-fare"
            : "ok",
      detail: !sup.available
        ? "Fornitori non leggibili con questo accesso."
        : `${plural(sup.overdue, "rata scaduta", "rate scadute")} (${fmt(sup.overdueTotal)}), ${sup.dueNext} in scadenza entro il ${deadline.split("-").reverse().join("/")} (${fmt(sup.dueNextTotal)}).`,
      value: sup.available ? String(sup.overdue + sup.dueNext) : null,
    },
    {
      id: "scadenza",
      label: "Riepilogo al commercialista",
      state: late ? "attenzione" : "da-fare",
      detail: `Da inviare entro il ${deadline.split("-").reverse().join("/")}${late ? ": scadenza passata" : ""}. L'invio resta una scelta della Direzione.`,
      value: deadline.split("-").reverse().join("/"),
    },
  ];
}

/** Compensation lines of a volunteer must hold only documented reimbursements (no fixed amount, no other kinds). */
export function volunteerIssueCount(
  lines: readonly {
    contractType: string;
    fixed: number;
    entries: readonly {
      kind: string;
      status: string;
      documentId: string | null;
      sign: number;
    }[];
  }[],
): number {
  let n = 0;
  for (const l of lines) {
    if (l.contractType !== "VOLONTARIATO_SPORTIVO") continue;
    const bad =
      l.fixed > 0 ||
      l.entries.some(
        (x) =>
          x.status === "ATTIVA" &&
          x.sign > 0 &&
          (x.kind !== "RIMBORSO_SPESE" || !x.documentId),
      );
    if (bad) n++;
  }
  return n;
}
