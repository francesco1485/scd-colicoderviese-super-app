/**
 * Posta del club on the server (r95, UD-101). Every read and write goes through the SECURITY DEFINER functions of
 * migration r95 with the caller's own session (offices only; RISERVATO only for Direzione + the owning office).
 * The Gmail sync runs with the service key and only from runCommSyncNow (Direzione, checked on the server) or the
 * cron endpoint; no credential ever reaches the browser.
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
import { runCommSyncForOrg, serviceSupabase } from "./comm/sync.server";
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
}

function outcome(data: unknown, error: unknown, okMessage: string): CommOutcome {
  if (error) return { ok: false, message: commError(null) };
  const r = (data ?? {}) as { ok?: boolean; code?: string; threadId?: string; messageId?: string; recipients?: number };
  if (!r.ok) return { ok: false, message: commError(r.code), ...(r.code ? { code: r.code } : {}) };
  return {
    ok: true,
    message: okMessage,
    ...(r.threadId ? { threadId: r.threadId } : {}),
    ...(r.messageId ? { messageId: r.messageId } : {}),
    ...(typeof r.recipients === "number" ? { recipients: r.recipients } : {}),
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
  NOT_CONFIGURED: "Mancano le variabili Gmail sul server: segui i cinque passi.",
  TOKEN_REFUSED: "Google ha rifiutato le credenziali: rigenera il token di aggiornamento (passo 4).",
  WRONG_ACCOUNT: "Le credenziali sono di un'altra casella: rifai il passo 4 entrando con sportclubcolico@gmail.com.",
  NETWORK: "Google non risponde in questo momento. Riprova tra poco.",
  RATE_LIMITED: "Gmail ha chiesto di rallentare: il resto parte con il prossimo giro.",
  HISTORY_RESET: "Collegata. Il punto di lettura della posta è stato riallineato.",
};

export const runCommSyncNow = createServerFn({ method: "POST" }).handler(async (): Promise<CommOutcome> => {
  const { org, sb } = await context();
  if (!sb || !org) return NOT_SIGNED;
  const dir = await sb.rpc("scd_comm_is_direction", { p_organization_id: org.organizationId });
  if (dir.data !== true) return { ok: false, message: "Solo la Direzione può verificare il collegamento." };
  const service = serviceSupabase();
  if (!service) return { ok: false, message: "Manca la chiave di servizio SCD_SUPABASE_SECRET_KEY sul server (passo 5).", code: "NO_SERVICE_KEY" };
  try {
    const r = await runCommSyncForOrg(service, org.organizationId);
    if (!r.connected) return { ok: false, message: SYNC_CODE[r.code ?? ""] ?? "Collegamento non riuscito.", ...(r.code ? { code: r.code } : {}) };
    const parts = [`Casella collegata.`, `Nuove mail ricevute: ${r.received}.`];
    if (r.sent || r.failed) parts.push(`Inviate: ${r.sent}${r.failed ? `, non inviate: ${r.failed}` : ""}.`);
    if (r.stillQueued) parts.push(`In coda: ${r.stillQueued}${r.capReached ? " (limite giornaliero raggiunto: ripartono domani)" : ""}.`);
    if (r.code && SYNC_CODE[r.code]) parts.push(SYNC_CODE[r.code] ?? "");
    return { ok: true, message: parts.join(" ") };
  } catch {
    return { ok: false, message: "Verifica non riuscita. Riprova tra poco." };
  }
});
