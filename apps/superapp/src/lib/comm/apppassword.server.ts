/**
 * App-password transport of the Posta del club (UD-101), server only: the setup a non-technical Direzione can do
 * alone (Google account → Sicurezza → Verifica in due passaggi → Password per le app → one Render variable).
 *
 *   sending    SMTP smtp.gmail.com:465 (implicit TLS), one individual e-mail per recipient, the exact RFC 2822 bytes
 *              built by rfc2822.ts (From/Reply-To the club mailbox, X-SCD-* headers, [SCD-xxxxxx] subject tag),
 *              Bcc only in the SMTP envelope; retried only when the server certainly refused the message.
 *   receiving  IMAP imap.gmail.com:993, INBOX opened READ-ONLY (EXAMINE) and bodies fetched with BODY.PEEK, so the
 *              Gmail state (read/unread, labels) is never touched; read point "imap:<uidvalidity>:<last uid>" kept in
 *              scd_comm_settings.history_id; Gmail X-GM-MSGID/X-GM-THRID become the same hex ids the Gmail API uses.
 *
 * Credentials: SCD_GMAIL_APP_PASSWORD (+ optional SCD_GMAIL_USER, default sportclubcolico@gmail.com) in the Render
 * environment only. Library loggers are off; nothing here logs addresses, subjects, bodies or the password.
 * nodemailer, imapflow and mailparser are loaded lazily, so tests inject fakes and never open a socket.
 */
import { BODY_MAX, htmlToText, type InboundPayload } from "./rfc2822";
import {
  TransportError,
  encodeImapCursor,
  gmailHexId,
  looksLikeAppPassword,
  mapImapError,
  mapSmtpError,
  parseImapCursor,
  smtpRetrySafe,
  splitMessageIds,
  type AppPasswordEnv,
  type MailTransport,
  type TransportCode,
} from "./transport";

export const SMTP_HOST = "smtp.gmail.com";
export const SMTP_PORT = 465;
export const IMAP_HOST = "imap.gmail.com";
export const IMAP_PORT = 993;
/** Messages bigger than this are skipped (the read point still moves past them). */
const MAX_MESSAGE_BYTES = 25 * 1024 * 1024;
/** Only the first part of a message is downloaded: enough for headers and text, attachments are only counted. */
const SOURCE_MAX_BYTES = 2 * 1024 * 1024;

// ------------------------------------------------------------------ minimal shapes of the libraries (for fakes)

export interface SmtpConfig {
  host: string;
  port: number;
  secure: true;
  auth: { user: string; pass: string };
}

export interface SmtpLike {
  verify(): Promise<unknown>;
  sendMail(m: { envelope: { from: string; to: string[] }; raw: string }): Promise<{ accepted?: unknown[]; rejected?: unknown[] }>;
  close(): void;
}

export interface ImapConfig {
  host: string;
  port: number;
  secure: true;
  auth: { user: string; pass: string };
}

export interface ImapMessageMeta {
  uid: number;
  size?: number | undefined;
  emailId?: string | undefined;
  threadId?: string | undefined;
  internalDate?: Date | string | undefined;
  source?: Buffer | undefined;
}

export interface ImapLike {
  connect(): Promise<void>;
  mailboxOpen(path: string, options: { readOnly: boolean }): Promise<{ uidValidity: bigint | number | string; uidNext: number }>;
  fetchAll(range: string, query: Record<string, unknown>, options: { uid: true }): Promise<ImapMessageMeta[]>;
  fetchOne(range: string, query: Record<string, unknown>, options: { uid: true }): Promise<ImapMessageMeta | false>;
  logout(): Promise<void>;
  close(): void;
}

export interface ParsedAddress {
  address?: string | undefined;
  name?: string | undefined;
  group?: ParsedAddress[] | undefined;
}

export interface ParsedLike {
  from?: { value: ParsedAddress[] } | undefined;
  to?: { value: ParsedAddress[] } | Array<{ value: ParsedAddress[] }> | undefined;
  cc?: { value: ParsedAddress[] } | Array<{ value: ParsedAddress[] }> | undefined;
  subject?: string | undefined;
  text?: string | undefined;
  html?: string | false | undefined;
  messageId?: string | undefined;
  inReplyTo?: string | undefined;
  references?: string | string[] | undefined;
  date?: Date | undefined;
  attachments?: Array<{ filename?: string | undefined; contentDisposition?: string | undefined }> | undefined;
}

export interface AppPasswordDeps {
  createSmtp(cfg: SmtpConfig): Promise<SmtpLike>;
  createImap(cfg: ImapConfig): Promise<ImapLike>;
  parse(source: Buffer): Promise<ParsedLike>;
  sleep(ms: number): Promise<void>;
}

/** Real libraries, loaded on first use. Timeouts everywhere; loggers off. */
export const defaultAppPasswordDeps: AppPasswordDeps = {
  async createSmtp(cfg) {
    const nodemailer = (await import("nodemailer")).default;
    const t = nodemailer.createTransport({
      ...cfg,
      pool: true,
      maxConnections: 1,
      maxMessages: 100,
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
      logger: false,
      debug: false,
      tls: { servername: cfg.host, minVersion: "TLSv1.2" },
    });
    return {
      verify: () => t.verify(),
      sendMail: (m) => t.sendMail(m) as Promise<{ accepted?: unknown[]; rejected?: unknown[] }>,
      close: () => t.close(),
    };
  },
  async createImap(cfg) {
    const { ImapFlow } = await import("imapflow");
    const c = new ImapFlow({
      ...cfg,
      logger: false,
      emitLogs: false,
      disableAutoIdle: true,
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 60_000,
    });
    // An 'error' event without a listener would crash the process: errors surface through the awaited calls.
    c.on("error", () => undefined);
    return {
      connect: () => c.connect(),
      mailboxOpen: async (path, options) => {
        const mb = await c.mailboxOpen(path, options);
        return { uidValidity: mb.uidValidity, uidNext: mb.uidNext };
      },
      fetchAll: (range, query, options) => c.fetchAll(range, query, options) as Promise<ImapMessageMeta[]>,
      fetchOne: (range, query, options) => c.fetchOne(range, query, options) as Promise<ImapMessageMeta | false>,
      logout: () => c.logout(),
      close: () => c.close(),
    };
  },
  async parse(source) {
    const { simpleParser } = await import("mailparser");
    return (await simpleParser(source, { skipHtmlToText: true, skipTextToHtml: true, skipImageLinks: true, skipTextLinks: true })) as unknown as ParsedLike;
  },
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
};

// ------------------------------------------------------------------ parsing (pure)

function flatten(list: ParsedAddress[] | undefined): ParsedAddress[] {
  return (list ?? []).flatMap((a) => (a.group ? flatten(a.group) : [a]));
}

function addresses(v: ParsedLike["to"]): string[] {
  const objs = Array.isArray(v) ? v : v ? [v] : [];
  return objs.flatMap((o) => flatten(o.value)).map((a) => (a.address ?? "").trim().toLowerCase()).filter((a) => a.includes("@"));
}

/** mailparser result + IMAP metadata → payload of scd_comm_record_inbound (same shape as the Gmail API parser). */
export function parsedToInbound(parsed: ParsedLike, meta: ImapMessageMeta, uidValidity: string): InboundPayload | null {
  const from = flatten(parsed.from?.value)[0];
  const email = (from?.address ?? "").trim().toLowerCase();
  if (!email.includes("@")) return null;
  const body = parsed.text && parsed.text.trim() ? parsed.text : typeof parsed.html === "string" ? htmlToText(parsed.html) : "";
  const internal = meta.internalDate ? new Date(meta.internalDate) : parsed.date ?? null;
  const receivedAt = internal && !Number.isNaN(internal.getTime()) ? internal.toISOString() : null;
  const ids = (v: string | string[] | undefined) => splitMessageIds(v ?? null);
  return {
    gmailMessageId: gmailHexId(meta.emailId) ?? `imap-${uidValidity}-${meta.uid}`,
    gmailThreadId: gmailHexId(meta.threadId),
    rfcMessageId: ids(parsed.messageId)[0] ?? null,
    inReplyTo: ids(parsed.inReplyTo)[0] ?? null,
    references: ids(parsed.references),
    from: email,
    fromName: from?.name?.trim() || null,
    to: addresses(parsed.to),
    cc: addresses(parsed.cc),
    subject: (parsed.subject ?? "").trim().slice(0, 250),
    bodyText: body.replace(/\r\n/g, "\n").trimEnd().slice(0, BODY_MAX),
    attachments: (parsed.attachments ?? []).filter((a) => !!a.filename || a.contentDisposition === "attachment").length,
    receivedAt,
    labels: ["INBOX"],
  };
}

// ------------------------------------------------------------------ connection check (no sending)

export interface CheckResult {
  ok: boolean;
  code: TransportCode | null;
}

export interface AppPasswordCheck {
  smtp: CheckResult;
  imap: CheckResult;
}

const smtpConfig = (env: AppPasswordEnv): SmtpConfig => ({ host: SMTP_HOST, port: SMTP_PORT, secure: true, auth: { user: env.user, pass: env.password } });
const imapConfig = (env: AppPasswordEnv): ImapConfig => ({ host: IMAP_HOST, port: IMAP_PORT, secure: true, auth: { user: env.user, pass: env.password } });

/**
 * "Verifica collegamento": SMTP login (EHLO + AUTH, no MAIL FROM) and IMAP login + logout. Never sends, never opens a
 * mailbox. A password that is not 16 letters or a user that is not the club mailbox are refused without connecting.
 */
export async function verifyAppPassword(env: AppPasswordEnv, mailbox: string, deps: AppPasswordDeps = defaultAppPasswordDeps): Promise<AppPasswordCheck> {
  if (env.user !== mailbox.trim().toLowerCase()) return { smtp: { ok: false, code: "WRONG_ACCOUNT" }, imap: { ok: false, code: "WRONG_ACCOUNT" } };
  if (!looksLikeAppPassword(env.password)) return { smtp: { ok: false, code: "APP_PASSWORD_FORMAT" }, imap: { ok: false, code: "APP_PASSWORD_FORMAT" } };
  const smtpCheck = async (): Promise<CheckResult> => {
    let smtp: SmtpLike | null = null;
    try {
      smtp = await deps.createSmtp(smtpConfig(env));
      await smtp.verify();
      return { ok: true, code: null };
    } catch (e) {
      return { ok: false, code: mapSmtpError(e) };
    } finally {
      smtp?.close();
    }
  };
  const imapCheck = async (): Promise<CheckResult> => {
    let imap: ImapLike | null = null;
    try {
      imap = await deps.createImap(imapConfig(env));
      await imap.connect();
      await imap.logout().catch(() => imap?.close());
      return { ok: true, code: null };
    } catch (e) {
      imap?.close();
      return { ok: false, code: mapImapError(e) };
    }
  };
  const [smtp, imap] = await Promise.all([smtpCheck(), imapCheck()]);
  return { smtp, imap };
}

// ------------------------------------------------------------------ the transport

export function createAppPasswordTransport(env: AppPasswordEnv, deps: AppPasswordDeps = defaultAppPasswordDeps, opts: { retries?: number } = {}): MailTransport {
  const retries = Math.max(0, opts.retries ?? 2);
  let imap: ImapLike | null = null;
  let smtp: SmtpLike | null = null;
  let canSend = false;

  return {
    mode: "APP_PASSWORD",

    async open() {
      if (!looksLikeAppPassword(env.password)) throw new TransportError("APP_PASSWORD_FORMAT");
      try {
        imap = await deps.createImap(imapConfig(env));
        await imap.connect();
      } catch (e) {
        imap?.close();
        imap = null;
        throw new TransportError(mapImapError(e));
      }
      let sendCode: TransportCode | null = null;
      try {
        smtp = await deps.createSmtp(smtpConfig(env));
        await smtp.verify();
        canSend = true;
      } catch (e) {
        sendCode = mapSmtpError(e);
        smtp?.close();
        smtp = null;
        canSend = false;
      }
      return { account: env.user, canSend, sendCode };
    },

    async fetchInbound(cursor, max) {
      if (!imap) throw new TransportError("NOT_CONFIGURED");
      try {
        const mb = await imap.mailboxOpen("INBOX", { readOnly: true });
        const uidValidity = String(mb.uidValidity);
        const top = Math.max(0, Number(mb.uidNext) - 1);
        const c = parseImapCursor(cursor);
        if (!c || c.uidValidity !== uidValidity) {
          return { cursor: encodeImapCursor({ uidValidity, lastUid: top }), messages: [], skipped: 0, reset: !!cursor };
        }
        if (top <= c.lastUid) return { cursor: encodeImapCursor(c), messages: [], skipped: 0, reset: false };
        // "n:*" always returns at least the newest message, even when its uid is below n: filter again.
        const metas = (await imap.fetchAll(`${c.lastUid + 1}:*`, { uid: true, size: true, threadId: true, internalDate: true }, { uid: true }))
          .filter((m) => m.uid > c.lastUid)
          .sort((a, b) => a.uid - b.uid)
          .slice(0, Math.max(1, max));
        const messages: InboundPayload[] = [];
        let skipped = 0;
        let last = c.lastUid;
        for (const meta of metas) {
          last = meta.uid;
          if ((meta.size ?? 0) > MAX_MESSAGE_BYTES) {
            skipped++;
            continue;
          }
          const full = await imap.fetchOne(String(meta.uid), { uid: true, source: { maxLength: SOURCE_MAX_BYTES } }, { uid: true });
          if (!full || !full.source) {
            skipped++;
            continue;
          }
          let parsed: ParsedLike;
          try {
            parsed = await deps.parse(full.source);
          } catch {
            skipped++;
            continue;
          }
          const payload = parsedToInbound(parsed, { ...meta, ...full, emailId: full.emailId ?? meta.emailId, threadId: full.threadId ?? meta.threadId }, uidValidity);
          if (payload) messages.push(payload);
          else skipped++;
        }
        return { cursor: encodeImapCursor({ uidValidity, lastUid: last }), messages, skipped, reset: false };
      } catch (e) {
        if (e instanceof TransportError) throw e;
        throw new TransportError(mapImapError(e));
      }
    },

    async send(envelope) {
      if (!smtp || !canSend) throw new TransportError("SMTP_PORT_BLOCKED");
      const to = [envelope.to, ...envelope.cc, ...envelope.bcc].filter((x, i, a) => x && a.indexOf(x) === i);
      for (let attempt = 0; ; attempt++) {
        try {
          const info = await smtp.sendMail({ envelope: { from: envelope.from, to }, raw: envelope.rawNoBcc });
          const rejected = (info.rejected ?? []).map((r) => String(typeof r === "object" && r && "address" in r ? (r as { address: unknown }).address : r).toLowerCase());
          if (rejected.includes(envelope.to.toLowerCase())) throw new TransportError("RECIPIENT_REJECTED");
          return { gmailMessageId: null, gmailThreadId: null };
        } catch (e) {
          if (e instanceof TransportError) throw e;
          if (attempt < retries && smtpRetrySafe(e)) {
            await deps.sleep(1_000 * (attempt + 1));
            continue;
          }
          throw new TransportError(mapSmtpError(e));
        }
      }
    },

    async close() {
      smtp?.close();
      smtp = null;
      if (imap) {
        const c = imap;
        imap = null;
        await c.logout().catch(() => c.close());
      }
    },
  };
}
