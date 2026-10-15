import { describe, expect, it } from "vitest";

import {
  REQUEST_CONFIRMERS,
  REQUEST_TEAMS,
  confirmBy,
  confirmationExpiry,
  confirmerFor,
  confirmerLine,
  daysLeft,
  daysLeftLabel,
  dbConfirmerPositions,
  easterSunday,
  formValues,
  friendlyEmailDraft,
  hasRequestRole,
  isWorkingDay,
  mayConfirm,
  mergeConfirmedFriendlies,
  missingConfirmerPositions,
  missingToSend,
  nextFormStatus,
  nextStatus,
  noticeDeadline,
  parseRequestRows,
  publicLocation,
  redactContacts,
  seesEverything,
  toRequestRow,
  validateDraft,
  workingDaysBefore,
  type RequestRow,
} from "./request-machine";
import type { PublicEvent } from "./public-snapshots";

const NOW = Date.parse("2026-10-15T13:07:00Z");

const row = (over: Partial<RequestRow> = {}): RequestRow => ({
  id: "11111111-1111-1111-1111-111111111111",
  kind: "AMICHEVOLE",
  channel: "WHATSAPP",
  rawText: null,
  teamKey: "u15",
  startsAt: "2026-10-24T13:00:00.000Z",
  venue: "Colico",
  homeAway: "CASA",
  scope: "REGIONALE",
  note: null,
  opponentText: "Olginatese",
  status: "DA_CONFERMARE",
  expiresAt: "2026-10-24T13:00:00.000Z",
  sentAt: "2026-10-15T13:00:00.000Z",
  confirmedAt: null,
  decisionNote: null,
  eventId: null,
  formStatus: null,
  createdAt: "2026-10-15T13:00:00.000Z",
  club: { id: "c", name: "Olginatese", city: "Olginate", province: "LC", figcMatricola: "123456", crestKey: null },
  ...over,
});

describe("who confirms (Francesco 15/10 15:17)", () => {
  it("maps every requestable group to exactly one confirmer", () => {
    for (const t of REQUEST_TEAMS) {
      const hits = REQUEST_CONFIRMERS.filter((r) => r.groups.includes(t.key));
      expect(hits, t.key).toHaveLength(1);
    }
    expect(confirmerFor("2015")?.id).toBe("attivita-base");
    expect(confirmerFor("piccoli")?.id).toBe("attivita-base");
    expect(confirmerFor("u16")?.id).toBe("ds-agonistica");
    expect(confirmerFor("u15")?.birthYears).toEqual([2011, 2013]);
    expect(confirmerFor("prima")?.id).toBe("ds-generale");
    expect(confirmerFor("u19")?.id).toBe("ds-generale");
    expect(confirmerFor("u99")).toBeNull();
  });

  it("never uses positions missing from the registry (only the Direzione confirms for those groups)", () => {
    expect(missingConfirmerPositions().map((r) => r.position).sort()).toEqual(["direttore-sportivo-agonistica", "direttore-sportivo-generale"]);
    expect(dbConfirmerPositions("pulcini")).toEqual(["responsabile-attivita-base"]);
    expect(dbConfirmerPositions("u15")).toEqual([]);
    expect(dbConfirmerPositions("x")).toBeNull();
    expect(confirmerLine("u15")).toMatch(/Direzione/);
    expect(confirmerLine("2014")).toMatch(/Responsabile Attività di Base/);
  });

  it("gives the UI the same answer as the database rules", () => {
    const rab = new Set(["responsabile-attivita-base"]);
    expect(mayConfirm(rab, "2015")).toBe(true);
    expect(mayConfirm(rab, "u15")).toBe(false);
    expect(mayConfirm(new Set(["direzione"]), "prima")).toBe(true);
    expect(mayConfirm(new Set(["direttore-generale"]), "2015")).toBe(false);
    expect(mayConfirm(new Set(["dirigente-annata"]), "2015")).toBe(false);
    expect(seesEverything(new Set(["coordinatore-attivita-sportiva"]))).toBe(true);
    expect(seesEverything(rab)).toBe(false);
    expect(hasRequestRole(rab)).toBe(true);
    expect(hasRequestRole(new Set(["famiglia"]))).toBe(false);
  });
});

describe("status transitions and expiry", () => {
  it("allows only the documented moves", () => {
    expect(nextStatus("BOZZA", "INVIA")).toBe("DA_CONFERMARE");
    expect(nextStatus("DA_CONFERMARE", "CONFERMA")).toBe("CONFERMATA");
    expect(nextStatus("DA_CONFERMARE", "RIFIUTA")).toBe("RIFIUTATA");
    expect(nextStatus("DA_CONFERMARE", "SCADE")).toBe("SCADUTA");
    expect(nextStatus("BOZZA", "CONFERMA")).toBeNull();
    expect(nextStatus("CONFERMATA", "ANNULLA")).toBeNull();
    expect(nextStatus("SCADUTA", "CONFERMA")).toBeNull();
    expect(nextStatus("DA_CONFERMARE", "MODIFICA")).toBe("DA_CONFERMARE");
  });

  it("moves the federal form forward one step at a time", () => {
    expect(nextFormStatus("DA_PREPARARE")).toBe("PRONTO");
    expect(nextFormStatus("FIRMATO")).toBe("INVIATO");
    expect(nextFormStatus("INVIATO")).toBeNull();
    expect(nextFormStatus(null)).toBeNull();
  });

  it("gives 15 days, never after the match", () => {
    const sent = Date.parse("2026-10-15T10:00:00Z");
    expect(confirmationExpiry(sent, Date.parse("2026-12-01T10:00:00Z"))).toBe(sent + 15 * 86_400_000);
    expect(confirmationExpiry(sent, Date.parse("2026-10-18T10:00:00Z"))).toBe(Date.parse("2026-10-18T10:00:00Z"));
  });

  it("counts days left honestly", () => {
    expect(daysLeft("2026-10-30T13:07:00Z", NOW)).toBe(15);
    expect(daysLeft("2026-10-15T14:00:00Z", NOW)).toBe(1);
    expect(daysLeft("2026-10-10T00:00:00Z", NOW)).toBe(0);
    expect(daysLeft(null, NOW)).toBeNull();
    expect(daysLeftLabel(0)).toBe("scade oggi");
    expect(daysLeftLabel(null)).toBe("termine non noto");
  });
});

describe("drafts", () => {
  it("validates like the database", () => {
    const ok = validateDraft({ teamKey: "u15", date: "2026-10-24", time: "15:00", opponentText: " Olginatese ", homeAway: "CASA", scope: "REGIONALE" }, NOW);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value.startsAt).toBe("2026-10-24T13:00:00.000Z");
      expect(ok.value.opponentText).toBe("Olginatese");
    }
    const bad = validateDraft({ teamKey: "u99", date: "2026-01-01", time: "25:00" }, NOW);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(Object.keys(bad.errors).sort()).toEqual(["teamKey", "time"]);
    const past = validateDraft({ date: "2026-10-01", time: "10:00" }, NOW);
    expect(!past.ok && past.errors["date"]).toMatch(/passata/);
    const half = validateDraft({ date: "2026-10-24" }, NOW);
    expect(!half.ok && half.errors["time"]).toBeTruthy();
    const piccoli = validateDraft({ teamKey: "piccoli", scope: "NAZIONALE" }, NOW);
    expect(!piccoli.ok && piccoli.errors["scope"]).toMatch(/Piccoli/);
    expect(validateDraft({}, NOW).ok).toBe(true);
  });

  it("lists what is missing before sending", () => {
    expect(missingToSend({ teamKey: null, startsAt: null, opponentText: null, club: null })).toEqual(["squadra", "data e ora", "avversaria"]);
    expect(missingToSend(row())).toEqual([]);
  });

  it("drops malformed rows instead of guessing", () => {
    expect(parseRequestRows([{ id: "x" }, null, 3])).toEqual([]);
    expect(parseRequestRows("nope")).toEqual([]);
    const r = toRequestRow({ ...row(), club: null, scope: undefined });
    expect(r?.club).toBeNull();
    expect(r?.scope).toBeNull();
  });
});

describe("federal notice (CU n.1/n.5 SGS 2026/27)", () => {
  it("knows Italian working days", () => {
    expect(easterSunday(2027)).toBe("2027-03-28");
    expect(isWorkingDay("2026-10-17")).toBe(false); // Saturday
    expect(isWorkingDay("2026-11-02")).toBe(true);
    expect(isWorkingDay("2026-12-08")).toBe(false);
    expect(isWorkingDay("2027-03-29")).toBe(false); // Easter Monday
  });

  it("counts working days back from the match", () => {
    // Saturday 24/10: Fri 23, Thu 22, Wed 21.
    expect(workingDaysBefore("2026-10-24", 3)).toBe("2026-10-21");
    // Wednesday 09/12: Tue 8 is a holiday -> Mon 7, Fri 4, Thu 3.
    expect(workingDaysBefore("2026-12-09", 3)).toBe("2026-12-03");
  });

  it("applies the category and scope rules", () => {
    expect(noticeDeadline("2015", "REGIONALE", "2026-10-24")).toMatchObject({ workingDays: 3, deadline: "2026-10-21", status: "VERIFIED" });
    expect(noticeDeadline("u15", "LOCALE", "2026-10-24")).toMatchObject({ workingDays: 5, deadline: "2026-10-19" });
    expect(noticeDeadline("pulcini", "NAZIONALE", "2026-10-24").workingDays).toBe(5);
    expect(noticeDeadline("u16", "INTERNAZIONALE", "2026-12-19").workingDays).toBe(20);
    expect(noticeDeadline("2014", null, "2026-10-24").workingDays).toBe(3);
    expect(noticeDeadline("piccoli", "ESTERO", "2026-10-24").status).toBe("NOT_ALLOWED");
    const lnd = noticeDeadline("prima", "REGIONALE", "2026-10-24");
    expect(lnd).toMatchObject({ status: "UNVERIFIED", deadline: null });
    expect(lnd.text).toMatch(/da verificare/);
    expect(noticeDeadline(null, null, null).deadline).toBeNull();
  });

  it("confirms by the earlier of expiry and federal deadline", () => {
    const fed = noticeDeadline("u15", "REGIONALE", "2026-10-24");
    expect(confirmBy("2026-10-30T13:00:00Z", fed)).toEqual({ day: "2026-10-19", reason: "FEDERALE" });
    expect(confirmBy("2026-10-17T13:00:00Z", fed)).toEqual({ day: "2026-10-17", reason: "SCADENZA" });
    expect(confirmBy("2026-10-17T13:00:00Z", noticeDeadline("prima", null, "2026-10-24"))).toEqual({ day: "2026-10-17", reason: "SCADENZA" });
    expect(confirmBy(null, noticeDeadline("prima", null, null))).toEqual({ day: null, reason: null });
  });
});

describe("federal form and e-mail draft", () => {
  it("prefills only what is known and leaves personal data to the pen", () => {
    const v = Object.fromEntries(formValues(row()).map((f) => [f.key, f.value]));
    expect(v["club_federal_id"]).toBe("26020");
    expect(v["home_team"]).toMatch(/ColicoDerviese/);
    expect(v["away_team"]).toBe("Olginatese");
    expect(v["away_team_federal_id"]).toBe("123456");
    expect(v["match_date"]).toBe("24/10/2026");
    expect(v["kickoff_time"]).toBe("15:00");
    expect(v["category"]).toBe("Under 15 (2012-2013)");
    expect(v["match_level"]).toBe("Regionale");
    expect(v["safeguarding_officer"]).toBeNull();
    expect(v["organizer_manager"]).toBeNull();
    const unknown = Object.fromEntries(formValues(row({ homeAway: null, teamKey: "pulcini" })).map((f) => [f.key, f.value]));
    expect(unknown["home_team"]).toBeNull();
    expect(unknown["category"]).toBeNull();
  });

  it("builds a draft e-mail that names the match and is never sent", () => {
    const d = friendlyEmailDraft(row());
    expect(d.to).toBe("tornei.lombardia@lnd.it");
    expect(d.subject).toMatch(/U15/);
    expect(d.body).toMatch(/24\/10\/2026 alle 15:00/);
  });
});

describe("mergeConfirmedFriendlies", () => {
  const ev = (o: Partial<PublicEvent>): PublicEvent => ({
    id: "e", date: "2026-10-24", time: "15:00", group: "u15", category: "", type: "AMICHEVOLE", homeAway: "CASA",
    opponent: "OLGINATESE", venue: "", round: "", source: "SCD", status: "", isVariation: false, notice: [],
    timeConfirmed: true, venueConfirmed: true, facilityReview: false, ...o,
  });
  it("skips friendlies already in the master and keeps the order", () => {
    const out = mergeConfirmedFriendlies(
      [ev({ id: "m1" }), ev({ id: "m2", date: "2026-10-30" })],
      [ev({ id: "r1", opponent: "A.S.D. Olginatese" }), ev({ id: "r2", date: "2026-10-25", opponent: "Bellano" })],
    );
    expect(out.map((e) => e.id)).toEqual(["m1", "r2", "m2"]);
  });
});

describe("privacy of free text and public location (scd-sicurezza notes)", () => {
  it("redacts phone numbers and e-mails, keeps dates, times and birth years", () => {
    expect(redactContacts("chiama Marco 333 123 4567 o +39 0341-940123, scrivi a mister.rossi@example.it")).toBe(
      "chiama Marco [telefono] o [telefono], scrivi a [email]",
    );
    expect(redactContacts("amichevole 2014 2015 il 24/10/2026 ore 15:30 tel 3331234567")).toBe("amichevole 2014 2015 il 24/10/2026 ore 15:30 tel [telefono]");
    expect(redactContacts(null)).toBeNull();
  });

  it("publishes only a known facility or 'Trasferta' with the city", () => {
    expect(publicLocation("Colico · Campo 2", "CASA", null)).toBe("Colico · Campo 2");
    expect(publicLocation("colico campo 1", null, null)).toBe("Colico · Campo 1");
    expect(publicLocation("Colico", "CASA", null)).toBe("Colico");
    expect(publicLocation("Dervio", "CASA", null)).toBe("Dervio");
    expect(publicLocation("Olginate", "FUORI", "Olginate")).toBe("Trasferta · Olginate");
    expect(publicLocation("a casa di Luca B.", "FUORI", null)).toBe("Trasferta");
    expect(publicLocation("palestra della scuola di Marco", "CASA", null)).toBeNull();
    expect(publicLocation(null, null, null)).toBeNull();
  });
});
