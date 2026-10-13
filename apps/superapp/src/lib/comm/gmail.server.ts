/**
 * Gmail OAuth transport of the Posta del club (r95), server only. The simpler app-password transport (SMTP + IMAP)
 * lives in apppassword.server.ts; transport.ts selects between them and defines the shared MailTransport interface. Plain HTTPS calls to the Gmail REST API with an OAuth
 * access token obtained from the refresh token of the club mailbox. Credentials come from the environment
 * (SCD_GMAIL_CLIENT_ID, SCD_GMAIL_CLIENT_SECRET, SCD_GMAIL_REFRESH_TOKEN), set by the Direzione in Render: they are
 * never logged, never stored in the database and never returned to the browser. Inactive until they exist.
 * Scopes needed: gmail.send (outgoing) and gmail.readonly (incoming).
 */

import { isImportable, parseGmailMessage, toBase64Url, type GmailMessageJson } from "./rfc2822";
import { TransportError, isHistoryId, looksLikeAppPassword, selectTransportMode, type MailTransport } from "./transport";

export interface GmailEnv {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class GmailError extends Error {
  constructor(
    readonly code: "NOT_CONFIGURED" | "TOKEN_REFUSED" | "RATE_LIMITED" | "HISTORY_EXPIRED" | "HTTP_ERROR" | "NETWORK",
    readonly status: number | null = null,
  ) {
    super(code);
    this.name = "GmailError";
  }
}

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://gmail.googleapis.com/gmail/v1/users/me";
const TIMEOUT_MS = 20_000;

/** Which variables are present and which transport they select (booleans and the mode only: values never leave). */
export function gmailEnvPresence(env: Readonly<Record<string, string | undefined>> = process.env) {
  const has = (k: string) => typeof env[k] === "string" && (env[k] ?? "").trim().length > 0;
  return {
    mode: selectTransportMode(env),
    appPassword: has("SCD_GMAIL_APP_PASSWORD"),
    appPasswordShape: has("SCD_GMAIL_APP_PASSWORD") ? looksLikeAppPassword(env["SCD_GMAIL_APP_PASSWORD"]) : false,
    gmailUser: has("SCD_GMAIL_USER"),
    clientId: has("SCD_GMAIL_CLIENT_ID"),
    clientSecret: has("SCD_GMAIL_CLIENT_SECRET"),
    refreshToken: has("SCD_GMAIL_REFRESH_TOKEN"),
    serviceKey: has("SCD_SUPABASE_SECRET_KEY"),
    syncSecret: (env["SCD_COMM_SYNC_SECRET"] ?? "").trim().length >= 32,
  };
}

export function gmailEnv(env: Readonly<Record<string, string | undefined>> = process.env): GmailEnv | null {
  const clientId = (env["SCD_GMAIL_CLIENT_ID"] ?? "").trim();
  const clientSecret = (env["SCD_GMAIL_CLIENT_SECRET"] ?? "").trim();
  const refreshToken = (env["SCD_GMAIL_REFRESH_TOKEN"] ?? "").trim();
  if (!clientId || !clientSecret || !refreshToken) return null;
  return { clientId, clientSecret, refreshToken };
}

async function call(fetchImpl: FetchLike, url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetchImpl(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new GmailError("NETWORK");
  }
}

/** Exchanges the refresh token for a short-lived access token. The response body is never echoed. */
export async function getAccessToken(env: GmailEnv, fetchImpl: FetchLike = fetch): Promise<string> {
  const res = await call(fetchImpl, TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      refresh_token: env.refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });
  if (!res.ok) throw new GmailError("TOKEN_REFUSED", res.status);
  const json = (await res.json().catch(() => null)) as { access_token?: unknown } | null;
  if (!json || typeof json.access_token !== "string" || !json.access_token) throw new GmailError("TOKEN_REFUSED", res.status);
  return json.access_token;
}

async function api<T>(fetchImpl: FetchLike, token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await call(fetchImpl, `${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}) },
  });
  if (res.status === 429) throw new GmailError("RATE_LIMITED", 429);
  if (res.status === 404 && path.startsWith("/history")) throw new GmailError("HISTORY_EXPIRED", 404);
  if (res.status === 401 || res.status === 403) throw new GmailError("TOKEN_REFUSED", res.status);
  if (!res.ok) throw new GmailError("HTTP_ERROR", res.status);
  return (await res.json()) as T;
}

export async function getProfile(token: string, fetchImpl: FetchLike = fetch): Promise<{ emailAddress: string; historyId: string }> {
  const p = await api<{ emailAddress?: string; historyId?: string }>(fetchImpl, token, "/profile");
  return { emailAddress: (p.emailAddress ?? "").toLowerCase(), historyId: String(p.historyId ?? "") };
}

/** users.messages.send with the RFC 2822 message as base64url; threadId keeps replies in the same Gmail thread. */
export async function sendRaw(
  token: string,
  rawBase64Url: string,
  threadId: string | null,
  fetchImpl: FetchLike = fetch,
): Promise<{ id: string; threadId: string }> {
  const body: Record<string, string> = { raw: rawBase64Url };
  if (threadId) body["threadId"] = threadId;
  const r = await api<{ id?: string; threadId?: string }>(fetchImpl, token, "/messages/send", { method: "POST", body: JSON.stringify(body) });
  if (!r.id) throw new GmailError("HTTP_ERROR", null);
  return { id: r.id, threadId: r.threadId ?? "" };
}

/** New message ids added to the INBOX since startHistoryId (all pages up to maxPages). */
export async function listNewInboxMessages(
  token: string,
  startHistoryId: string,
  fetchImpl: FetchLike = fetch,
  maxPages = 5,
): Promise<{ historyId: string; messageIds: string[] }> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  let historyId = startHistoryId;
  for (let page = 0; page < maxPages; page++) {
    const q = new URLSearchParams({ startHistoryId, historyTypes: "messageAdded", labelId: "INBOX", maxResults: "100" });
    if (pageToken) q.set("pageToken", pageToken);
    const r = await api<{ history?: Array<{ messagesAdded?: Array<{ message?: { id?: string } }> }>; historyId?: string; nextPageToken?: string }>(
      fetchImpl,
      token,
      `/history?${q.toString()}`,
    );
    for (const h of r.history ?? []) for (const a of h.messagesAdded ?? []) if (a.message?.id && !ids.includes(a.message.id)) ids.push(a.message.id);
    if (r.historyId) historyId = String(r.historyId);
    if (!r.nextPageToken) break;
    pageToken = r.nextPageToken;
  }
  return { historyId, messageIds: ids };
}

export async function getMessage(token: string, id: string, fetchImpl: FetchLike = fetch): Promise<unknown> {
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(id)) throw new GmailError("HTTP_ERROR", null);
  return api<unknown>(fetchImpl, token, `/messages/${id}?format=full`);
}

/** The r95 Gmail REST path behind the shared MailTransport interface (cursor = Gmail history id). */
export function createOAuthTransport(env: GmailEnv, fetchImpl: FetchLike = fetch): MailTransport {
  let token: string | null = null;
  let profileHistoryId = "";
  const wrap = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof GmailError) throw new TransportError(e.code === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : e.code, e.status);
      throw new TransportError("NETWORK");
    }
  };
  const need = () => {
    if (!token) throw new TransportError("NOT_CONFIGURED");
    return token;
  };
  return {
    mode: "OAUTH",
    async open() {
      return wrap(async () => {
        token = await getAccessToken(env, fetchImpl);
        const p = await getProfile(token, fetchImpl);
        profileHistoryId = p.historyId;
        return { account: p.emailAddress, canSend: true, sendCode: null };
      });
    },
    async fetchInbound(cursor, max) {
      const t = need();
      if (!cursor || !isHistoryId(cursor)) return { cursor: profileHistoryId, messages: [], skipped: 0, reset: !!cursor };
      return wrap(async () => {
        const h = await listNewInboxMessages(t, cursor, fetchImpl);
        const messages = [];
        let skipped = 0;
        for (const id of h.messageIds.slice(0, max)) {
          const msg = parseGmailMessage((await getMessage(t, id, fetchImpl)) as GmailMessageJson);
          if (!msg || !isImportable(msg.labels)) skipped++;
          else messages.push(msg);
        }
        return { cursor: h.historyId, messages, skipped, reset: false };
      }).catch((e: unknown) => {
        if (e instanceof TransportError && e.code === "HISTORY_EXPIRED") return { cursor: profileHistoryId, messages: [], skipped: 0, reset: true };
        throw e;
      });
    },
    async send(envelope) {
      const t = need();
      return wrap(async () => {
        const r = await sendRaw(t, toBase64Url(envelope.raw), envelope.gmailThreadId, fetchImpl);
        return { gmailMessageId: r.id, gmailThreadId: r.threadId || null };
      });
    },
    async close() {
      token = null;
    },
  };
}
