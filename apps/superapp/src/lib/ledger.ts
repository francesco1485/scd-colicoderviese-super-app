/**
 * T3 Soldi (r82, UD-083). Pure helpers for /tesoreria/movimenti: the register of the club's account movements
 * (SumUp business account first) with three-state reconciliation of family payments:
 * DA_ABBINARE -> PROPOSTO (linked automatically to the fee position) -> VERIFICATO (a person confirms).
 * No IBAN and no family names are stored; the linked athlete's name comes from the fee position (office only).
 */

export const CATEGORY_LABEL: Readonly<Record<string, string>> = {
  QUOTA: "Quote",
  FONDO_SOLIDALE: "Fondo Solidale",
  PULMINO: "Pulmino (mensile)",
  ADESIONE_PULMINO: "Adesione pulmino",
  INCASSI_SUMUP: "Incassi SumUp (link e POS)",
  ENTRATA_DA_CLASSIFICARE: "Entrata da classificare",
  FORNITORE: "Fornitori",
  CLUB_HOUSE_ACQUISTI: "Spesa Club House",
  ACQUISTI_MATERIALE: "Materiale",
  SOFTWARE_SERVIZI: "Servizi online",
  FEDERAZIONE: "Federazione",
  PRELIEVO_CONTANTI: "Prelievi contanti",
  STAFF_E_SPESE: "Staff e spese",
  RIMBORSO: "Rimborsi",
  USCITA_DA_CLASSIFICARE: "Uscita da classificare",
};

export const MATCH_STATES = ["DA_ABBINARE", "PROPOSTO", "VERIFICATO", "NON_APPLICABILE"] as const;
export type MatchState = (typeof MATCH_STATES)[number];

export const MATCH_LABEL: Readonly<Record<MatchState, string>> = {
  DA_ABBINARE: "Da abbinare",
  PROPOSTO: "Abbinato, da verificare",
  VERIFICATO: "Verificato",
  NON_APPLICABILE: "Nessun abbinamento",
};

export interface LedgerEntry {
  code: string;
  bookedAt: string;
  kind: string;
  amount: number;
  fee: number;
  balance: number | null;
  category: string;
  months: string[];
  counterparty: string | null;
  family: boolean;
  matchState: MatchState;
  linkKind: "FEE_POSITION" | "SUPPLIER" | null;
  linkRef: string | null;
  linkLabel: string | null;
  verifiedAt: string | null;
  note: string | null;
  /** scd_ledger_entries.account, when the board sends it (prima nota: SumUp, bank, cash). */
  account?: string | null;
  /** Link to the supporting document (receipt, invoice), when the board sends it. */
  documentUrl?: string | null;
}

export interface LedgerSummary {
  movements: number;
  incoming: number;
  outgoing: number;
  fees: number;
  firstAt: string | null;
  lastAt: string | null;
  balance: number | null;
  brokenBalances: number;
  toMatch: number;
  proposed: number;
  verified: number;
}

export interface MonthRow { month: string; incoming: number; outgoing: number; fees: number }
export interface CategoryRow { category: string; count: number; total: number }
export interface FeeCompareRow { ref: string; label: string | null; category: string | null; bank: number; movements: number; gestionale: number | null; difference: number }

export interface LedgerBoard {
  summary: LedgerSummary;
  months: MonthRow[];
  categories: CategoryRow[];
  entries: LedgerEntry[];
  feeCompare: FeeCompareRow[];
}

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
};
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const isState = (v: unknown): v is MatchState => typeof v === "string" && (MATCH_STATES as readonly string[]).includes(v);

export function parseEntry(v: unknown): LedgerEntry | null {
  const r = obj(v);
  const code = r ? str(r["code"]) : null;
  const bookedAt = r ? str(r["bookedAt"]) : null;
  const amount = r ? num(r["amount"]) : null;
  if (!r || !code || !bookedAt || amount === null) return null;
  const lk = r["linkKind"];
  return {
    code,
    bookedAt,
    kind: str(r["kind"]) ?? "ALTRO",
    amount,
    fee: num(r["fee"]) ?? 0,
    balance: num(r["balance"]),
    category: str(r["category"]) ?? (amount >= 0 ? "ENTRATA_DA_CLASSIFICARE" : "USCITA_DA_CLASSIFICARE"),
    months: arr(r["months"]).filter((m): m is string => typeof m === "string"),
    counterparty: str(r["counterparty"]),
    family: r["family"] === true,
    matchState: isState(r["matchState"]) ? r["matchState"] : "NON_APPLICABILE",
    linkKind: lk === "FEE_POSITION" || lk === "SUPPLIER" ? lk : null,
    linkRef: str(r["linkRef"]),
    linkLabel: str(r["linkLabel"]),
    verifiedAt: str(r["verifiedAt"]),
    note: str(r["note"]),
    account: str(r["account"]),
    documentUrl: str(r["documentUrl"]),
  };
}

export function parseLedgerBoard(v: unknown): LedgerBoard | null {
  const r = obj(v);
  const s = r ? obj(r["summary"]) : null;
  if (!r || !s) return null;
  return {
    summary: {
      movements: num(s["movements"]) ?? 0,
      incoming: num(s["incoming"]) ?? 0,
      outgoing: num(s["outgoing"]) ?? 0,
      fees: num(s["fees"]) ?? 0,
      firstAt: str(s["firstAt"]),
      lastAt: str(s["lastAt"]),
      balance: num(s["balance"]),
      brokenBalances: num(s["brokenBalances"]) ?? 0,
      toMatch: num(s["toMatch"]) ?? 0,
      proposed: num(s["proposed"]) ?? 0,
      verified: num(s["verified"]) ?? 0,
    },
    months: arr(r["months"]).map(obj).filter((m): m is Raw => m !== null).map((m) => ({
      month: str(m["month"]) ?? "",
      incoming: num(m["incoming"]) ?? 0,
      outgoing: num(m["outgoing"]) ?? 0,
      fees: num(m["fees"]) ?? 0,
    })).filter((m) => m.month !== ""),
    categories: arr(r["categories"]).map(obj).filter((m): m is Raw => m !== null).map((m) => ({
      category: str(m["category"]) ?? "ALTRO",
      count: num(m["count"]) ?? 0,
      total: num(m["total"]) ?? 0,
    })),
    entries: arr(r["entries"]).map(parseEntry).filter((e): e is LedgerEntry => e !== null),
    feeCompare: arr(r["feeCompare"]).map(obj).filter((m): m is Raw => m !== null && str(m["ref"]) !== null).map((m) => ({
      ref: str(m["ref"]) as string,
      label: str(m["label"]),
      category: str(m["category"]),
      bank: num(m["bank"]) ?? 0,
      movements: num(m["movements"]) ?? 0,
      gestionale: num(m["gestionale"]),
      difference: num(m["difference"]) ?? 0,
    })),
  };
}

export type LedgerFilter = "da-fare" | "famiglie" | "uscite" | "tutti" | MatchState;

export const LEDGER_FILTERS: ReadonlyArray<{ id: LedgerFilter; label: string }> = [
  { id: "da-fare", label: "Da fare" },
  { id: "famiglie", label: "Pagamenti famiglie" },
  { id: "uscite", label: "Uscite" },
  { id: "VERIFICATO", label: "Verificati" },
  { id: "tutti", label: "Tutti" },
];

/** "Da fare" = movements to match or to verify. */
export function filterEntries(items: readonly LedgerEntry[], f: LedgerFilter, q = ""): LedgerEntry[] {
  const needle = q.trim().toLowerCase();
  return items
    .filter((e) => {
      if (f === "tutti") return true;
      if (f === "da-fare") return e.matchState === "DA_ABBINARE" || e.matchState === "PROPOSTO";
      if (f === "famiglie") return e.family;
      if (f === "uscite") return e.amount < 0;
      return e.matchState === f;
    })
    .filter((e) => !needle || `${e.linkLabel ?? ""} ${e.counterparty ?? ""} ${CATEGORY_LABEL[e.category] ?? e.category} ${e.months.join(" ")} ${e.code}`.toLowerCase().includes(needle));
}

export function ledgerFilterCount(items: readonly LedgerEntry[], f: LedgerFilter): number {
  return filterEntries(items, f).length;
}

/** "2026-10" -> "ottobre 2026". */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
}

/** Gestionale "paid" vs money received in the bank for the same fee position. */
export function compareState(r: Pick<FeeCompareRow, "difference" | "gestionale">): "allineato" | "banca-in-piu" | "gestionale-in-piu" {
  if (Math.abs(r.difference) < 0.005) return "allineato";
  return r.difference > 0 ? "banca-in-piu" : "gestionale-in-piu";
}

export const COMPARE_HELP: Readonly<Record<ReturnType<typeof compareState>, string>> = {
  allineato: "Banca e Gestionale coincidono.",
  "banca-in-piu": "In banca risulta più del pagato nel Gestionale: aggiornare il foglio dopo la verifica.",
  "gestionale-in-piu": "Il Gestionale segna più di quanto arrivato in banca: pagamento in contanti, link SumUp o da verificare.",
};

/** Totals of incoming family payments by category (cents-safe). */
export function familyTotals(items: readonly LedgerEntry[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of items) {
    if (!e.family) continue;
    out[e.category] = Math.round(((out[e.category] ?? 0) + e.amount) * 100) / 100;
  }
  return out;
}

const ERRORS: Readonly<Record<string, string>> = {
  forbidden: "Solo Direzione e Tesoreria possono verificare i movimenti.",
  not_found: "Movimento non trovato: ricarica la pagina.",
  fee_not_found: "Codice posizione non trovato nel Gestionale.",
  note_required: "Scrivi il motivo.",
  action: "Azione non valida.",
};
export function ledgerError(code: string | null | undefined): string {
  return (code && ERRORS[code]) || "Operazione non riuscita. Riprova tra poco.";
}
