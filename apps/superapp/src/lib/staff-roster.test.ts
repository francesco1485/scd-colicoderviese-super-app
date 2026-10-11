import { describe, expect, it } from "vitest";

import { initials, kindOf, parseRoster, peopleForArea, peopleOnPitch, teamMatches } from "./staff-roster";
import { staffEmails, staffRosterPublic } from "./staff-roster.functions";

const raw = JSON.stringify({
  asOf: "2026-10-11",
  people: [
    { id: "d-u15", name: "Dirigente Prova", role: "Dirigente accompagnatore U15", teams: ["U15"], email: "d@example.org", phone: "+39 333 1234567" },
    { id: "m-2015", name: "Mister Prova", role: "Allenatore annata 2015", teams: ["2015"] },
    { id: "m-u16", name: "Secondo Prova", role: "Secondo allenatore U16", teams: ["U16"], email: "not-an-email" },
    { id: "r-pul", name: "Trasporti Prova", role: "Responsabile servizio pulmini", areas: ["Pulmini"] },
    { id: "a-1", name: "Autista Prova", role: "Autista pulmino 1", teams: ["U15"] },
    { id: "bad id", name: "X", role: "Y" },
    { id: "d-u15", name: "Duplicato", role: "Dirigente" },
  ],
});

describe("staff roster", () => {
  it("parses people, kinds and drops invalid or duplicate entries", () => {
    const { roster, contacts } = parseRoster(raw);
    expect(roster.asOf).toBe("2026-10-11");
    expect(roster.people.map((p) => p.id)).toEqual(["d-u15", "m-2015", "m-u16", "r-pul", "a-1"]);
    expect(roster.people[0]).toMatchObject({ kind: "dirigente", teams: ["U15"] });
    expect(roster.people[3]).toMatchObject({ kind: "responsabile", areas: ["pulmini"] });
    expect(JSON.stringify(roster)).not.toContain("@");
    expect(contacts.find((c) => c.id === "d-u15")).toEqual({ id: "d-u15", email: "d@example.org", phone: "+39 333 1234567" });
    expect(contacts.find((c) => c.id === "m-u16")?.email).toBeNull();
    expect(parseRoster("{").roster.people).toEqual([]);
  });

  it("classifies roles", () => {
    expect(kindOf("Allenatore portieri")).toBe("mister");
    expect(kindOf("Team manager Prima")).toBe("dirigente");
    expect(kindOf("Autista serale")).toBe("autista");
    expect(kindOf("Responsabile club house")).toBe("responsabile");
    expect(kindOf("Fonico")).toBe("staff");
  });

  it("matches team labels against pitch texts", () => {
    expect(teamMatches("U15 2012/2013 + U12 2015 + U11 2016/2017", "U15")).toBe(true);
    expect(teamMatches("U15 2012/2013 + U12 2015", "U1")).toBe(false);
    expect(teamMatches("Esordienti 2014/2015", "2015")).toBe(true);
    expect(teamMatches("Pulcini 2016/17", "2017")).toBe(true);
    expect(teamMatches("Primi Calci 2018-2019", "2015")).toBe(false);
    expect(teamMatches("Juniores Élite U19", "u19")).toBe(true);
  });

  it("lists the adults on a pitch, dirigenti first, drivers excluded", () => {
    const { roster } = parseRoster(raw);
    const on = peopleOnPitch(roster.people, ["U15 2012/2013 + U12 2015", ""]);
    expect(on.map((p) => p.id)).toEqual(["d-u15", "m-2015"]);
    expect(peopleOnPitch(roster.people, [""])).toEqual([]);
    expect(peopleForArea(roster.people, "pulmini").map((p) => p.id)).toEqual(["r-pul"]);
  });

  it("builds initials", () => {
    expect(initials("Mario Rossi")).toBe("MR");
    expect(initials("Anna Maria Bianchi")).toBe("AB");
    expect(initials("Crovi")).toBe("CR");
    expect(initials("  ")).toBe("?");
  });
});

describe("staff roster on the server", () => {
  it("names are public, e-mails only inside an open area", () => {
    expect(staffRosterPublic({ SCD_STAFF_ROSTER_JSON: raw }).people).toHaveLength(5);
    expect(staffEmails({ SCD_STAFF_ROSTER_JSON: raw }, true)).toEqual({});
    expect(staffEmails({ SCD_STAFF_ROSTER_JSON: raw, SCD_STAGING_PREVIEW: "1", SCD_STAGING_PASSWORD: "x".repeat(24) }, true)).toEqual({ "d-u15": "d@example.org" });
  });
});
