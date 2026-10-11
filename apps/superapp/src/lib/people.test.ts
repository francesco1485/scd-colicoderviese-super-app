import { describe, expect, it } from "vitest";

import { birthYear, certificateState, filterPeople, isMinor, itDate, peopleCounts, personKind, sortPeople, teamsOf, validateNewPerson, type PersonRow } from "./people";

const role = (label: string, teamCode: string | null = null): PersonRow["roles"][number] => ({ id: label, label, kind: "DIRIGENTE", teamCode, teamName: teamCode ? `Under ${teamCode.slice(1)}` : null, areaId: null, validTo: null });

const rows: PersonRow[] = [
  { id: "1", displayName: "Anna Rossi", firstName: "Anna", lastName: "Rossi", birthYear: 2012, minor: true, status: "ACTIVE", leftAt: null, leftReason: null, kind: "atleta", roles: [], athlete: { registrationStatus: "VERIFIED", certificateExpiresAt: "2026-10-20" }, sourceId: "ISCRIZIONI" },
  { id: "2", displayName: "Marco Bianchi", firstName: "Marco", lastName: "Bianchi", birthYear: 1980, minor: false, status: "ACTIVE", leftAt: null, leftReason: null, kind: "staff", roles: [role("Dirigente U15", "U15")], athlete: null, sourceId: "ELENCO_RUOLI" },
  { id: "3", displayName: "Luca Verdi", firstName: "Luca", lastName: "Verdi", birthYear: 2010, minor: true, status: "LEFT", leftAt: "2026-09-30", leftReason: "Cambio società", kind: "atleta", roles: [], athlete: { registrationStatus: "VERIFIED", certificateExpiresAt: "2026-01-01" }, sourceId: "ISCRIZIONI" },
  { id: "4", displayName: "Élodie Neri", firstName: "Élodie", lastName: "Neri", birthYear: null, minor: null, status: "ACTIVE", leftAt: null, leftReason: null, kind: "altro", roles: [], athlete: null, sourceId: "UNVERIFIED" },
];

describe("people rules", () => {
  it("computes minors and birth years without inventing", () => {
    expect(isMinor("2008-10-12", "2026-10-11")).toBe(true);
    expect(isMinor("2008-10-11", "2026-10-11")).toBe(false);
    expect(isMinor(null, "2026-10-11")).toBeNull();
    expect(birthYear("2012-03-04")).toBe(2012);
    expect(birthYear(null)).toBeNull();
    expect(personKind(true, [])).toBe("atleta");
    expect(personKind(false, [role("x")])).toBe("staff");
    expect(personKind(false, [])).toBe("altro");
  });

  it("flags certificates by date", () => {
    expect(certificateState("2026-10-20", "2026-10-11")).toBe("in-scadenza");
    expect(certificateState("2026-12-20", "2026-10-11")).toBe("ok");
    expect(certificateState("2026-10-10", "2026-10-11")).toBe("scaduto");
    expect(certificateState(null, "2026-10-11")).toBe("sconosciuto");
  });

  it("hides the LEFT by default, filters by kind, team and accent-free search", () => {
    expect(filterPeople(rows, {}).map((p) => p.id)).toEqual(["1", "2", "4"]);
    expect(filterPeople(rows, { status: "LEFT" }).map((p) => p.id)).toEqual(["3"]);
    expect(filterPeople(rows, { status: "tutti" })).toHaveLength(4);
    expect(filterPeople(rows, { kind: "staff" }).map((p) => p.id)).toEqual(["2"]);
    expect(filterPeople(rows, { team: "U15" }).map((p) => p.id)).toEqual(["2"]);
    expect(filterPeople(rows, { q: "elodie" }).map((p) => p.id)).toEqual(["4"]);
    expect(filterPeople(rows, { q: "under 15" }).map((p) => p.id)).toEqual(["2"]);
  });

  it("counts active people, athletes, staff, minors, left and certificate issues", () => {
    expect(peopleCounts(rows, "2026-10-11")).toEqual({ active: 3, athletes: 1, staff: 1, minors: 1, left: 1, certificateIssues: 1 });
  });

  it("sorts by last name and lists teams", () => {
    expect(sortPeople(rows).map((p) => p.lastName)).toEqual(["Bianchi", "Neri", "Rossi", "Verdi"]);
    expect(teamsOf(rows)).toEqual([{ code: "U15", name: "Under 15" }]);
    expect(itDate("2026-09-30")).toBe("30/09/2026");
    expect(itDate(null)).toBe("—");
  });

  it("validates a new person typed by the Direction", () => {
    const base = { firstName: "Gi", lastName: "Lo", birthDate: "", email: "", phone: "", kind: "atleta" as const, roleLabel: "", roleKind: "" as const, note: "" };
    expect(validateNewPerson(base)).toEqual([]);
    expect(validateNewPerson({ ...base, firstName: "G", email: "nope", birthDate: "12/03/2012" })).toEqual(["Nome mancante.", "Data di nascita non valida.", "E-mail non valida."]);
    expect(validateNewPerson({ ...base, kind: "staff" })).toEqual(["Per lo staff serve il ruolo (come lo scrive la società).", "Per lo staff serve il tipo di ruolo."]);
  });
});
