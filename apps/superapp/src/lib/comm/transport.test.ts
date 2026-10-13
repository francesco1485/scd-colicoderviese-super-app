import { describe, expect, it } from "vitest";

import {
  TRANSPORT_MESSAGE,
  appPasswordEnv,
  encodeImapCursor,
  extractThreadTag,
  gmailHexId,
  htmlFromText,
  isHistoryId,
  isOurMessageId,
  looksLikeAppPassword,
  mapImapError,
  mapSmtpError,
  parseImapCursor,
  replyReference,
  selectTransportMode,
  smtpRetrySafe,
  splitMessageIds,
  stopsRun,
  stripThreadTag,
  tagUuidRange,
  taggedSubject,
  threadTag,
} from "./transport";

const OAUTH = { SCD_GMAIL_CLIENT_ID: "cid", SCD_GMAIL_CLIENT_SECRET: "cs", SCD_GMAIL_REFRESH_TOKEN: "rt" };
const APP = { SCD_GMAIL_APP_PASSWORD: "abcd efgh ijkl mnop" };
const THREAD = "1a2b3c4d-0000-4000-8000-000000000001";

describe("transport selection", () => {
  it("prefers OAuth, then the app password, else stays disabled", () => {
    expect(selectTransportMode({ ...OAUTH, ...APP })).toBe("OAUTH");
    expect(selectTransportMode(APP)).toBe("APP_PASSWORD");
    expect(selectTransportMode({})).toBe("DISABLED");
    expect(selectTransportMode({ SCD_GMAIL_CLIENT_ID: "cid", ...APP })).toBe("APP_PASSWORD");
    expect(selectTransportMode({ SCD_GMAIL_APP_PASSWORD: "   " })).toBe("DISABLED");
  });

  it("reads the app password without the spaces Google shows and defaults the user to the club mailbox", () => {
    expect(appPasswordEnv(APP)).toEqual({ user: "sportclubcolico@gmail.com", password: "abcdefghijklmnop" });
    expect(appPasswordEnv({ ...APP, SCD_GMAIL_USER: " SportClubColico@Gmail.com " })?.user).toBe("sportclubcolico@gmail.com");
    expect(appPasswordEnv({})).toBeNull();
  });

  it("recognises the 16-letter shape of an app password", () => {
    expect(looksLikeAppPassword("abcd efgh ijkl mnop")).toBe(true);
    expect(looksLikeAppPassword("Calcio2026!")).toBe(false);
    expect(looksLikeAppPassword("abcdefghijklmno")).toBe(false);
  });
});

describe("reply matching", () => {
  it("tags subjects once with the thread and reads the tag back", () => {
    expect(threadTag(THREAD)).toBe("SCD-1A2B3C");
    expect(threadTag("not-a-uuid")).toBeNull();
    const s = taggedSubject("Quote ottobre", THREAD);
    expect(s).toBe("Quote ottobre [SCD-1A2B3C]");
    expect(taggedSubject(`Re: ${s}`, THREAD)).toBe("Re: Quote ottobre [SCD-1A2B3C]");
    expect(taggedSubject("Senza conversazione", null)).toBe("Senza conversazione");
    expect(extractThreadTag("R: Re: Quote ottobre [scd-1a2b3c]")).toBe("1a2b3c");
    expect(extractThreadTag("Quote ottobre")).toBeNull();
    expect(stripThreadTag("Re: Quote ottobre [SCD-1A2B3C]")).toBe("Re: Quote ottobre");
    expect(tagUuidRange("1a2b3c")).toEqual({ lo: "1a2b3c00-0000-0000-0000-000000000000", hi: "1a2b3cff-ffff-ffff-ffff-ffffffffffff" });
    expect(tagUuidRange("zz")).toBeNull();
  });

  it("finds our Message-ID in In-Reply-To or, failing that, in References", () => {
    const ours = "scd-0f8fad5b-d9cb-469f-a165-70867728950e@colicoderviese.app";
    expect(isOurMessageId(`<${ours}>`)).toBe(true);
    expect(isOurMessageId("CAF1@mail.gmail.com")).toBe(false);
    expect(replyReference(ours, [])).toBe(ours);
    expect(replyReference("CAF2@mail.gmail.com", ["CAF0@x.it", ours, "CAF1@x.it"])).toBe(ours);
    expect(replyReference("CAF2@mail.gmail.com", ["CAF0@x.it"])).toBeNull();
    expect(replyReference(null, null)).toBeNull();
    expect(splitMessageIds("<a@x.it> <b@y.it>")).toEqual(["a@x.it", "b@y.it"]);
    expect(splitMessageIds(["<a@x.it>", "b@y.it"])).toEqual(["a@x.it", "b@y.it"]);
  });

  it("converts Gmail IMAP ids to the Gmail API hex ids and keeps the IMAP read point apart from history ids", () => {
    expect(gmailHexId("1278455344230334865")).toBe(BigInt("1278455344230334865").toString(16));
    expect(gmailHexId("abc")).toBeNull();
    expect(gmailHexId(undefined)).toBeNull();
    const c = encodeImapCursor({ uidValidity: "11", lastUid: 4021 });
    expect(c).toBe("imap:11:4021");
    expect(parseImapCursor(c)).toEqual({ uidValidity: "11", lastUid: 4021 });
    expect(parseImapCursor("5000")).toBeNull();
    expect(isHistoryId("5000")).toBe(true);
    expect(isHistoryId(c)).toBe(false);
  });
});

describe("error mapping", () => {
  it("maps Gmail SMTP answers to plain causes", () => {
    expect(mapSmtpError({ code: "EAUTH", responseCode: 535, response: "535-5.7.8 Username and Password not accepted. BadCredentials" })).toBe("APP_PASSWORD_WRONG");
    expect(mapSmtpError({ code: "EAUTH", responseCode: 534, response: "534-5.7.9 Application-specific password required." })).toBe("NORMAL_PASSWORD_USED");
    expect(mapSmtpError({ code: "EAUTH", responseCode: 534, response: "534-5.7.14 Please log in via your web browser" })).toBe("TWO_STEP_OFF");
    expect(mapSmtpError({ code: "ETIMEDOUT", command: "CONN" })).toBe("SMTP_PORT_BLOCKED");
    expect(mapSmtpError({ code: "ECONNECTION" })).toBe("SMTP_PORT_BLOCKED");
    expect(mapSmtpError({ code: "ECONNREFUSED" })).toBe("SMTP_PORT_BLOCKED");
    expect(mapSmtpError({ code: "ETIMEDOUT", command: "DATA" })).toBe("TIMEOUT");
    expect(mapSmtpError({ code: "EMESSAGE", responseCode: 550, response: "550 5.4.5 Daily user sending limit exceeded" })).toBe("DAILY_LIMIT");
    expect(mapSmtpError({ code: "EMESSAGE", responseCode: 421, response: "421 4.7.0 Try again later" })).toBe("RATE_LIMITED");
    expect(mapSmtpError({ code: "EENVELOPE", responseCode: 550, response: "550 5.1.1 The email account does not exist" })).toBe("RECIPIENT_REJECTED");
    expect(mapSmtpError({ code: "EMESSAGE", responseCode: 451, response: "451 4.3.0 Temporary" })).toBe("TEMPORARY");
    expect(mapSmtpError({ code: "EDNS" })).toBe("NETWORK");
    expect(mapSmtpError(null)).toBe("SEND_FAILED");
  });

  it("maps IMAP login failures the same way", () => {
    expect(mapImapError({ authenticationFailed: true, serverResponseCode: "AUTHENTICATIONFAILED", response: "Invalid credentials (Failure)" })).toBe("APP_PASSWORD_WRONG");
    expect(mapImapError({ authenticationFailed: true, response: "[ALERT] Application-specific password required" })).toBe("NORMAL_PASSWORD_USED");
    expect(mapImapError({ authenticationFailed: true, response: "[ALERT] Please log in via your web browser" })).toBe("TWO_STEP_OFF");
    expect(mapImapError({ code: "CONNECT_TIMEOUT" })).toBe("IMAP_UNREACHABLE");
    expect(mapImapError({ code: "ENOTFOUND" })).toBe("NETWORK");
  });

  it("retries only when the server certainly refused the message", () => {
    expect(smtpRetrySafe({ responseCode: 451, response: "451 4.3.0 Mail server temporarily rejected message" })).toBe(true);
    expect(smtpRetrySafe({ code: "ECONNECTION", command: "CONN" })).toBe(true);
    expect(smtpRetrySafe({ code: "ETIMEDOUT", command: "DATA" })).toBe(false);
    expect(smtpRetrySafe({ responseCode: 550, response: "550 5.4.5 Daily user sending limit exceeded" })).toBe(false);
    expect(smtpRetrySafe({ responseCode: 421, response: "421 4.7.0 Try again later" })).toBe(false);
  });

  it("stops a run on limits and refused credentials, not on one bad address", () => {
    for (const c of ["RATE_LIMITED", "DAILY_LIMIT", "APP_PASSWORD_WRONG", "SMTP_PORT_BLOCKED", "TOKEN_REFUSED"]) expect(stopsRun(c)).toBe(true);
    for (const c of ["RECIPIENT_REJECTED", "TEMPORARY", "TIMEOUT"]) expect(stopsRun(c)).toBe(false);
  });

  it("explains the causes in plain Italian for the Direzione", () => {
    expect(TRANSPORT_MESSAGE.APP_PASSWORD_WRONG.toLowerCase()).toContain("password per app errata");
    expect(TRANSPORT_MESSAGE.TWO_STEP_OFF.toLowerCase()).toContain("verifica in due passaggi non attiva");
    expect(TRANSPORT_MESSAGE.SMTP_PORT_BLOCKED).toContain("Porta SMTP bloccata dal server");
    expect(TRANSPORT_MESSAGE.SMTP_PORT_BLOCKED).toContain("piano a pagamento Render");
  });
});

describe("HTML alternative", () => {
  it("escapes the text, keeps paragraphs and puts the signature in the footer", () => {
    const html = htmlFromText("Ciao <b>tutti</b>\nriga due\n\nVedi https://colicoderviese.app/calendario.\n\n--\nGiulia · Tesoreria");
    expect(html).toContain("Ciao &lt;b&gt;tutti&lt;/b&gt;<br>riga due");
    expect(html).toContain('<a href="https://colicoderviese.app/calendario"');
    expect(html).toContain("Giulia · Tesoreria");
    expect(html).not.toContain("<b>tutti</b>");
    expect(html).not.toMatch(/<img/i);
  });
});
