import { describe, expect, it } from "vitest";

import {
  ageOn,
  capSummary,
  commError,
  filterThreads,
  isValidEmail,
  matchInboundAddress,
  parseEmailList,
  parseInbox,
  parseResolve,
  planDailyBatch,
  replyAudience,
  replySubject,
  resolveEnvelopes,
  signature,
  under14Addresses,
  type RuleContact,
  type RuleFamilyMember,
  type RulePerson,
  type ThreadSummary,
} from "./rules";

const TODAY = "2026-10-13";
const MAILBOX = "sportclubcolico@gmail.com";
const born = (years: number, monthDay = "01-01") => `${2026 - years}-${monthDay}`;

// Invented people: adults have realistic names, minors are codes.
const people: RulePerson[] = [
  { id: "a1", name: "Marco Rossi", birthDate: born(36), email: "marco.rossi@example.org", status: "ACTIVE", athlete: true, teamIds: [] },
  { id: "k1", name: "K1", birthDate: born(11), email: "kid1@example.org", status: "ACTIVE", athlete: true, teamIds: ["t1"] },
  { id: "g1", name: "Laura Bianchi", birthDate: null, email: "laura.bianchi@example.org", status: "ACTIVE", athlete: false },
  { id: "g2", name: "Paolo Bianchi", birthDate: born(46), email: "paolo.bianchi@example.org", status: "ACTIVE", athlete: false },
  { id: "k2", name: "K2", birthDate: born(16), email: "teen2@example.org", status: "ACTIVE", athlete: true, teamIds: ["t1"] },
  { id: "g3", name: "Anna Verdi", birthDate: born(44), email: "anna.verdi@example.org", status: "ACTIVE", athlete: false },
  { id: "k3", name: "K3", birthDate: born(15), email: null, status: "ACTIVE", athlete: true },
  { id: "k4", name: "K4", birthDate: born(10), email: "kid4@example.org", status: "ACTIVE", athlete: true },
  { id: "k5", name: "K5", birthDate: null, email: null, status: "ACTIVE", athlete: true },
  { id: "g4", name: "Sara Neri", birthDate: null, email: "sara.neri@example.org", status: "ACTIVE", athlete: false },
  { id: "k6", name: "K6", birthDate: null, email: "k6@example.org", status: "ACTIVE", athlete: true },
  { id: "k7", name: "K7", birthDate: born(12), email: "laura.bianchi@example.org", status: "ACTIVE", athlete: true },
  { id: "k8", name: "K8", birthDate: born(17), email: "teen8@example.org", status: "ACTIVE", athlete: true },
  { id: "g5", name: "Luca Gallo", birthDate: null, email: null, status: "ACTIVE", athlete: false },
  { id: "a2", name: "Elena Moro", birthDate: born(30), email: "elena.moro@example.org", status: "ACTIVE", athlete: true, optOut: true },
  { id: "a3", name: "Fabio Riva", birthDate: born(25), email: null, status: "ACTIVE", athlete: true },
  { id: "a4", name: "Ugo Sala", birthDate: born(50), email: "ugo.sala@example.org", status: "LEFT", athlete: true },
  { id: "k9", name: "K9", birthDate: born(9), email: "k9only@example.org", status: "ACTIVE", athlete: true },
];
const members: RuleFamilyMember[] = [
  { familyId: "f1", personId: "k1", isGuardian: false },
  { familyId: "f1", personId: "k7", isGuardian: false },
  { familyId: "f1", personId: "g1", isGuardian: true },
  { familyId: "f1", personId: "g2", isGuardian: true },
  { familyId: "f2", personId: "k2", isGuardian: false },
  { familyId: "f2", personId: "k3", isGuardian: false },
  { familyId: "f2", personId: "g3", isGuardian: true },
  { familyId: "f3", personId: "k5", isGuardian: false },
  { familyId: "f3", personId: "g4", isGuardian: true },
  { familyId: "f4", personId: "k8", isGuardian: false },
  { familyId: "f4", personId: "g5", isGuardian: true },
  { familyId: "f5", personId: "k9", isGuardian: false },
  { familyId: "f5", personId: "g2", isGuardian: true },
];
const contacts: RuleContact[] = [
  { id: "c1", email: "amministrazione@sponsor.example", label: "Sponsor Uno", kind: "SPONSOR", status: "COLLEGATO" },
  { id: "c2", email: "fatture@fornitore.example", label: "Fornitore Due", kind: "SUPPLIER", status: "COLLEGATO" },
  { id: "c3", email: "proposto@x.example", label: "Proposto", kind: "SUPPLIER", status: "PROPOSTO" },
  { id: "c4", email: "spam@x.example", label: "Scartato", kind: "EXTERNAL", status: "SCARTATO" },
];
const input = { people, members, contacts, mailbox: MAILBOX };
const emailsOf = (r: ReturnType<typeof resolveEnvelopes>) => r.envelopes.map((e) => e.email).sort();

describe("minors rule (mirror of scd_comm_resolve_envelopes)", () => {
  const all = resolveEnvelopes(input, { kind: "ALL_MEMBERS" }, TODAY);

  it("never writes to a child under 14, not even in copy", () => {
    for (const e of all.envelopes) {
      expect(e.email).not.toBe("kid1@example.org");
      expect(e.email).not.toBe("kid4@example.org");
      expect(e.email).not.toBe("k9only@example.org");
      expect(e.cc).not.toContain("kid1@example.org");
    }
  });

  it("writes to adults directly and to the guardians of minors", () => {
    expect(all.envelopes.find((e) => e.email === "marco.rossi@example.org")?.kind).toBe("DIRECT");
    expect(all.envelopes.find((e) => e.email === "laura.bianchi@example.org")?.kind).toBe("GUARDIAN");
    expect(all.envelopes.find((e) => e.email === "paolo.bianchi@example.org")?.kind).toBe("GUARDIAN");
    expect(all.envelopes.find((e) => e.email === "sara.neri@example.org")?.kind).toBe("GUARDIAN");
  });

  it("writes to a 14-17 athlete only with the guardians in copy", () => {
    const teen = all.envelopes.find((e) => e.email === "teen2@example.org");
    expect(teen?.kind).toBe("MINOR_WITH_GUARDIANS");
    expect(teen?.cc).toEqual(["anna.verdi@example.org"]);
    // 17-year-old whose only guardian has no address: not written to at all
    expect(all.envelopes.some((e) => e.email === "teen8@example.org")).toBe(false);
    for (const e of all.envelopes.filter((x) => x.kind === "MINOR_WITH_GUARDIANS")) expect(e.cc.length).toBeGreaterThan(0);
  });

  it("treats an unknown birth date as a minor", () => {
    expect(all.envelopes.some((e) => e.email === "k6@example.org")).toBe(false);
    expect(all.excluded["BIRTH_DATE_UNKNOWN_NO_GUARDIAN"]).toBe(1);
  });

  it("deduplicates addresses and counts the exclusions", () => {
    expect(all.envelopes.filter((e) => e.email === "laura.bianchi@example.org")).toHaveLength(1);
    expect(emailsOf(all)).toEqual([
      "anna.verdi@example.org",
      "laura.bianchi@example.org",
      "marco.rossi@example.org",
      "paolo.bianchi@example.org",
      "sara.neri@example.org",
      "teen2@example.org",
    ]);
    expect(all.excluded).toMatchObject({ OPT_OUT: 1, NO_EMAIL: 1, MINOR_NO_GUARDIAN: 2, BIRTH_DATE_UNKNOWN_NO_GUARDIAN: 1 });
  });

  it("matches the database result for a team", () => {
    expect(emailsOf(resolveEnvelopes(input, { kind: "TEAM", teamId: "t1" }, TODAY))).toEqual(["laura.bianchi@example.org", "paolo.bianchi@example.org", "teen2@example.org"]);
  });

  it("resolves a free address of a child to the guardians and refuses bad or club addresses", () => {
    const r = resolveEnvelopes(input, { kind: "FREE", emails: ["KID1@example.org", "nuovo@esterno.it", "bad", MAILBOX, "fatture@fornitore.example"] }, TODAY);
    expect(emailsOf(r)).toEqual(["fatture@fornitore.example", "laura.bianchi@example.org", "nuovo@esterno.it", "paolo.bianchi@example.org"]);
    expect(r.envelopes.find((e) => e.email === "fatture@fornitore.example")?.kind).toBe("CONTACT");
    expect(r.excluded).toMatchObject({ INVALID_EMAIL: 1, CLUB_MAILBOX: 1 });
  });

  it("uses only linked contacts for sponsors and suppliers", () => {
    expect(emailsOf(resolveEnvelopes(input, { kind: "SPONSORS" }, TODAY))).toEqual(["amministrazione@sponsor.example"]);
    expect(emailsOf(resolveEnvelopes(input, { kind: "SUPPLIERS" }, TODAY))).toEqual(["fatture@fornitore.example"]);
    expect(resolveEnvelopes(input, { kind: "CONTACT", contactId: "c4" }, TODAY).envelopes).toEqual([]);
  });

  it("writes to a whole family through the same rule", () => {
    expect(emailsOf(resolveEnvelopes(input, { kind: "FAMILY", familyId: "f1" }, TODAY))).toEqual(["laura.bianchi@example.org", "paolo.bianchi@example.org"]);
  });

  it("finds the addresses that belong only to children under 14", () => {
    expect([...under14Addresses(people, members, TODAY)].sort()).toEqual(["k9only@example.org", "kid1@example.org", "kid4@example.org"]);
  });

  it("computes the age on the day, birthday included", () => {
    expect(ageOn("2012-10-13", TODAY)).toBe(14);
    expect(ageOn("2012-10-14", TODAY)).toBe(13);
    expect(ageOn(null, TODAY)).toBeNull();
  });
});

describe("addresses", () => {
  it("validates and splits lists", () => {
    expect(isValidEmail(" Mario.Rossi@Example.org ")).toBe(true);
    expect(isValidEmail("mario@localhost")).toBe(false);
    expect(isValidEmail("a b@c.it")).toBe(false);
    expect(parseEmailList("a@b.it; C@D.it\n<e@f.it>, a@b.it")).toEqual(["a@b.it", "c@d.it", "e@f.it"]);
  });
});

describe("inbound matching (mirror of scd_comm_record_inbound)", () => {
  it("matches a person, a contact, a proposal, a discarded contact and our own mailbox", () => {
    expect(matchInboundAddress("Marco.Rossi@example.org", people, contacts, MAILBOX, TODAY)).toEqual({ kind: "PERSON", personId: "a1" });
    expect(matchInboundAddress("laura.bianchi@example.org", people, contacts, MAILBOX, TODAY)).toEqual({ kind: "PERSON", personId: "g1" });
    expect(matchInboundAddress("fatture@fornitore.example", people, contacts, MAILBOX, TODAY)).toEqual({ kind: "CONTACT", contactId: "c2", office: "TESORERIA" });
    expect(matchInboundAddress("amministrazione@sponsor.example", people, contacts, MAILBOX, TODAY)).toEqual({ kind: "CONTACT", contactId: "c1", office: "DIREZIONE" });
    expect(matchInboundAddress("proposto@x.example", people, contacts, MAILBOX, TODAY)).toEqual({ kind: "PROPOSED", contactId: "c3" });
    expect(matchInboundAddress("nuovo@esterno.it", people, contacts, MAILBOX, TODAY)).toEqual({ kind: "PROPOSED", contactId: null });
    expect(matchInboundAddress("spam@x.example", people, contacts, MAILBOX, TODAY)).toEqual({ kind: "DISCARDED", contactId: "c4" });
    expect(matchInboundAddress("SportClubColico@gmail.com", people, contacts, MAILBOX, TODAY)).toEqual({ kind: "OWN" });
    expect(matchInboundAddress("ugo.sala@example.org", people, contacts, MAILBOX, TODAY).kind).toBe("PROPOSED");
  });
});

describe("daily cap batching", () => {
  it("never exceeds the cap and defers the rest", () => {
    expect(planDailyBatch({ queued: 30, sentToday: 0, cap: 400, batchMax: 50 })).toEqual({ take: 30, roomAfter: 370, deferred: 0, capReached: false });
    expect(planDailyBatch({ queued: 120, sentToday: 0, cap: 400, batchMax: 50 })).toEqual({ take: 50, roomAfter: 350, deferred: 70, capReached: false });
    expect(planDailyBatch({ queued: 120, sentToday: 380, cap: 400, batchMax: 50 })).toEqual({ take: 20, roomAfter: 0, deferred: 100, capReached: true });
    expect(planDailyBatch({ queued: 5, sentToday: 400, cap: 400, batchMax: 50 })).toEqual({ take: 0, roomAfter: 0, deferred: 5, capReached: true });
    expect(planDailyBatch({ queued: 5, sentToday: 450, cap: 400, batchMax: 50 }).take).toBe(0);
  });

  it("explains the cap in plain words", () => {
    expect(capSummary({ sentToday: 120, cap: 400, queued: 0 })).toBe("Oggi inviate 120 su 400");
    expect(capSummary({ sentToday: 380, cap: 400, queued: 50 })).toContain("20 oggi, 30 da domani");
  });
});

describe("copy and payloads", () => {
  it("signs with the staff member and the office", () => {
    expect(signature("Giulia Ferri", "TESORERIA")).toContain("Giulia Ferri · Tesoreria");
    expect(signature(null, null)).toContain("Lo staff · Società");
  });

  it("explains the error codes", () => {
    expect(commError("SENDING_DISABLED")).toContain("Invio non ancora attivo");
    expect(commError("SAFEGUARDING_EXCLUDED")).toContain("safeguarding");
    expect(commError("whatever")).toContain("Riprova");
  });

  it("builds reply subject and audience", () => {
    expect(replySubject("Quote ottobre")).toBe("Re: Quote ottobre");
    expect(replySubject("RE: Quote")).toBe("RE: Quote");
    const a = replyAudience({
      audience: { kind: "ALL_MEMBERS" },
      messages: [
        { id: "m1", direction: "OUT", office: "TESORERIA", subject: "", body: "", from: null, fromName: null, to: [], cc: [], delivery: "SENT", audience: null, recipients: 3, attachments: 0, queuedAt: null, sentAt: null, receivedAt: null, createdAt: "", mine: true, senderName: "Giulia Ferri", status: {} },
        { id: "m2", direction: "IN", office: null, subject: "", body: "", from: "Anna.Verdi@example.org", fromName: "Anna Verdi", to: [], cc: [], delivery: null, audience: null, recipients: 0, attachments: 0, queuedAt: null, sentAt: null, receivedAt: null, createdAt: "", mine: false, senderName: null, status: {} },
      ],
    });
    expect(a).toEqual({ kind: "FREE", emails: ["anna.verdi@example.org"], label: "Anna Verdi" });
  });

  it("parses the inbox and filters threads", () => {
    const inbox = parseInbox({
      me: "u1",
      offices: ["TESORERIA", "BOGUS"],
      settings: { mailbox: MAILBOX, sendingEnabled: false, gmailConnected: false, dailyCap: 400, sentToday: 0, queued: 0 },
      threads: [
        { id: "t1", subject: "Quote", confidentiality: "RISERVATO", office: "TESORERIA", status: "APERTO", unread: true, drafts: 1, lastMessageAt: "2026-10-13T08:00:00Z", counterpartLabel: "Tutti i tesserati" },
        { id: "t2", subject: "Campo", confidentiality: "ORDINARIO", office: "SEGRETERIA", status: "CHIUSO", unread: false, drafts: 0, lastMessageAt: "2026-10-12T08:00:00Z" },
      ],
      proposals: [{ id: "c1", email: "x@y.it", messages: 2 }],
    });
    expect(inbox?.offices).toEqual(["TESORERIA"]);
    const t = inbox?.threads ?? ([] as ThreadSummary[]);
    expect(filterThreads(t, "non-lette", "TUTTI", "").map((x) => x.id)).toEqual(["t1"]);
    expect(filterThreads(t, "tutte", "SEGRETERIA", "").map((x) => x.id)).toEqual(["t2"]);
    expect(filterThreads(t, "riservate", "TUTTI", "").map((x) => x.id)).toEqual(["t1"]);
    expect(filterThreads(t, "bozze", "TUTTI", "").map((x) => x.id)).toEqual(["t1"]);
    expect(filterThreads(t, "tutte", "TUTTI", "tesserati").map((x) => x.id)).toEqual(["t1"]);
    expect(parseInbox(null)).toBeNull();
  });

  it("parses a resolve preview and refuses an error payload", () => {
    expect(parseResolve({ ok: false, code: "NOT_ALLOWED" })).toBeNull();
    const p = parseResolve({ ok: true, total: 1, recipients: [{ email: "a@b.it", cc: [], kind: "DIRECT", label: "A" }], excluded: { OPT_OUT: 2 } });
    expect(p?.recipients[0]?.kind).toBe("DIRECT");
    expect(p?.excluded).toEqual({ OPT_OUT: 2 });
  });
});
