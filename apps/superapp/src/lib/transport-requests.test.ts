import { describe, expect, it } from "vitest";

import { addDays, awayMatchesFor, calendarGroupFor, groupByEvent, parseMyRequests, parseOfficeRequests, parseStops, requestError, stopLabel } from "./transport-requests";

const ev = (id: string, date: string, group: string, homeAway: string, time = "15:00") => ({ id, date, time, group, homeAway, opponent: "Avversaria", venue: "Campo" });

describe("away matches for a family", () => {
  const events = [
    ev("A", "2026-10-17", "u15", "FUORI"),
    ev("B", "2026-10-18", "u15", "CASA"),
    ev("C", "2026-10-18", "u16", "FUORI", "10:30"),
    ev("D", "2026-11-20", "u15", "FUORI"),
    ev("E", "2026-10-11", "u15", "FUORI"),
    ev("F", "2026-10-25", "piccoli", "FUORI"),
  ];
  it("keeps only future away matches of the family's teams within the window, in time order", () => {
    expect(awayMatchesFor(events, ["u15", "u16"], "2026-10-12").map((m) => m.eventId)).toEqual(["A", "C"]);
    expect(awayMatchesFor(events, ["piccoliamici"], "2026-10-12").map((m) => [m.eventId, m.teamCode])).toEqual([["F", "piccoliamici"]]);
    expect(awayMatchesFor(events, [], "2026-10-12")).toEqual([]);
    expect(calendarGroupFor("u19")).toBe("u19");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });
});

describe("parsers", () => {
  it("drops invalid rows and defaults unknown values", () => {
    const mine = parseMyRequests([
      { id: "r1", eventId: "A", date: "2026-10-17", teamCode: "u15", personId: "p1", direction: "ANDATA", status: "CONFERMATA", stop: "Piazza, Colico" },
      { id: "r2", eventId: "A", date: "17/10", teamCode: "u15", personId: "p1" },
      { id: "r3", eventId: "B", date: "2026-10-18", teamCode: "u15", personId: "p2", direction: "X", status: "Y" },
    ]);
    expect(mine.map((r) => r.id)).toEqual(["r1", "r3"]);
    expect(mine[1]!.direction).toBe("ANDATA_RITORNO");
    expect(mine[1]!.status).toBe("RICHIESTA");
    expect(parseMyRequests(null)).toEqual([]);
    expect(parseOfficeRequests(null)).toBeNull();
    expect(parseOfficeRequests([{ id: "r1", eventId: "A", date: "2026-10-17", teamCode: "u15" }])).toEqual([]);
    const stops = parseStops([{ id: "s1", town: "Colico", place: "Piazza Garibaldi" }, { town: "x" }]);
    expect(stops).toHaveLength(1);
    expect(stopLabel(stops[0]!)).toBe("Piazza Garibaldi, Colico");
    expect(stopLabel({ id: "s2", line: "Linea 1", town: null, place: null })).toBe("Linea 1");
  });

  it("groups office requests by match with waiting and confirmed counts", () => {
    const office = parseOfficeRequests([
      { id: "1", eventId: "A", date: "2026-10-17", teamCode: "u15", name: "Persona Uno", status: "RICHIESTA" },
      { id: "2", eventId: "A", date: "2026-10-17", teamCode: "u15", name: "Persona Due", status: "CONFERMATA", event: "U15 a Sondrio" },
      { id: "3", eventId: "C", date: "2026-10-18", teamCode: "u16", name: "Persona Tre", status: "ANNULLATA" },
    ])!;
    const g = groupByEvent(office);
    expect(g.map((x) => [x.eventId, x.waiting, x.confirmed])).toEqual([["A", 1, 1], ["C", 0, 0]]);
    expect(g[0]!.event).toBe("U15 a Sondrio");
    expect(requestError("confirmed")).toMatch(/già confermato/);
    expect(requestError(undefined)).toMatch(/Riprova/);
  });
});
