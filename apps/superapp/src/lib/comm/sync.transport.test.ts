import type { SupabaseClient } from "@supabase/supabase-js";
import { simpleParser } from "mailparser";
import { describe, expect, it } from "vitest";

import type { InboundPayload } from "./rfc2822";
import { createTransport, releaseClaims, resolveReplyTarget, runCommSyncForOrg } from "./sync.server";
import { TransportError, type InboundBatch, type MailTransport, type OpenResult, type OutgoingEnvelope } from "./transport";

const ORG = "00000000-0000-0000-0000-0000000000a1";
const MAILBOX = "sportclubcolico@gmail.com";
const THREAD = "1a2b3c4d-0000-4000-8000-000000000001";
const OURS = "scd-0f8fad5b-d9cb-469f-a165-70867728950e@colicoderviese.app";

type Call = { name: string; args: Record<string, unknown> };
type TableCall = { table: string; ops: Array<[string, unknown[]]> };

/** rpc + a chainable from() whose result per table is configurable. */
function fakeSb(state: Record<string, unknown>, claim: unknown = { items: [] }, tables: Record<string, unknown[]> = {}) {
  const calls: Call[] = [];
  const tableCalls: TableCall[] = [];
  const sb = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      if (name === "scd_comm_sync_state") return { data: state, error: null };
      if (name === "scd_comm_outbox_claim") return { data: claim, error: null };
      if (name === "scd_comm_record_inbound") return { data: { ok: true, match: "PERSON" }, error: null };
      return { data: { ok: true }, error: null };
    },
    from: (table: string) => {
      const rec: TableCall = { table, ops: [] };
      tableCalls.push(rec);
      const builder: Record<string, unknown> = {};
      for (const op of ["select", "eq", "gte", "lte", "limit", "order", "in", "not", "update"]) {
        builder[op] = (...args: unknown[]) => {
          rec.ops.push([op, args]);
          return builder;
        };
      }
      builder["then"] = (resolve: (v: unknown) => void) => resolve({ data: tables[table] ?? [], error: null });
      return builder;
    },
  } as unknown as SupabaseClient;
  return { sb, calls, tableCalls };
}

function fakeTransport(o: { open?: OpenResult | TransportError; batch?: InboundBatch; sendErrors?: Array<TransportError | null> } = {}) {
  const sent: OutgoingEnvelope[] = [];
  const cursors: Array<string | null> = [];
  let closed = 0;
  let i = 0;
  const t: MailTransport = {
    mode: "APP_PASSWORD",
    async open() {
      if (o.open instanceof TransportError) throw o.open;
      return o.open ?? { account: MAILBOX, canSend: true, sendCode: null };
    },
    async fetchInbound(cursor) {
      cursors.push(cursor);
      return o.batch ?? { cursor: "imap:7:100", messages: [], skipped: 0, reset: cursor === null ? false : false };
    },
    async send(env) {
      const err = o.sendErrors?.[i++];
      if (err) throw err;
      sent.push(env);
      return { gmailMessageId: null, gmailThreadId: null };
    },
    async close() {
      closed++;
    },
  };
  return { t, sent, cursors, closed: () => closed };
}

const item = (n: number, to: string, extra: Record<string, unknown> = {}) => ({
  recipientId: `0f8fad5b-d9cb-469f-a165-7086772895${String(n).padStart(2, "0")}`,
  messageId: "m1",
  threadId: THREAD,
  to,
  cc: [],
  bcc: [],
  subject: "Quote ottobre",
  body: "Promemoria quote.",
  office: "TESORERIA",
  senderName: "Giulia Ferri",
  gmailThreadId: null,
  inReplyTo: null,
  ...extra,
});

const inbound = (over: Partial<InboundPayload> = {}): InboundPayload => ({
  gmailMessageId: "11bdfc5cae0c8191",
  gmailThreadId: "11bdfc5cae0c7e30",
  rfcMessageId: "CAF9reply@mail.gmail.com",
  inReplyTo: null,
  references: [],
  from: "anna.verdi@example.org",
  fromName: "Anna Verdi",
  to: [MAILBOX],
  cc: [],
  subject: "Re: Quote ottobre",
  bodyText: "Pagato",
  attachments: 0,
  receivedAt: "2026-10-13T08:05:00.000Z",
  labels: ["INBOX"],
  ...over,
});

describe("transport selection in the sync", () => {
  it("builds the app-password transport from the environment, OAuth first, nothing without credentials", () => {
    expect(createTransport({ env: { SCD_GMAIL_APP_PASSWORD: "abcd efgh ijkl mnop" } })?.mode).toBe("APP_PASSWORD");
    expect(createTransport({ env: { SCD_GMAIL_APP_PASSWORD: "abcdefghijklmnop", SCD_GMAIL_CLIENT_ID: "c", SCD_GMAIL_CLIENT_SECRET: "s", SCD_GMAIL_REFRESH_TOKEN: "r" } })?.mode).toBe("OAUTH");
    expect(createTransport({ env: {} })).toBeNull();
  });
});

describe("comm-sync with the app-password transport", () => {
  it("sends one individual e-mail per recipient: tagged subject, thread header, plain + HTML, our Message-ID recorded", async () => {
    const claim = { room: 50, stillQueued: 0, items: [item(1, "anna.verdi@example.org"), item(2, "paolo.bianchi@example.org", { bcc: ["giulia.ferri@example.org"] })] };
    const { sb, calls } = fakeSb({ mailbox: MAILBOX, historyId: "imap:7:100", sendingEnabled: true }, claim);
    const f = fakeTransport();
    const r = await runCommSyncForOrg(sb, ORG, { transport: f.t, now: () => new Date("2026-10-13T10:00:00Z") });
    expect(r).toMatchObject({ mode: "APP_PASSWORD", connected: true, receiving: true, sent: 2, failed: 0 });
    expect(f.sent).toHaveLength(2);

    expect(f.sent.map((s) => s.to)).toEqual(["anna.verdi@example.org", "paolo.bianchi@example.org"]);
    // nobody sees the other recipients
    expect(f.sent[0]?.rawNoBcc).not.toContain("paolo.bianchi@example.org");
    expect(f.sent[1]?.rawNoBcc).not.toContain("anna.verdi@example.org");
    // Bcc (the sender's own copy) only in the SMTP envelope
    expect(f.sent[1]?.bcc).toEqual(["giulia.ferri@example.org"]);
    expect(f.sent[1]?.rawNoBcc).not.toMatch(/^Bcc:/m);
    expect(f.sent[1]?.raw).toMatch(/^Bcc: giulia\.ferri@example\.org/m);

    const parsed = await simpleParser(Buffer.from(f.sent[0]?.rawNoBcc ?? "", "utf8"));
    expect(parsed.subject).toBe("Quote ottobre [SCD-1A2B3C]");
    expect(parsed.from?.text).toBe('"S.C.D. ColicoDerviese" <sportclubcolico@gmail.com>');
    expect(parsed.replyTo?.text).toBe('"S.C.D. ColicoDerviese" <sportclubcolico@gmail.com>');
    expect(parsed.headers.get("x-scd-thread")).toBe(THREAD);
    expect(parsed.messageId).toBe(`<scd-${claim.items[0]?.recipientId}@colicoderviese.app>`);
    expect(parsed.text).toContain("Giulia Ferri · Tesoreria");
    expect(String(parsed.html)).toContain("Promemoria quote.");

    const marks = calls.filter((c) => c.name === "scd_comm_mark_delivery").map((c) => c.args);
    expect(marks.map((m) => [m["p_ok"], m["p_rfc_message_id"], m["p_gmail_message_id"]])).toEqual([
      [true, `scd-${claim.items[0]?.recipientId}@colicoderviese.app`, null],
      [true, `scd-${claim.items[1]?.recipientId}@colicoderviese.app`, null],
    ]);
    expect(calls.find((c) => c.name === "scd_comm_outbox_claim")?.args).toMatchObject({ p_max: 50 });
    expect(f.closed()).toBe(1);
  });

  it("respects the daily cap: sends only what the claim hands out and stops on Gmail's daily limit, releasing the rest", async () => {
    const claim = { room: 3, stillQueued: 7, items: [item(1, "a@example.org"), item(2, "b@example.org"), item(3, "c@example.org")] };
    const { sb, calls, tableCalls } = fakeSb({ mailbox: MAILBOX, historyId: "imap:7:100", sendingEnabled: true }, claim, {
      scd_comm_recipients: [{ id: claim.items[2]?.recipientId }],
    });
    const f = fakeTransport({ sendErrors: [null, new TransportError("DAILY_LIMIT")] });
    const r = await runCommSyncForOrg(sb, ORG, { transport: f.t, batchMax: 3 });
    expect(r).toMatchObject({ sent: 1, failed: 1, code: "DAILY_LIMIT", stillQueued: 8 });
    expect(f.sent).toHaveLength(1);
    expect(calls.filter((c) => c.name === "scd_comm_mark_delivery").map((c) => [c.args["p_ok"], c.args["p_error"]])).toEqual([
      [true, null],
      [false, "DAILY_LIMIT"],
    ]);
    const release = tableCalls.find((t) => t.table === "scd_comm_recipients");
    expect(release?.ops).toContainEqual(["update", [{ status: "QUEUED", claimed_at: null }]]);
    expect(release?.ops).toContainEqual(["in", ["id", [claim.items[2]?.recipientId]]]);
    expect(release?.ops).toContainEqual(["eq", ["status", "SENDING"]]);
  });

  it("never sends from the verification (skipOutbound) nor while the switch is off", async () => {
    const claim = { room: 50, items: [item(1, "a@example.org")] };
    for (const [opts, enabled] of [[{ skipOutbound: true }, true], [{}, false]] as const) {
      const { sb, calls } = fakeSb({ mailbox: MAILBOX, historyId: "imap:7:100", sendingEnabled: enabled }, claim);
      const f = fakeTransport();
      const r = await runCommSyncForOrg(sb, ORG, { transport: f.t, ...opts });
      expect(r.sent).toBe(0);
      expect(f.sent).toEqual([]);
      expect(calls.some((c) => c.name === "scd_comm_outbox_claim")).toBe(false);
      expect(calls.at(-1)).toMatchObject({ name: "scd_comm_sync_checkpoint", args: { p_connected: true } });
    }
  });

  it("keeps receiving but marks the mailbox not connected (sending off) when the SMTP port is blocked", async () => {
    const { sb, calls } = fakeSb({ mailbox: MAILBOX, historyId: "imap:7:100", sendingEnabled: true }, { room: 50, items: [item(1, "a@example.org")] });
    const f = fakeTransport({ open: { account: MAILBOX, canSend: false, sendCode: "SMTP_PORT_BLOCKED" }, batch: { cursor: "imap:7:101", messages: [inbound()], skipped: 0, reset: false } });
    const r = await runCommSyncForOrg(sb, ORG, { transport: f.t });
    expect(r).toMatchObject({ connected: false, receiving: true, received: 1, sent: 0, code: "SMTP_PORT_BLOCKED" });
    expect(calls.some((c) => c.name === "scd_comm_outbox_claim")).toBe(false);
    expect(calls.at(-1)).toMatchObject({ name: "scd_comm_sync_checkpoint", args: { p_connected: false, p_history_id: "imap:7:101" } });
  });

  it("refuses an app password of another mailbox and records why, without secrets", async () => {
    const { sb, calls } = fakeSb({ mailbox: MAILBOX, historyId: null, sendingEnabled: true });
    const r = await runCommSyncForOrg(sb, ORG, { transport: fakeTransport({ open: { account: "other@gmail.com", canSend: true, sendCode: null } }).t });
    expect(r).toMatchObject({ connected: false, code: "WRONG_ACCOUNT" });
    const bad = fakeSb({ mailbox: MAILBOX, historyId: null, sendingEnabled: true });
    const r2 = await runCommSyncForOrg(bad.sb, ORG, { transport: fakeTransport({ open: new TransportError("APP_PASSWORD_WRONG") }).t });
    expect(r2.code).toBe("APP_PASSWORD_WRONG");
    expect(bad.calls.at(-1)?.args).toMatchObject({ p_connected: false, p_result: { code: "APP_PASSWORD_WRONG", mode: "APP_PASSWORD" } });
    expect(JSON.stringify([calls, bad.calls])).not.toContain("abcdefghijklmnop");
  });

  it("matches a reply through References when In-Reply-To is not ours, and strips the helper fields", async () => {
    const { sb, calls } = fakeSb({ mailbox: MAILBOX, historyId: "imap:7:100", sendingEnabled: false });
    const msg = inbound({ subject: "Re: Quote ottobre [SCD-1A2B3C]", inReplyTo: "CAF2@mail.gmail.com", references: [OURS, "CAF2@mail.gmail.com"] });
    await runCommSyncForOrg(sb, ORG, { transport: fakeTransport({ batch: { cursor: "imap:7:101", messages: [msg], skipped: 0, reset: false } }).t });
    const p = calls.find((c) => c.name === "scd_comm_record_inbound")?.args["p_payload"] as Record<string, unknown>;
    expect(p["inReplyTo"]).toBe(OURS);
    expect(p).not.toHaveProperty("references");
    expect(p["subject"]).toBe("Re: Quote ottobre");
    expect(p).not.toHaveProperty("labels");
  });
});

describe("reply matching by subject tag", () => {
  it("finds the thread of the tag and answers with its latest envelope Message-ID", async () => {
    const { sb, tableCalls } = fakeSb({}, {}, {
      scd_comm_threads: [{ id: THREAD }],
      scd_comm_messages: [{ id: "m1" }],
      scd_comm_recipients: [{ rfc_message_id: OURS }],
    });
    const target = await resolveReplyTarget(sb, ORG, inbound({ subject: "Re: Quote ottobre [SCD-1A2B3C]" }));
    expect(target).toBe(OURS);
    expect(tableCalls[0]?.ops).toContainEqual(["gte", ["id", "1a2b3c00-0000-0000-0000-000000000000"]]);
    expect(tableCalls[0]?.ops).toContainEqual(["lte", ["id", "1a2b3cff-ffff-ffff-ffff-ffffffffffff"]]);
    expect(tableCalls[0]?.ops).toContainEqual(["eq", ["organization_id", ORG]]);
  });

  it("does not guess when the tag is ambiguous or absent", async () => {
    const two = fakeSb({}, {}, { scd_comm_threads: [{ id: THREAD }, { id: "1a2b3c99-0000-4000-8000-000000000002" }] });
    expect(await resolveReplyTarget(two.sb, ORG, inbound({ subject: "Re: x [SCD-1A2B3C]" }))).toBeNull();
    const none = fakeSb({});
    expect(await resolveReplyTarget(none.sb, ORG, inbound({ subject: "Domanda" }))).toBeNull();
    expect(none.tableCalls).toEqual([]);
  });

  it("releases nothing when there is nothing to release", async () => {
    const { sb, tableCalls } = fakeSb({});
    expect(await releaseClaims(sb, [])).toBe(0);
    expect(tableCalls).toEqual([]);
  });
});
