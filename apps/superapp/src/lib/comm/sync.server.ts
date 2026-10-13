/**
 * comm-sync (r95): the only job that talks to Gmail. Runs with the Supabase service key (SCD_SUPABASE_SECRET_KEY,
 * server env only) because the outbox claim, delivery marks, inbound record and checkpoint functions are
 * service-only. Called by the Render cron (POST /internal/comm-sync with the shared secret) and by the Direzione's
 * "Verifica collegamento ora" button (after a server-side Direzione check).
 *
 * Order of each run, per organization:
 *   1. no Gmail credentials        → checkpoint "not connected" (sending forced off), nothing else;
 *   2. token exchange + profile    → the mailbox must be the club mailbox, else "not connected";
 *   3. inbound                     → Gmail history since the stored cursor; first run only stores the cursor;
 *   4. outbound                    → only when sending is enabled: claim within the daily cap, send, mark;
 *   5. checkpoint                  → connected, new cursor, counts (never tokens or addresses).
 * Never sends anything when sending_enabled is false; never logs credentials or message contents.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { supabaseEnv } from "../supabase.server";
import {
  GmailError,
  getAccessToken,
  getMessage,
  getProfile,
  gmailEnv,
  listNewInboxMessages,
  sendRaw,
  type FetchLike,
} from "./gmail.server";
import { buildRawMessage, isImportable, parseGmailMessage, toBase64Url, type GmailMessageJson } from "./rfc2822";
import { normalizeEmail, signature, type Office } from "./rules";

export interface SyncResult {
  organizationId: string;
  connected: boolean;
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

interface OutboxItem {
  recipientId: string;
  messageId: string;
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

function outboxItems(v: unknown): OutboxItem[] {
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

/** The RFC 2822 message of one envelope: from and Reply-To the club mailbox, signed with the staff member's name. */
export function envelopeMessage(item: OutboxItem, mailbox: string, now: Date = new Date()): string {
  return buildRawMessage({
    from: { name: "S.C.D. ColicoDerviese", email: mailbox },
    replyTo: { name: "S.C.D. ColicoDerviese", email: mailbox },
    to: [item.to],
    cc: item.cc,
    bcc: item.bcc,
    subject: item.subject,
    body: `${item.body}${signature(item.senderName, item.office)}`,
    messageId: `scd-${item.recipientId}@colicoderviese.app`,
    inReplyTo: item.inReplyTo,
    date: now,
    headers: { "X-SCD-Message-Id": item.messageId, "X-SCD-Recipient-Id": item.recipientId },
  });
}

async function checkpoint(sb: SupabaseClient, org: string, connected: boolean, historyId: string | null, result: Record<string, unknown>) {
  await sb.rpc("scd_comm_sync_checkpoint", { p_organization_id: org, p_connected: connected, p_history_id: historyId, p_result: result });
}

export async function runCommSyncForOrg(
  sb: SupabaseClient,
  org: string,
  opts: { env?: Readonly<Record<string, string | undefined>>; fetchImpl?: FetchLike; batchMax?: number; now?: () => Date } = {},
): Promise<SyncResult> {
  const env = opts.env ?? process.env;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const out: SyncResult = { organizationId: org, connected: false, code: null, received: 0, skipped: 0, sent: 0, failed: 0, stillQueued: 0, capReached: false };

  const stateRes = await sb.rpc("scd_comm_sync_state", { p_organization_id: org });
  const state = (stateRes.data ?? null) as { mailbox?: string; historyId?: string | null; sendingEnabled?: boolean } | null;
  if (!state?.mailbox) return { ...out, code: "NOT_CONFIGURED" };
  const mailbox = normalizeEmail(state.mailbox);

  const creds = gmailEnv(env);
  if (!creds) {
    await checkpoint(sb, org, false, null, { code: "NOT_CONFIGURED" });
    return { ...out, code: "NOT_CONFIGURED" };
  }

  let token: string;
  let profile: { emailAddress: string; historyId: string };
  try {
    token = await getAccessToken(creds, fetchImpl);
    profile = await getProfile(token, fetchImpl);
  } catch (e) {
    const code = e instanceof GmailError ? e.code : "NETWORK";
    await checkpoint(sb, org, false, null, { code });
    return { ...out, code };
  }
  if (profile.emailAddress !== mailbox) {
    await checkpoint(sb, org, false, null, { code: "WRONG_ACCOUNT" });
    return { ...out, code: "WRONG_ACCOUNT" };
  }
  out.connected = true;

  // Inbound
  let historyId: string | null = state.historyId ?? null;
  try {
    if (!historyId) {
      historyId = profile.historyId;
    } else {
      const h = await listNewInboxMessages(token, historyId, fetchImpl);
      for (const id of h.messageIds.slice(0, 200)) {
        const msg = parseGmailMessage((await getMessage(token, id, fetchImpl)) as GmailMessageJson);
        if (!msg || !isImportable(msg.labels)) {
          out.skipped++;
          continue;
        }
        const payload: Record<string, unknown> = { ...msg };
        delete payload["labels"];
        const r = await sb.rpc("scd_comm_record_inbound", { p_organization_id: org, p_payload: payload });
        const d = (r.data ?? {}) as { ok?: boolean; duplicate?: boolean; skipped?: string };
        if (r.error || !d.ok || d.duplicate || d.skipped) out.skipped++;
        else out.received++;
      }
      historyId = h.historyId;
    }
  } catch (e) {
    if (e instanceof GmailError && e.code === "HISTORY_EXPIRED") {
      historyId = profile.historyId;
      out.code = "HISTORY_RESET";
    } else {
      out.code = e instanceof GmailError ? e.code : "INBOUND_FAILED";
    }
  }

  // Outbound (only when the Direzione enabled sending; the claim itself re-checks the flags and the daily cap)
  if (state.sendingEnabled) {
    const claim = await sb.rpc("scd_comm_outbox_claim", { p_organization_id: org, p_max: opts.batchMax ?? 50 });
    const items = outboxItems(claim.data);
    const room = Number((claim.data as { room?: unknown } | null)?.room ?? 0);
    for (const item of items) {
      try {
        const raw = envelopeMessage(item, mailbox, opts.now ? opts.now() : new Date());
        const sent = await sendRaw(token, toBase64Url(raw), item.gmailThreadId, fetchImpl);
        await sb.rpc("scd_comm_mark_delivery", {
          p_recipient_id: item.recipientId, p_ok: true, p_gmail_message_id: sent.id, p_gmail_thread_id: sent.threadId,
          p_rfc_message_id: `scd-${item.recipientId}@colicoderviese.app`, p_error: null,
        });
        out.sent++;
      } catch (e) {
        const code = e instanceof GmailError ? e.code : "BUILD_FAILED";
        await sb.rpc("scd_comm_mark_delivery", {
          p_recipient_id: item.recipientId, p_ok: false, p_gmail_message_id: null, p_gmail_thread_id: null, p_rfc_message_id: null, p_error: code,
        });
        out.failed++;
        if (code === "RATE_LIMITED" || code === "TOKEN_REFUSED") break;
      }
    }
    out.stillQueued = Number((claim.data as { stillQueued?: unknown } | null)?.stillQueued ?? 0);
    out.capReached = out.stillQueued > 0 && room < (opts.batchMax ?? 50);
  }

  await checkpoint(sb, org, true, historyId, {
    code: out.code, received: out.received, skipped: out.skipped, sent: out.sent, failed: out.failed, stillQueued: out.stillQueued,
  });
  return out;
}

/** All organizations with a settings row. */
export async function runCommSync(
  sb: SupabaseClient,
  opts: { env?: Readonly<Record<string, string | undefined>>; fetchImpl?: FetchLike; organizationId?: string } = {},
): Promise<SyncResult[]> {
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
