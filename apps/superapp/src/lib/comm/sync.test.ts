import type { SupabaseClient } from "@supabase/supabase-js";
import { simpleParser } from "mailparser";
import { describe, expect, it } from "vitest";

import { fromBase64Url } from "./rfc2822";
import { envelopeMessage, runCommSyncForOrg, syncSecretMatches } from "./sync.server";

const ORG = "00000000-0000-0000-0000-0000000000a1";
const ENV = { SCD_GMAIL_CLIENT_ID: "cid", SCD_GMAIL_CLIENT_SECRET: "csecret", SCD_GMAIL_REFRESH_TOKEN: "rtoken" };
const b64url = (s: string) => Buffer.from(s, "utf8").toString("base64url");

type Call = { name: string; args: Record<string, unknown> };

function fakeSb(state: Record<string, unknown>, claim: unknown = { items: [] }) {
  const calls: Call[] = [];
  const sb = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      if (name === "scd_comm_sync_state") return { data: state, error: null };
      if (name === "scd_comm_outbox_claim") return { data: claim, error: null };
      if (name === "scd_comm_record_inbound") return { data: { ok: true, match: "PERSON" }, error: null };
      return { data: { ok: true }, error: null };
    },
  } as unknown as SupabaseClient;
  return { sb, calls };
}

interface FakeGmail {
  profileEmail?: string;
  tokenStatus?: number;
  history?: { ids: string[]; historyId: string } | "expired";
  messages?: Record<string, unknown>;
  sendStatus?: number[];
}

function fakeFetch(g: FakeGmail) {
  const sent: Array<{ raw: string; threadId?: string }> = [];
  const urls: string[] = [];
  let sendIdx = 0;
  const fn = async (url: string, init?: RequestInit): Promise<Response> => {
    urls.push(url);
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    if (url.startsWith("https://oauth2.googleapis.com/token")) {
      expect(String(init?.body)).toContain("grant_type=refresh_token");
      return g.tokenStatus && g.tokenStatus !== 200 ? json(g.tokenStatus, { error: "invalid_grant", detail: "rtoken" }) : json(200, { access_token: "ya29.secret-access" });
    }
    expect((init?.headers as Record<string, string>)["Authorization"]).toBe("Bearer ya29.secret-access");
    if (url.endsWith("/profile")) return json(200, { emailAddress: g.profileEmail ?? "sportclubcolico@gmail.com", historyId: "5000" });
    if (url.includes("/history?")) {
      if (g.history === "expired") return json(404, {});
      return json(200, { history: (g.history?.ids ?? []).map((id) => ({ messagesAdded: [{ message: { id } }] })), historyId: g.history?.historyId ?? "5001" });
    }
    const m = /\/messages\/([A-Za-z0-9_-]+)\?format=full$/.exec(url);
    if (m) return json(200, g.messages?.[m[1] ?? ""] ?? {});
    if (url.endsWith("/messages/send")) {
      const status = g.sendStatus?.[sendIdx++] ?? 200;
      const body = JSON.parse(String(init?.body)) as { raw: string; threadId?: string };
      if (status !== 200) return json(status, {});
      sent.push(body.threadId ? { raw: fromBase64Url(body.raw).toString("utf8"), threadId: body.threadId } : { raw: fromBase64Url(body.raw).toString("utf8") });
      return json(200, { id: `sent-${sent.length}`, threadId: body.threadId ?? `thr-${sent.length}` });
    }
    return json(500, {});
  };
  return { fn, sent, urls };
}

const inboxMsg = (id: string, labels: string[], from = "anna.verdi@example.org") => ({
  id,
  threadId: `t-${id}`,
  labelIds: labels,
  internalDate: "1792000000000",
  payload: { mimeType: "text/plain", headers: [{ name: "From", value: from }, { name: "Subject", value: "Re: Quote" }], body: { data: b64url("Pagato") } },
});

describe("comm-sync", () => {
  it("does nothing but record 'not connected' without credentials", async () => {
    const { sb, calls } = fakeSb({ mailbox: "sportclubcolico@gmail.com", historyId: null, sendingEnabled: true });
    const f = fakeFetch({});
    const r = await runCommSyncForOrg(sb, ORG, { env: {}, fetchImpl: f.fn });
    expect(r).toMatchObject({ connected: false, code: "NOT_CONFIGURED", sent: 0 });
    expect(f.urls).toEqual([]);
    expect(calls.find((c) => c.name === "scd_comm_sync_checkpoint")?.args).toMatchObject({ p_connected: false });
    expect(calls.some((c) => c.name === "scd_comm_outbox_claim")).toBe(false);
  });

  it("refuses a token for another mailbox and never sends", async () => {
    const { sb, calls } = fakeSb({ mailbox: "sportclubcolico@gmail.com", historyId: "1", sendingEnabled: true });
    const f = fakeFetch({ profileEmail: "someone.else@gmail.com" });
    const r = await runCommSyncForOrg(sb, ORG, { env: ENV, fetchImpl: f.fn });
    expect(r).toMatchObject({ connected: false, code: "WRONG_ACCOUNT" });
    expect(f.sent).toEqual([]);
    expect(calls.some((c) => c.name === "scd_comm_outbox_claim")).toBe(false);
  });

  it("reports a refused token without echoing any secret", async () => {
    const { sb, calls } = fakeSb({ mailbox: "sportclubcolico@gmail.com", historyId: "1", sendingEnabled: true });
    const r = await runCommSyncForOrg(sb, ORG, { env: ENV, fetchImpl: fakeFetch({ tokenStatus: 400 }).fn });
    expect(r.code).toBe("TOKEN_REFUSED");
    const dump = JSON.stringify({ r, calls });
    for (const secret of ["rtoken", "csecret", "ya29"]) expect(dump).not.toContain(secret);
  });

  it("first run only stores the history cursor and sends nothing while sending is off", async () => {
    const { sb, calls } = fakeSb({ mailbox: "sportclubcolico@gmail.com", historyId: null, sendingEnabled: false });
    const f = fakeFetch({});
    const r = await runCommSyncForOrg(sb, ORG, { env: ENV, fetchImpl: f.fn });
    expect(r).toMatchObject({ connected: true, received: 0, sent: 0 });
    expect(f.urls.some((u) => u.includes("/history"))).toBe(false);
    expect(calls.some((c) => c.name === "scd_comm_outbox_claim")).toBe(false);
    expect(calls.find((c) => c.name === "scd_comm_sync_checkpoint")?.args).toMatchObject({ p_connected: true, p_history_id: "5000" });
  });

  it("imports inbox mail, sends the claimed envelopes and stops on rate limit", async () => {
    const claim = {
      room: 3,
      stillQueued: 4,
      items: [
        { recipientId: "r1", messageId: "m1", to: "anna.verdi@example.org", cc: [], bcc: ["giulia.ferri@example.org"], subject: "Quote ottobre", body: "Promemoria", office: "TESORERIA", senderName: "Giulia Ferri", gmailThreadId: "t-in1", inReplyTo: "CAF1@mail.gmail.com" },
        { recipientId: "r2", messageId: "m1", to: "teen2@example.org", cc: ["anna.verdi@example.org"], bcc: [], subject: "Quote ottobre", body: "Promemoria", office: "TESORERIA", senderName: "Giulia Ferri", gmailThreadId: null, inReplyTo: null },
        { recipientId: "r3", messageId: "m1", to: "paolo.bianchi@example.org", cc: [], bcc: [], subject: "Quote ottobre", body: "Promemoria", office: "TESORERIA", senderName: "Giulia Ferri", gmailThreadId: null, inReplyTo: null },
      ],
    };
    const { sb, calls } = fakeSb({ mailbox: "sportclubcolico@gmail.com", historyId: "4000", sendingEnabled: true }, claim);
    const f = fakeFetch({
      history: { ids: ["in1aaaaa", "sent1aaa"], historyId: "4100" },
      messages: { in1aaaaa: inboxMsg("in1aaaaa", ["INBOX"]), sent1aaa: inboxMsg("sent1aaa", ["SENT"], "sportclubcolico@gmail.com") },
      sendStatus: [200, 200, 429],
    });
    const r = await runCommSyncForOrg(sb, ORG, { env: ENV, fetchImpl: f.fn, now: () => new Date("2026-10-13T10:00:00Z") });
    expect(r).toMatchObject({ connected: true, received: 1, skipped: 1, sent: 2, failed: 1, stillQueued: 4, capReached: true });

    const inbound = calls.filter((c) => c.name === "scd_comm_record_inbound");
    expect(inbound).toHaveLength(1);
    expect(inbound[0]?.args["p_payload"]).toMatchObject({ gmailMessageId: "in1aaaaa", from: "anna.verdi@example.org", bodyText: "Pagato" });
    expect(inbound[0]?.args["p_payload"]).not.toHaveProperty("labels");

    expect(f.sent).toHaveLength(2);
    expect(f.sent[0]?.threadId).toBe("t-in1");
    expect(f.sent[0]?.raw).toContain("From: \"S.C.D. ColicoDerviese\" <sportclubcolico@gmail.com>");
    expect(f.sent[0]?.raw).toContain("Reply-To: \"S.C.D. ColicoDerviese\" <sportclubcolico@gmail.com>");
    expect(f.sent[0]?.raw).toContain("Bcc: giulia.ferri@example.org");
    expect(f.sent[0]?.raw).toContain("In-Reply-To: <CAF1@mail.gmail.com>");
    expect(f.sent[0]?.raw).toContain("X-SCD-Message-Id: m1");
    expect(f.sent[1]?.raw).toContain("Cc: anna.verdi@example.org");

    const marks = calls.filter((c) => c.name === "scd_comm_mark_delivery").map((c) => [c.args["p_recipient_id"], c.args["p_ok"], c.args["p_error"]]);
    expect(marks).toEqual([["r1", true, null], ["r2", true, null], ["r3", false, "RATE_LIMITED"]]);
    expect(calls.at(-1)).toMatchObject({ name: "scd_comm_sync_checkpoint", args: { p_connected: true, p_history_id: "4100" } });
    expect(JSON.stringify(calls)).not.toContain("ya29");
  });

  it("resets the history cursor when Gmail says it expired", async () => {
    const { sb, calls } = fakeSb({ mailbox: "sportclubcolico@gmail.com", historyId: "1", sendingEnabled: false });
    const r = await runCommSyncForOrg(sb, ORG, { env: ENV, fetchImpl: fakeFetch({ history: "expired" }).fn });
    expect(r.code).toBe("HISTORY_RESET");
    expect(calls.at(-1)?.args).toMatchObject({ p_connected: true, p_history_id: "5000" });
  });

  it("signs each envelope with the staff member's name and office, in plain text and HTML", async () => {
    const raw = envelopeMessage(
      { recipientId: "r9", messageId: "m9", threadId: null, to: "a@b.it", cc: [], bcc: [], subject: "Ciao", body: "Testo", office: "SEGRETERIA", senderName: "Davide Conti", gmailThreadId: null, inReplyTo: null },
      "sportclubcolico@gmail.com",
      new Date("2026-10-13T10:00:00Z"),
    );
    const parsed = await simpleParser(Buffer.from(raw, "utf8"));
    expect(parsed.text).toContain("Davide Conti · Segreteria");
    expect(parsed.text).toContain("la risposta arriva alla società");
    expect(String(parsed.html)).toContain("Davide Conti · Segreteria");
  });
});

describe("cron secret", () => {
  const secret = "x".repeat(40);
  it("accepts only the exact bearer secret of at least 32 characters", () => {
    expect(syncSecretMatches(`Bearer ${secret}`, { SCD_COMM_SYNC_SECRET: secret })).toBe(true);
    expect(syncSecretMatches(`Bearer ${secret}y`, { SCD_COMM_SYNC_SECRET: secret })).toBe(false);
    expect(syncSecretMatches(null, { SCD_COMM_SYNC_SECRET: secret })).toBe(false);
    expect(syncSecretMatches("Bearer short", { SCD_COMM_SYNC_SECRET: "short" })).toBe(false);
  });
});
