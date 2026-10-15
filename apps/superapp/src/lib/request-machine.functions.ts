/**
 * Request machine on the server (UD-154, staged migration r133 NOT APPLIED). Named request-machine.* to keep it apart
 * from lib/requests.ts (the older free-text classifier of UD-044, which stays as it is).
 *
 * Every call uses the caller's own Supabase session (publishable key + cookies); the database functions of r133 check
 * roles and positions on their own, nothing here trusts the browser for permissions. Until r133 is applied every
 * call fails closed: reads answer `ready: false` ("Funzione in preparazione") and writes answer a plain message,
 * never a fake "saved". Nothing is sent to anybody: notices stay in the app.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { workAreaView, type WorkAreaGate } from "./access";
import { sessionView } from "./auth.functions";
import { CREST_REGISTRY, normalizeOpponentName } from "./crests";
import { stagingPreviewEnabled } from "./impianti-access";
import {
  FORM_STATUSES,
  MATCH_SCOPES,
  REQUEST_CHANNELS,
  hasRequestRole,
  parseClubRows,
  parseNotices,
  parseRequestRows,
  requestError,
  toRequestRow,
  validateDraft,
  type ClubRow,
  type RequestNotice,
  type RequestRow,
} from "./request-machine";
import { serverSupabase } from "./supabase.server";

type DbError = { code?: string; message: string } | null;

/** r133 not applied: function or table missing from the schema. */
export function machineMissing(e: DbError): boolean {
  if (!e) return false;
  return ["42P01", "42883", "PGRST202", "PGRST205"].includes(e.code ?? "") || /does not exist|schema cache|could not find the function/i.test(e.message);
}

async function context() {
  const s = await sessionView();
  const roles = s.user ? new Set(s.roles) : null;
  const org = s.memberships[0] ?? null;
  return { s, roles, org, sb: s.configured && s.user && org ? serverSupabase() : null };
}

const OFF_WRITE = "Funzione in preparazione: la Direzione deve ancora attivare le richieste nel database.";

/* ------------------------------------------------------------------ Segreteria board */

export interface RequestsDesk {
  gate: WorkAreaGate;
  /** False without Supabase keys, session or organization. */
  connected: boolean;
  /** False while r133 is not applied. */
  ready: boolean;
  /** Segreteria/Direzione write drafts; the others only read. UI hint, the database decides. */
  canEdit: boolean;
  rows: RequestRow[];
  notices: RequestNotice[];
  error: string | null;
}

export const getRequestsDesk = createServerFn({ method: "GET" }).handler(async (): Promise<RequestsDesk> => {
  const { s, roles, org, sb } = await context();
  const gate = workAreaView("richieste", { preview: stagingPreviewEnabled(process.env, import.meta.env.PROD), sessionRoles: roles });
  const canEdit = Boolean(roles && org && ["DIRECTION", "SECRETARIAT", "REGISTRATION"].includes(org.role));
  const base: RequestsDesk = { gate, connected: false, ready: false, canEdit: false, rows: [], notices: [], error: null };
  if (gate.view !== "page" || !sb || !org || !s.user) return base;
  const orgId = org.organizationId;
  const exp = await sb.rpc("scd_requests_expire", { p_organization_id: orgId });
  if (machineMissing(exp.error)) return { ...base, connected: true, canEdit };
  const [board, notices] = await Promise.all([
    sb.rpc("scd_requests_board", { p_organization_id: orgId }),
    sb.rpc("scd_request_notices", { p_organization_id: orgId }),
  ]);
  if (machineMissing(board.error)) return { ...base, connected: true, canEdit };
  if (board.error) return { ...base, connected: true, ready: true, canEdit, error: "Lettura non riuscita: serve un accesso Segreteria, Direzione, Direttore Generale o Coordinatore." };
  return { ...base, connected: true, ready: true, canEdit, rows: parseRequestRows(board.data), notices: notices.error ? [] : parseNotices(notices.data) };
});

/* ------------------------------------------------------------------ "Da confermare" card (La mia SCD) */

export type MyConfirmations =
  /** Not signed in or no part in the machine: the card is not shown. */
  | { state: "none" }
  /** r133 not applied or database not reachable: the card says "in preparazione". */
  | { state: "off" }
  | { state: "ok"; rows: RequestRow[]; notices: RequestNotice[]; serverNow: number };

export const getMyConfirmations = createServerFn({ method: "GET" }).handler(async (): Promise<MyConfirmations> => {
  const { roles, org, sb } = await context();
  if (!roles || !hasRequestRole(roles)) return { state: "none" };
  if (!sb || !org) return { state: "off" };
  const orgId = org.organizationId;
  const exp = await sb.rpc("scd_requests_expire", { p_organization_id: orgId });
  if (exp.error) return { state: "off" };
  const [mine, notices] = await Promise.all([
    sb.rpc("scd_requests_to_confirm", { p_organization_id: orgId }),
    sb.rpc("scd_request_notices", { p_organization_id: orgId }),
  ]);
  if (mine.error) return { state: "off" };
  return { state: "ok", rows: parseRequestRows(mine.data), notices: notices.error ? [] : parseNotices(notices.data).slice(0, 8), serverNow: Date.now() };
});

/* ------------------------------------------------------------------ writes */

export interface MachineOutcome {
  ok: boolean;
  message: string;
  id?: string;
  errors?: Record<string, string>;
}

const draftSchema = z.object({
  teamKey: z.string().max(20).nullable().optional(),
  date: z.string().max(10).nullable().optional(),
  time: z.string().max(5).nullable().optional(),
  venue: z.string().max(200).nullable().optional(),
  homeAway: z.enum(["CASA", "FUORI"]).nullable().optional(),
  scope: z.enum(MATCH_SCOPES).nullable().optional(),
  opponentText: z.string().max(160).nullable().optional(),
  opponentClubId: z.string().max(36).nullable().optional(),
  note: z.string().max(400).nullable().optional(),
});

async function call(fn: string, args: Record<string, unknown>, okMessage: string): Promise<MachineOutcome> {
  const { org, sb } = await context();
  if (!sb || !org) return { ok: false, message: "Entra con il tuo account per continuare." };
  const { data, error } = await sb.rpc(fn, { p_organization_id: org.organizationId, ...args });
  if (machineMissing(error)) return { ok: false, message: OFF_WRITE };
  if (error) return { ok: false, message: requestError(null) };
  const r = (data ?? {}) as { ok?: boolean; code?: string; id?: string };
  if (!r.ok) return { ok: false, message: requestError(r.code) };
  return { ok: true, message: okMessage, ...(r.id ? { id: r.id } : {}) };
}

const dbDraft = (v: ReturnType<typeof validateDraft> & { ok: true }) => ({
  teamKey: v.value.teamKey,
  startsAt: v.value.startsAt,
  venue: v.value.venue,
  homeAway: v.value.homeAway,
  scope: v.value.scope,
  opponentText: v.value.opponentText,
  opponentClubId: v.value.opponentClubId,
  note: v.value.note,
});

export const createRequestDraft = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    draftSchema.extend({ channel: z.enum(REQUEST_CHANNELS), rawText: z.string().max(1000).nullable().optional() }).parse(d),
  )
  .handler(async ({ data }): Promise<MachineOutcome> => {
    const v = validateDraft(data, Date.now());
    if (!v.ok) return { ok: false, message: "Controlla i campi evidenziati.", errors: v.errors };
    return call(
      "scd_request_create",
      { p: { kind: "AMICHEVOLE", channel: data.channel, rawText: data.rawText ?? null, ...dbDraft(v) } },
      "Bozza salvata. Controlla i dati e mandala a chi conferma.",
    );
  });

export const updateRequestDraft = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => draftSchema.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<MachineOutcome> => {
    const v = validateDraft(data, Date.now());
    if (!v.ok) return { ok: false, message: "Controlla i campi evidenziati.", errors: v.errors };
    return call("scd_request_update", { p_request_id: data.id, p: dbDraft(v) }, "Modifiche salvate.");
  });

const idSchema = z.object({ id: z.string().uuid() });

export const sendRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data }) => call("scd_request_send", { p_request_id: data.id }, "Inviata: la trova nella sua area La mia SCD, ha 15 giorni per confermare."));

export const cancelRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => idSchema.extend({ note: z.string().max(300).optional() }).parse(d))
  .handler(async ({ data }) => call("scd_request_cancel", { p_request_id: data.id, p_note: data.note ?? null }, "Richiesta annullata."));

export const decideRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    idSchema
      .extend({ decision: z.enum(["CONFERMA", "RIFIUTA"]), note: z.string().max(300).optional(), clubId: z.string().uuid().nullable().optional() })
      .parse(d),
  )
  .handler(async ({ data }) =>
    call(
      "scd_request_decide",
      { p_request_id: data.id, p_decision: data.decision, p_note: data.note ?? null, p_opponent_club_id: data.clubId ?? null },
      data.decision === "CONFERMA"
        ? "Confermata: compare in calendario e la Segreteria prepara il modulo da far firmare."
        : "Segnata come non possibile. La Segreteria è avvisata nell'app.",
    ),
  );

export const advanceFormStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => idSchema.extend({ to: z.enum(FORM_STATUSES) }).parse(d))
  .handler(async ({ data }) => call("scd_request_set_form_status", { p_request_id: data.id, p_form_status: data.to }, "Stato del modulo aggiornato."));

/* ------------------------------------------------------------------ clubs */

export interface ClubSuggestion {
  /** Database id, or null for a club known only to the crest registry (added on pick). */
  id: string | null;
  name: string;
  city: string | null;
  crestKey: string | null;
}

export interface ClubSearch {
  ready: boolean;
  items: ClubSuggestion[];
}

export const searchClubs = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ q: z.string().max(60) }).parse(d))
  .handler(async ({ data }): Promise<ClubSearch> => {
    const q = data.q.trim();
    const { org, sb } = await context();
    if (!sb || !org || q.length < 2) return { ready: Boolean(sb && org), items: [] };
    const { data: rows, error } = await sb.rpc("scd_clubs_search", { p_organization_id: org.organizationId, p_query: q });
    if (error) return { ready: false, items: [] };
    const db: ClubRow[] = parseClubRows(rows);
    const known = new Set(db.map((c) => normalizeOpponentName(c.name)));
    const nq = normalizeOpponentName(q);
    // Clubs of the opponent crest registry (calendar opponents) not yet in the database: offered, added on pick.
    const fromRegistry = CREST_REGISTRY.filter(
      (e) => !known.has(normalizeOpponentName(e.displayName)) && [e.displayName, ...e.aliases].some((n) => normalizeOpponentName(n).includes(nq)),
    )
      .slice(0, 5)
      .map((e) => ({ id: null, name: e.displayName, city: null, crestKey: e.slug }));
    return { ready: true, items: [...db.map((c) => ({ id: c.id, name: c.name, city: c.city, crestKey: c.crestKey })), ...fromRegistry].slice(0, 12) };
  });

export const createClub = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().min(2).max(120),
        city: z.string().max(80).optional(),
        province: z.string().max(2).optional(),
        figcMatricola: z.string().max(10).optional(),
        crestKey: z.string().max(80).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<MachineOutcome & { club?: ClubSuggestion }> => {
    if (data.crestKey && !CREST_REGISTRY.some((e) => e.slug === data.crestKey)) return { ok: false, message: "Stemma non nel registro." };
    if (data.figcMatricola && !/^\d{3,10}$/.test(data.figcMatricola)) return { ok: false, message: "La matricola FIGC ha solo cifre.", errors: { figcMatricola: "Solo cifre." } };
    if (data.province && !/^[A-Za-z]{2}$/.test(data.province)) return { ok: false, message: "Provincia di due lettere (es. LC).", errors: { province: "Due lettere." } };
    const out = await call("scd_club_create", { p: { ...data, province: data.province?.toUpperCase() } }, "Società salvata.");
    if (!out.ok || !out.id) return out;
    return { ...out, club: { id: out.id, name: data.name.trim(), city: data.city?.trim() || null, crestKey: data.crestKey ?? null } };
  });

/* ------------------------------------------------------------------ printable form */

export interface RequestFormData {
  gate: WorkAreaGate;
  ready: boolean;
  row: RequestRow | null;
  error: string | null;
}

export const getRequestForm = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().max(64) }).parse(d))
  .handler(async ({ data }): Promise<RequestFormData> => {
    const { roles, org, sb } = await context();
    const gate = workAreaView("richieste", { preview: stagingPreviewEnabled(process.env, import.meta.env.PROD), sessionRoles: roles });
    if (gate.view !== "page" || !sb || !org) return { gate, ready: false, row: null, error: null };
    if (!z.string().uuid().safeParse(data.id).success) return { gate, ready: true, row: null, error: "Richiesta non trovata." };
    const { data: raw, error } = await sb.rpc("scd_request_form", { p_organization_id: org.organizationId, p_request_id: data.id });
    if (machineMissing(error)) return { gate, ready: false, row: null, error: null };
    if (error) return { gate, ready: true, row: null, error: "Lettura non riuscita." };
    const row = raw ? toRequestRow(raw) : null;
    return { gate, ready: true, row, error: row ? null : "Richiesta non trovata." };
  });
