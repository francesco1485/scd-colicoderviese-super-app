/**
 * Quote e Fondo (r78, process 3 of the A-Z map, UD-076/UD-082). Pure helpers for /tesoreria/quote and the
 * family card. The data are a copy of SCD_MASTER_GESTIONALE_2026-27 (tabs 32_QUOTE_OPERATIVE and
 * 17_CONTROLLO_QUOTE) made by the scheduled job through scd_fee_sync: this module never computes a fee,
 * it only reads, groups and explains what the sheet says. The app never collects money and never
 * stores IBAN, ISEE values or fund percentages.
 */

export const FEE_GROUPS = ["IN_RITARDO", "DA_COMUNICARE", "DA_VERIFICARE", "REGOLARE", "SALDATO", "ESCLUSO"] as const;
export type FeeGroup = (typeof FEE_GROUPS)[number];
export type FeePlan = "UNICA" | "2 RATE" | "3 RATE";

export const GROUP_LABEL: Readonly<Record<FeeGroup, string>> = {
  IN_RITARDO: "In ritardo",
  DA_COMUNICARE: "Da comunicare",
  DA_VERIFICARE: "Da verificare",
  REGOLARE: "Regolare",
  SALDATO: "Saldato",
  ESCLUSO: "Escluso",
};

/** What the office does with each group (shown next to the filter). */
export const GROUP_HELP: Readonly<Record<FeeGroup, string>> = {
  IN_RITARDO: "Una rata è scaduta e non risulta pagata: sollecito gentile dopo verifica del bonifico.",
  DA_COMUNICARE: "La quota non è ancora stata comunicata alla famiglia.",
  DA_VERIFICARE: "Categoria, importo o pagamento da controllare nel Gestionale.",
  REGOLARE: "Pagamenti in linea con le scadenze.",
  SALDATO: "Quota pagata per intero.",
  ESCLUSO: "Fuori conteggio (dirigente, prima squadra, duplicato o ritirato).",
};

/** Family wording: never "moroso", never internal notes. */
export const FAMILY_GROUP_LABEL: Readonly<Record<FeeGroup, string>> = {
  IN_RITARDO: "Rata da saldare",
  DA_COMUNICARE: "Quota in arrivo",
  DA_VERIFICARE: "In verifica dalla segreteria",
  REGOLARE: "In regola",
  SALDATO: "Saldata",
  ESCLUSO: "—",
};

/**
 * Deadlines decided by the Direzione Generale on 08/10/2026 for season 2026/27. Dates already
 * communicated to families are never moved (UD-076).
 */
export const FEE_DEADLINES: Readonly<Record<string, Readonly<Record<FeePlan, readonly string[]>>>> = {
  "2026/27": {
    UNICA: ["2026-10-31"],
    "2 RATE": ["2026-10-15", "2026-11-30"],
    "3 RATE": ["2026-10-15", "2026-10-31", "2026-11-30"],
  },
};

export const FEE_RULES: readonly string[] = [
  "Unica soluzione entro il 31/10.",
  "Due rate: 15/10 e 30/11. Tre rate: 15/10, 31/10 e 30/11.",
  "Fratelli: -10% sulla quota base per tutti, ulteriore -15% dal 2° figlio pagante.",
  "Fondo Solidale: non cumulabile con lo sconto fratelli.",
  "Le date già comunicate alle famiglie non si cambiano. Nessun rimborso automatico.",
];

export interface FeePosition {
  code: string;
  name: string | null;
  birthYear: number | null;
  category: string | null;
  feeTotal: number | null;
  paid: number | null;
  residual: number | null;
  overdue: number | null;
  status: string | null;
  override: string | null;
  group: FeeGroup;
  noticeSent: boolean | null;
  noticeDate: string | null;
  plan: FeePlan | null;
  instalments: number[];
  fund: boolean;
  familyRule: string | null;
  action: string | null;
  linked: boolean;
}

export interface FeeSync {
  syncedAt: string | null;
  sourceModifiedAt: string | null;
  positions: number | null;
  linked: number | null;
}

export interface FeeBoard {
  season: string;
  sync: FeeSync | null;
  positions: FeePosition[];
}

export interface MyFee {
  personId: string;
  name: string;
  feeTotal: number | null;
  paid: number | null;
  residual: number | null;
  overdue: number | null;
  group: FeeGroup;
  plan: FeePlan | null;
  instalments: number[];
  noticeSent: boolean | null;
}

/* ------------------------------------------------------------------ parsing */

type Raw = Record<string, unknown>;

function obj(v: unknown): Raw | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function bool(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}

export function isFeeGroup(v: unknown): v is FeeGroup {
  return typeof v === "string" && (FEE_GROUPS as readonly string[]).includes(v);
}

function plan(v: unknown): FeePlan | null {
  return v === "UNICA" || v === "2 RATE" || v === "3 RATE" ? v : null;
}

function amounts(v: unknown): number[] {
  return Array.isArray(v) ? v.map(num).filter((n): n is number => n !== null && n > 0) : [];
}

export function parseFeePosition(v: unknown): FeePosition | null {
  const r = obj(v);
  const code = r ? str(r["code"]) : null;
  if (!r || !code) return null;
  return {
    code,
    name: str(r["name"]),
    birthYear: num(r["birthYear"]),
    category: str(r["category"]),
    feeTotal: num(r["feeTotal"]),
    paid: num(r["paid"]),
    residual: num(r["residual"]),
    overdue: num(r["overdue"]),
    status: str(r["status"]),
    override: str(r["override"]),
    group: isFeeGroup(r["group"]) ? r["group"] : "DA_VERIFICARE",
    noticeSent: bool(r["noticeSent"]),
    noticeDate: str(r["noticeDate"]),
    plan: plan(r["plan"]),
    instalments: amounts(r["instalments"]),
    fund: r["fund"] === true,
    familyRule: str(r["familyRule"]),
    action: str(r["action"]),
    linked: r["linked"] === true,
  };
}

export function parseFeeBoard(v: unknown): FeeBoard | null {
  const r = obj(v);
  if (!r) return null;
  const s = obj(r["sync"]);
  const counts = s ? obj(s["counts"]) : null;
  return {
    season: str(r["season"]) ?? "2026/27",
    sync: s
      ? {
          syncedAt: str(s["synced_at"]),
          sourceModifiedAt: str(s["source_modified_at"]),
          positions: counts ? num(counts["positions"]) : null,
          linked: counts ? num(counts["linked"]) : null,
        }
      : null,
    positions: Array.isArray(r["positions"]) ? r["positions"].map(parseFeePosition).filter((p): p is FeePosition => p !== null) : [],
  };
}

export function parseMyFees(v: unknown): MyFee[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((x) => {
    const r = obj(x);
    const personId = r ? str(r["personId"]) : null;
    if (!r || !personId) return [];
    const group = isFeeGroup(r["group"]) ? r["group"] : "DA_VERIFICARE";
    if (group === "ESCLUSO") return [];
    return [{
      personId,
      name: str(r["name"]) ?? "Nome non indicato",
      feeTotal: num(r["feeTotal"]),
      paid: num(r["paid"]),
      residual: num(r["residual"]),
      overdue: num(r["overdue"]),
      group,
      plan: plan(r["plan"]),
      instalments: amounts(r["instalments"]),
      noticeSent: bool(r["noticeSent"]),
    }];
  });
}

/* ------------------------------------------------------------------ totals */

const cents = (n: number | null | undefined) => Math.round((n ?? 0) * 100);
const back = (c: number) => c / 100;

export interface FeeTotals {
  counted: number;
  excluded: number;
  feeTotal: number;
  paid: number;
  residual: number;
  overdue: number;
  late: number;
  groups: Record<FeeGroup, number>;
  linked: number;
  fund: number;
}

/** Totals of the positions that count (ESCLUSO is counted apart and never summed). */
export function feeTotals(positions: readonly FeePosition[]): FeeTotals {
  const groups = Object.fromEntries(FEE_GROUPS.map((g) => [g, 0])) as Record<FeeGroup, number>;
  let fee = 0, paid = 0, residual = 0, overdue = 0, counted = 0, linked = 0, fund = 0;
  for (const p of positions) {
    groups[p.group] += 1;
    if (p.group === "ESCLUSO") continue;
    counted += 1;
    fee += cents(p.feeTotal);
    paid += cents(p.paid);
    residual += cents(p.residual);
    overdue += cents(p.overdue);
    if (p.linked) linked += 1;
    if (p.fund) fund += 1;
  }
  return {
    counted,
    excluded: groups.ESCLUSO,
    feeTotal: back(fee),
    paid: back(paid),
    residual: back(residual),
    overdue: back(overdue),
    late: groups.IN_RITARDO,
    groups,
    linked,
    fund,
  };
}

export interface CategoryRow {
  category: string;
  people: number;
  feeTotal: number;
  paid: number;
  residual: number;
  overdue: number;
  late: number;
  toCheck: number;
}

const NO_CATEGORY = "Categoria da verificare";

/** One row per category (counted positions only), ordered by the youngest birth year last. */
export function byCategory(positions: readonly FeePosition[]): CategoryRow[] {
  const map = new Map<string, { row: CategoryRow; c: [number, number, number, number]; year: number }>();
  for (const p of positions) {
    if (p.group === "ESCLUSO") continue;
    const key = p.category ?? NO_CATEGORY;
    const e = map.get(key) ?? { row: { category: key, people: 0, feeTotal: 0, paid: 0, residual: 0, overdue: 0, late: 0, toCheck: 0 }, c: [0, 0, 0, 0], year: 0 };
    e.row.people += 1;
    e.c[0] += cents(p.feeTotal);
    e.c[1] += cents(p.paid);
    e.c[2] += cents(p.residual);
    e.c[3] += cents(p.overdue);
    if (p.group === "IN_RITARDO") e.row.late += 1;
    if (p.group === "DA_VERIFICARE" || p.group === "DA_COMUNICARE") e.row.toCheck += 1;
    e.year = Math.max(e.year, p.birthYear ?? 0);
    map.set(key, e);
  }
  return [...map.values()]
    .map(({ row, c, year }) => ({ ...row, feeTotal: back(c[0]), paid: back(c[1]), residual: back(c[2]), overdue: back(c[3]), year }))
    .sort((a, b) => (a.category === NO_CATEGORY ? 1 : b.category === NO_CATEGORY ? -1 : a.year - b.year || a.category.localeCompare(b.category, "it")))
    .map(({ year: _year, ...row }) => row);
}

/* ------------------------------------------------------------------ filters */

export type FeeFilter = "lavoro" | FeeGroup | "tutti";

export const FEE_FILTERS: ReadonlyArray<{ id: FeeFilter; label: string }> = [
  { id: "lavoro", label: "Da lavorare" },
  { id: "IN_RITARDO", label: GROUP_LABEL.IN_RITARDO },
  { id: "DA_COMUNICARE", label: GROUP_LABEL.DA_COMUNICARE },
  { id: "DA_VERIFICARE", label: GROUP_LABEL.DA_VERIFICARE },
  { id: "REGOLARE", label: GROUP_LABEL.REGOLARE },
  { id: "SALDATO", label: GROUP_LABEL.SALDATO },
  { id: "ESCLUSO", label: GROUP_LABEL.ESCLUSO },
  { id: "tutti", label: "Tutte" },
];

const WORK: ReadonlySet<FeeGroup> = new Set(["IN_RITARDO", "DA_COMUNICARE", "DA_VERIFICARE"]);
const URGENCY: Readonly<Record<FeeGroup, number>> = { IN_RITARDO: 0, DA_COMUNICARE: 1, DA_VERIFICARE: 2, REGOLARE: 3, SALDATO: 4, ESCLUSO: 5 };

function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** Filter and search (code, name, category, year); the work list puts the most overdue first. */
export function filterPositions(positions: readonly FeePosition[], filter: FeeFilter, q: string): FeePosition[] {
  const needle = fold(q.trim());
  return positions
    .filter((p) => (filter === "tutti" ? true : filter === "lavoro" ? WORK.has(p.group) : p.group === filter))
    .filter((p) => !needle || fold([p.code, p.name ?? "", p.category ?? "", p.birthYear ?? ""].join(" ")).includes(needle))
    .sort((a, b) => URGENCY[a.group] - URGENCY[b.group] || (b.overdue ?? 0) - (a.overdue ?? 0) || (b.residual ?? 0) - (a.residual ?? 0) || a.code.localeCompare(b.code));
}

export function filterCount(positions: readonly FeePosition[], filter: FeeFilter): number {
  return filterPositions(positions, filter, "").length;
}

/* ----------------------------------------------------------------- schedule */

export interface Instalment {
  n: number;
  due: string | null;
  amount: number;
  /** Covered by what has been paid so far (instalments are covered in order). */
  covered: boolean;
  /** Due date passed and not covered. */
  late: boolean;
}

/**
 * The instalment calendar of one position: amounts from the sheet, dates from the season rules.
 * When the sheet has no plan amounts, the residual is shown as a single amount without a date.
 */
export function schedule(p: { plan: FeePlan | null; instalments: readonly number[]; paid: number | null }, season: string, today: string): Instalment[] {
  const dates = p.plan ? FEE_DEADLINES[season]?.[p.plan] ?? [] : [];
  let left = cents(p.paid);
  return p.instalments.map((amount, i) => {
    const need = cents(amount);
    const covered = left >= need;
    left = Math.max(0, left - need);
    const due = dates[i] ?? null;
    return { n: i + 1, due, amount, covered, late: !covered && due !== null && due < today };
  });
}

/** The first instalment still to pay, if any. */
export function nextInstalment(p: { plan: FeePlan | null; instalments: readonly number[]; paid: number | null }, season: string, today: string): Instalment | null {
  return schedule(p, season, today).find((i) => !i.covered) ?? null;
}

export interface DeadlineRow {
  due: string;
  plans: FeePlan[];
  people: number;
  amount: number;
  open: number;
}

/** Season calendar: for each date, how many positions have an instalment then and how much is still open. */
export function deadlineCalendar(positions: readonly FeePosition[], season: string, today: string): DeadlineRow[] {
  const rules = FEE_DEADLINES[season];
  if (!rules) return [];
  const map = new Map<string, { plans: Set<FeePlan>; people: number; amount: number; open: number }>();
  for (const [planId, dates] of Object.entries(rules) as [FeePlan, readonly string[]][]) {
    for (const d of dates) {
      const e = map.get(d) ?? { plans: new Set<FeePlan>(), people: 0, amount: 0, open: 0 };
      e.plans.add(planId);
      map.set(d, e);
    }
  }
  for (const p of positions) {
    if (p.group === "ESCLUSO") continue;
    for (const i of schedule(p, season, today)) {
      if (!i.due) continue;
      const e = map.get(i.due);
      if (!e) continue;
      e.people += 1;
      e.amount += cents(i.amount);
      if (!i.covered) e.open += cents(i.amount);
    }
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([due, e]) => ({ due, plans: [...e.plans], people: e.people, amount: back(e.amount), open: back(e.open) }));
}

/* ------------------------------------------------------------------ wording */

const EUR = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
export function euro(n: number | null | undefined): string {
  return n === null || n === undefined ? "—" : EUR.format(n);
}

export function itDay(iso: string | null | undefined): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** "12/10/2026 alle 06:10" in Rome time, or "—". */
export function itDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const f = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const parts = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return `${parts["day"]}/${parts["month"]}/${parts["year"]} alle ${parts["hour"]}:${parts["minute"]}`;
}

export function planLabel(p: FeePlan | null): string {
  return p === "UNICA" ? "Unica soluzione" : p === "2 RATE" ? "Due rate" : p === "3 RATE" ? "Tre rate" : "Piano da definire";
}

/** One line for the family card: what to do next, in plain words. */
export function familyNext(f: MyFee, season: string, today: string): string {
  if (f.group === "SALDATO") return "Quota saldata. Grazie!";
  if (f.group === "DA_COMUNICARE" || f.noticeSent === false) return "La segreteria ti invierà importo e scadenze.";
  if (f.group === "DA_VERIFICARE") return "La segreteria sta verificando la quota: ti scriverà se serve qualcosa.";
  const next = nextInstalment(f, season, today);
  if (next?.due) return `${next.late ? "Rata scaduta il" : "Prossima rata entro il"} ${itDay(next.due)}: ${euro(next.amount)}.`;
  if ((f.residual ?? 0) > 0) return `Da versare: ${euro(f.residual)}.`;
  return "Nessuna rata in sospeso.";
}
