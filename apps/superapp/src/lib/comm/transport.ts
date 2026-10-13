/**
 * Mail transports of the Posta del club (UD-101), pure part: no network, no Node-only modules, safe to unit-test and
 * to import from the pages for labels.
 *
 * Two transports implement the same MailTransport interface, so the hub (database functions, outbox, pages) does not
 * know which one is active:
 *   - OAUTH         Gmail REST API with a refresh token (gmail.server.ts), the r95 path for technical setups;
 *   - APP_PASSWORD  SMTP smtp.gmail.com:465 (TLS) to send + IMAP imap.gmail.com:993 to receive, authenticated with
 *                   a Google "password per le app" (apppassword.server.ts): the path a non-technical Direzione can do.
 * Selection: OAuth when its three variables are present, else app password when SCD_GMAIL_APP_PASSWORD is present,
 * else DISABLED (nothing is contacted, sending stays off).
 */
import type { InboundPayload } from "./rfc2822";

export type TransportMode = "OAUTH" | "APP_PASSWORD" | "DISABLED";

export const CLUB_MAILBOX_DEFAULT = "sportclubcolico@gmail.com";

type Env = Readonly<Record<string, string | undefined>>;

const val = (env: Env, k: string) => (env[k] ?? "").trim();

/** Google shows the app password as "abcd efgh ijkl mnop": spaces are not part of it. */
export function normalizeAppPassword(v: string | null | undefined): string {
  return (v ?? "").replace(/\s+/g, "");
}

/** A Google app password is exactly 16 letters (shown lower-case, in four groups of four). */
export function looksLikeAppPassword(v: string | null | undefined): boolean {
  return /^[a-z]{16}$/i.test(normalizeAppPassword(v));
}

export interface AppPasswordEnv {
  user: string;
  password: string;
}

export function appPasswordEnv(env: Env = process.env): AppPasswordEnv | null {
  const password = normalizeAppPassword(env["SCD_GMAIL_APP_PASSWORD"]);
  if (!password) return null;
  const user = (val(env, "SCD_GMAIL_USER") || CLUB_MAILBOX_DEFAULT).toLowerCase();
  return { user, password };
}

export function hasOAuthEnv(env: Env = process.env): boolean {
  return !!(val(env, "SCD_GMAIL_CLIENT_ID") && val(env, "SCD_GMAIL_CLIENT_SECRET") && val(env, "SCD_GMAIL_REFRESH_TOKEN"));
}

/** OAuth if its env is complete, else app password, else disabled (the r95 behaviour). */
export function selectTransportMode(env: Env = process.env): TransportMode {
  if (hasOAuthEnv(env)) return "OAUTH";
  if (appPasswordEnv(env)) return "APP_PASSWORD";
  return "DISABLED";
}

export const TRANSPORT_LABEL: Readonly<Record<TransportMode, string>> = {
  OAUTH: "Gmail API (OAuth)",
  APP_PASSWORD: "Password per le app (SMTP + IMAP)",
  DISABLED: "Non collegata",
};

// ------------------------------------------------------------------ errors

export type TransportCode =
  | "NOT_CONFIGURED"
  | "WRONG_ACCOUNT"
  | "TOKEN_REFUSED"
  | "RATE_LIMITED"
  | "HISTORY_EXPIRED"
  | "HTTP_ERROR"
  | "NETWORK"
  | "TIMEOUT"
  | "APP_PASSWORD_FORMAT"
  | "APP_PASSWORD_WRONG"
  | "NORMAL_PASSWORD_USED"
  | "TWO_STEP_OFF"
  | "SMTP_PORT_BLOCKED"
  | "IMAP_UNREACHABLE"
  | "DAILY_LIMIT"
  | "RECIPIENT_REJECTED"
  | "TEMPORARY"
  | "SEND_FAILED";

export class TransportError extends Error {
  constructor(
    readonly code: TransportCode,
    readonly status: number | null = null,
  ) {
    super(code);
    this.name = "TransportError";
  }
}

/** Plain Italian for the Direzione (setup page, verification, last sync result). Never contains a secret. */
export const TRANSPORT_MESSAGE: Readonly<Record<TransportCode, string>> = {
  NOT_CONFIGURED: "Manca la password per le app sul server: segui i cinque passi.",
  WRONG_ACCOUNT: "Le credenziali sono di un'altra casella: la password per le app va creata entrando con sportclubcolico@gmail.com.",
  TOKEN_REFUSED: "Google ha rifiutato le credenziali OAuth: rigenera il token di aggiornamento.",
  RATE_LIMITED: "Gmail ha chiesto di rallentare: il resto parte con il prossimo giro.",
  HISTORY_EXPIRED: "Il punto di lettura della posta è stato riallineato.",
  HTTP_ERROR: "Gmail ha risposto con un errore. Riprova tra poco.",
  NETWORK: "Google non risponde in questo momento. Riprova tra poco.",
  TIMEOUT: "Google non ha risposto in tempo. Riprova tra poco.",
  APP_PASSWORD_FORMAT:
    "La password per le app è fatta di 16 lettere (Google la mostra in quattro gruppi da quattro). Probabilmente è stata incollata la password normale dell'account: rifai il passo 3.",
  APP_PASSWORD_WRONG:
    "Password per app errata, oppure verifica in due passaggi non attiva. Controlla su myaccount.google.com/security che la verifica in due passaggi sia attiva, crea una nuova password per le app e sostituiscila su Render.",
  NORMAL_PASSWORD_USED: "Google chiede una password per le app: su Render è stata messa la password normale dell'account. Crea la password per le app (passo 3) e sostituiscila.",
  TWO_STEP_OFF: "Verifica in due passaggi non attiva: Google blocca l'accesso. Attivala su myaccount.google.com/security (passo 2), poi crea la password per le app.",
  SMTP_PORT_BLOCKED:
    "Porta SMTP bloccata dal server: il piano gratuito di Render non permette di inviare mail. Serve il piano a pagamento Render (Starter) per il servizio della Super App. La ricezione può funzionare lo stesso.",
  IMAP_UNREACHABLE: "Il server non riesce a raggiungere la casella in lettura (imap.gmail.com, porta 993). Riprova tra poco; se continua, controlla il piano Render.",
  DAILY_LIMIT: "Gmail ha raggiunto il limite giornaliero di invii: il resto parte domani, in automatico.",
  RECIPIENT_REJECTED: "Indirizzo rifiutato dal server del destinatario.",
  TEMPORARY: "Errore temporaneo del server di posta: riprova con il prossimo giro.",
  SEND_FAILED: "Invio non riuscito.",
};

/** Errors after which no other envelope of this run can succeed: stop and leave the rest queued. */
export function stopsRun(code: string): boolean {
  return ["RATE_LIMITED", "TOKEN_REFUSED", "DAILY_LIMIT", "APP_PASSWORD_WRONG", "NORMAL_PASSWORD_USED", "TWO_STEP_OFF", "SMTP_PORT_BLOCKED"].includes(code);
}

interface MailLibError {
  code?: unknown;
  responseCode?: unknown;
  response?: unknown;
  command?: unknown;
  authenticationFailed?: unknown;
  serverResponseCode?: unknown;
}

const text = (v: unknown) => (typeof v === "string" ? v : "");

function credentialCode(response: string): TransportCode {
  if (/5\.7\.9|application-specific password required/i.test(response)) return "NORMAL_PASSWORD_USED";
  if (/5\.7\.14|webloginrequired|log in via your web browser|please log in/i.test(response)) return "TWO_STEP_OFF";
  return "APP_PASSWORD_WRONG";
}

const NET_CODES = new Set(["ECONNREFUSED", "ETIMEDOUT", "EHOSTUNREACH", "ENETUNREACH", "ECONNRESET", "EPIPE", "CONNECT_TIMEOUT", "GREETING_TIMEOUT"]);

/** nodemailer error → code. Connection failures before any SMTP reply mean the outbound port is blocked. */
export function mapSmtpError(e: unknown): TransportCode {
  const err = (e ?? {}) as MailLibError;
  const code = text(err.code);
  const response = text(err.response);
  const rc = typeof err.responseCode === "number" ? err.responseCode : null;
  if (code === "EAUTH" || rc === 535 || rc === 534) return credentialCode(response);
  if (rc !== null) {
    if (/5\.4\.5|daily user sending limit|sending limit exceeded/i.test(response)) return "DAILY_LIMIT";
    if (rc === 421 || rc === 454 || /4\.7\.0|try again later|rate limit/i.test(response)) return "RATE_LIMITED";
    if (rc === 550 || rc === 553 || rc === 551 || rc === 501) return "RECIPIENT_REJECTED";
    if (rc >= 400 && rc < 500) return "TEMPORARY";
    return "SEND_FAILED";
  }
  if (code === "EDNS" || code === "ENOTFOUND" || code === "EAI_AGAIN") return "NETWORK";
  if (code === "ECONNECTION" || code === "ESOCKET" || NET_CODES.has(code)) {
    const cmd = text(err.command);
    return !cmd || cmd === "CONN" ? "SMTP_PORT_BLOCKED" : "TIMEOUT";
  }
  if (code === "EENVELOPE") return "RECIPIENT_REJECTED";
  return "SEND_FAILED";
}

/** True only when the server certainly did not accept the message, so sending again cannot duplicate it. */
export function smtpRetrySafe(e: unknown): boolean {
  const err = (e ?? {}) as MailLibError;
  const rc = typeof err.responseCode === "number" ? err.responseCode : null;
  if (rc === 450 || rc === 451 || rc === 452) return !/5\.4\.5|daily/i.test(text(err.response));
  return rc === null && text(err.command) === "CONN" && (text(err.code) === "ECONNECTION" || text(err.code) === "ETIMEDOUT" || text(err.code) === "ESOCKET");
}

/** imapflow error → code. */
export function mapImapError(e: unknown): TransportCode {
  const err = (e ?? {}) as MailLibError;
  if (err.authenticationFailed === true || text(err.serverResponseCode) === "AUTHENTICATIONFAILED") return credentialCode(text(err.response));
  const code = text(err.code);
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "NETWORK";
  if (NET_CODES.has(code) || code === "NoConnection" || code === "ClosedAfterConnectTLS" || code === "ClosedAfterConnectText") return "IMAP_UNREACHABLE";
  if (code === "ETIMEOUT" || code === "UPGRADE_TIMEOUT") return "TIMEOUT";
  if (code === "ETHROTTLE") return "RATE_LIMITED";
  return "NETWORK";
}

// ------------------------------------------------------------------ thread matching

/** "[SCD-1A2B3C]": the first six hex digits of the thread id, appended to every outgoing subject. */
export function threadTag(threadId: string | null | undefined): string | null {
  const hex = (threadId ?? "").replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex)) return null;
  return `SCD-${hex.slice(0, 6).toUpperCase()}`;
}

const TAG_RE = /\[(SCD-[0-9A-F]{6})\]/i;

export function taggedSubject(subject: string, threadId: string | null | undefined): string {
  const tag = threadTag(threadId);
  const s = subject.trim();
  if (!tag || s.toUpperCase().includes(`[${tag}]`)) return s;
  return `${s} [${tag}]`;
}

/** The six hex digits of the tag in a (reply) subject, lower-case, or null. */
export function extractThreadTag(subject: string | null | undefined): string | null {
  const m = TAG_RE.exec(subject ?? "");
  return m?.[1] ? m[1].slice(4).toLowerCase() : null;
}

export function stripThreadTag(subject: string): string {
  return subject.replace(/\s*\[SCD-[0-9A-F]{6}\]/gi, "").trim();
}

/** Inclusive uuid range covering every thread id that starts with the tag's six hex digits. */
export function tagUuidRange(tagHex: string): { lo: string; hi: string } | null {
  if (!/^[0-9a-f]{6}$/.test(tagHex)) return null;
  return { lo: `${tagHex}00-0000-0000-0000-000000000000`, hi: `${tagHex}ff-ffff-ffff-ffff-ffffffffffff` };
}

const OUR_ID_RE = /^<?scd-[0-9a-f-]{36}@colicoderviese\.app>?$/i;

/** Message-ID of an envelope we sent ("scd-<recipient uuid>@colicoderviese.app"). */
export function isOurMessageId(id: string | null | undefined): boolean {
  return OUR_ID_RE.test((id ?? "").trim());
}

/**
 * The Message-ID of ours this mail answers: In-Reply-To first, else the most recent of ours in References (some
 * clients put a later message in In-Reply-To but keep the chain in References). Null when none is ours.
 */
export function replyReference(inReplyTo: string | null | undefined, references: readonly string[] | null | undefined): string | null {
  const clean = (v: string) => v.trim().replace(/^<|>$/g, "");
  if (inReplyTo && isOurMessageId(inReplyTo)) return clean(inReplyTo);
  const refs = [...(references ?? [])].reverse();
  const hit = refs.find((r) => isOurMessageId(r));
  return hit ? clean(hit) : null;
}

/** "a <x> b" / ["<x>", "<y>"] → ["x", "y"]. */
export function splitMessageIds(v: string | readonly string[] | null | undefined): string[] {
  const list = Array.isArray(v) ? v : typeof v === "string" ? [v] : [];
  return list.flatMap((s) => (String(s).match(/<[^<>\s]+>|[^<>\s]+@[^<>\s]+/g) ?? []).map((x) => x.replace(/^<|>$/g, "")));
}

// ------------------------------------------------------------------ ids and cursors

/** Gmail IMAP X-GM-MSGID / X-GM-THRID (decimal) → the hex id the Gmail API uses, so both transports dedupe alike. */
export function gmailHexId(decimal: string | number | bigint | null | undefined): string | null {
  if (decimal === null || decimal === undefined) return null;
  const s = String(decimal).trim();
  if (!/^\d{1,20}$/.test(s)) return null;
  try {
    return BigInt(s).toString(16);
  } catch {
    return null;
  }
}

export interface ImapCursor {
  uidValidity: string;
  lastUid: number;
}

/** The IMAP read point lives in scd_comm_settings.history_id as "imap:<uidvalidity>:<last uid>" (no migration). */
export function encodeImapCursor(c: ImapCursor): string {
  return `imap:${c.uidValidity}:${c.lastUid}`;
}

export function parseImapCursor(v: string | null | undefined): ImapCursor | null {
  const m = /^imap:(\d{1,20}):(\d{1,12})$/.exec((v ?? "").trim());
  if (!m) return null;
  return { uidValidity: m[1] ?? "0", lastUid: Number(m[2]) };
}

/** A Gmail API history id (digits only). An IMAP cursor is not one: OAuth then starts again from the profile. */
export function isHistoryId(v: string | null | undefined): boolean {
  return /^\d{1,20}$/.test((v ?? "").trim());
}

// ------------------------------------------------------------------ HTML body

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function linkify(escaped: string): string {
  return escaped.replace(/\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)]/g, (u) => `<a href="${u}" style="color:#1d4f91">${u}</a>`);
}

/**
 * HTML alternative of the plain text (body + signature): escaped, paragraphs and line breaks kept, links clickable,
 * club colours (blue band, yellow rule). No images: they are blocked by most clients and an asset must never be
 * replaced by an approximation.
 */
export function htmlFromText(plain: string): string {
  const parts = plain.replace(/\r\n/g, "\n").split(/\n--\n/);
  const main = parts[0] ?? "";
  const footer = parts.slice(1).join("\n--\n");
  const paras = (s: string) =>
    s
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p style="margin:0 0 14px">${linkify(escapeHtml(p)).replace(/\n/g, "<br>")}</p>`)
      .join("");
  return [
    '<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>',
    '<body style="margin:0;padding:0;background:#f2f6fb">',
    '<div style="max-width:640px;margin:0 auto;padding:20px 12px">',
    '<div style="background:#1d4f91;color:#ffffff;border-radius:12px 12px 0 0;padding:14px 20px;font:700 16px/1.3 Arial,Helvetica,sans-serif;letter-spacing:.02em">S.C.D. ColicoDerviese</div>',
    '<div style="height:3px;background:#f5c400"></div>',
    '<div style="background:#ffffff;border-radius:0 0 12px 12px;padding:22px 20px;font:15px/1.6 Arial,Helvetica,sans-serif;color:#0b2545">',
    paras(main),
    footer ? `<div style="margin-top:18px;padding-top:12px;border-top:1px solid #d9e4f2;font-size:13px;color:#4a6283">${paras(footer)}</div>` : "",
    "</div></div></body></html>",
  ].join("");
}

// ------------------------------------------------------------------ the interface both transports implement

export interface OutgoingEnvelope {
  /** Club mailbox: SMTP envelope sender and From. */
  from: string;
  to: string;
  cc: string[];
  bcc: string[];
  /** Full message including the Bcc header (Gmail API strips it). */
  raw: string;
  /** Same message without the Bcc header (SMTP sends the bytes as they are). */
  rawNoBcc: string;
  /** Gmail thread to keep a reply in (OAuth only). */
  gmailThreadId: string | null;
}

export interface SendResult {
  gmailMessageId: string | null;
  gmailThreadId: string | null;
}

export interface OpenResult {
  /** Authenticated mailbox, lower-case. */
  account: string;
  /** False when receiving works but sending cannot (e.g. SMTP port blocked): sending is then kept off. */
  canSend: boolean;
  sendCode: TransportCode | null;
}

export interface InboundBatch {
  cursor: string;
  messages: InboundPayload[];
  skipped: number;
  /** True when the stored cursor was missing or not usable and was set to "now" without importing. */
  reset: boolean;
}

export interface MailTransport {
  readonly mode: Exclude<TransportMode, "DISABLED">;
  /** Authenticates (and for app password checks SMTP too). Throws TransportError. */
  open(): Promise<OpenResult>;
  /** New INBOX mail since the cursor (null = first run: only returns the current cursor). Never changes the mailbox. */
  fetchInbound(cursor: string | null, max: number): Promise<InboundBatch>;
  /** One individual e-mail. Throws TransportError. */
  send(envelope: OutgoingEnvelope): Promise<SendResult>;
  close(): Promise<void>;
}
