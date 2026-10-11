import { describe, expect, it } from "vitest";

import { groupForTeamCode, otherAnnate, registrationLabel, rosterOf, rosterSummary, rosterTeams, teamCodeForGroup, toRosterRow, type RosterDbRow } from "./roster";

const db = (o: Partial<RosterDbRow>): RosterDbRow => ({
  team_id: "t1",
  team_code: "u15",
  team_name: "U15",
  team_status: "ACTIVE",
  person_id: crypto.randomUUID(),
  display_name: "Rossi Mario",
  birth_year: 2012,
  is_minor: true,
  registration_status: "UNVERIFIED",
  medical_certificate_expires_at: null,
  ...o,
});

describe("roster", () => {
  it("maps calendar groups to database team codes both ways", () => {
    expect(teamCodeForGroup("piccoli")).toBe("piccoliamici");
    expect(teamCodeForGroup("u15")).toBe("u15");
    expect(groupForTeamCode("piccoliamici")).toBe("piccoli");
    expect(groupForTeamCode("prima")).toBe("prima");
  });

  it("never shows an empty name", () => {
    expect(toRosterRow(db({ display_name: "  " })).displayName).toBe("Nome non indicato");
  });

  it("summarises certificates, minors and registrations", () => {
    const rows = [
      db({ medical_certificate_expires_at: "2026-10-01" }),
      db({ medical_certificate_expires_at: "2026-10-20", registration_status: "VERIFIED" }),
      db({ medical_certificate_expires_at: "2027-06-30", is_minor: false }),
      db({}),
    ].map((r) => toRosterRow(r));
    const s = rosterSummary(rows, "2026-10-11");
    expect(s.total).toBe(4);
    expect(s.minors).toBe(3);
    expect(s.registrationToCheck).toBe(3);
    expect(s.certificate).toEqual({ scaduto: 1, "in-scadenza": 1, ok: 1, sconosciuto: 1 });
  });

  it("filters one team and sorts with accents folded", () => {
    const rows = [db({ display_name: "Zanetti Luca" }), db({ display_name: "Èrba Paolo" }), db({ display_name: "Bianchi Ugo", team_code: "u16" })].map((r) => toRosterRow(r));
    expect(rosterOf(rows, "u15").map((r) => r.displayName)).toEqual(["Èrba Paolo", "Zanetti Luca"]);
    expect(rosterTeams(rows).map((t) => t.code)).toEqual(["u15", "u16"]);
  });

  it("labels unknown registration states as to be checked", () => {
    expect(registrationLabel("VERIFIED")).toBe("Tesserato");
    expect(registrationLabel("WHATEVER")).toBe("Tesseramento da verificare");
  });
});

describe("call-up from other annate (UD-068)", () => {
  const r = (athleteId: string, teamCode: string, displayName: string) =>
    ({ teamId: teamCode, teamCode, teamName: teamCode.toUpperCase(), teamStatus: "ACTIVE", personId: athleteId, athleteId, displayName, birthYear: 2012, minor: true, registrationStatus: "VERIFIED", certificateExpiresAt: null });
  it("groups the other teams, skips squad members, duplicates and rows without athlete id", () => {
    const rows = [r("a1", "u15", "Zeta"), r("a2", "2015", "Bruno"), r("a1", "2015", "Zeta"), r("a3", "2015", "Aldo"), r("a3", "u16", "Aldo"), r("", "u16", "Senza id")];
    const out = otherAnnate(rows, "u15");
    expect(out.map((g) => g.teamCode)).toEqual(["2015"]);
    expect(out[0]?.rows.map((x) => x.displayName)).toEqual(["Aldo", "Bruno"]);
    expect(otherAnnate([r("a1", "u15", "Zeta")], "u15")).toEqual([]);
  });
});
