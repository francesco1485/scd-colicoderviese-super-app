/**
 * RFC 2822 / 5322 message builder and Gmail message parser for the Posta del club (r95). Pure: no network.
 * Outgoing: text/plain UTF-8 (or multipart/alternative plain + HTML), base64 bodies, RFC 2047 encoded headers, Reply-To
 * on the club mailbox, X-SCD-* headers. The same bytes go through either transport (Gmail REST or SMTP).
 * Incoming: Gmail API `users.messages.get?format=full` JSON → the payload of scd_comm_record_inbound.
 */

export interface MailAddress {
  name?: string;
  email: string;
}

export interface OutgoingMail {
  from: MailAddress;
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: MailAddress;
  subject: string;
  body: string;
  /** Our own Message-ID (without angle brackets is fine). */
  messageId?: string;
  inReplyTo?: string | null;
  references?: string[];
  date?: Date;
  /** Extra X- headers, e.g. X-SCD-Message-Id. */
  headers?: Record<string, string>;
  /** Optional HTML alternative of `body`: the message becomes multipart/alternative (plain first, HTML second). */
  html?: string | null;
  /** SMTP hands the message over as-is, so Bcc must live only in the envelope, never in the headers. */
  omitBccHeader?: boolean;
  /** Fixed MIME boundary (tests); random otherwise. */
  boundary?: string;
}

const CRLF = "\r\n";

/** Strip CR/LF and other control characters: a header value can never start a new header. */
export function sanitizeHeader(v: string): string {
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
}

function utf8Base64(s: string): string {
  return Buffer.from(s, "utf8").toString("base64");
}

/** RFC 2047 "B" encoding when the value is not plain printable ASCII; split into encoded words of at most 75 chars. */
export function encodeHeaderWord(value: string): string {
  const v = sanitizeHeader(value);
  if (/^[\x20-\x7e]*$/.test(v)) return v;
  const words: string[] = [];
  let chunk = "";
  for (const ch of v) {
    // 45 bytes of UTF-8 -> 60 base64 chars; with "=?UTF-8?B?" + "?=" (12) stays under 75.
    if (Buffer.byteLength(chunk + ch, "utf8") > 45) {
      words.push(`=?UTF-8?B?${utf8Base64(chunk)}?=`);
      chunk = "";
    }
    chunk += ch;
  }
  if (chunk) words.push(`=?UTF-8?B?${utf8Base64(chunk)}?=`);
  return words.join(`${CRLF} `);
}

const ADDR_RE = /^[^@\s<>",;]+@[^@\s<>",;]+\.[^@\s<>",;]+$/;

export function formatAddress(a: MailAddress): string {
  const email = sanitizeHeader(a.email).toLowerCase();
  if (!ADDR_RE.test(email)) throw new Error("invalid address");
  const name = a.name ? sanitizeHeader(a.name) : "";
  if (!name) return email;
  if (/^[\x20-\x7e]*$/.test(name)) return `"${name.replace(/["\\]/g, "\\$&")}" <${email}>`;
  return `${encodeHeaderWord(name)} <${email}>`;
}

function angle(id: string): string {
  const v = sanitizeHeader(id).replace(/^<|>$/g, "");
  return `<${v}>`;
}

/** RFC 5322 date in UTC ("Tue, 13 Oct 2026 08:26:00 +0000"). */
export function rfcDate(d: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const p = (n: number) => String(n).padStart(2, "0");
  return `${days[d.getUTCDay()]}, ${p(d.getUTCDate())} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} +0000`;
}

function base64Lines(text: string): string {
  return utf8Base64(text.replace(/\r?\n/g, CRLF)).replace(/.{1,76}/g, (l) => `${l}${CRLF}`);
}

/** The full message with CRLF line ends. Bodies: UTF-8, base64 in 76-character lines. */
export function buildRawMessage(m: OutgoingMail): string {
  if (m.to.length === 0) throw new Error("no recipient");
  const headers: string[] = [];
  headers.push(`From: ${formatAddress(m.from)}`);
  headers.push(`To: ${m.to.map((e) => formatAddress({ email: e })).join(", ")}`);
  if (m.cc && m.cc.length) headers.push(`Cc: ${m.cc.map((e) => formatAddress({ email: e })).join(", ")}`);
  if (m.bcc && m.bcc.length && !m.omitBccHeader) headers.push(`Bcc: ${m.bcc.map((e) => formatAddress({ email: e })).join(", ")}`);
  if (m.replyTo) headers.push(`Reply-To: ${formatAddress(m.replyTo)}`);
  headers.push(`Subject: ${encodeHeaderWord(m.subject)}`);
  headers.push(`Date: ${rfcDate(m.date ?? new Date())}`);
  if (m.messageId) headers.push(`Message-ID: ${angle(m.messageId)}`);
  if (m.inReplyTo) headers.push(`In-Reply-To: ${angle(m.inReplyTo)}`);
  const refs = [...(m.references ?? []), ...(m.inReplyTo ? [m.inReplyTo] : [])].filter((x, i, a) => x && a.indexOf(x) === i);
  if (refs.length) headers.push(`References: ${refs.map(angle).join(" ")}`);
  for (const [k, v] of Object.entries(m.headers ?? {})) {
    if (!/^X-[A-Za-z0-9-]+$/.test(k)) throw new Error("only X- headers are allowed");
    headers.push(`${k}: ${sanitizeHeader(v)}`);
  }
  headers.push("MIME-Version: 1.0");
  if (!m.html) {
    headers.push('Content-Type: text/plain; charset="UTF-8"');
    headers.push("Content-Transfer-Encoding: base64");
    return `${headers.join(CRLF)}${CRLF}${CRLF}${base64Lines(m.body)}`;
  }
  const boundary = sanitizeHeader(m.boundary ?? `scd-alt-${globalThis.crypto.randomUUID()}`).replace(/[^A-Za-z0-9'()+_,./:=?-]/g, "");
  headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
  const part = (type: string, text: string) =>
    `--${boundary}${CRLF}Content-Type: ${type}; charset="UTF-8"${CRLF}Content-Transfer-Encoding: base64${CRLF}${CRLF}${base64Lines(text)}`;
  return `${headers.join(CRLF)}${CRLF}${CRLF}${part("text/plain", m.body)}${part("text/html", m.html)}--${boundary}--${CRLF}`;
}

/** Gmail `raw` field: base64url without padding. */
export function toBase64Url(raw: string): string {
  return Buffer.from(raw, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(data: string): Buffer {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

// ------------------------------------------------------------------ parsing incoming mail

/** Decodes RFC 2047 encoded words (B and Q, UTF-8 / ISO-8859-1 / Windows-1252); plain text is returned unchanged. */
export function decodeEncodedWords(v: string): string {
  return v
    .replace(/\?=\s+=\?/g, "?==?")
    .replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (_m, charset: string, enc: string, text: string) => {
      const bytes =
        enc.toUpperCase() === "B"
          ? Buffer.from(text, "base64")
          : Buffer.from(text.replace(/_/g, " ").replace(/=([0-9A-Fa-f]{2})/g, (_x, h: string) => String.fromCharCode(parseInt(h, 16))), "latin1");
      return decodeBytes(bytes, charset);
    });
}

function decodeBytes(bytes: Buffer, charset: string | null | undefined): string {
  const cs = (charset ?? "utf-8").toLowerCase().replace(/^"|"$/g, "");
  try {
    return new TextDecoder(cs === "latin1" ? "iso-8859-1" : cs).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

/** "Mario Rossi <mario@x.it>, \"Ufficio, Acme\" <a@b.it>, c@d.it" → addresses (lower-case). */
export function parseAddressList(v: string | null | undefined): MailAddress[] {
  if (!v) return [];
  const out: MailAddress[] = [];
  const parts: string[] = [];
  let cur = "";
  let quoted = false;
  let angleDepth = 0;
  for (const ch of v) {
    if (ch === '"') quoted = !quoted;
    if (!quoted && ch === "<") angleDepth++;
    if (!quoted && ch === ">") angleDepth = Math.max(0, angleDepth - 1);
    if (!quoted && angleDepth === 0 && ch === ",") {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  parts.push(cur);
  for (const raw of parts) {
    const p = raw.trim();
    if (!p) continue;
    const m = /^(.*)<([^>]+)>\s*$/.exec(p);
    const email = (m ? m[2] ?? "" : p).trim().toLowerCase();
    if (!ADDR_RE.test(email)) continue;
    const name = m ? decodeEncodedWords((m[1] ?? "").trim().replace(/^"|"$/g, "").replace(/\\(.)/g, "$1")).trim() : "";
    out.push(name ? { name, email } : { email });
  }
  return out;
}

interface GmailPart {
  mimeType?: string;
  filename?: string;
  headers?: Array<{ name?: string; value?: string }>;
  body?: { data?: string; size?: number; attachmentId?: string };
  parts?: GmailPart[];
}

export interface GmailMessageJson {
  id?: string;
  threadId?: string;
  labelIds?: string[];
  internalDate?: string;
  payload?: GmailPart;
}

export interface InboundPayload {
  gmailMessageId: string;
  gmailThreadId: string | null;
  rfcMessageId: string | null;
  inReplyTo: string | null;
  from: string;
  fromName: string | null;
  to: string[];
  cc: string[];
  subject: string;
  bodyText: string;
  attachments: number;
  receivedAt: string | null;
  labels: string[];
  /** Message-IDs of the References header (used to match replies; never stored). */
  references?: string[];
}

function header(part: GmailPart | undefined, name: string): string | null {
  const h = part?.headers?.find((x) => (x.name ?? "").toLowerCase() === name.toLowerCase());
  return h?.value ?? null;
}

function charsetOf(part: GmailPart): string | null {
  const ct = header(part, "Content-Type") ?? "";
  const m = /charset\s*=\s*"?([^";\s]+)"?/i.exec(ct);
  return m?.[1] ?? null;
}

/** Plain text of an HTML part: tags removed, entities for the common characters decoded, blank lines collapsed. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, d: string) => String.fromCodePoint(Number(d)))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function walk(part: GmailPart | undefined, acc: { plain: string[]; html: string[]; attachments: number }) {
  if (!part) return;
  const mime = (part.mimeType ?? "").toLowerCase();
  if (part.filename && (part.body?.attachmentId || (part.body?.size ?? 0) > 0)) {
    acc.attachments++;
    return;
  }
  if (part.parts && part.parts.length) {
    for (const p of part.parts) walk(p, acc);
    return;
  }
  const data = part.body?.data;
  if (!data) return;
  const text = decodeBytes(fromBase64Url(data), charsetOf(part));
  if (mime === "text/plain") acc.plain.push(text);
  else if (mime === "text/html") acc.html.push(text);
}

export const BODY_MAX = 20_000;

/** Gmail message JSON → payload for scd_comm_record_inbound, or null when it has no usable sender. */
export function parseGmailMessage(msg: GmailMessageJson): InboundPayload | null {
  const p = msg.payload;
  const fromList = parseAddressList(header(p, "From"));
  const from = fromList[0];
  if (!msg.id || !from) return null;
  const acc = { plain: [] as string[], html: [] as string[], attachments: 0 };
  walk(p, acc);
  const body = acc.plain.length ? acc.plain.join("\n\n") : htmlToText(acc.html.join("\n\n"));
  const internal = msg.internalDate && /^\d+$/.test(msg.internalDate) ? new Date(Number(msg.internalDate)).toISOString() : null;
  const clean = (v: string | null) => (v ? v.trim().replace(/^<|>$/g, "") : null);
  return {
    gmailMessageId: msg.id,
    gmailThreadId: msg.threadId ?? null,
    rfcMessageId: clean(header(p, "Message-ID") ?? header(p, "Message-Id")),
    inReplyTo: clean(header(p, "In-Reply-To")),
    references: (header(p, "References") ?? "").match(/<[^<>\s]+>/g)?.map((x) => x.slice(1, -1)) ?? [],
    from: from.email,
    fromName: from.name ?? null,
    to: parseAddressList(header(p, "To")).map((a) => a.email),
    cc: parseAddressList(header(p, "Cc")).map((a) => a.email),
    subject: decodeEncodedWords(header(p, "Subject") ?? "").trim().slice(0, 250),
    bodyText: body.replace(/\r\n/g, "\n").slice(0, BODY_MAX),
    attachments: acc.attachments,
    receivedAt: internal,
    labels: msg.labelIds ?? [],
  };
}

/** Only real incoming mail is imported: in the inbox, not sent by us, not spam, trash or drafts. */
export function isImportable(labels: readonly string[]): boolean {
  return labels.includes("INBOX") && !labels.some((l) => l === "SENT" || l === "DRAFT" || l === "SPAM" || l === "TRASH");
}
