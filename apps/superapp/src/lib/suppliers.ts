/**
 * M11 Fornitori ed economia (r80). Pure helpers for /tesoreria/fornitori: the copy of the master
 * "SCD - TESORERIA FORNITORI | SCADENZE E CHIUSURE 2026-2027" (decision N2). Direzione and Tesoreria only.
 * The app never pays: it shows what is due, when, and the next action written in the master.
 */

export const PLAN_GROUPS = ["PIANO_ATTIVO", "DA_DEFINIRE", "CONTESTATO", "CHIUSO"] as const;
export type PlanGroup = (typeof PLAN_GROUPS)[number];

export const PLAN_LABEL: Readonly<Record<PlanGroup, string>> = {
  PIANO_ATTIVO: "Piano attivo",
  DA_DEFINIRE: "Da definire",
  CONTESTATO: "Contestato",
  CHIUSO: "Chiuso",
};

export interface Supplier {
  key: string;
  supplier: string;
  planStatus: string | null;
  planGroup: PlanGroup;
  balance: number | null;
  paid: number | null;
  residual: number | null;
  instalments: number | null;
  nextAmount: number | null;
  nextDue: string | null;
  closingExpected: string | null;
  nextAction: string | null;
  commercialPosition: string | null;
  strategy: string | null;
  mailUrl: string | null;
}

export interface Instalment {
  key: string;
  supplierKey: string;
  supplier: string;
  label: string | null;
  amount: number | null;
  due: string | null;
  planStatus: string | null;
  urgency: string | null;
  todo: string | null;
  mailUrl: string | null;
}

export interface SupplierBoard {
  season: string;
  sync: { syncedAt: string | null; sourceModifiedAt: string | null; alignedOn: string | null } | null;
  suppliers: Supplier[];
  instalments: Instalment[];
}

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
};
const day = (v: unknown): string | null => {
  const s = str(v);
  return s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
};
const gmail = (v: unknown): string | null => {
  const s = str(v);
  return s && s.startsWith("https://mail.google.com/") ? s : null;
};
const isGroup = (v: unknown): v is PlanGroup => typeof v === "string" && (PLAN_GROUPS as readonly string[]).includes(v);

export function parseSupplier(v: unknown): Supplier | null {
  const r = obj(v);
  const key = r ? str(r["key"]) : null;
  const supplier = r ? str(r["supplier"]) : null;
  if (!r || !key || !supplier) return null;
  return {
    key,
    supplier,
    planStatus: str(r["planStatus"]),
    planGroup: isGroup(r["planGroup"]) ? r["planGroup"] : "DA_DEFINIRE",
    balance: num(r["balance"]),
    paid: num(r["paid"]),
    residual: num(r["residual"]),
    instalments: num(r["instalments"]),
    nextAmount: num(r["nextAmount"]),
    nextDue: day(r["nextDue"]),
    closingExpected: day(r["closingExpected"]),
    nextAction: str(r["nextAction"]),
    commercialPosition: str(r["commercialPosition"]),
    strategy: str(r["strategy"]),
    mailUrl: gmail(r["mailUrl"]),
  };
}

export function parseInstalment(v: unknown): Instalment | null {
  const r = obj(v);
  const key = r ? str(r["key"]) : null;
  const supplier = r ? str(r["supplier"]) : null;
  if (!r || !key || !supplier) return null;
  return {
    key,
    supplierKey: str(r["supplierKey"]) ?? key,
    supplier,
    label: str(r["label"]),
    amount: num(r["amount"]),
    due: day(r["due"]),
    planStatus: str(r["planStatus"]),
    urgency: str(r["urgency"]),
    todo: str(r["todo"]),
    mailUrl: gmail(r["mailUrl"]),
  };
}

export function parseSupplierBoard(v: unknown): SupplierBoard | null {
  const r = obj(v);
  if (!r) return null;
  const s = obj(r["sync"]);
  return {
    season: str(r["season"]) ?? "2026/27",
    sync: s ? { syncedAt: str(s["syncedAt"]), sourceModifiedAt: str(s["sourceModifiedAt"]), alignedOn: day(s["alignedOn"]) } : null,
    suppliers: Array.isArray(r["suppliers"]) ? r["suppliers"].map(parseSupplier).filter((x): x is Supplier => x !== null) : [],
    instalments: Array.isArray(r["instalments"]) ? r["instalments"].map(parseInstalment).filter((x): x is Instalment => x !== null) : [],
  };
}

/** Days from `today` to `iso` (both YYYY-MM-DD). Negative = past. */
export function daysTo(iso: string, today: string): number {
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

export type DueState = "scaduta" | "entro5" | "mese" | "dopo" | "senza-data";

/** "entro 5 giorni" mirrors the D-5 reminder of the master. */
export function dueState(due: string | null, today: string): DueState {
  if (!due) return "senza-data";
  const d = daysTo(due, today);
  if (d < 0) return "scaduta";
  if (d <= 5) return "entro5";
  if (d <= 31) return "mese";
  return "dopo";
}

export const DUE_LABEL: Readonly<Record<DueState, string>> = {
  scaduta: "Scaduta",
  entro5: "Entro 5 giorni",
  mese: "Entro 30 giorni",
  dopo: "Più avanti",
  "senza-data": "Senza data",
};

const cents = (n: number | null | undefined) => Math.round((n ?? 0) * 100);

export interface SupplierTotals {
  suppliers: number;
  open: number;
  balance: number;
  paid: number;
  residual: number;
  groups: Record<PlanGroup, number>;
  overdue: number;
  overdueAmount: number;
  within5: number;
  within5Amount: number;
  month: number;
  monthAmount: number;
}

/** Totals in euro computed in cents (no float drift). Instalments: only those not yet past their plan closing. */
export function supplierTotals(suppliers: readonly Supplier[], instalments: readonly Instalment[], today: string): SupplierTotals {
  const groups: Record<PlanGroup, number> = { PIANO_ATTIVO: 0, DA_DEFINIRE: 0, CONTESTATO: 0, CHIUSO: 0 };
  let b = 0, p = 0, r = 0;
  for (const s of suppliers) {
    groups[s.planGroup] += 1;
    b += cents(s.balance);
    p += cents(s.paid);
    r += cents(s.residual);
  }
  const closed = new Set(suppliers.filter((s) => s.planGroup === "CHIUSO").map((s) => s.key));
  const live = instalments.filter((i) => !closed.has(i.supplierKey));
  const bucket = (st: DueState) => live.filter((i) => dueState(i.due, today) === st);
  const sum = (xs: Instalment[]) => xs.reduce((a, i) => a + cents(i.amount), 0) / 100;
  const od = bucket("scaduta"), w5 = bucket("entro5"), mo = bucket("mese");
  return {
    suppliers: suppliers.length,
    open: suppliers.length - groups.CHIUSO,
    balance: b / 100,
    paid: p / 100,
    residual: r / 100,
    groups,
    overdue: od.length,
    overdueAmount: sum(od),
    within5: w5.length,
    within5Amount: sum(w5),
    month: mo.length,
    monthAmount: sum(mo),
  };
}

export interface AgendaWeek {
  /** Monday of the week (YYYY-MM-DD) or "scadute" / "senza-data". */
  week: string;
  items: Instalment[];
  amount: number;
}

function monday(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const wd = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - wd);
  return d.toISOString().slice(0, 10);
}

/** Payment agenda grouped by week: past-due first, then weeks in order, then undated. Closed plans excluded. */
export function agenda(suppliers: readonly Supplier[], instalments: readonly Instalment[], today: string): AgendaWeek[] {
  const closed = new Set(suppliers.filter((s) => s.planGroup === "CHIUSO").map((s) => s.key));
  const map = new Map<string, Instalment[]>();
  for (const i of instalments) {
    if (closed.has(i.supplierKey)) continue;
    const k = !i.due ? "senza-data" : i.due < today ? "scadute" : monday(i.due);
    map.set(k, [...(map.get(k) ?? []), i]);
  }
  const order = (k: string) => (k === "scadute" ? "0" : k === "senza-data" ? "9" : `1${k}`);
  return [...map.entries()]
    .sort(([a], [b]) => order(a).localeCompare(order(b)))
    .map(([week, items]) => ({
      week,
      items: [...items].sort((x, y) => (x.due ?? "9").localeCompare(y.due ?? "9") || x.supplier.localeCompare(y.supplier)),
      amount: items.reduce((a, i) => a + cents(i.amount), 0) / 100,
    }));
}

export type SupplierFilter = "aperti" | PlanGroup | "tutti";

export const SUPPLIER_FILTERS: ReadonlyArray<{ id: SupplierFilter; label: string }> = [
  { id: "aperti", label: "Aperti" },
  { id: "PIANO_ATTIVO", label: "Piano attivo" },
  { id: "DA_DEFINIRE", label: "Da definire" },
  { id: "CONTESTATO", label: "Contestati" },
  { id: "CHIUSO", label: "Chiusi" },
  { id: "tutti", label: "Tutti" },
];

const GROUP_ORDER: Readonly<Record<PlanGroup, number>> = { CONTESTATO: 0, DA_DEFINIRE: 1, PIANO_ATTIVO: 2, CHIUSO: 3 };

export function filterSuppliers(items: readonly Supplier[], f: SupplierFilter, q = ""): Supplier[] {
  const needle = q.trim().toLowerCase();
  return items
    .filter((s) => (f === "tutti" ? true : f === "aperti" ? s.planGroup !== "CHIUSO" : s.planGroup === f))
    .filter((s) => (needle ? `${s.supplier} ${s.planStatus ?? ""} ${s.strategy ?? ""}`.toLowerCase().includes(needle) : true))
    .sort((a, b) => GROUP_ORDER[a.planGroup] - GROUP_ORDER[b.planGroup] || (a.nextDue ?? "9").localeCompare(b.nextDue ?? "9") || a.supplier.localeCompare(b.supplier));
}

export function supplierFilterCount(items: readonly Supplier[], f: SupplierFilter): number {
  return filterSuppliers(items, f).length;
}

/** The master flags plans whose payment or answer was not found ("... NON TROVATA"): the Tesoreria must check. */
export function needsCheck(s: Pick<Supplier, "planStatus" | "planGroup">): boolean {
  return s.planGroup !== "CHIUSO" && /NON TROVAT/i.test(s.planStatus ?? "");
}

/** Instalments of one supplier, by due date. */
export function instalmentsOf(instalments: readonly Instalment[], key: string): Instalment[] {
  return instalments.filter((i) => i.supplierKey === key).sort((a, b) => (a.due ?? "9").localeCompare(b.due ?? "9"));
}

/** Age of the master: days since its "Aggiornato al" date (null when unknown). */
export function staleDays(alignedOn: string | null | undefined, today: string): number | null {
  return alignedOn ? Math.max(0, -daysTo(alignedOn, today)) : null;
}
