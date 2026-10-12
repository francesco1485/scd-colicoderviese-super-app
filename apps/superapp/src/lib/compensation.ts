/**
 * Compensi e stipendi (r75, UD-075). Pure helpers for the /tesoreria/compensi page: parsing of
 * scd_comp_board, Italian labels, month arithmetic and the summary the Direction and the Treasury
 * read first. The database is the authority on permissions and on what is payable; these helpers
 * only present it.
 */

export type CompActor = "DIREZIONE" | "TESORERIA";
export type PeriodStatus = "BOZZA" | "AUTORIZZATO" | "PAGATO" | "BLOCCATO";
export type ContractType = "LAVORO_SPORTIVO" | "VOLONTARIATO_SPORTIVO" | "COLLABORAZIONE" | "DIPENDENTE" | "ALTRO" | "DA_VERIFICARE";
export type IbanStatus = "MANCANTE" | "DA_VERIFICARE" | "CONFERMATO";
export type ContractStatus = "DA_VERIFICARE" | "OK" | "BLOCCATO";
export type RelationshipStatus = "ATTIVO" | "SOSPESO" | "CESSATO";

export const ENTRY_KINDS = [
  "VARIABILE",
  "ATTIVITA_BASE",
  "PREMIO",
  "GOAL",
  "TORNEO",
  "RIMBORSO_SPESE",
  "RETTIFICA_PIU",
  "ACCONTO",
  "RECUPERO",
  "CONTRIBUTO_CASA",
  "ALTRO_AIUTO",
  "RETTIFICA_MENO",
] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

export const ENTRY_LABEL: Readonly<Record<EntryKind, string>> = {
  VARIABILE: "Variabile autorizzato",
  ATTIVITA_BASE: "Attività di base",
  PREMIO: "Premio",
  GOAL: "Goal",
  TORNEO: "Torneo",
  RIMBORSO_SPESE: "Rimborso spese documentate",
  RETTIFICA_PIU: "Rettifica in più",
  ACCONTO: "Acconto già dato",
  RECUPERO: "Recupero / trattenuta",
  CONTRIBUTO_CASA: "Contributo casa",
  ALTRO_AIUTO: "Altro aiuto dato",
  RETTIFICA_MENO: "Rettifica in meno",
};

const MINUS: ReadonlySet<EntryKind> = new Set(["ACCONTO", "RECUPERO", "CONTRIBUTO_CASA", "ALTRO_AIUTO", "RETTIFICA_MENO"]);

/** +1 adds to what is owed, -1 subtracts (money already given or to recover). Mirrors scd_comp_sign. */
export function entrySign(kind: EntryKind): 1 | -1 {
  return MINUS.has(kind) ? -1 : 1;
}

export const CONTRACT_LABEL: Readonly<Record<ContractType, string>> = {
  LAVORO_SPORTIVO: "Lavoro sportivo",
  VOLONTARIATO_SPORTIVO: "Volontariato sportivo",
  COLLABORAZIONE: "Collaborazione",
  DIPENDENTE: "Dipendente",
  ALTRO: "Altro",
  DA_VERIFICARE: "Da verificare",
};

export const STATUS_LABEL: Readonly<Record<PeriodStatus, string>> = {
  BOZZA: "Da verificare",
  AUTORIZZATO: "Autorizzato, da pagare",
  PAGATO: "Pagato",
  BLOCCATO: "Bloccato",
};

export const BLOCKER_LABEL: Readonly<Record<string, string>> = {
  RAPPORTO_NON_ATTIVO: "rapporto non attivo",
  CESSATO: "rapporto cessato",
  IBAN_NON_CONFERMATO: "IBAN non confermato",
  CONTRATTO_RASD_DA_VERIFICARE: "contratto o RASD da verificare",
  NETTO_ZERO: "niente da pagare (netto zero)",
};

export interface CompEntry {
  id: string;
  kind: EntryKind;
  quantity: number | null;
  unitAmount: number | null;
  amount: number;
  sign: 1 | -1;
  date: string;
  note: string | null;
  documentId: string | null;
  status: "ATTIVA" | "ANNULLATA";
  cancelReason: string | null;
}

export interface CompDocument {
  id: string;
  name: string;
  kind: string;
  uploadedAt: string;
}

export interface CompLine {
  agreementId: string;
  personCode: string | null;
  name: string;
  area: string | null;
  role: string | null;
  contractType: ContractType;
  monthlyFixed: number;
  legacyMonthly: number | null;
  goalRate: number | null;
  ibanStatus: IbanStatus;
  contractStatus: ContractStatus;
  relationshipStatus: RelationshipStatus;
  startDate: string | null;
  endDate: string | null;
  ceasedAt: string | null;
  openAdvances: number;
  openRecoveries: number;
  notes: string | null;
  fixed: number;
  plus: number;
  minus: number;
  net: number;
  status: PeriodStatus;
  authorizedAt: string | null;
  authorizedNet: number | null;
  paidAmount: number | null;
  paidAt: string | null;
  paidMethod: string | null;
  paidRef: string | null;
  periodNote: string | null;
  blockers: string[];
  entries: CompEntry[];
  documents: CompDocument[];
}

export interface CompBoard {
  actor: CompActor;
  period: string;
  dueDate: string;
  lines: CompLine[];
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
};
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export function parseCompBoard(raw: unknown): CompBoard | null {
  if (!raw || typeof raw !== "object") return null;
  const r = obj(raw);
  const actor = r["actor"] === "DIREZIONE" || r["actor"] === "TESORERIA" ? r["actor"] : null;
  if (!actor) return null;
  const lines: CompLine[] = arr(r["lines"]).map((x) => {
    const o = obj(x);
    return {
      agreementId: str(o["agreementId"]) ?? "",
      personCode: str(o["personCode"]),
      name: str(o["name"]) ?? "—",
      area: str(o["area"]),
      role: str(o["role"]),
      contractType: oneOf(o["contractType"], ["LAVORO_SPORTIVO", "VOLONTARIATO_SPORTIVO", "COLLABORAZIONE", "DIPENDENTE", "ALTRO", "DA_VERIFICARE"] as const, "DA_VERIFICARE"),
      monthlyFixed: num(o["monthlyFixed"]) ?? 0,
      legacyMonthly: num(o["legacyMonthly"]),
      goalRate: num(o["goalRate"]),
      ibanStatus: oneOf(o["ibanStatus"], ["MANCANTE", "DA_VERIFICARE", "CONFERMATO"] as const, "MANCANTE"),
      contractStatus: oneOf(o["contractStatus"], ["DA_VERIFICARE", "OK", "BLOCCATO"] as const, "DA_VERIFICARE"),
      relationshipStatus: oneOf(o["relationshipStatus"], ["ATTIVO", "SOSPESO", "CESSATO"] as const, "ATTIVO"),
      startDate: str(o["startDate"]),
      endDate: str(o["endDate"]),
      ceasedAt: str(o["ceasedAt"]),
      openAdvances: num(o["openAdvances"]) ?? 0,
      openRecoveries: num(o["openRecoveries"]) ?? 0,
      notes: str(o["notes"]),
      fixed: num(o["fixed"]) ?? 0,
      plus: num(o["plus"]) ?? 0,
      minus: num(o["minus"]) ?? 0,
      net: num(o["net"]) ?? 0,
      status: oneOf(o["status"], ["BOZZA", "AUTORIZZATO", "PAGATO", "BLOCCATO"] as const, "BOZZA"),
      authorizedAt: str(o["authorizedAt"]),
      authorizedNet: num(o["authorizedNet"]),
      paidAmount: num(o["paidAmount"]),
      paidAt: str(o["paidAt"]),
      paidMethod: str(o["paidMethod"]),
      paidRef: str(o["paidRef"]),
      periodNote: str(o["periodNote"]),
      blockers: arr(o["blockers"]).filter((b): b is string => typeof b === "string"),
      entries: arr(o["entries"]).map((e) => {
        const p = obj(e);
        const kind = oneOf(p["kind"], ENTRY_KINDS, "RETTIFICA_PIU");
        return {
          id: str(p["id"]) ?? "",
          kind,
          quantity: num(p["quantity"]),
          unitAmount: num(p["unitAmount"]),
          amount: num(p["amount"]) ?? 0,
          sign: entrySign(kind),
          date: str(p["date"]) ?? "",
          note: str(p["note"]),
          documentId: str(p["documentId"]),
          status: p["status"] === "ANNULLATA" ? "ANNULLATA" : "ATTIVA",
          cancelReason: str(p["cancelReason"]),
        } satisfies CompEntry;
      }),
      documents: arr(o["documents"]).map((d) => {
        const p = obj(d);
        return { id: str(p["id"]) ?? "", name: str(p["name"]) ?? "documento", kind: str(p["kind"]) ?? "ALTRO", uploadedAt: str(p["uploadedAt"]) ?? "" };
      }),
    };
  }).filter((l) => l.agreementId);
  return { actor, period: str(r["period"]) ?? "", dueDate: str(r["dueDate"]) ?? "", lines };
}

/* ------------------------------------------------------------------ months */

const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

export function isPeriod(p: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(p);
}

export function shiftPeriod(p: string, delta: number): string {
  const [y, m] = p.split("-").map(Number) as [number, number];
  const idx = y * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
}

export function periodLabel(p: string): string {
  const [y, m] = p.split("-").map(Number) as [number, number];
  return `${MONTHS[m - 1]} ${y}`;
}

/** Payment due date of a competence month: day 15 of the following month. */
export function dueDateOf(p: string): string {
  return `${shiftPeriod(p, 1)}-15`;
}

/**
 * The month the Direction should be working on today: the competence month whose payment is due
 * next (before the 16th: the previous month; from the 16th: the current month).
 */
export function defaultPeriod(todayIso: string): string {
  const cur = todayIso.slice(0, 7);
  const day = Number(todayIso.slice(8, 10));
  return day <= 15 ? shiftPeriod(cur, -1) : cur;
}

export function daysUntil(todayIso: string, dateIso: string): number {
  return Math.round((Date.parse(`${dateIso}T12:00:00Z`) - Date.parse(`${todayIso}T12:00:00Z`)) / 86_400_000);
}

export function itDay(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

const EUR = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
export function euro(n: number | null | undefined): string {
  return n === null || n === undefined ? "—" : EUR.format(n);
}

/* ----------------------------------------------------------------- summary */

export interface CompSummary {
  people: number;
  netTotal: number;
  toVerify: number;
  authorized: number;
  authorizedTotal: number;
  paid: number;
  paidTotal: number;
  blocked: number;
  /** Lines the Direction could authorize right now (no blockers, still a draft). */
  readyToAuthorize: number;
  missingIban: number;
  contractToCheck: number;
  zeroNet: number;
}

export function summarize(lines: readonly CompLine[]): CompSummary {
  const s: CompSummary = { people: lines.length, netTotal: 0, toVerify: 0, authorized: 0, authorizedTotal: 0, paid: 0, paidTotal: 0, blocked: 0, readyToAuthorize: 0, missingIban: 0, contractToCheck: 0, zeroNet: 0 };
  for (const l of lines) {
    s.netTotal += Math.max(0, l.net);
    if (l.status === "BOZZA") s.toVerify++;
    if (l.status === "AUTORIZZATO") {
      s.authorized++;
      s.authorizedTotal += l.authorizedNet ?? l.net;
    }
    if (l.status === "PAGATO") {
      s.paid++;
      s.paidTotal += l.paidAmount ?? 0;
    }
    if (l.status === "BLOCCATO") s.blocked++;
    if (l.status === "BOZZA" && l.blockers.length === 0) s.readyToAuthorize++;
    if (l.ibanStatus !== "CONFERMATO") s.missingIban++;
    if (l.contractStatus !== "OK") s.contractToCheck++;
    if (l.net <= 0) s.zeroNet++;
  }
  s.netTotal = round2(s.netTotal);
  s.authorizedTotal = round2(s.authorizedTotal);
  s.paidTotal = round2(s.paidTotal);
  return s;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export type CompFilter = "tutti" | "da-verificare" | "pronti" | "autorizzati" | "pagati" | "bloccati";

export function filterLines(lines: readonly CompLine[], f: CompFilter, q = ""): CompLine[] {
  const needle = q.trim().toLowerCase();
  return lines.filter((l) => {
    if (needle && !`${l.name} ${l.role ?? ""} ${l.area ?? ""}`.toLowerCase().includes(needle)) return false;
    switch (f) {
      case "da-verificare":
        return l.status === "BOZZA" && l.blockers.length > 0;
      case "pronti":
        return l.status === "BOZZA" && l.blockers.length === 0;
      case "autorizzati":
        return l.status === "AUTORIZZATO";
      case "pagati":
        return l.status === "PAGATO";
      case "bloccati":
        return l.status === "BLOCCATO";
      default:
        return true;
    }
  });
}

/** Italian message for a refusal code of the compensation functions. */
export function compErrorMessage(code: string | null | undefined, blockers?: readonly string[]): string {
  switch (code) {
    case "forbidden":
      return "Questa azione è riservata alla Direzione (o alla Tesoreria per i pagamenti).";
    case "missing":
      return "Mancano dati obbligatori.";
    case "not_found":
      return "Voce non trovata: ricarica la pagina.";
    case "period_locked":
      return "Il mese è già autorizzato o pagato: per modificarlo la Direzione deve prima togliere l'autorizzazione.";
    case "amount":
      return "Importo non valido: deve essere maggiore di zero.";
    case "reason":
      return "Scrivi il motivo dell'annullamento.";
    case "blocked":
      return `Non si può ancora: ${(blockers ?? []).map((b) => BLOCKER_LABEL[b] ?? b).join(", ")}.`;
    case "not_authorized":
      return "Prima serve l'autorizzazione della Direzione.";
    case "already_paid":
      return "Risulta già pagato.";
    case "state":
      return "Operazione non possibile in questo stato.";
    case "document":
      return "Documento non trovato.";
    case "path":
      return "Percorso del documento non valido.";
    default:
      return "Operazione non riuscita. Riprova tra poco.";
  }
}

/** Plain-text list of what the Treasury has to transfer (authorized, not yet paid). No IBAN. */
export function paymentListText(lines: readonly CompLine[], period: string): string {
  const due = lines.filter((l) => l.status === "AUTORIZZATO");
  const total = round2(due.reduce((s, l) => s + (l.authorizedNet ?? l.net), 0));
  const rows = due.map((l) => `${l.name}\t${euro(l.authorizedNet ?? l.net)}${l.role ? `\t${l.role}` : ""}`);
  return [`Compensi ${periodLabel(period)} · da pagare entro ${itDay(dueDateOf(period))}`, ...rows, `Totale\t${euro(total)} (${due.length} persone)`].join("\n");
}

/** "mancano 3 giorni", "scade oggi", "scaduto da 2 giorni". */
export function dueLabel(days: number): string {
  if (days > 1) return `mancano ${days} giorni`;
  if (days === 1) return "manca 1 giorno";
  if (days === 0) return "scade oggi";
  return days === -1 ? "scaduto da 1 giorno" : `scaduto da ${-days} giorni`;
}
