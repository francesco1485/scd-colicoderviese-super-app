/**
 * Posta del club on the server (r95, UD-101). Every read and write goes through the SECURITY DEFINER functions of
 * migration r95 with the caller's own session (offices only; RISERVATO only for Direzione + the owning office).
 * The mailbox sync runs with the service key and only from the Direzione's verification (never sends), the staff's
 * stale-refresh of the inbox (refreshCommMailbox) or the cron endpoint; no credential ever reaches the browser.
 * Transport: OAuth Gmail REST or Google app password (SMTP + IMAP), chosen by the server environment (transport.ts).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sessionView } from "./auth.functions";
import { gmailEnvPresence } from "./comm/gmail.server";
import {
  commError,
  parseDirectory,
  parseInbox,
  parseResolve,
  parseThread,
  type Directory,
  type Inbox,
  type ResolvePreview,
  type ThreadDetail,
} from "./comm/rules";
import { sponsorComposerSeed, type SponsorSeed } from "./comm/sponsor";
import { runCommSyncForOrg, serviceSupabase } from "./comm/sync.server";
import { TRANSPORT_MESSAGE, appPasswordEnv, selectTransportMode, type TransportCode, type TransportMode } from "./comm/transport";
import { serverSupabase } from "./supabase.server";

async function context() {
  const s = await sessionView();
  const org = s.memberships[0] ?? null;
  return { org, sb: s.configured && s.user ? serverSupabase() : null };
}

export interface CommOutcome {
  ok: boolean;
  message: string;
  code?: string;
  threadId?: string;
  messageId?: string;
  recipients?: number;
  contactId?: string;
}

function outcome(data: unknown, error: unknown, okMessage: string): CommOutcome {
  if (error) return { ok: false, message: commError(null) };
  const r = (data ?? {}) as { ok?: boolean; code?: string; threadId?: string; messageId?: string; recipients?: number; contactId?: string };
  if (!r.ok) return { ok: false, message: commError(r.code), ...(r.code ? { code: r.code } : {}) };
  return {
    ok: true,
    message: okMessage,
    ...(r.threadId ? { threadId: r.threadId } : {}),
    ...(r.messageId ? { messageId: r.messageId } : {}),
    ...(typeof r.recipients === "number" ? { recipients: r.recipients } : {}),
    ...(r.contactId ? { contactId: r.contactId } : {}),
  };
}

const NOT_SIGNED: CommOutcome = { ok: false, message: "Accesso non valido: entra con il tuo account." };

const uuid = z.string().uuid();
const audienceSchema = z
  .object({
    kind: z.enum(["ALL_MEMBERS", "TEAM", "BIRTH_YEAR", "SPONSORS", "SUPPLIERS", "PERSON", "FAMILY", "CONTACT", "FREE"]),
    teamId: uuid.optional(),
    birthYear: z.number().int().min(1940).max(2030).optional(),
    personId: uuid.optional(),
    familyId: uuid.optional(),
    contactId: uuid.optional(),
    emails: z.array(z.string().trim().toLowerCase().max(254)).max(200).optional(),
    label: z.string().max(200).optional(),
  })
  .superRefine((a, ctx) => {
    const need: Partial<Record<typeof a.kind, keyof typeof a>> = { TEAM: "teamId", BIRTH_YEAR: "birthYear", PERSON: "personId", FAMILY: "familyId", CONTACT: "contactId", FREE: "emails" };
    const k = need[a.kind];
    if (k && (a[k] === undefined || (Array.isArray(a[k]) && (a[k] as unknown[]).length === 0))) ctx.addIssue({ code: "custom", message: `${String(k)} required` });
  });
export type AudienceInput = z.input<typeof audienceSchema>;

/** The audience sent to the database: only the fields its kind uses, never the display label. */
function dbAudience(a: z.output<typeof audienceSchema>): Record<string, unknown> {
  const out: Record<string, unknown> = { kind: a.kind };
  if (a.kind === "TEAM") out["teamId"] = a.teamId;
  if (a.kind === "BIRTH_YEAR") out["birthYear"] = a.birthYear;
  if (a.kind === "PERSON") out["personId"] = a.personId;
  if (a.kind === "FAMILY") out["familyId"] = a.familyId;
  if (a.kind === "CONTACT") out["contactId"] = a.contactId;
  if (a.kind === "FREE") out["emails"] = a.emails;
  return out;
}

export interface InboxData {
  connected: boolean;
  inbox: Inbox | null;
  error: string | null;
}

export const getCommInbox = createServerFn({ method: "GET" }).handler(async (): Promise<InboxData> => {
  const { org, sb } = await context();
  if (!sb || !org) return { connected: false, inbox: null, error: null };
  const { data, error } = await sb.rpc("scd_comm_inbox", { p_organization_id: org.organizationId });
  if (error) return { connected: true, inbox: null, error: "Lettura della posta non riuscita. Riprova tra poco." };
  return { connected: true, inbox: parseInbox(data), error: null };
});

export const getCommThread = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data }): Promise<ThreadDetail | null> => {
    const { sb } = await context();
    if (!sb) return null;
    const r = await sb.rpc("scd_comm_thread", { p_thread_id: data.id });
    return r.error ? null : parseThread(r.data);
  });

export const resolveCommAudience = createServerFn({ method: "POST" })
  .inputValidator((d: { audience: AudienceInput }) => z.object({ audience: audienceSchema }).parse(d))
  .handler(async ({ data }): Promise<ResolvePreview | null> => {
    const { org, sb } = await context();
    if (!sb || !org) return null;
    const r = await sb.rpc("scd_comm_resolve_recipients", { p_organization_id: org.organizationId, p_audience: dbAudience(data.audience) });
    return r.error ? null : parseResolve(r.data);
  });

export const searchCommDirectory = createServerFn({ method: "GET" })
  .inputValidator((d: { q: string }) => z.object({ q: z.string().trim().max(80) }).parse(d))
  .handler(async ({ data }): Promise<Directory | null> => {
    const { org, sb } = await context();
    if (!sb || !org) return null;
    const r = await sb.rpc("scd_comm_directory", { p_organization_id: org.organizationId, p_q: data.q });
    return r.error ? null : parseDirectory(r.data);
  });

const draftSchema = z.object({
  threadId: uuid.nullish(),
  messageId: uuid.nullish(),
  office: z.enum(["DIREZIONE", "SEGRETERIA", "TESORERIA"]),
  confidentiality: z.enum(["ORDINARIO", "RISERVATO"]),
  subject: z.string().trim().min(1).max(250),
  body: z.string().max(20_000),
  audience: audienceSchema,
});
export type DraftInput = z.input<typeof draftSchema>;

export const saveCommDraft = createServerFn({ method: "POST" })
  .inputValidator((d: DraftInput) => draftSchema.parse(d))
  .handler(async ({ data }): Promise<CommOutcome> => {
    const { org, sb } = await context();
    if (!sb || !org) return NOT_SIGNED;
    const r = await sb.rpc("scd_comm_create_draft", {
      p_organization_id: org.organizationId,
      p_thread_id: data.threadId ?? null,
      p_message_id: data.messageId ?? null,
      p_office: data.office,
      p_confidentiality: data.confidentiality,
      p_subject: data.subject,
      p_body: data.body,
      p_audience: dbAudience(data.audience),
    });
    return outcome(r.data, r.error, "Bozza salvata con il tuo nome.");
  });

export const queueCommMessage = createServerFn({ method: "POST" })
  .inputValidator((d: { messageId: string }) => z.object({ messageId: uuid }).parse(d))
  .handler(async ({ data }): Promise<CommOutcome> => {
    const { sb } = await context();
    if (!sb) return NOT_SIGNED;
    const r = await sb.rpc("scd_comm_queue", { p_message_id: data.messageId });
    const o = outcome(r.data, r.error, "Messaggio in coda: parte da sportclubcolico@gmail.com con il prossimo giro.");
    return o.ok && typeof o.recipients === "number" ? { ...o, message: `In coda per ${o.recipients} destinatari: parte da sportclubcolico@gmail.com con il prossimo giro.` } : o;
  });

export const setCommConfidentiality = createServerFn({ method: "POST" })
  .inputValidator((d: { threadId: string; level: "ORDINARIO" | "RISERVATO" }) =>
    z.object({ threadId: uuid, level: z.enum(["ORDINARIO", "RISERVATO"]) }).parse(d))
  .handler(async ({ data }): Promise<CommOutcome> => {
    const { sb } = await context();
    if (!sb) return NOT_SIGNED;
    const r = await sb.rpc("scd_comm_set_confidentiality", { p_thread_id: data.threadId, p_level: data.level });
    return outcome(r.data, r.error, data.level === "RISERVATO" ? "Conversazione riservata: la vedono solo la Direzione e il tuo ufficio." : "Conversazione ordinaria: la vedono Direzione, Segreteria e Tesoreria.");
  });

export const setCommThreadStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { threadId: string; status: "APERTO" | "CHIUSO" }) => z.object({ threadId: uuid, status: z.enum(["APERTO", "CHIUSO"]) }).parse(d))
  .handler(async ({ data }): Promise<CommOutcome> => {
    const { sb } = await context();
    if (!sb) return NOT_SIGNED;
    const r = await sb.rpc("scd_comm_set_thread_status", { p_thread_id: data.threadId, p_status: data.status });
    return outcome(r.data, r.error, data.status === "CHIUSO" ? "Conversazione chiusa." : "Conversazione riaperta.");
  });

const linkSchema = z.object({
  contactId: uuid,
  action: z.enum(["LINK_PERSON", "ACCEPT", "DISCARD"]),
  personId: uuid.nullish(),
  kind: z.enum(["ORGANIZATION", "SUPPLIER", "SPONSOR", "EXTERNAL"]).nullish(),
  ref: z.string().trim().max(160).nullish(),
  orgName: z.string().trim().max(160).nullish(),
  displayName: z.string().trim().max(160).nullish(),
});
export type LinkInput = z.input<typeof linkSchema>;

export const linkCommContact = createServerFn({ method: "POST" })
  .inputValidator((d: LinkInput) => linkSchema.parse(d))
  .handler(async ({ data }): Promise<CommOutcome> => {
    const { org, sb } = await context();
    if (!sb || !org) return NOT_SIGNED;
    const r = await sb.rpc("scd_comm_link_contact", {
      p_organization_id: org.organizationId, p_contact_id: data.contactId, p_action: data.action, p_person_id: data.personId ?? null,
      p_counterpart_kind: data.kind ?? null, p_counterpart_ref: data.ref ?? null, p_org_name: data.orgName ?? null, p_display_name: data.displayName ?? null,
    });
    const done = { LINK_PERSON: "Contatto collegato alla persona.", ACCEPT: "Contatto accettato e collegato.", DISCARD: "Contatto scartato: le sue mail restano agli atti." } as const;
    return outcome(r.data, r.error, done[data.action]);
  });

const contactSchema = z.object({
  email: z.string().trim().toLowerCase().max(254),
  displayName: z.string().trim().max(160).nullish(),
  kind: z.enum(["ORGANIZATION", "SUPPLIER", "SPONSOR", "EXTERNAL"]),
  ref: z.string().trim().max(160).nullish(),
  orgName: z.string().trim().max(160).nullish(),
});
export type ContactInput = z.input<typeof contactSchema>;

export const upsertCommContact = createServerFn({ method: "POST" })
  .inputValidator((d: ContactInput) => contactSchema.parse(d))
  .handler(async ({ data }): Promise<CommOutcome> => {
    const { org, sb } = await context();
    if (!sb || !org) return NOT_SIGNED;
    const r = await sb.rpc("scd_comm_upsert_contact", {
      p_organization_id: org.organizationId, p_email: data.email, p_display_name: data.displayName ?? null,
      p_counterpart_kind: data.kind, p_counterpart_ref: data.ref ?? null, p_org_name: data.orgName ?? null,
    });
    return outcome(r.data, r.error, "Contatto salvato.");
  });

// ------------------------------------------------------------------ Direzione: connection and sending switch

export interface CommSetup {
  connected: boolean;
  isDirection: boolean;
  inbox: Inbox | null;
  env: ReturnType<typeof gmailEnvPresence>;
  /** Code of the last sync (e.g. TOKEN_REFUSED), never values. */
  lastCode: string | null;
}

export const getCommSetup = createServerFn({ method: "GET" }).handler(async (): Promise<CommSetup> => {
  const env = gmailEnvPresence();
  const { org, sb } = await context();
  if (!sb || !org) return { connected: false, isDirection: false, inbox: null, env, lastCode: null };
  const [dir, inbox] = await Promise.all([
    sb.rpc("scd_comm_is_direction", { p_organization_id: org.organizationId }),
    sb.rpc("scd_comm_inbox", { p_organization_id: org.organizationId }),
  ]);
  const isDirection = dir.data === true;
  let lastCode: string | null = null;
  if (isDirection) {
    const s = await sb.from("scd_comm_settings").select("last_sync_result").eq("organization_id", org.organizationId).maybeSingle();
    const v = (s.data as { last_sync_result?: { code?: unknown } } | null)?.last_sync_result?.code;
    lastCode = typeof v === "string" ? v : null;
  }
  return { connected: true, isDirection, inbox: isDirection ? parseInbox(inbox.data) : null, env, lastCode };
});

export const setCommSending = createServerFn({ method: "POST" })
  .inputValidator((d: { enabled: boolean }) => z.object({ enabled: z.boolean() }).parse(d))
  .handler(async ({ data }): Promise<CommOutcome> => {
    const { org, sb } = await context();
    if (!sb || !org) return NOT_SIGNED;
    const r = await sb.rpc("scd_comm_set_sending", { p_organization_id: org.organizationId, p_enabled: data.enabled });
    return outcome(r.data, r.error, data.enabled ? "Invio attivo: i messaggi in coda partono con il prossimo giro." : "Invio sospeso: i messaggi restano in coda o tra le bozze.");
  });

export const SYNC_CODE: Readonly<Record<string, string>> = {
  ...TRANSPORT_MESSAGE,
  NOT_CONFIGURED: "Mancano le credenziali della casella sul server: segui i cinque passi (password per le app su Render).",
  HISTORY_RESET: "Collegata. Il punto di lettura della posta è stato riallineato: da ora arrivano le mail nuove.",
  NO_SERVICE_KEY: "Manca la chiave di servizio SCD_SUPABASE_SECRET_KEY sul server.",
};

function syncSummary(r: { received: number; sent: number; failed: number; stillQueued: number; capReached: boolean; code: string | null }): string[] {
  const parts = [`Nuove mail ricevute: ${r.received}.`];
  if (r.sent || r.failed) parts.push(`Inviate: ${r.sent}${r.failed ? `, non inviate: ${r.failed}` : ""}.`);
  if (r.stillQueued) parts.push(`In coda: ${r.stillQueued}${r.capReached ? " (limite giornaliero raggiunto: ripartono domani)" : ""}.`);
  return parts;
}

/** Kept for the cron-like manual run (sends queued mail when sending is on). The setup page uses verifyCommConnection. */
export const runCommSyncNow = createServerFn({ method: "POST" }).handler(async (): Promise<CommOutcome> => {
  const { org, sb } = await context();
  if (!sb || !org) return NOT_SIGNED;
  const dir = await sb.rpc("scd_comm_is_direction", { p_organization_id: org.organizationId });
  if (dir.data !== true) return { ok: false, message: "Solo la Direzione può verificare il collegamento." };
  const service = serviceSupabase();
  if (!service) return { ok: false, message: SYNC_CODE["NO_SERVICE_KEY"] ?? "", code: "NO_SERVICE_KEY" };
  try {
    const r = await runCommSyncForOrg(service, org.organizationId);
    if (!r.receiving) return { ok: false, message: SYNC_CODE[r.code ?? ""] ?? "Collegamento non riuscito.", ...(r.code ? { code: r.code } : {}) };
    const parts = [r.connected ? "Casella collegata." : "Ricezione collegata, invio non disponibile.", ...syncSummary(r)];
    if (r.code && SYNC_CODE[r.code]) parts.push(SYNC_CODE[r.code] ?? "");
    return { ok: r.connected, message: parts.join(" ") };
  } catch {
    return { ok: false, message: "Verifica non riuscita. Riprova tra poco." };
  }
});

export interface VerifyCheck {
  id: "smtp" | "imap" | "account";
  label: string;
  ok: boolean;
  message: string;
}

export interface VerifyOutcome extends CommOutcome {
  mode: TransportMode;
  checks: VerifyCheck[];
}

/**
 * "Verifica collegamento" (Direzione only). App password: SMTP login + IMAP login, nothing sent; then, when both
 * work, one receive-only sync records the connection and the read point so the Direzione can switch sending on.
 * OAuth: the same receive-only sync. Never sends an e-mail, whatever the state of the switch.
 */
export const verifyCommConnection = createServerFn({ method: "POST" }).handler(async (): Promise<VerifyOutcome> => {
  const mode = selectTransportMode();
  const fail = (message: string, checks: VerifyCheck[] = [], code?: string): VerifyOutcome => ({ ok: false, message, mode, checks, ...(code ? { code } : {}) });
  const { org, sb } = await context();
  if (!sb || !org) return fail(NOT_SIGNED.message);
  const dir = await sb.rpc("scd_comm_is_direction", { p_organization_id: org.organizationId });
  if (dir.data !== true) return fail("Solo la Direzione può verificare il collegamento.");
  if (mode === "DISABLED") return fail(SYNC_CODE["NOT_CONFIGURED"] ?? "", [], "NOT_CONFIGURED");
  const service = serviceSupabase();
  if (!service) return fail(SYNC_CODE["NO_SERVICE_KEY"] ?? "", [], "NO_SERVICE_KEY");
  try {
    const checks: VerifyCheck[] = [];
    if (mode === "APP_PASSWORD") {
      const creds = appPasswordEnv();
      const st = await service.rpc("scd_comm_sync_state", { p_organization_id: org.organizationId });
      const mailbox = String((st.data as { mailbox?: unknown } | null)?.mailbox ?? "sportclubcolico@gmail.com");
      if (!creds) return fail(SYNC_CODE["NOT_CONFIGURED"] ?? "", [], "NOT_CONFIGURED");
      const { verifyAppPassword } = await import("./comm/apppassword.server");
      const v = await verifyAppPassword(creds, mailbox);
      const msg = (c: { ok: boolean; code: TransportCode | null }, okText: string) => (c.ok ? okText : TRANSPORT_MESSAGE[c.code ?? "NETWORK"]);
      checks.push({ id: "smtp", label: "Invio (smtp.gmail.com, porta 465)", ok: v.smtp.ok, message: msg(v.smtp, "Accesso riuscito. Nessuna mail inviata.") });
      checks.push({ id: "imap", label: "Ricezione (imap.gmail.com, porta 993)", ok: v.imap.ok, message: msg(v.imap, "Accesso riuscito. La casella non viene modificata.") });
      if (!v.imap.ok) return fail(checks.find((c) => !c.ok)?.message ?? "Collegamento non riuscito.", checks, v.imap.code ?? undefined);
    }
    const r = await runCommSyncForOrg(service, org.organizationId, { skipOutbound: true });
    if (!r.receiving) return fail(SYNC_CODE[r.code ?? ""] ?? "Collegamento non riuscito.", checks, r.code ?? undefined);
    if (mode === "OAUTH") checks.push({ id: "account", label: "Gmail API (OAuth)", ok: r.connected, message: r.connected ? "Accesso riuscito. Nessuna mail inviata." : SYNC_CODE[r.code ?? ""] ?? "" });
    const head = r.connected ? "Casella collegata: ora la Direzione può attivare l'invio." : "Ricezione collegata, ma l'invio non è disponibile:";
    const parts = [head];
    if (!r.connected && r.code && SYNC_CODE[r.code]) parts.push(SYNC_CODE[r.code] ?? "");
    parts.push(`Nuove mail ricevute: ${r.received}.`);
    if (r.connected && r.code === "HISTORY_RESET") parts.push("Da ora arrivano qui le mail nuove.");
    return { ok: r.connected, message: parts.join(" "), mode, checks, ...(r.code ? { code: r.code } : {}) };
  } catch {
    return fail("Verifica non riuscita. Riprova tra poco.");
  }
});

/** Minimum gap between two refreshes triggered by people opening the Posta del club (the cron does the rest). */
export const REFRESH_MIN_GAP_MS = 120_000;

export interface RefreshOutcome {
  ran: boolean;
  received: number;
  sent: number;
}

/**
 * Staff opening the Posta del club (or queueing a message) bring the mailbox up to date when the last run is older
 * than two minutes: replies arrive and queued mail leaves even before the Render cron exists. Same job, same daily
 * cap, same switch: nothing leaves while "Invio attivo" is off. Any office member may trigger it; nothing is returned
 * but counts.
 */
export const refreshCommMailbox = createServerFn({ method: "POST" }).handler(async (): Promise<RefreshOutcome> => {
  const none: RefreshOutcome = { ran: false, received: 0, sent: 0 };
  if (selectTransportMode() === "DISABLED") return none;
  const { org, sb } = await context();
  if (!sb || !org) return none;
  const offices = await sb.rpc("scd_comm_offices", { p_organization_id: org.organizationId });
  if (offices.error || !Array.isArray(offices.data) || offices.data.length === 0) return none;
  const service = serviceSupabase();
  if (!service) return none;
  const st = await service.from("scd_comm_settings").select("last_sync_at").eq("organization_id", org.organizationId).maybeSingle();
  const last = Date.parse(String((st.data as { last_sync_at?: unknown } | null)?.last_sync_at ?? ""));
  if (Number.isFinite(last) && Date.now() - last < REFRESH_MIN_GAP_MS) return none;
  try {
    const r = await runCommSyncForOrg(service, org.organizationId, { batchMax: 25 });
    return { ran: true, received: r.received, sent: r.sent };
  } catch {
    return none;
  }
});

/** Prefill of the composer for "Scrivi allo sponsor" / "Scrivi a tutti i partner" (addresses stay on the server side lists). */
export const getSponsorComposeSeed = createServerFn({ method: "GET" })
  .inputValidator((d: { name?: string | null }) => z.object({ name: z.string().trim().max(120).nullish() }).parse(d))
  .handler(async ({ data }): Promise<SponsorSeed | null> => {
    const { org, sb } = await context();
    if (!sb || !org) return null;
    const [offices, dir] = await Promise.all([
      sb.rpc("scd_comm_offices", { p_organization_id: org.organizationId }),
      sb.rpc("scd_comm_directory", { p_organization_id: org.organizationId, p_q: data.name ?? "" }),
    ]);
    const list = Array.isArray(offices.data) ? (offices.data as unknown[]).filter((o): o is "DIREZIONE" | "SEGRETERIA" | "TESORERIA" => o === "DIREZIONE" || o === "SEGRETERIA" || o === "TESORERIA") : [];
    if (list.length === 0) return null;
    const d = parseDirectory(dir.data);
    return sponsorComposerSeed({ name: data.name ?? null, contacts: d?.contacts ?? [], offices: list, sponsorsLinked: d ? d.counts.sponsors : null });
  });
