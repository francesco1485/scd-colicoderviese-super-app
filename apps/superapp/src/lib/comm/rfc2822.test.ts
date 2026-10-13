import { describe, expect, it } from "vitest";

import {
  buildRawMessage,
  decodeEncodedWords,
  encodeHeaderWord,
  formatAddress,
  fromBase64Url,
  htmlToText,
  isImportable,
  parseAddressList,
  parseGmailMessage,
  sanitizeHeader,
  toBase64Url,
} from "./rfc2822";

const b64url = (s: string) => Buffer.from(s, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function headersOf(raw: string): Record<string, string> {
  const head = raw.split("\r\n\r\n")[0] ?? "";
  const out: Record<string, string> = {};
  let last = "";
  for (const line of head.split("\r\n")) {
    if (/^\s/.test(line)) out[last] += line;
    else {
      const i = line.indexOf(":");
      last = line.slice(0, i);
      out[last] = line.slice(i + 1).trim();
    }
  }
  return out;
}

describe("RFC 2822 builder", () => {
  const raw = buildRawMessage({
    from: { name: "S.C.D. ColicoDerviese", email: "sportclubcolico@gmail.com" },
    replyTo: { name: "S.C.D. ColicoDerviese", email: "sportclubcolico@gmail.com" },
    to: ["teen2@example.org"],
    cc: ["anna.verdi@example.org"],
    bcc: ["giulia.ferri@example.org"],
    subject: "Quota d'iscrizione: già pagata? ⚽ Novità stagione 2026/27 per tutte le famiglie della società",
    body: "Gentile famiglia,\nla quota è dovuta entro il 31/10.\nGrazie",
    messageId: "scd-r1@colicoderviese.app",
    inReplyTo: "<CAF123@mail.gmail.com>",
    date: new Date("2026-10-13T08:26:00Z"),
    headers: { "X-SCD-Message-Id": "m-1" },
  });
  const h = headersOf(raw);

  it("writes From, Reply-To, To, Cc, Bcc and the tracking header", () => {
    expect(h["From"]).toBe('"S.C.D. ColicoDerviese" <sportclubcolico@gmail.com>');
    expect(h["Reply-To"]).toBe('"S.C.D. ColicoDerviese" <sportclubcolico@gmail.com>');
    expect(h["To"]).toBe("teen2@example.org");
    expect(h["Cc"]).toBe("anna.verdi@example.org");
    expect(h["Bcc"]).toBe("giulia.ferri@example.org");
    expect(h["X-SCD-Message-Id"]).toBe("m-1");
    expect(h["Message-ID"]).toBe("<scd-r1@colicoderviese.app>");
    expect(h["In-Reply-To"]).toBe("<CAF123@mail.gmail.com>");
    expect(h["References"]).toBe("<CAF123@mail.gmail.com>");
    expect(h["Date"]).toBe("Tue, 13 Oct 2026 08:26:00 +0000");
    expect(h["Content-Type"]).toBe('text/plain; charset="UTF-8"');
  });

  it("encodes a UTF-8 subject in RFC 2047 words of at most 75 characters", () => {
    const words = (h["Subject"] ?? "").split(/\s+/);
    expect(words.length).toBeGreaterThan(1);
    for (const w of words) {
      expect(w).toMatch(/^=\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=$/);
      expect(w.length).toBeLessThanOrEqual(75);
    }
    expect(decodeEncodedWords(h["Subject"] ?? "")).toBe("Quota d'iscrizione: già pagata? ⚽ Novità stagione 2026/27 per tutte le famiglie della società");
  });

  it("encodes the body as base64 UTF-8 with CRLF and short lines", () => {
    const body = raw.split("\r\n\r\n")[1] ?? "";
    for (const line of body.split("\r\n").filter(Boolean)) expect(line.length).toBeLessThanOrEqual(76);
    expect(Buffer.from(body.replace(/\r\n/g, ""), "base64").toString("utf8")).toBe("Gentile famiglia,\r\nla quota è dovuta entro il 31/10.\r\nGrazie");
  });

  it("keeps plain ASCII headers readable", () => {
    expect(encodeHeaderWord("Convocazione sabato")).toBe("Convocazione sabato");
  });

  it("blocks header injection", () => {
    expect(sanitizeHeader("Ciao\r\nBcc: tutti@example.org")).toBe("Ciao Bcc: tutti@example.org");
    const r = buildRawMessage({ from: { email: "sportclubcolico@gmail.com" }, to: ["a@b.it"], subject: "x\r\nBcc: evil@x.it", body: "y" });
    expect(r.split("\r\n").some((l) => l.startsWith("Bcc:"))).toBe(false);
    expect(() => formatAddress({ email: "a@b.it>\r\nBcc: x@y.it" })).toThrow();
    expect(() => buildRawMessage({ from: { email: "sportclubcolico@gmail.com" }, to: ["a@b.it"], subject: "x", body: "y", headers: { Bcc: "evil@x.it" } })).toThrow();
    expect(() => buildRawMessage({ from: { email: "sportclubcolico@gmail.com" }, to: [], subject: "x", body: "y" })).toThrow();
  });

  it("encodes non-ASCII display names and quotes specials", () => {
    expect(formatAddress({ name: "Società Sportiva", email: "A@B.IT" })).toMatch(/^=\?UTF-8\?B\?.+\?= <a@b\.it>$/);
    expect(formatAddress({ name: 'Rossi, "Ufficio"', email: "a@b.it" })).toBe('"Rossi, \\"Ufficio\\"" <a@b.it>');
  });

  it("round-trips base64url for the Gmail raw field", () => {
    const enc = toBase64Url(raw);
    expect(enc).not.toMatch(/[+/=]/);
    expect(fromBase64Url(enc).toString("utf8")).toBe(raw);
  });
});

describe("Gmail message parser", () => {
  const msg = {
    id: "18c0ffee1234",
    threadId: "18c0ffee0000",
    labelIds: ["INBOX", "UNREAD"],
    internalDate: String(Date.parse("2026-10-13T09:00:00Z")),
    payload: {
      mimeType: "multipart/mixed",
      headers: [
        { name: "From", value: "=?UTF-8?B?QW5uYSBWZXJkacOg?= <Anna.Verdi@Example.org>" },
        { name: "To", value: "S.C.D. ColicoDerviese <sportclubcolico@gmail.com>, \"Rossi, Ufficio\" <ufficio@example.org>" },
        { name: "Subject", value: "Re: =?UTF-8?Q?Quota_d'iscrizione_gi=C3=A0_pagata=3F?=" },
        { name: "Message-ID", value: "<CAF999@mail.gmail.com>" },
        { name: "In-Reply-To", value: "<scd-r1@colicoderviese.app>" },
      ],
      parts: [
        {
          mimeType: "multipart/alternative",
          parts: [
            { mimeType: "text/plain", headers: [{ name: "Content-Type", value: 'text/plain; charset="UTF-8"' }], body: { data: b64url("Grazie, già pagato.\r\nAnna") } },
            { mimeType: "text/html", body: { data: b64url("<p>Grazie</p>") } },
          ],
        },
        { mimeType: "application/pdf", filename: "ricevuta.pdf", body: { attachmentId: "att1", size: 1200 } },
      ],
    },
  };

  it("extracts sender, thread, ids, decoded subject, plain body and attachment count", () => {
    const p = parseGmailMessage(msg);
    expect(p).toMatchObject({
      gmailMessageId: "18c0ffee1234",
      gmailThreadId: "18c0ffee0000",
      rfcMessageId: "CAF999@mail.gmail.com",
      inReplyTo: "scd-r1@colicoderviese.app",
      from: "anna.verdi@example.org",
      fromName: "Anna Verdià",
      to: ["sportclubcolico@gmail.com", "ufficio@example.org"],
      subject: "Re: Quota d'iscrizione già pagata?",
      bodyText: "Grazie, già pagato.\nAnna",
      attachments: 1,
      receivedAt: "2026-10-13T09:00:00.000Z",
    });
  });

  it("falls back to the HTML part as text and decodes Latin-1", () => {
    const p = parseGmailMessage({
      id: "abcdef123",
      payload: {
        mimeType: "text/html",
        headers: [{ name: "From", value: "x@y.it" }, { name: "Content-Type", value: "text/html; charset=iso-8859-1" }],
        body: { data: Buffer.from("<div>Perch\xe9 no?<br>Ciao &amp; grazie</div>", "latin1").toString("base64url") },
      },
    });
    expect(p?.bodyText).toBe("Perché no?\nCiao & grazie");
  });

  it("returns null without a valid sender and imports only inbox mail", () => {
    expect(parseGmailMessage({ id: "abcdef123", payload: { headers: [{ name: "From", value: "not an address" }] } })).toBeNull();
    expect(isImportable(["INBOX", "UNREAD"])).toBe(true);
    expect(isImportable(["SENT"])).toBe(false);
    expect(isImportable(["INBOX", "SPAM"])).toBe(false);
  });

  it("parses address lists with quoted commas", () => {
    expect(parseAddressList('"Rossi, Mario" <m@x.it>, b@y.it, junk')).toEqual([{ name: "Rossi, Mario", email: "m@x.it" }, { email: "b@y.it" }]);
  });

  it("turns HTML into readable text", () => {
    expect(htmlToText("<style>p{}</style><p>Uno</p><p>Due&nbsp;&#232;</p>")).toBe("Uno\nDue è");
  });
});
