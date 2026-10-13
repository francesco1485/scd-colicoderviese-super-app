/**
 * comm-sync (r95, UD-101): the only job that talks to the club mailbox. Runs with the Supabase service key
 * (SCD_SUPABASE_SECRET_KEY, server env only) because the outbox claim, delivery marks, inbound record and checkpoint
 * functions are service-only. Called by the Render cron (POST /internal/comm-sync with the shared secret), by the
 * Direzione's "Verifica collegamento" (never sends) and by the staff opening the Posta del club when the last run is
 * old (refreshCommMailbox).
 *
 * Transport (transport.ts): OAuth Gmail REST when its env is complete, else app password (SMTP + IMAP), else none.
 * Order of each run, per organization:
 *   1. no transport                → checkpoint "not connected" (sending forced off), nothing else;
 *   2. open                        → login; the mailbox must be the club mailbox, else "not connected";
 *   3. inbound                     → new INBOX mail since the stored cursor; first run only stores the cursor;
 *                                    replies matched by In-Reply-To / References / [SCD-xxxxxx] subject tag;
 *   4. outbound                    → only when sending is enabled and the transport can send: claim within the
 *                                    daily cap, one e-mail per envelope, mark each delivery;
 *   5. checkpoint                  → connected (= can receive AND send), new cursor, counts (never secrets/addresses).
 * Never sends anything when sending_enabled is false; never logs credentials, addresses or message contents.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { supabaseEnv } from "../supabase.server";
import { createAppPasswordTransport, defaultAppPasswordDeps, type AppPasswordDeps } from "./apppassword.server";
import { createOAuthTransport, gmailEnv, type FetchLike } from "./gmail.server";
import { buildRawMessage, type InboundPayload } from "./rfc2822";
import { normalizeEmail, signature, type Office } from "./rules";
import {
  TransportError,
  appPasswordEnv,
  extractThreadTag,
  htmlFromText,
  replyReference,
  selectTransportMode,
  stopsRun,
  stripThreadTag,
  tagUuidRange,
  taggedSubject,
  type MailTransport,
  type TransportMode,
} from "./transport";

export interface SyncResult {
  organizationId: string;
  mode: TransportMode;
  connected: boolean;
  /** Receiving works (may be true while sending is blocked). */
  receiving: boolean;
  code: string | null;
  received: number;
  skipped: number;
  sent: number;
  failed: number;
  stillQueued: number;
  capReached: boolean;
}

/** Service client, or null when the key is not configured. Never exposed to the browser. */
export function serviceSupabase(env: Readonly<Record<string, string | undefined>> = process.env): SupabaseClient | null {
  const base = supabaseEnv(env);
  const key = (env["SCD_SUPABASE_SECRET_KEY"] ?? "").trim();
  if (!base || !key) return null;
  return createClient(base.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export interface OutboxItem {
  recipientId: string;
  messageId: string;
  threadId: string | null;
  to: string;
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  office: Office | null;
  senderName: string | null;
  gmailThreadId: string | null;
  inReplyTo: string | null;
}

export function outboxItems(v: unknown): OutboxItem[] {
  const items = (v as { items?: unknown })?.items;
  if (!Array.isArray(items)) return [];
  return items.flatMap((x) => {
    const o = x as Record<string, unknown>;
    const s = (k: string) => (typeof o[k] === "string" ? (o[k] as string) : null);
    const list = (k: string) => (Array.isArray(o[k]) ? (o[k] as unknown[]).filter((e): e is string => typeof e === "string") : []);
    const recipientId = s("recipientId");
    const to = s("to");
    if (!recipientId || !to) return [];
    const office = s("office");
    return [{
      recipientId,
      messageId: s("messageId") ?? "",
      threadId: s("threadId"),
      to,
      cc: list("cc"),
      bcc: list("bcc"),
      subject: s("subject") ?? "",
      body: s("body") ?? "",
      office: office === "DIREZIONE" || office === "SEGRETERIA" || office === "TESORERIA" ? office : null,
      senderName: s("senderName"),
      gmailThreadId: s("gmailThreadId"),
      inReplyTo: s("inReplyTo"),
    }];
  });
}

/** Our Message-ID for one envelope (also recorded on the recipient row to match the reply). */
export function envelopeMessageId(recipientId: string): string {
  return `scd-${recipientId}@colicoderviese.app`;
}

/**
 * The RFC 2822 message of one envelope: one recipient (plus the guardians the minors rule puts in copy), from and
 * Reply-To the club mailbox, signed with the staff member's name and office, plain text + HTML, subject tagged with
 * the thread ([SCD-xxxxxx]) and X-SCD-Thread / X-SCD-Message-Id / X-SCD-Recipient-Id headers.
 */
export function envelopeMessage(item: OutboxItem, mailbox: string, now: Date = new Date(), opts: { omitBccHeader?: boolean; boundary?: string } = {}): string {
  const text = `${item.body}${signature(item.senderName, item.office)}`;
  const headers: Record<string, string> = { "X-SCD-Message-Id": item.messageId, "X-SCD-Recipient-Id": item.recipientId };
  if (item.threadId) headers["X-SCD-Thread"] = item.threadId;
  return buildRawMessage({
    from: { name: "S.C.D. ColicoDerviese", email: mailbox },
    replyTo: { name: "S.C.D. ColicoDerviese", email: mailbox },
    to: [item.to],
    cc: item.cc,
    bcc: item.bcc,
    subject: taggedSubject(item.subject, item.threadId),
    body: text,
    html: htmlFromText(text),
    messageId: envelopeMessageId(item.recipientId),
    inReplyTo: item.inReplyTo,
    date: now,
    headers,
    ...(opts.omitBccHeader ? { omitBccHeader: true } : {}),
    ...(opts.boundary ? { boundary: opts.boundary } : {}),
  });
}

async function checkpoint(sb: SupabaseClient, org: string, connected: boolean, historyId: string | null, result: Record<string, unknown>) {
  await sb.rpc("scd_comm_sync_checkpoint", { p_organization_id: org, p_connected: connected, p_history_id: historyId, p_result: result });
}

export interface TransportFactoryOpts {
  env?: Readonly<Record<string, string | undefined>>;
  fetchImpl?: FetchLike;
  appDeps?: AppPasswordDeps;
}

/** The transport the environment selects, or null (DISABLED). */
export function createTransport(opts: TransportFactoryOpts = {}): MailTransport | null {
  const env = opts.env ?? process.env;
  const mode = selectTransportMode(env);
  if (mode === "OAUTH") {
    const creds = gmailEnv(env);
    return creds ? createOAuthTransport(creds, opts.fetchImpl ?? fetch) : null;
  }
  if (mode === "APP_PASSWORD") {
    const creds = appPasswordEnv(env);
    return creds ? createAppPasswordTransport(creds, opts.appDeps ?? defaultAppPasswordDeps) : null;
  }
  return null;
}

/**
 * The reply target the database understands: when In-Reply-To is not one of our Message-IDs, use ours from
 * References, else the thread of the [SCD-xxxxxx] subject tag (its latest delivered envelope). The database then
 * matches the thread with r.rfc_message_id (scd_comm_record_inbound).
 */
export async function resolveReplyTarget(sb: SupabaseClient, org: string, msg: InboundPayload): Promise<string | null> {
  const ref = replyReference(msg.inReplyTo, msg.references ?? []);
  if (ref) return ref;
  const tag = extractThreadTag(msg.subject);
  const range = tag ? tagUuidRange(tag) : null;
  if (!range) return null;
  try {
    const threads = await sb.from("scd_comm_threads").select("id").eq("organization_id", org).gte("id", range.lo).lte("id", range.hi).limit(2);
    const rows = (threads.data ?? []) as Array<{ id: string }>;
    if (threads.error || rows.length !== 1 || !rows[0]) return null;
    const msgs = await sb.from("scd_comm_messages").select("id").eq("thread_id", rows[0].id).eq("direction", "OUT").order("created_at", { ascending: false }).limit(20);
    const ids = ((msgs.data ?? []) as Array<{ id: string }>).map((m) => m.id);
    if (msgs.error || ids.length === 0) return null;
    const rec = await sb.from("scd_comm_recipients").select("rfc_message_id").in("message_id", ids).not("rfc_message_id", "is", null).order("sent_at", { ascending: false }).limit(1);
    const id = ((rec.data ?? []) as Array<{ rfc_message_id: string | null }>)[0]?.rfc_message_id ?? null;
    return rec.error ? null : id;
  } catch {
    return null;
  }
}

/**
 * Envelopes claimed in this run but never attempted (the run stopped on a rate limit, a daily limit or refused
 * credentials) go back to QUEUED, so they leave with a later run instead of staying stuck in SENDING. Only rows still
 * in SENDING are touched: nothing that was handed to the mail server is ever sent twice.
 */
export async function releaseClaims(sb: SupabaseClient, recipientIds: readonly string[]): Promise<number> {
  if (recipientIds.length === 0) return 0;
  try {
    const r = await sb.from("scd_comm_recipients").update({ status: "QUEUED", claimed_at: null }).in("id", [...recipientIds]).eq("status", "SENDING").select("id");
    return r.error ? 0 : (r.data ?? []).length;
  } catch {
    return 0;
  }
}

export interface SyncOpts extends TransportFactoryOpts {
  batchMax?: number;
  now?: () => Date;
  /** Verification and page refreshes: import replies, never send. */
  skipOutbound?: boolean;
  /** Injected transport (tests); otherwise selected from the environment. */
  transport?: MailTransport | null;
}

export async function runCommSyncForOrg(sb: SupabaseClient, org: string, opts: SyncOpts = {}): Promise<SyncResult> {
  const env = opts.env ?? process.env;
  const mode = opts.transport ? opts.transport.mode : selectTransportMode(env);
  const out: SyncResult = { organizationId: org, mode, connected: false, receiving: false, code: null, received: 0, skipped: 0, sent: 0, failed: 0, stillQueued: 0, capReached: false };

  const stateRes = await sb.rpc("scd_comm_sync_state", { p_organization_id: org });
  const state = (stateRes.data ?? null) as { mailbox?: string; historyId?: string | null; sendingEnabled?: boolean } | null;
  if (!state?.mailbox) return { ...out, code: "NOT_CONFIGURED" };
  const mailbox = normalizeEmail(state.mailbox);

  const transport = opts.transport === undefined ? createTransport(opts) : opts.transport;
  if (!transport) {
    await checkpoint(sb, org, false, null, { code: "NOT_CONFIGURED", mode });
    return { ...out, code: "NOT_CONFIGURED" };
  }

  try {
    let opened;
    try {
      opened = await transport.open();
    } catch (e) {
      const code = e instanceof TransportError ? e.code : "NETWORK";
      await checkpoint(sb, org, false, null, { code, mode });
      return { ...out, code };
    }
    if (normalizeEmail(opened.account) !== mailbox) {
      await checkpoint(sb, org, false, null, { code: "WRONG_ACCOUNT", mode });
      return { ...out, code: "WRONG_ACCOUNT" };
    }
    out.receiving = true;
    out.connected = opened.canSend;
    if (!opened.canSend) out.code = opened.sendCode ?? "SEND_FAILED";

    // Inbound
    let historyId: string | null = state.historyId ?? null;
    try {
      const batch = await transport.fetchInbound(historyId, 200);
      out.skipped += batch.skipped;
      for (const msg of batch.messages) {
        const target = await resolveReplyTarget(sb, org, msg);
        const payload: Record<string, unknown> = { ...msg, subject: stripThreadTag(msg.subject), ...(target ? { inReplyTo: target } : {}) };
        delete payload["labels"];
        delete payload["references"];
        const r = await sb.rpc("scd_comm_record_inbound", { p_organization_id: org, p_payload: payload });
        const d = (r.data ?? {}) as { ok?: boolean; duplicate?: boolean; skipped?: string };
        if (r.error || !d.ok || d.duplicate || d.skipped) out.skipped++;
        else out.received++;
      }
      historyId = batch.cursor || historyId;
      if (batch.reset) out.code = out.code ?? "HISTORY_RESET";
    } catch (e) {
      out.code = out.code ?? (e instanceof TransportError ? e.code : "INBOUND_FAILED");
    }

    // Outbound (only when the Direzione enabled sending; the claim itself re-checks the flags and the daily cap)
    if (state.sendingEnabled && out.connected && !opts.skipOutbound) {
      const batchMax = opts.batchMax ?? 50;
      const claim = await sb.rpc("scd_comm_outbox_claim", { p_organization_id: org, p_max: batchMax });
      const items = outboxItems(claim.data);
      const room = Number((claim.data as { room?: unknown } | null)?.room ?? 0);
      let stopped: string | null = null;
      const unattempted: string[] = [];
      for (const item of items) {
        if (stopped) {
          unattempted.push(item.recipientId);
          continue;
        }
        try {
          const now = opts.now ? opts.now() : new Date();
          const boundary = `scd-alt-${item.recipientId}`;
          const sent = await transport.send({
            from: mailbox,
            to: item.to,
            cc: item.cc,
            bcc: item.bcc,
            raw: envelopeMessage(item, mailbox, now, { boundary }),
            rawNoBcc: envelopeMessage(item, mailbox, now, { boundary, omitBccHeader: true }),
            gmailThreadId: item.gmailThreadId,
          });
          await sb.rpc("scd_comm_mark_delivery", {
            p_recipient_id: item.recipientId, p_ok: true, p_gmail_message_id: sent.gmailMessageId, p_gmail_thread_id: sent.gmailThreadId,
            p_rfc_message_id: envelopeMessageId(item.recipientId), p_error: null,
          });
          out.sent++;
        } catch (e) {
          const code = e instanceof TransportError ? e.code : "BUILD_FAILED";
          await sb.rpc("scd_comm_mark_delivery", {
            p_recipient_id: item.recipientId, p_ok: false, p_gmail_message_id: null, p_gmail_thread_id: null, p_rfc_message_id: null, p_error: code,
          });
          out.failed++;
          if (stopsRun(code)) {
            stopped = code;
            out.code = code;
          }
        }
      }
      const released = await releaseClaims(sb, unattempted);
      out.stillQueued = Number((claim.data as { stillQueued?: unknown } | null)?.stillQueued ?? 0) + released;
      out.capReached = out.stillQueued > 0 && room < batchMax;
    }

    await checkpoint(sb, org, out.connected, historyId, {
      code: out.code, mode, receiving: out.receiving, received: out.received, skipped: out.skipped, sent: out.sent, failed: out.failed, stillQueued: out.stillQueued,
    });
    return out;
  } finally {
    await transport.close().catch(() => undefined);
  }
}

/** All organizations with a settings row. */
export async function runCommSync(sb: SupabaseClient, opts: SyncOpts & { organizationId?: string } = {}): Promise<SyncResult[]> {
  let orgs: string[];
  if (opts.organizationId) orgs = [opts.organizationId];
  else {
    const { data } = await sb.from("scd_comm_settings").select("organization_id");
    orgs = (data ?? []).map((r) => String((r as { organization_id: unknown }).organization_id));
  }
  const results: SyncResult[] = [];
  for (const org of orgs) results.push(await runCommSyncForOrg(sb, org, opts));
  return results;
}

/** Constant-time comparison of the cron secret (at least 32 characters). */
export function syncSecretMatches(header: string | null, env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  const secret = (env["SCD_COMM_SYNC_SECRET"] ?? "").trim();
  if (secret.length < 32 || !header) return false;
  const given = header.replace(/^Bearer\s+/i, "").trim();
  if (given.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= secret.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}
