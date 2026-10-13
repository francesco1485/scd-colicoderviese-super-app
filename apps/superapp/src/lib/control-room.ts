/**
 * Control Room of the Direzione (Direzione 13/10/2026 15:31, "Excelsior" interiors; reference board
 * "CONTROL ROOM OPERATIVA", REFERENCE_BOARD: structure only, never its sample data).
 *
 * Pure rules, no I/O: which tiles may appear, how each source is judged, the alert list, the task
 * list, today's agenda and the semantic tone of every status pill. Every value comes from a source
 * the app already reads (calendar snapshot, training quadro, scd_proposal_queue, scd_comm_inbox,
 * scd_fee_board, scd_transport_board, scd_kb_search only_due). A tile without a real source is
 * hidden, never filled. No percentage is computed here: the board's "Readiness" and "occupazione"
 * bars have no verifiable definition yet, so they are left out on purpose.
 */
import { homeMatchesOn, trainingRowsFor, upcomingMatches } from "./board-data";
import type { InboxData } from "./comm.functions";
import type { FeeData } from "./fees.functions";
import { dueIn, type KbItem } from "./knowledge";
import type { KbData } from "./knowledge.functions";
import { compareUrgency, queueHealth, type Proposal, type ProposalStatus } from "./proposals";
import type { QueueData } from "./proposals.functions";
import type { PublicEvent, PublicGroup, TrainingSlot } from "./public-snapshots";
import { FIELD_LABEL, findOverlaps, fromMinutes, groupOverlaps, joinDays, quadroEntries, type Field } from "./quadro";
import type { RunStatus, TransportRun } from "./transport";
import type { TransportData } from "./transport.functions";

/* ------------------------------------------------------------------ inputs */

export interface CalendarSource {
  events: readonly PublicEvent[];
  groups: readonly PublicGroup[];
  /** ISO time of the master copy. */
  sourceModifiedAt: string;
  season: string;
}

export interface QuadroSource {
  slots: readonly TrainingSlot[];
  days: readonly string[];
  /** ISO time of the quadro copy. */
  generatedUTC: string;
}

/** Everything the Control Room reads. A null source means "not readable by this viewer / not connected". */
export interface ControlRoomSources {
  /** Club day, YYYY-MM-DD (Europe/Rome). */
  today: string;
  /** Club time, HH:MM (Europe/Rome). */
  nowHHMM: string;
  /** Current instant, ISO. Used to judge freshness and overdue items. */
  nowIso: string;
  calendar: CalendarSource | null;
  quadro: QuadroSource | null;
  queue: QueueData | null;
  inbox: InboxData | null;
  fees: FeeData | null;
  transport: TransportData | null;
  due: KbData | null;
  /** Access requests waiting for a check (registry of positions), null when not readable. */
  pendingAccess?: number | null;
}

/* ------------------------------------------------------------------ tones */

export type Tone = "ok" | "warn" | "crit" | "info" | "mute";

const PROPOSAL_TONE: Readonly<Record<ProposalStatus, Tone>> = {
  NEW: "info",
  IN_PROGRESS: "info",
  NEEDS_INFO: "warn",
  SNOOZED: "mute",
  ACCEPTED: "ok",
  REJECTED: "mute",
  DUPLICATE: "mute",
};

const RUN_TONE: Readonly<Record<RunStatus, Tone>> = {
  PIANIFICATA: "warn",
  CONFERMATA: "ok",
  ANNULLATA: "crit",
};

export const RUN_LABEL: Readonly<Record<RunStatus, string>> = {
  PIANIFICATA: "Da confermare",
  CONFERMATA: "Confermata",
  ANNULLATA: "Annullata",
};

export type CheckState = "ok" | "stale" | "off" | "error";

const CHECK_TONE: Readonly<Record<CheckState, Tone>> = { ok: "ok", stale: "warn", off: "mute", error: "crit" };

export const CHECK_LABEL: Readonly<Record<CheckState, string>> = {
  ok: "Aggiornata",
  stale: "Copia datata",
  off: "Non collegata",
  error: "Errore di lettura",
};

/** One semantic colour per status, the same on every internal page. Unknown statuses are muted, never green. */
export function statusTone(kind: "proposal", status: ProposalStatus): Tone;
export function statusTone(kind: "run", status: RunStatus): Tone;
export function statusTone(kind: "check", status: CheckState): Tone;
export function statusTone(kind: "proposal" | "run" | "check", status: string): Tone {
  const map: Readonly<Record<string, Tone>> = kind === "proposal" ? PROPOSAL_TONE : kind === "run" ? RUN_TONE : CHECK_TONE;
  return map[status] ?? "mute";
}

/* ------------------------------------------------------------------ source checks */

export type SourceId = "calendario" | "quadro" | "coda" | "posta" | "quote" | "pulmini" | "scadenze";

export interface SourceCheck {
  id: SourceId;
  label: string;
  state: CheckState;
  /** Time of the last copy or sync when the source tells it, ISO. */
  at: string | null;
  detail: string;
}

/** Age limits after which a copy is called "datata". Hours. */
export const STALE_AFTER_HOURS: Readonly<Record<SourceId, number>> = {
  calendario: 24 * 7,
  quadro: 24 * 31,
  coda: 24,
  posta: 3,
  quote: 48,
  pulmini: 48,
  scadenze: 48,
};

function ageHours(nowIso: string, at: string | null): number | null {
  if (!at) return null;
  const a = Date.parse(at);
  const n = Date.parse(nowIso);
  if (Number.isNaN(a) || Number.isNaN(n)) return null;
  return (n - a) / 3_600_000;
}

function freshness(id: SourceId, nowIso: string, at: string | null): CheckState {
  const h = ageHours(nowIso, at);
  if (h === null) return "ok";
  return h > STALE_AFTER_HOURS[id] ? "stale" : "ok";
}

/** Server-read sources share one shape: not connected, error, or data (null data = role without access). */
function serverCheck(
  id: SourceId,
  label: string,
  src: { connected: boolean; error: string | null } | null,
  hasData: boolean,
  at: string | null,
  nowIso: string,
): SourceCheck {
  if (!src || !src.connected) return { id, label, state: "off", at: null, detail: "Serve l'accesso personale al database del club." };
  if (src.error) return { id, label, state: "error", at: null, detail: src.error };
  if (!hasData) return { id, label, state: "off", at: null, detail: "Il tuo ruolo non legge questa fonte." };
  return { id, label, state: freshness(id, nowIso, at), at, detail: at ? "Ultima copia o sincronizzazione registrata." : "Lettura diretta dal database del club." };
}

/** The health of every source the Control Room uses, in a fixed order. */
export function sourceChecks(s: ControlRoomSources): SourceCheck[] {
  const out: SourceCheck[] = [];
  out.push(
    s.calendar
      ? { id: "calendario", label: "Calendario ufficiale", state: freshness("calendario", s.nowIso, s.calendar.sourceModifiedAt), at: s.calendar.sourceModifiedAt, detail: `Copia del calendario FIGC/LND e SCD ${s.calendar.season}.` }
      : { id: "calendario", label: "Calendario ufficiale", state: "off", at: null, detail: "Copia non disponibile." },
  );
  out.push(
    s.quadro && s.quadro.slots.length > 0
      ? { id: "quadro", label: "Quadro allenamenti", state: freshness("quadro", s.nowIso, s.quadro.generatedUTC || null), at: s.quadro.generatedUTC || null, detail: "Quadro settimanale di campi e spogliatoi." }
      : { id: "quadro", label: "Quadro allenamenti", state: "off", at: null, detail: "Il quadro si legge solo da tesserati con accesso." },
  );
  out.push(serverCheck("coda", "Coda di lavoro", s.queue, Boolean(s.queue?.queue), null, s.nowIso));
  const settings = s.inbox?.inbox?.settings ?? null;
  const mail = serverCheck("posta", "Posta del club", s.inbox, Boolean(s.inbox?.inbox), settings?.lastSyncAt ?? null, s.nowIso);
  if (mail.state === "ok" || mail.state === "stale") {
    if (settings && !settings.gmailConnected) out.push({ ...mail, state: "off", detail: "Casella sportclubcolico@gmail.com non collegata." });
    else out.push(mail);
  } else out.push(mail);
  out.push(serverCheck("quote", "Quote e Fondo", s.fees, Boolean(s.fees?.board), s.fees?.board?.sync?.syncedAt ?? null, s.nowIso));
  out.push(serverCheck("pulmini", "Pulmini", s.transport, Boolean(s.transport?.board), s.transport?.board?.syncedAt ?? null, s.nowIso));
  out.push(serverCheck("scadenze", "Scadenze (Cervellone)", s.due, Boolean(s.due?.result), null, s.nowIso));
  return out;
}

export type SystemLevel = "ok" | "partial" | "down";

/**
 * "Sistema operativo attivo" only when every source answered and none is datata. Otherwise the
 * label says how many sources need a look; when nothing answers it says so.
 */
export function systemStatus(checks: readonly SourceCheck[]): { level: SystemLevel; label: string; detail: string } {
  const ok = checks.filter((c) => c.state === "ok").length;
  if (checks.length > 0 && ok === checks.length) return { level: "ok", label: "Sistema operativo attivo", detail: `${ok} fonti su ${checks.length} aggiornate` };
  if (ok === 0) return { level: "down", label: "Fonti non collegate", detail: "Nessuna fonte del club ha risposto" };
  return { level: "partial", label: "Sistema attivo, fonti da verificare", detail: `${ok} fonti su ${checks.length} aggiornate` };
}

/* ------------------------------------------------------------------ tiles */

export const TILE_IDS = ["oggi", "alert", "task", "fonti", "settimana", "eventi", "impianti", "pulmini", "posta", "matchday", "pratiche"] as const;
export type TileId = (typeof TILE_IDS)[number];

export interface TileRule {
  visible: boolean;
  /** Why the tile is shown or hidden (also used in the report and in tests). */
  reason: string;
}

/** Days ahead in which the next home match becomes the "Match Day" tile. */
export const MATCHDAY_WINDOW_DAYS = 7;

/** Desktop rows (12 columns): tile and relative weight. Weights of the visible tiles fill the row. */
export const CONTROL_ROOM_ROWS: readonly (readonly (readonly [TileId, number])[])[] = [
  [["oggi", 3], ["alert", 3], ["task", 3], ["fonti", 3]],
  [["settimana", 9], ["eventi", 3]],
  [["impianti", 4], ["pulmini", 4], ["posta", 4]],
  [["matchday", 8], ["pratiche", 4]],
];

/** Phone and tablet: one stack, what the Direzione needs first. */
export const MOBILE_TILE_ORDER: readonly TileId[] = ["oggi", "alert", "task", "matchday", "eventi", "settimana", "impianti", "pulmini", "posta", "pratiche", "fonti"];

/** Column spans of the visible tiles of one row; they always add up to 12 (empty when nothing is visible). */
export function rowSpans(row: readonly (readonly [TileId, number])[], visible: (id: TileId) => boolean): [TileId, number][] {
  const shown = row.filter(([id]) => visible(id));
  const total = shown.reduce((n, [, w]) => n + w, 0);
  if (total === 0) return [];
  let used = 0;
  return shown.map(([id, w], i) => {
    const span = i === shown.length - 1 ? 12 - used : Math.max(2, Math.round((w * 12) / total));
    used += span;
    return [id, span];
  });
}

/** A tile appears only when a real source can fill it. */
export function tileVisibility(s: ControlRoomSources): Record<TileId, TileRule> {
  const cal = Boolean(s.calendar && s.calendar.events.length > 0);
  const quadro = Boolean(s.quadro && s.quadro.slots.length > 0);
  const queue = Boolean(s.queue?.connected && s.queue.queue);
  const due = Boolean(s.due?.connected && s.due.result);
  const inbox = Boolean(s.inbox?.connected && s.inbox.inbox);
  const fees = Boolean(s.fees?.connected && s.fees.board);
  const transport = Boolean(s.transport?.connected && s.transport.board);
  const match = s.calendar ? nextHomeMatch(s.calendar.events, s.today, s.nowHHMM) : null;
  const rule = (visible: boolean, yes: string, no: string): TileRule => ({ visible, reason: visible ? yes : no });
  return {
    oggi: rule(cal || quadro, "Calendario o quadro disponibili.", "Né calendario né quadro leggibili."),
    alert: rule(cal || quadro || queue || inbox || fees || transport || s.pendingAccess != null, "Almeno una fonte che genera avvisi.", "Nessuna fonte che possa generare avvisi."),
    task: rule(queue || due, "Coda di lavoro o scadenze del Cervellone leggibili.", "Coda e scadenze non leggibili."),
    fonti: rule(true, "Sempre: dice quali fonti rispondono.", ""),
    settimana: rule(cal || quadro, "Calendario o quadro disponibili.", "Né calendario né quadro leggibili."),
    eventi: rule(cal, "Calendario ufficiale disponibile.", "Calendario non disponibile."),
    impianti: rule(quadro, "Quadro allenamenti con campi e spogliatoi.", "Quadro allenamenti non leggibile."),
    pulmini: rule(transport, "Tabellone pulmini dal database.", "Pulmini non leggibili per questo accesso."),
    posta: rule(inbox, "Posta del club collegata.", "Posta del club non leggibile."),
    matchday: rule(match !== null, "Gara in casa entro 7 giorni nel calendario.", "Nessuna gara in casa nei prossimi 7 giorni."),
    pratiche: rule(queue, "Coda di lavoro leggibile.", "Coda di lavoro non leggibile."),
  };
}

/* ------------------------------------------------------------------ calendar helpers */

export function addDaysIso(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Next home match at Colico or Dervio within the window, from now. */
export function nextHomeMatch(events: readonly PublicEvent[], today: string, nowHHMM: string, withinDays = MATCHDAY_WINDOW_DAYS): PublicEvent | null {
  const last = addDaysIso(today, withinDays);
  const list = upcomingMatches(events, today, nowHHMM)
    .filter((e) => e.date <= last && homeMatchesOn([e], e.date).length > 0)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || "99").localeCompare(b.time || "99"));
  return list[0] ?? null;
}

/** Upcoming official events (matches) from now, nearest first. */
export function nextEvents(events: readonly PublicEvent[], today: string, nowHHMM: string, limit = 5): PublicEvent[] {
  return upcomingMatches(events, today, nowHHMM)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || "99").localeCompare(b.time || "99"))
    .slice(0, limit);
}

export interface AgendaRow {
  id: string;
  time: string;
  end: string;
  kind: "allenamento" | "gara";
  /** Team or group label as written in the source. */
  label: string;
  place: string;
}

/** Today: training sessions of the quadro plus the day's matches, by time. */
export function todayAgenda(s: Pick<ControlRoomSources, "today" | "calendar" | "quadro">, groupLabel: (id: string) => string): AgendaRow[] {
  const rows: AgendaRow[] = [];
  if (s.quadro) {
    for (const r of trainingRowsFor(s.today, s.quadro.slots)) {
      rows.push({ id: r.id, time: r.time, end: r.end, kind: "allenamento", label: r.teams, place: `Colico · ${FIELD_LABEL[r.field as Field] ?? r.field}` });
    }
  }
  if (s.calendar) {
    for (const e of s.calendar.events.filter((x) => x.date === s.today)) {
      rows.push({ id: e.id, time: e.time, end: "", kind: "gara", label: groupLabel(e.group) || e.category, place: e.venue });
    }
  }
  return rows.sort((a, b) => (a.time || "99").localeCompare(b.time || "99") || a.label.localeCompare(b.label));
}

export interface FieldDay {
  field: Field;
  label: string;
  sessions: { time: string; end: string; teams: string }[];
}

/** Colico fields today from the quadro (weekdays only: the quadro has no weekend). */
export function facilityToday(slots: readonly TrainingSlot[], today: string): FieldDay[] {
  const rows = trainingRowsFor(today, slots);
  return (["C1", "C2"] as const).map((field) => ({
    field,
    label: FIELD_LABEL[field],
    sessions: rows.filter((r) => r.field === field).map((r) => ({ time: r.time, end: r.end, teams: r.teams })),
  }));
}

/* ------------------------------------------------------------------ alerts */

export interface AlertItem {
  id: string;
  tone: "crit" | "warn";
  title: string;
  detail: string;
  /** Where the alert is handled. */
  href: string;
  /** Sort key (YYYY-MM-DD) when the alert has a date. */
  date: string | null;
}

/** Days ahead scanned for calendar variations and unconfirmed home matches. */
export const ALERT_WINDOW_DAYS = 7;

const shortIt = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);

/** Real problems only, critical first, then by date. Counts never expose names. */
export function buildAlerts(s: ControlRoomSources, groupLabel: (id: string) => string): AlertItem[] {
  const out: AlertItem[] = [];

  if (s.pendingAccess && s.pendingAccess > 0) {
    out.push({ id: "access-pending", tone: "warn", title: `${s.pendingAccess} ${s.pendingAccess === 1 ? "richiesta di accesso" : "richieste di accesso"} da verificare`, detail: "Persone e accessi", href: "/segreteria/persone", date: null });
  }

  const queue = s.queue?.queue ?? null;
  if (queue) {
    const h = queueHealth(queue.items, s.nowIso);
    if (h.overdue > 0) out.push({ id: "queue-overdue", tone: "crit", title: `${h.overdue} ${h.overdue === 1 ? "voce oltre la scadenza" : "voci oltre la scadenza"}`, detail: "Coda di lavoro: da decidere", href: "/gestionale/coda", date: null });
    const info = queue.items.filter((p) => p.open && p.status === "NEEDS_INFO").length;
    if (info > 0) out.push({ id: "queue-info", tone: "warn", title: `${info} ${info === 1 ? "voce in attesa" : "voci in attesa"} di informazioni`, detail: "Coda di lavoro", href: "/gestionale/coda", date: null });
  }

  const settings = s.inbox?.inbox?.settings ?? null;
  if (settings) {
    if (settings.failedToday > 0) out.push({ id: "mail-failed", tone: "crit", title: `${settings.failedToday} ${settings.failedToday === 1 ? "invio non riuscito" : "invii non riusciti"} oggi`, detail: "Posta del club", href: "/gestionale/posta", date: null });
    if (!settings.gmailConnected) out.push({ id: "mail-off", tone: "warn", title: "Casella del club non collegata", detail: "Le mail non entrano nel gestionale", href: "/direzione/posta/collega", date: null });
  }

  const fees = s.fees?.board ?? null;
  if (fees) {
    const late = fees.positions.filter((p) => p.group === "IN_RITARDO").length;
    if (late > 0) out.push({ id: "fees-late", tone: "warn", title: `${late} ${late === 1 ? "quota in ritardo" : "quote in ritardo"}`, detail: `Stagione ${fees.season}`, href: "/tesoreria/quote", date: null });
  }

  const board = s.transport?.board ?? null;
  if (board) {
    const last = addDaysIso(s.today, ALERT_WINDOW_DAYS);
    const open = board.runs.filter((r) => r.status !== "ANNULLATA" && r.date >= s.today && r.date <= last && (!r.driverId || !r.vehicleId));
    for (const r of open.slice(0, 3)) {
      out.push({ id: `run-${r.id}`, tone: "warn", title: `${r.title}: ${!r.vehicleId ? "pulmino" : "autista"} da assegnare`, detail: `${shortIt(r.date)} · partenza ${r.departure}`, href: "/pulmini", date: r.date });
    }
  }

  if (s.calendar) {
    const last = addDaysIso(s.today, ALERT_WINDOW_DAYS);
    const near = s.calendar.events.filter((e) => e.date >= s.today && e.date <= last);
    for (const e of near) {
      const team = groupLabel(e.group) || e.category;
      if (e.isVariation) out.push({ id: `var-${e.id}`, tone: "warn", title: `Variazione gara ${team}`, detail: `${shortIt(e.date)}${e.time ? ` · ${e.time}` : ""} · ${e.venue || "campo da definire"}`, href: "/calendario", date: e.date });
      else if (e.homeAway === "CASA" && (!e.timeConfirmed || !e.venueConfirmed)) {
        const what = !e.timeConfirmed && !e.venueConfirmed ? "Orario e campo" : !e.timeConfirmed ? "Orario" : "Campo";
        out.push({ id: `conf-${e.id}`, tone: "warn", title: `${what} da confermare: ${team}`, detail: `${shortIt(e.date)}${e.time ? ` · ${e.time}` : ""} · gara in casa`, href: "/calendario", date: e.date });
      }
    }
  }

  if (s.quadro) {
    const groups = groupOverlaps(findOverlaps(quadroEntries(s.quadro.slots)), s.quadro.days);
    for (const g of groups) {
      out.push({ id: `ov-${g.key}`, tone: "warn", title: `Conflitto ${FIELD_LABEL[g.field]}: ${g.teams[0]} e ${g.teams[1]}`, detail: `${joinDays(g.days)} · ${fromMinutes(g.from)}–${fromMinutes(g.to)}`, href: "/gestionale/impianti", date: null });
    }
  }

  const rank = (a: AlertItem) => (a.tone === "crit" ? 0 : 1);
  return out.sort((a, b) => rank(a) - rank(b) || (a.date ?? "9999").localeCompare(b.date ?? "9999"));
}

/* ------------------------------------------------------------------ tasks */

export interface TaskItem {
  id: string;
  title: string;
  meta: string;
  /** YYYY-MM-DD or null. */
  due: string | null;
  /** Days to the deadline (negative = overdue), null without a date. */
  days: number | null;
  href: string;
  external: boolean;
}

/** Days ahead in which a Cervellone deadline becomes a task. */
export const TASK_WINDOW_DAYS = 30;

/** Open proposals (urgency order of the queue) and near Cervellone deadlines, nearest deadline first. */
export function buildTasks(s: ControlRoomSources, limit = 5): TaskItem[] {
  const out: TaskItem[] = [];
  const items: readonly Proposal[] = s.queue?.queue?.items ?? [];
  for (const p of items.filter((x) => x.open && x.status !== "SNOOZED").slice().sort(compareUrgency)) {
    const due = p.dueAt ? p.dueAt.slice(0, 10) : null;
    out.push({ id: `p-${p.id}`, title: p.title, meta: `${p.mine ? "Presa da te" : p.assigned ? "In carico" : "Da prendere"} · Coda di lavoro`, due, days: due ? dueIn(s.today, due) : null, href: "/gestionale/coda", external: false });
  }
  const kb: readonly KbItem[] = s.due?.result?.items ?? [];
  for (const it of kb) {
    if (!it.due) continue;
    const days = dueIn(s.today, it.due);
    if (days > TASK_WINDOW_DAYS) continue;
    out.push({ id: `k-${it.id}`, title: it.title, meta: "Scadenza · Cervellone", due: it.due, days, href: it.link ?? "/direzione/cervellone", external: Boolean(it.link) });
  }
  return out
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"))
    .slice(0, limit);
}

/* ------------------------------------------------------------------ pratiche, posta, pulmini */

export function proposalCounts(items: readonly Proposal[]): { status: ProposalStatus; count: number }[] {
  const order: ProposalStatus[] = ["NEW", "IN_PROGRESS", "NEEDS_INFO", "SNOOZED"];
  return order.map((status) => ({ status, count: items.filter((p) => p.open && p.status === status).length })).filter((x) => x.count > 0);
}

/** Latest items of the queue, newest first (open and recently decided). */
export function latestProposals(items: readonly Proposal[], limit = 4): Proposal[] {
  return items
    .slice()
    .sort((a, b) => (b.decidedAt ?? b.createdAt).localeCompare(a.decidedAt ?? a.createdAt))
    .slice(0, limit);
}

/** Runs of the next days that are not cancelled, by date and departure. */
export function upcomingRuns(runs: readonly TransportRun[], today: string, days = ALERT_WINDOW_DAYS): TransportRun[] {
  const last = addDaysIso(today, days);
  return runs
    .filter((r) => r.date >= today && r.date <= last)
    .sort((a, b) => a.date.localeCompare(b.date) || a.departure.localeCompare(b.departure));
}

/* ------------------------------------------------------------------ tabs */

export interface ControlTab {
  id: string;
  label: string;
  href: string;
}

/** Board tabs mapped to the routes that already exist. "Report" becomes Cervellone: there is no report page yet. */
export const CONTROL_ROOM_TABS: readonly ControlTab[] = [
  { id: "dashboard", label: "Dashboard", href: "/direzione" },
  { id: "calendario", label: "Calendario", href: "/gestionale" },
  { id: "impianti", label: "Impianti", href: "/gestionale/impianti" },
  { id: "matchday", label: "Match Day", href: "/gestionale/mister" },
  { id: "pulmini", label: "Pulmini", href: "/pulmini" },
  { id: "persone", label: "Persone", href: "/segreteria/persone" },
  { id: "comunicazioni", label: "Comunicazioni", href: "/gestionale/posta" },
  { id: "task", label: "Task", href: "/gestionale/coda" },
  { id: "pratiche", label: "Pratiche", href: "/segreteria" },
  { id: "cervellone", label: "Cervellone", href: "/direzione/cervellone" },
];
