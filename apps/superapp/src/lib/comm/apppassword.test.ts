import { describe, expect, it } from "vitest";

import {
  createAppPasswordTransport,
  defaultAppPasswordDeps,
  parsedToInbound,
  verifyAppPassword,
  type AppPasswordDeps,
  type ImapConfig,
  type ImapLike,
  type ImapMessageMeta,
  type SmtpConfig,
  type SmtpLike,
} from "./apppassword.server";
import { TransportError } from "./transport";

const ENV = { user: "sportclubcolico@gmail.com", password: "abcdefghijklmnop" };
const MAILBOX = "sportclubcolico@gmail.com";
const OURS = "scd-0f8fad5b-d9cb-469f-a165-70867728950e@colicoderviese.app";

function rawReply(opts: { from?: string; subject?: string; inReplyTo?: string; references?: string; html?: boolean } = {}): Buffer {
  const lines = [
    `From: ${opts.from ?? '"Anna Verdi" <anna.verdi@example.org>'}`,
    "To: sportclubcolico@gmail.com",
    `Subject: ${opts.subject ?? "Re: Quote ottobre [SCD-1A2B3C]"}`,
    "Message-ID: <CAF9reply@mail.gmail.com>",
    ...(opts.inReplyTo ? [`In-Reply-To: <${opts.inReplyTo}>`] : []),
    ...(opts.references ? [`References: ${opts.references}`] : []),
    "Date: Tue, 13 Oct 2026 10:05:00 +0200",
    "MIME-Version: 1.0",
    opts.html ? 'Content-Type: text/html; charset="UTF-8"' : 'Content-Type: text/plain; charset="UTF-8"',
    "",
    opts.html ? "<p>Pagato <b>ieri</b></p>" : "Pagato ieri, grazie.",
    "",
  ];
  return Buffer.from(lines.join("\r\n"), "utf8");
}

interface FakeState {
  smtpVerifyError?: unknown;
  smtpSendErrors?: unknown[];
  smtpRejected?: string[];
  imapConnectError?: unknown;
  uidValidity?: number;
  uidNext?: number;
  messages?: Array<ImapMessageMeta & { raw: Buffer }>;
}

function fakeDeps(st: FakeState) {
  const log = {
    smtpConfigs: [] as SmtpConfig[],
    imapConfigs: [] as ImapConfig[],
    sent: [] as Array<{ envelope: { from: string; to: string[] }; raw: string }>,
    opened: [] as Array<{ path: string; readOnly: boolean }>,
    fetchAll: [] as Array<{ range: string; query: Record<string, unknown> }>,
    fetchOne: [] as Array<{ range: string; query: Record<string, unknown> }>,
    sleeps: [] as number[],
    verified: 0,
    logouts: 0,
    smtpClosed: 0,
  };
  let sendIdx = 0;
  const deps: AppPasswordDeps = {
    async createSmtp(cfg) {
      log.smtpConfigs.push(cfg);
      const s: SmtpLike = {
        async verify() {
          log.verified++;
          if (st.smtpVerifyError) throw st.smtpVerifyError;
          return true;
        },
        async sendMail(m) {
          const err = st.smtpSendErrors?.[sendIdx++];
          if (err) throw err;
          log.sent.push(m);
          return { accepted: m.envelope.to.filter((t) => !(st.smtpRejected ?? []).includes(t)), rejected: st.smtpRejected ?? [] };
        },
        close() {
          log.smtpClosed++;
        },
      };
      return s;
    },
    async createImap(cfg) {
      log.imapConfigs.push(cfg);
      const c: ImapLike = {
        async connect() {
          if (st.imapConnectError) throw st.imapConnectError;
        },
        async mailboxOpen(path, options) {
          log.opened.push({ path, readOnly: options.readOnly });
          return { uidValidity: BigInt(st.uidValidity ?? 7), uidNext: st.uidNext ?? 101 };
        },
        async fetchAll(range, query) {
          log.fetchAll.push({ range, query });
          const from = Number(range.split(":")[0]);
          const all = st.messages ?? [];
          const hits = all.filter((m) => m.uid >= from);
          // IMAP "n:*" returns the newest message even when n is above every uid.
          const res = hits.length ? hits : all.slice(-1);
          return res.map(({ raw: _raw, ...meta }) => meta);
        },
        async fetchOne(range, query) {
          log.fetchOne.push({ range, query });
          const m = (st.messages ?? []).find((x) => String(x.uid) === range);
          return m ? { uid: m.uid, source: m.raw, emailId: m.emailId, threadId: m.threadId } : false;
        },
        async logout() {
          log.logouts++;
        },
        close() {},
      };
      return c;
    },
    parse: defaultAppPasswordDeps.parse,
    async sleep(ms) {
      log.sleeps.push(ms);
    },
  };
  return { deps, log };
}

describe("verifyAppPassword", () => {
  it("logs in to SMTP and IMAP over TLS without sending anything", async () => {
    const { deps, log } = fakeDeps({});
    const r = await verifyAppPassword(ENV, MAILBOX, deps);
    expect(r).toEqual({ smtp: { ok: true, code: null }, imap: { ok: true, code: null } });
    expect(log.smtpConfigs[0]).toMatchObject({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: MAILBOX } });
    expect(log.imapConfigs[0]).toMatchObject({ host: "imap.gmail.com", port: 993, secure: true });
    expect(log.verified).toBe(1);
    expect(log.sent).toEqual([]);
    expect(log.opened).toEqual([]);
    expect(log.logouts).toBe(1);
  });

  it("refuses another account or a password that is not 16 letters without connecting", async () => {
    const a = fakeDeps({});
    expect((await verifyAppPassword({ ...ENV, user: "someone@gmail.com" }, MAILBOX, a.deps)).smtp.code).toBe("WRONG_ACCOUNT");
    const b = fakeDeps({});
    expect((await verifyAppPassword({ ...ENV, password: "Calcio2026!" }, MAILBOX, b.deps)).imap.code).toBe("APP_PASSWORD_FORMAT");
    expect([...a.log.smtpConfigs, ...b.log.smtpConfigs, ...a.log.imapConfigs, ...b.log.imapConfigs]).toEqual([]);
  });

  it("reports a blocked SMTP port while receiving still works", async () => {
    const { deps } = fakeDeps({ smtpVerifyError: Object.assign(new Error("Connection timeout"), { code: "ETIMEDOUT", command: "CONN" }) });
    const r = await verifyAppPassword(ENV, MAILBOX, deps);
    expect(r.smtp).toEqual({ ok: false, code: "SMTP_PORT_BLOCKED" });
    expect(r.imap.ok).toBe(true);
  });

  it("reports a wrong app password from both servers", async () => {
    const { deps } = fakeDeps({
      smtpVerifyError: Object.assign(new Error("Invalid login"), { code: "EAUTH", responseCode: 535, response: "535-5.7.8 Username and Password not accepted" }),
      imapConnectError: Object.assign(new Error("Authentication failed"), { authenticationFailed: true, serverResponseCode: "AUTHENTICATIONFAILED" }),
    });
    const r = await verifyAppPassword(ENV, MAILBOX, deps);
    expect(r.smtp.code).toBe("APP_PASSWORD_WRONG");
    expect(r.imap.code).toBe("APP_PASSWORD_WRONG");
  });
});

describe("app-password transport", () => {
  it("open fails on an IMAP login error and keeps sending off when SMTP is blocked", async () => {
    const bad = fakeDeps({ imapConnectError: Object.assign(new Error("x"), { authenticationFailed: true, response: "[ALERT] Application-specific password required" }) });
    await expect(createAppPasswordTransport(ENV, bad.deps).open()).rejects.toMatchObject({ code: "NORMAL_PASSWORD_USED" });

    const blocked = fakeDeps({ smtpVerifyError: Object.assign(new Error("x"), { code: "ECONNECTION", command: "CONN" }) });
    const t = createAppPasswordTransport(ENV, blocked.deps);
    expect(await t.open()).toEqual({ account: MAILBOX, canSend: false, sendCode: "SMTP_PORT_BLOCKED" });
    await expect(t.send({ from: MAILBOX, to: "a@b.it", cc: [], bcc: [], raw: "x", rawNoBcc: "x", gmailThreadId: null })).rejects.toBeInstanceOf(TransportError);
    await t.close();
  });

  it("first run only stores the IMAP read point, read-only, without fetching", async () => {
    const { deps, log } = fakeDeps({ uidValidity: 7, uidNext: 101 });
    const t = createAppPasswordTransport(ENV, deps);
    await t.open();
    const b = await t.fetchInbound(null, 200);
    expect(b).toEqual({ cursor: "imap:7:100", messages: [], skipped: 0, reset: false });
    expect(log.opened).toEqual([{ path: "INBOX", readOnly: true }]);
    expect(log.fetchAll).toEqual([]);
    // a Gmail API history id (OAuth before) or a changed UIDVALIDITY also restarts from "now"
    expect((await t.fetchInbound("5000", 200)).reset).toBe(true);
    expect((await t.fetchInbound("imap:6:40", 200)).cursor).toBe("imap:7:100");
    await t.close();
    expect(log.logouts).toBe(1);
  });

  it("imports new INBOX mail with BODY.PEEK semantics, Gmail ids and reply references", async () => {
    const { deps, log } = fakeDeps({
      uidValidity: 7,
      uidNext: 103,
      messages: [
        { uid: 95, raw: rawReply() },
        { uid: 101, emailId: "1278455344230334865", threadId: "1278455344230334000", size: 900, internalDate: new Date("2026-10-13T08:05:00Z"), raw: rawReply({ inReplyTo: "CAF2@mail.gmail.com", references: `<${OURS}> <CAF2@mail.gmail.com>` }) },
        { uid: 102, size: 30 * 1024 * 1024, raw: rawReply() },
      ],
    });
    const t = createAppPasswordTransport(ENV, deps);
    await t.open();
    const b = await t.fetchInbound("imap:7:100", 200);
    expect(b.cursor).toBe("imap:7:102");
    expect(b.skipped).toBe(1);
    expect(b.messages).toHaveLength(1);
    expect(b.messages[0]).toMatchObject({
      gmailMessageId: BigInt("1278455344230334865").toString(16),
      gmailThreadId: BigInt("1278455344230334000").toString(16),
      rfcMessageId: "CAF9reply@mail.gmail.com",
      inReplyTo: "CAF2@mail.gmail.com",
      from: "anna.verdi@example.org",
      fromName: "Anna Verdi",
      to: ["sportclubcolico@gmail.com"],
      subject: "Re: Quote ottobre [SCD-1A2B3C]",
      bodyText: "Pagato ieri, grazie.",
      receivedAt: "2026-10-13T08:05:00.000Z",
      labels: ["INBOX"],
    });
    expect(b.messages[0]?.references).toEqual([OURS, "CAF2@mail.gmail.com"]);
    expect(log.fetchAll[0]?.range).toBe("101:*");
    expect(log.fetchOne.map((f) => f.range)).toEqual(["101"]);
    expect(log.fetchOne[0]?.query).toMatchObject({ uid: true, source: { maxLength: 2 * 1024 * 1024 } });
    expect(log.fetchOne[0]?.query).not.toHaveProperty("flags");
    expect(log.opened.every((o) => o.readOnly)).toBe(true);
  });

  it("ignores the newest message IMAP returns for an empty n:* range", async () => {
    const { deps, log } = fakeDeps({ uidValidity: 7, uidNext: 101, messages: [{ uid: 100, raw: rawReply() }] });
    const t = createAppPasswordTransport(ENV, deps);
    await t.open();
    const b = await t.fetchInbound("imap:7:100", 200);
    expect(b).toEqual({ cursor: "imap:7:100", messages: [], skipped: 0, reset: false });
    expect(log.fetchAll).toEqual([]);
  });

  it("sends one e-mail with Bcc only in the envelope and retries a refused attempt", async () => {
    const { deps, log } = fakeDeps({ smtpSendErrors: [Object.assign(new Error("x"), { code: "EMESSAGE", responseCode: 451, response: "451 4.3.0 try again" })] });
    const t = createAppPasswordTransport(ENV, deps);
    await t.open();
    const r = await t.send({
      from: MAILBOX,
      to: "teen@example.org",
      cc: ["mum@example.org"],
      bcc: ["staff@example.org"],
      raw: "Bcc: staff@example.org\r\nSubject: x\r\n\r\nbody",
      rawNoBcc: "Subject: x\r\n\r\nbody",
      gmailThreadId: null,
    });
    expect(r).toEqual({ gmailMessageId: null, gmailThreadId: null });
    expect(log.sent).toHaveLength(1);
    expect(log.sent[0]?.envelope).toEqual({ from: MAILBOX, to: ["teen@example.org", "mum@example.org", "staff@example.org"] });
    expect(log.sent[0]?.raw).not.toContain("Bcc:");
    expect(log.sleeps).toEqual([1000]);
  });

  it("never retries when the outcome is uncertain and reports a refused recipient", async () => {
    const a = fakeDeps({ smtpSendErrors: [Object.assign(new Error("x"), { code: "ETIMEDOUT", command: "DATA" })] });
    const t = createAppPasswordTransport(ENV, a.deps);
    await t.open();
    await expect(t.send({ from: MAILBOX, to: "a@b.it", cc: [], bcc: [], raw: "x", rawNoBcc: "x", gmailThreadId: null })).rejects.toMatchObject({ code: "TIMEOUT" });
    expect(a.log.sleeps).toEqual([]);

    const b = fakeDeps({ smtpRejected: ["gone@b.it"] });
    const t2 = createAppPasswordTransport(ENV, b.deps);
    await t2.open();
    await expect(t2.send({ from: MAILBOX, to: "gone@b.it", cc: [], bcc: [], raw: "x", rawNoBcc: "x", gmailThreadId: null })).rejects.toMatchObject({ code: "RECIPIENT_REJECTED" });
  });
});

describe("parsedToInbound", () => {
  it("falls back to the HTML text and to an IMAP id outside Gmail", async () => {
    const parsed = await defaultAppPasswordDeps.parse(rawReply({ html: true, subject: "Nuova richiesta" }));
    const p = parsedToInbound(parsed, { uid: 9 }, "7");
    expect(p).toMatchObject({ gmailMessageId: "imap-7-9", gmailThreadId: null, bodyText: "Pagato ieri", subject: "Nuova richiesta", attachments: 0 });
  });

  it("drops a message without a usable sender", () => {
    expect(parsedToInbound({ from: { value: [{ name: "Nessuno" }] } }, { uid: 1 }, "7")).toBeNull();
  });
});

describe("real libraries", () => {
  it("load and build SMTP and IMAP clients without opening a connection", async () => {
    const smtp = await defaultAppPasswordDeps.createSmtp({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: MAILBOX, pass: "abcdefghijklmnop" } });
    const imap = await defaultAppPasswordDeps.createImap({ host: "imap.gmail.com", port: 993, secure: true, auth: { user: MAILBOX, pass: "abcdefghijklmnop" } });
    expect(typeof smtp.verify).toBe("function");
    expect(typeof imap.connect).toBe("function");
    smtp.close();
    imap.close();
  });
});
