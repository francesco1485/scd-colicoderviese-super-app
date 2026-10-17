import { describe, expect, it } from "vitest";

import { PULMINI_DEMAND } from "./roster-aggregates";
import {
  FLEET_2026_27,
  SEASON_TEAMS_2026_27,
  crewMismatch,
  demandBySeasonTeam,
  planErrorMessage,
  seasonTeamFor,
  serviceWeekend,
  serviceWeekendTrips,
  shortPersonName,
  transportCrew,
  withoutPhones,
  type TransportBoard,
} from "./transport";
import { parseMyRequests, parseOfficeRequests, requestError, TRANSPORT_ACK_LIVE } from "./transport-requests";

describe("service weekend", () => {
  it("on Saturday shows the weekend in progress, not the next one", () => {
    expect(serviceWeekend("2026-10-17")).toEqual({ sat: "2026-10-17", sun: "2026-10-18", from: "2026-10-17" });
  });
  it("on Sunday keeps only today", () => {
    expect(serviceWeekend("2026-10-18")).toEqual({ sat: "2026-10-17", sun: "2026-10-18", from: "2026-10-18" });
  });
  it("on a weekday shows the coming weekend", () => {
    expect(serviceWeekend("2026-10-14")).toEqual({ sat: "2026-10-17", sun: "2026-10-18", from: "2026-10-17" });
    expect(serviceWeekend("2026-10-19")).toEqual({ sat: "2026-10-24", sun: "2026-10-25", from: "2026-10-24" });
  });
  it("lists away matches only, days gone excluded, in time order", () => {
    const ev = [
      { id: "a", date: "2026-10-18", time: "10:30", homeAway: "FUORI" },
      { id: "b", date: "2026-10-17", time: "15:00", homeAway: "FUORI" },
      { id: "c", date: "2026-10-17", time: "09:00", homeAway: "CASA" },
      { id: "d", date: "2026-10-24", time: "15:00", homeAway: "FUORI" },
    ];
    expect(serviceWeekendTrips(ev, "2026-10-17").map((e) => e.id)).toEqual(["b", "a"]);
    expect(serviceWeekendTrips(ev, "2026-10-18").map((e) => e.id)).toEqual(["a"]);
  });
});

describe("2026/27 teams", () => {
  it("has the nine active teams and no U18", () => {
    expect(SEASON_TEAMS_2026_27).toHaveLength(9);
    expect(SEASON_TEAMS_2026_27.some((t) => /U18/.test(t.label))).toBe(false);
  });
  it("maps the Master's old labels to the season's names", () => {
    expect(seasonTeamFor("U12 2015").label).toBe("Esordienti 2015");
    expect(seasonTeamFor("U13 2014").label).toBe("Esordienti 2014");
    expect(seasonTeamFor("JUNIORES 2007-2009")).toMatchObject({ key: "u19", label: "Juniores U19 Élite", trainingServed: false });
    expect(seasonTeamFor("U16 ELITE 2011")).toMatchObject({ key: "u16", trainingServed: false });
    expect(seasonTeamFor("U15 2012-2013").key).toBe("u15");
    expect(seasonTeamFor("PULCINI 2016-2017").key).toBe("pulcini");
    expect(seasonTeamFor("PRIMI CALCI 2018-2019").key).toBe("primicalci");
    expect(seasonTeamFor("PICCOLI AMICI 2020-2021")).toMatchObject({ key: "piccoli", trainingServed: null });
  });
  it("flags the withdrawn U18 instead of hiding it, and keeps unknown as unknown", () => {
    expect(seasonTeamFor("U18 2009-2010")).toMatchObject({ key: null, status: "withdrawn" });
    expect(seasonTeamFor(null).status).toBe("unknown");
    expect(seasonTeamFor("SQUADRA X").label).toBe("SQUADRA X");
  });
  it("folds the real Master counts without losing anyone", () => {
    const rows = demandBySeasonTeam(PULMINI_DEMAND.byGroup);
    const total = Object.values(PULMINI_DEMAND.byGroup).reduce((a, b) => a + b, 0);
    expect(rows.reduce((a, r) => a + r.count, 0)).toBe(total);
    expect(rows.at(-1)?.status).toBe("withdrawn");
    expect(rows.map((r) => r.label)).not.toContain("U12 2015");
  });
});

describe("transport crew from the organigram roster", () => {
  const people = [
    { id: "a", name: "Responsabile Uno", role: "Responsabile servizio pulmini e autista", kind: "autista", areas: ["pulmini"] },
    { id: "b", name: "Autista Due", role: "Dirigente autista", kind: "autista", areas: [] },
    { id: "c", name: "Mister Tre", role: "Allenatore U15", kind: "mister", areas: [] },
  ];
  it("office = area pulmini; drivers = autista role, the Responsabile included", () => {
    const { office, drivers } = transportCrew(people);
    expect(office.map((p) => p.id)).toEqual(["a"]);
    expect(drivers.map((p) => p.id)).toEqual(["b", "a"]);
  });
  it("reports names on only one side, ignoring order and accents, inactive Master rows out", () => {
    const m = crewMismatch([{ name: "Autista Due" }, { name: "Nicolò Quattro" }], [
      { name: "Due Autista", status: "ATTIVO" },
      { name: "Nicolo Quattro", status: null },
      { name: "Vecchio Cinque", status: "NON ATTIVO" },
      { name: "Nuovo Sei", status: "DA VERIFICARE" },
    ]);
    expect(m).toEqual({ onlyRoster: [], onlyMaster: ["Nuovo Sei"] });
  });
});

describe("privacy and wording", () => {
  it("drops every phone before the board leaves the server", () => {
    const b = { canManage: true, drivers: [{ id: "d", code: "D", name: "A", kind: null, status: null, licenceCategory: null, licenceDue: null, extraAvailability: null, phone: "000" }] } as unknown as TransportBoard;
    expect(withoutPhones(b)!.drivers[0]!.phone).toBeNull();
    expect(withoutPhones(null)).toBeNull();
  });
  it("shortens names for the office list", () => {
    expect(shortPersonName("Mario Rossi")).toBe("Mario R.");
    expect(shortPersonName("Anna Maria de luca")).toBe("Anna L.");
    expect(shortPersonName("Mario")).toBe("Mario");
  });
  it("names the Responsabile servizio pulmini as owner", () => {
    expect(planErrorMessage("forbidden")).toBe("Le corse le organizza il Responsabile servizio pulmini (in sua assenza Direzione o Segreteria).");
  });
  it("keeps the 17/10 fleet facts as counts only", () => {
    expect(FLEET_2026_27).toMatchObject({ clubVans: 3, partnerVans: 1, partnerOwner: "ASD Volley Colico", drivers: 4, driversVolunteer: true });
    expect(JSON.stringify(FLEET_2026_27)).not.toMatch(/\d{6,}/);
  });
});

describe("presa visione (r114)", () => {
  const row = { id: "r1", eventId: "ev-1", date: "2026-10-18", teamCode: "u15", personId: "p1", name: "Mario R.", status: "CONFERMATA", acknowledged: true };
  it("is read only on a confirmed seat", () => {
    expect(parseMyRequests([row])[0]!.acknowledged).toBe(true);
    expect(parseMyRequests([{ ...row, status: "RICHIESTA" }])[0]!.acknowledged).toBe(false);
    expect(parseOfficeRequests([{ ...row, acknowledged: "yes" }])![0]!.acknowledged).toBe(false);
  });
  it("stays off until «applica r114» and explains why", () => {
    expect(TRANSPORT_ACK_LIVE).toBe(false);
    expect(requestError("unavailable")).toContain("in attivazione");
    expect(requestError("not_confirmed")).toContain("posto confermato");
  });
});
