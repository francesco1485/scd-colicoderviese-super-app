/**
 * T5 Proposte e conferme (r79, UD-083/UD-084). Pure helpers for the work queue at /gestionale/coda.
 * Automations propose (mail, files, sheet copies); a person confirms. Accepting only records the decision:
 * each machine applies it in its own page. Model: Linear Triage, Zendesk/Front states.
 */

export const PROPOSAL_STATUSES = ["NEW", "IN_PROGRESS", "NEEDS_INFO", "SNOOZED", "ACCEPTED", "REJECTED", "DUPLICATE"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];
export const PROPOSAL_KINDS = ["RICEVUTA_PAGAMENTO", "RITIRO", "FONDO", "FATTURA", "RICHIESTA", "DOCUMENTO", "ALTRO"] as const;
export type ProposalKind = (typeof PROPOSAL_KINDS)[number];
export type ProposalAction = "take" | "release" | "accept" | "reject" | "duplicate" | "snooze" | "needs_info" | "reopen";

export const STATUS_LABEL: Readonly<Record<ProposalStatus, string>> = {
  NEW: "Nuova",
  IN_PROGRESS: "Presa in carico",
  NEEDS_INFO: "Serve informazione",
  SNOOZED: "Rinviata",
  ACCEPTED: "Confermata",
  REJECTED: "Scartata",
  DUPLICATE: "Doppione",
};

export const KIND_LABEL: Readonly<Record<ProposalKind, string>> = {
  RICEVUTA_PAGAMENTO: "Ricevuta di pagamento",
  RITIRO: "Ritiro / tesserato altrove",
  FONDO: "Fondo Solidale",
  FATTURA: "Fattura",
  RICHIESTA: "Richiesta",
  DOCUMENTO: "Documento",
  ALTRO: "Altro",
};

/** What "Conferma" means for each kind, in plain words (the machine page applies it). */
export const ACCEPT_HINT: Readonly<Record<ProposalKind, string>> = {
  RICEVUTA_PAGAMENTO: "Confermi che la ricevuta è valida e va registrata nel Gestionale dopo il controllo del movimento.",
  RITIRO: "Confermi che la posizione va esclusa dal conteggio nel Gestionale.",
  FONDO: "Confermi di aver controllato i documenti nel file riservato del Fondo.",
  FATTURA: "Confermi che la fattura entra nello scadenzario fornitori.",
  RICHIESTA: "Confermi di aver gestito la richiesta (risposta inviata o azione fatta).",
  DOCUMENTO: "Confermi di aver controllato e archiviato il documento.",
  ALTRO: "Confermi di aver gestito la voce.",
};

export const MACHINE_LABEL: Readonly<Record<string, string>> = {
  M2: "Tesserati e famiglia",
  M3: "Quote e Fondo",
  M4: "Certificati",
  M11: "Fornitori ed economia",
  M16: "Cervellone",
  M22: "Magazzino",
};

export interface Proposal {
  id: string;
  machine: string;
  area: string;
  kind: ProposalKind;
  title: string;
  reason: string | null;
  reserved: boolean;
  sourceKind: string;
  sourceUrl: string | null;
  sourceAt: string | null;
  mailbox: string | null;
  targetRef: string | null;
  targetLabel: string | null;
  /** Current state of the linked record (for M3: the fee group in the Gestionale copy). */
  targetState: string | null;
  confidence: number | null;
  status: ProposalStatus;
  mine: boolean;
  assigned: boolean;
  dueAt: string | null;
  snoozeUntil: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
  open: boolean;
}

export interface ProposalQueue {
  canReadReserved: boolean;
  items: Proposal[];
}

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null);

function isStatus(v: unknown): v is ProposalStatus {
  return typeof v === "string" && (PROPOSAL_STATUSES as readonly string[]).includes(v);
}
function isKind(v: unknown): v is ProposalKind {
  return typeof v === "string" && (PROPOSAL_KINDS as readonly string[]).includes(v);
}

export function parseProposal(v: unknown): Proposal | null {
  const r = obj(v);
  const id = r ? str(r["id"]) : null;
  const title = r ? str(r["title"]) : null;
  if (!r || !id || !title) return null;
  return {
    id,
    machine: str(r["machine"]) ?? "M16",
    area: str(r["area"]) ?? "segreteria",
    kind: isKind(r["kind"]) ? r["kind"] : "ALTRO",
    title,
    reason: str(r["reason"]),
    reserved: r["sensitivity"] === "RISERVATO",
    sourceKind: str(r["sourceKind"]) ?? "MAIL",
    sourceUrl: str(r["sourceUrl"]),
    sourceAt: str(r["sourceAt"]),
    mailbox: str(r["mailbox"]),
    targetRef: str(r["targetRef"]),
    targetLabel: str(r["targetLabel"]),
    targetState: str(r["targetState"]),
    confidence: num(r["confidence"]),
    status: isStatus(r["status"]) ? r["status"] : "NEW",
    mine: r["mine"] === true,
    assigned: r["assigned"] === true,
    dueAt: str(r["due_at"]),
    snoozeUntil: str(r["snoozeUntil"]),
    decidedAt: str(r["decidedAt"]),
    decisionNote: str(r["decisionNote"]),
    createdAt: str(r["created_at"]) ?? "",
    open: r["open"] === true,
  };
}

export function parseQueue(v: unknown): ProposalQueue | null {
  const r = obj(v);
  if (!r) return null;
  return {
    canReadReserved: r["canReadReserved"] === true,
    items: Array.isArray(r["items"]) ? r["items"].map(parseProposal).filter((p): p is Proposal => p !== null) : [],
  };
}

/** For a withdrawal already excluded in the Gestionale, confirming is only archiving. */
export function alreadyAligned(p: Pick<Proposal, "kind" | "targetState">): boolean {
  return p.kind === "RITIRO" && p.targetState === "ESCLUSO";
}

export type QueueFilter = "aperte" | "mie" | "allineate" | ProposalKind | "chiuse";

export function filterQueue(items: readonly Proposal[], f: QueueFilter, area: string | null = null): Proposal[] {
  return items
    .filter((p) => (area ? p.area === area : true))
    .filter((p) => {
      if (f === "aperte") return p.open;
      if (f === "mie") return p.open && p.mine;
      if (f === "allineate") return p.open && alreadyAligned(p);
      if (f === "chiuse") return !p.open && (p.status === "ACCEPTED" || p.status === "REJECTED" || p.status === "DUPLICATE");
      return p.open && p.kind === f;
    })
    .sort(compareUrgency);
}

const KIND_ORDER: Readonly<Record<ProposalKind, number>> = { RICEVUTA_PAGAMENTO: 0, RICHIESTA: 1, RITIRO: 2, FONDO: 3, DOCUMENTO: 4, FATTURA: 5, ALTRO: 6 };

/** Open first; then overdue, then by due date; aligned withdrawals last (archive-only). */
export function compareUrgency(a: Proposal, b: Proposal): number {
  if (a.open !== b.open) return a.open ? -1 : 1;
  if (!a.open) return (b.decidedAt ?? "").localeCompare(a.decidedAt ?? "");
  const al = alreadyAligned(a) ? 1 : 0;
  const bl = alreadyAligned(b) ? 1 : 0;
  if (al !== bl) return al - bl;
  const ad = a.dueAt ?? "9999";
  const bd = b.dueAt ?? "9999";
  if (ad !== bd) return ad.localeCompare(bd);
  return KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || (a.sourceAt ?? "").localeCompare(b.sourceAt ?? "");
}

export interface QueueHealth {
  open: number;
  overdue: number;
  mine: number;
  aligned: number;
  unlinked: number;
  decidedLast7: number;
  rejectedLast7: number;
}

/** Health indicators (spie) of the queue, at `now` (ISO). */
export function queueHealth(items: readonly Proposal[], now: string): QueueHealth {
  const weekAgo = new Date(new Date(now).getTime() - 7 * 86_400_000).toISOString();
  const open = items.filter((p) => p.open);
  const decided = items.filter((p) => !p.open && p.decidedAt && p.decidedAt >= weekAgo);
  return {
    open: open.length,
    overdue: open.filter((p) => p.dueAt !== null && p.dueAt < now).length,
    mine: open.filter((p) => p.mine).length,
    aligned: open.filter(alreadyAligned).length,
    unlinked: open.filter((p) => p.machine === "M3" && !p.targetRef).length,
    decidedLast7: decided.length,
    rejectedLast7: decided.filter((p) => p.status === "REJECTED").length,
  };
}

export function needsNote(action: ProposalAction): boolean {
  return action === "reject" || action === "needs_info";
}

const ERRORS: Readonly<Record<string, string>> = {
  forbidden: "Non hai i permessi per questa voce.",
  not_found: "La voce non esiste più: ricarica la coda.",
  note_required: "Scrivi il motivo: serve a chi lavora la voce dopo di te.",
  duplicate_target: "Scegli la voce originale di cui questa è un doppione.",
  snooze_date: "Scegli una data futura per il rinvio.",
  closed: "La voce è già chiusa: riaprila prima di cambiarla.",
  action: "Azione non valida.",
};
export function proposalError(code: string | null | undefined): string {
  return (code && ERRORS[code]) || "Operazione non riuscita. Riprova tra poco.";
}

/** "oggi 14:05", "ieri", "3 giorni fa", or a date. */
export function agoLabel(iso: string | null, now: string): string {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  const n = new Date(now).getTime();
  if (Number.isNaN(d) || Number.isNaN(n)) return "—";
  const days = Math.floor((n - d) / 86_400_000);
  if (days <= 0) return "oggi";
  if (days === 1) return "ieri";
  if (days < 30) return `${days} giorni fa`;
  return new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
}
