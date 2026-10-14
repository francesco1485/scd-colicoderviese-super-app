/**
 * UD-130: minibuses in 2D under the trainings. Every name below is an invented TEST FIXTURE (adult-sounding,
 * no real child of the club); addresses and phones are there to prove they never reach the plan.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CONTACTS_LOCKED_TEXT, VanPlan2D } from "@/components/scd/VanPlan2D";

import { buildVanPlan, matchStop, payloadStrings, type RawRider, type RawStop } from "./pulmini-vans";
import type { TransportBoard } from "./transport";
import {
  DUCATO_9_ROWS,
  INDICATIVE_NOTE,
  NO_FLEET,
  assignmentEmptyText,
  assignmentSummary,
  fleetFromBoard,
  giroFor,
  minorLabel,
  rowsForSeats,
  seatPlanFor,
  seatShortLabel,
  seatsFor,
  vanAlerts,
  weekdayOf,
  type FleetFacts,
} from "./van-plan";

const NO = { LUN_A: "NO", LUN_R: "NO", MAR_A: "NO", MAR_R: "NO", MER_A: "NO", MER_R: "NO", GIO_A: "NO", GIO_R: "NO", VEN_A: "NO", VEN_R: "NO" };
const days = (o: Record<string, string>) => ({ ...NO, ...o });

const STOPS: RawStop[] = [
  { line: "VALTELLINA", position: 30, town: "PIANTEDO", place: "La Veronese", eta: null },
  { line: "VALTELLINA", position: 10, town: "MORBEGNO", place: "Stazione", eta: "16:40" },
  { line: "VALTELLINA", position: 20, town: "MANTELLO", place: "Piazza", eta: "16:50" },
];

function rider(o: RawRider & Record<string, unknown>): RawRider {
  return { teamGroup: "U13 2014", serviceStatus: "ATTIVO", line: "VALTELLINA", days: days({ LUN_A: "SI", LUN_R: "SI" }), ...o };
}

const board = (over: Partial<TransportBoard> = {}): TransportBoard => ({
  canManage: true,
  syncedAt: null,
  sourceModifiedAt: null,
  vehicles: ["01", "02", "03", "04"].map((n) => ({
    id: `v${n}`, code: `BUS-${n}`, label: `Pulmino ${Number(n)}`, plate: null, model: "Fiat Ducato", ownership: null,
    seatsHomologated: null, seatsPassengers: null, status: null, baseAvailability: null,
    insuranceDue: null, inspectionDue: null, roadTaxDue: null, serviceDue: null, notes: null,
  })),
  drivers: [],
  rules: [],
  stops: [],
  riders: [],
  runs: [],
  ...over,
});

const plan = (riders: RawRider[], withNames = true) => buildVanPlan({ riders, withNames, stops: STOPS, slots: [], asOf: "2026-10-14" });

describe("seat model (Fiat Ducato 9 posti = 1 autista + 8)", () => {
  it("has the club layout: davanti D+1+2 | centro 3-5 | dietro 6-8", () => {
    expect(DUCATO_9_ROWS.map((r) => r.seats.map((s) => s.id))).toEqual([["D", "1", "2"], ["3", "4", "5"], ["6", "7", "8"]]);
    expect(DUCATO_9_ROWS.map((r) => r.label)).toEqual(["Davanti", "Centro", "Dietro"]);
    expect(DUCATO_9_ROWS.flatMap((r) => r.seats).filter((s) => s.kind === "driver").map((s) => s.id)).toEqual(["D"]);
  });

  it("builds other layouts from the Master seats: driver + 2, then rows of 3", () => {
    expect(rowsForSeats(8).map((r) => r.seats.map((s) => s.id))).toEqual(DUCATO_9_ROWS.map((r) => r.seats.map((s) => s.id)));
    expect(rowsForSeats(6).map((r) => r.seats.map((s) => s.id))).toEqual([["D", "1", "2"], ["3", "4", "5"], ["6"]]);
    expect(rowsForSeats(2).map((r) => r.seats.map((s) => s.id))).toEqual([["D", "1", "2"]]);
  });

  it("uses the Ducato only as a labelled indicative layout when the Master has no seats", () => {
    const none = seatsFor(null);
    expect(none.source).toBe("indicative");
    expect(none.passengerSeats).toBe(8);
    expect(none.note).toBe(INDICATIVE_NOTE);
    expect(none.note).toMatch(/Posti da confermare nel Master Flotta/);
    const fleet = fleetFromBoard(board());
    expect(seatsFor(fleet.vehicles[0]).source).toBe("indicative");
    const known = fleetFromBoard(board({ vehicles: [{ ...board().vehicles[2]!, seatsPassengers: 6 }] }));
    const l = seatsFor(known.vehicles[0]);
    expect(l.source).toBe("master");
    expect(l.passengerSeats).toBe(6);
  });

  it("maps BUS-01..04 to the four vans, and gives no fleet without a board", () => {
    expect(fleetFromBoard(board()).vehicles.map((v) => v.van)).toEqual(["p1", "p2", "p3", "p4"]);
    expect(fleetFromBoard(null)).toEqual(NO_FLEET);
  });
});

describe("seats only from real data", () => {
  it("puts nobody on a seat when riders have only a line (today's Master: 0 assigned)", () => {
    const p = plan(Array.from({ length: 5 }, (_, i) => rider({ firstName: `Nome${"ABCDE"[i]}`.replace(/\d/g, ""), lastName: "Prova" })));
    const v = p.vans.find((x) => x.id === "p3")!;
    expect(v.regulars).toHaveLength(5);
    expect(v.regulars.every((r) => r.assigned === null && r.seat === null)).toBe(true);
    const seats = seatPlanFor("p3", v.regulars, seatsFor(null));
    expect(seats.aboard).toHaveLength(0);
    expect(seats.rows.flatMap((r) => r.seats).every((s) => s.rider === null)).toBe(true);
  });

  it("seats a rider only with the van AND a fixed seat; van without seat is 'posto non fissato'; double seats are conflicts", () => {
    const p = plan([
      rider({ firstName: "Ettore", lastName: "Bianchetti", vehicle: "BUS-03", seat: "4" }),
      rider({ firstName: "Gualtiero", lastName: "Verdoni", vehicle: "P3" }),
      rider({ firstName: "Ugo", lastName: "Neroni", vehicle: "Pulmino 3", seat: "4" }),
      rider({ firstName: "Osvaldo", lastName: "Grigetti", vehicle: "P3", seat: "12" }),
      rider({ firstName: "Arturo", lastName: "Lineari" }),
    ]);
    const v = p.vans.find((x) => x.id === "p3")!;
    const seats = seatPlanFor("p3", v.regulars, seatsFor(null));
    const cells = seats.rows.flatMap((r) => r.seats);
    expect(cells.find((c) => c.id === "4")!.rider!.name).toBe("Ettore B.");
    expect(cells.filter((c) => c.rider).map((c) => c.id)).toEqual(["4"]);
    expect(seats.aboard.map((r) => r.name).sort()).toEqual(["Ettore B.", "Gualtiero V.", "Osvaldo G.", "Ugo N."]);
    expect(seats.noFixedSeat.map((r) => r.name).sort()).toEqual(["Gualtiero V.", "Osvaldo G.", "Ugo N."]);
    expect(seats.seatConflicts.map((r) => r.name).sort()).toEqual(["Osvaldo G.", "Ugo N."]);
    // the rider placed by line only is on the van's line but not assigned
    expect(v.regulars.find((r) => r.name === "Arturo L.")!.assigned).toBeNull();
  });

  it("ignores a seat when the van comes from the line, not from the Master vehicle", () => {
    const p = plan([rider({ firstName: "Arturo", lastName: "Lineari", seat: "2" })]);
    expect(p.vans.find((x) => x.id === "p3")!.regulars[0]!.seat).toBeNull();
  });
});

describe("empty state counts", () => {
  it("says exactly what is missing in the Master with real counts", () => {
    const riders = Array.from({ length: 61 }, () => rider({}));
    const p = plan(riders, false);
    expect(assignmentSummary(p)).toEqual({ active: 61, assigned: 0, seated: 0 });
    expect(assignmentEmptyText(p)).toBe("Assegna i ragazzi ai pulmini nel Master Flotta: oggi 0 su 61 assegnati.");
  });

  it("counts inactive riders out, reports vans without seats, and is silent in the locked plan", () => {
    const p = plan([rider({ vehicle: "P3" }), rider({ vehicle: "P4", line: "NORD/VALCHIAVENNA" }), rider({ serviceStatus: "NON ATTIVO", vehicle: "P3" })], false);
    expect(assignmentSummary(p)).toEqual({ active: 2, assigned: 2, seated: 0 });
    expect(assignmentEmptyText(p)).toBe("2 su 2 ragazzi hanno il pulmino nel Master, nessuno ha ancora un posto fisso.");
    const locked = buildVanPlan({ riders: null, withNames: false, stops: STOPS, slots: [], asOf: null });
    expect(assignmentEmptyText(locked)).toBeNull();
    expect(vanAlerts({ plan: locked, fleet: NO_FLEET, today: "2026-10-14" })).toEqual([]);
  });
});

describe("giro: ordered stops, who gets on and off", () => {
  const p = plan([
    rider({ firstName: "Ettore", lastName: "Bianchetti", stopOut: "MORBEGNO - Stazione", stopBack: "Mantello" }),
    rider({ firstName: "Gualtiero", lastName: "Verdoni", stopOut: "mantello piazza", stopBack: "PIANTEDO", days: days({ LUN_A: "SI" }) }),
    rider({ firstName: "Ugo", lastName: "Neroni", stopOut: "Via Inventata 12, Cosio", stopBack: "", phone: "333 1234567" }),
    rider({ firstName: "Osvaldo", lastName: "Grigetti", stopOut: "Morbegno", days: days({ MAR_A: "SI" }) }),
  ]);
  const v = p.vans.find((x) => x.id === "p3")!;

  it("orders the stops by their position in the Master and keeps the planned times", () => {
    const g = giroFor(v, "LUN");
    expect(g.stops.map((s) => s.town)).toEqual(["Morbegno", "Mantello", "Piantedo"]);
    expect(g.stops.map((s) => s.eta)).toEqual(["16:40", "16:50", null]);
    expect(g.source).toBe("master");
  });

  it("lists ▲ who gets on (andata) and ▼ who gets off (ritorno) for the chosen day only", () => {
    const g = giroFor(v, "LUN");
    expect(g.stops[0]!.up.map((r) => r.name)).toEqual(["Ettore B."]);
    expect(g.stops[1]!.up.map((r) => r.name)).toEqual(["Gualtiero V."]);
    expect(g.stops[1]!.down.map((r) => r.name)).toEqual(["Ettore B."]);
    expect(g.stops[2]!.down).toEqual([]); // Gualtiero does not come back on Monday
    expect(g.noStopUp.map((r) => r.name)).toEqual(["Ugo N."]);
    expect(g.noStopDown.map((r) => r.name)).toEqual(["Ugo N."]);
    expect(g.outCount).toBe(3);
    expect(g.backCount).toBe(2);
    expect(giroFor(v, "MAR").stops[0]!.up.map((r) => r.name)).toEqual(["Osvaldo G."]);
  });

  it("never lets a free stop text (possible home address) or a phone reach the plan", () => {
    const all = payloadStrings(p).join(" | ");
    expect(all).not.toMatch(/Inventata/);
    expect(all).not.toMatch(/333/);
    expect(v.regulars.find((r) => r.name === "Ugo N.")!.stopIssue).toEqual({ out: "unmatched", back: "missing" });
  });

  it("matches a town alone only when the route has one stop there", () => {
    const stops = [
      { town: "Colico", place: "Stazione", eta: null },
      { town: "Colico", place: "Piazza", eta: null },
    ];
    expect(matchStop("COLICO", stops)).toEqual({ stop: null, issue: "unmatched" });
    expect(matchStop("Colico - Piazza", stops).stop?.place).toBe("Piazza");
    expect(matchStop("DA DEFINIRE", stops).issue).toBe("missing");
  });
});

describe("alerts (only from data that exists)", () => {
  it("flags a van over capacity on a day and direction, against indicative or Master seats", () => {
    const nine = Array.from({ length: 9 }, () => rider({}));
    const p = plan(nine, false);
    const a = vanAlerts({ plan: p, fleet: fleetFromBoard(board()), today: "2026-10-14" });
    const over = a.find((x) => x.id === "over-p3")!;
    expect(over.tone).toBe("crit");
    expect(over.text).toContain("8 indicativi");
    expect(over.text).toContain("Lun andata 9");
    const bigger = fleetFromBoard(board({ vehicles: board().vehicles.map((v) => (v.code === "BUS-03" ? { ...v, seatsPassengers: 12 } : v)) }));
    expect(vanAlerts({ plan: p, fleet: bigger, today: "2026-10-14" }).some((x) => x.id === "over-p3")).toBe(false);
    expect(vanAlerts({ plan: plan(nine.slice(0, 8), false), fleet: NO_FLEET, today: "2026-10-14" }).some((x) => x.id === "over-p3")).toBe(false);
  });

  it("flags riders without stop and without vehicle", () => {
    const p = plan([rider({ stopOut: "Morbegno Stazione", stopBack: "Morbegno Stazione" }), rider({})], false);
    const a = vanAlerts({ plan: p, fleet: NO_FLEET, today: "2026-10-14" });
    expect(a.find((x) => x.id === "stop-p3")!.text).toContain("1 ragazzo senza fermata registrata");
    expect(a.find((x) => x.id === "no-vehicle")!.text).toBe("Ragazzi senza pulmino nel Master Flotta: 2 su 2 (assegnati 0).");
  });

  it("raises expiry and licence alerts only from real dates, never from missing ones", () => {
    const fleet: FleetFacts = fleetFromBoard(
      board({
        vehicles: board().vehicles.map((v) => (v.code === "BUS-01" ? { ...v, insuranceDue: "2026-10-01", inspectionDue: "2026-11-01" } : v)),
        drivers: [
          { id: "d1", code: "AUT-1", name: "Autista Uno", kind: null, status: "ATTIVO", licenceCategory: "B", licenceDue: "2026-09-30", extraAvailability: null, phone: null },
          { id: "d2", code: "AUT-2", name: "Autista Due", kind: null, status: "ATTIVO", licenceCategory: "B", licenceDue: null, extraAvailability: null, phone: null },
        ],
      }),
    );
    const p = buildVanPlan({ riders: null, withNames: false, stops: null, slots: [], asOf: null });
    const a = vanAlerts({ plan: p, fleet, today: "2026-10-14" });
    expect(a.map((x) => x.id)).toEqual(["due-p1-insurance", "licence-Autista Uno", "due-p1-inspection"]);
    expect(a[0]!.text).toBe("Pulmino 1: assicurazione scaduta il 01/10/2026.");
    expect(a.some((x) => x.text.includes("Autista Due"))).toBe(false);
  });
});

describe("minors' names: first name + surname initial", () => {
  it("never shows a full surname", () => {
    expect(minorLabel("Mattia Rossi")).toBe("Mattia R.");
    expect(minorLabel("Mattia R.")).toBe("Mattia R.");
    expect(minorLabel("Mattia")).toBe("Mattia");
    expect(minorLabel("Anna Maria Bianchi")).toBe("Anna M.");
    expect(minorLabel(null)).toBeNull();
    expect(seatShortLabel("Mattia Rossi")).toBe("Mattia");
  });

  it("server names arrive already minimised", () => {
    const p = plan([rider({ firstName: "ETTORE", lastName: "BIANCHETTI" })]);
    expect(p.vans.find((x) => x.id === "p3")!.regulars[0]!.name).toBe("Ettore B.");
    expect(payloadStrings(p).join(" ")).not.toMatch(/Bianchetti|BIANCHETTI/);
  });

  it("maps quadro days to weekday codes", () => {
    expect(weekdayOf("MERCOLEDÌ")).toBe("MER");
    expect(weekdayOf("SABATO")).toBe("LUN");
  });
});

describe("VanPlan2D", () => {
  it("locked plan: empty indicative seats, no people, contacts placeholder", () => {
    const locked = buildVanPlan({ riders: null, withNames: false, stops: STOPS, slots: [], asOf: null, namesNote: "Nomi visibili solo con accesso del responsabile trasporti." });
    const html = renderToStaticMarkup(<VanPlan2D plan={locked} fleet={NO_FLEET} day="LUNEDÌ" today="2026-10-14" initialVan="p3" />);
    expect(html).toContain("disposizione indicativa");
    expect(html).toContain(CONTACTS_LOCKED_TEXT);
    expect(html).toContain('data-testid="van-plan-locked"');
    expect(html).not.toMatch(/assegnati \d+ su/);
  });

  it("names plan: seat tap shows name, team, ▲ sale a and ▼ scende a with stop and time", () => {
    const p = plan([rider({ firstName: "Ettore", lastName: "Bianchetti", vehicle: "P3", seat: "3", stopOut: "Morbegno Stazione", stopBack: "Mantello" })]);
    const html = renderToStaticMarkup(<VanPlan2D plan={p} fleet={fleetFromBoard(board())} day="LUNEDÌ" today="2026-10-14" initialVan="p3" initialSeat="3" />);
    expect(html).toContain("Posto 3 · Ettore B.");
    expect(html).toContain("Sale a");
    expect(html).toContain("Morbegno · Stazione · 16:40");
    expect(html).toContain("Mantello · Piazza");
    expect(html).not.toContain("Bianchetti");
  });

  it("empty seat map says how many riders the Master still has to assign", () => {
    const p = plan(Array.from({ length: 3 }, () => rider({})), false);
    const html = renderToStaticMarkup(<VanPlan2D plan={p} fleet={NO_FLEET} day="LUNEDÌ" today="2026-10-14" initialVan="p3" />);
    expect(html).toContain("Assegna i ragazzi ai pulmini nel Master Flotta: oggi 0 su 3 assegnati.");
  });

  it("giro tab lists the ordered stops with who gets on and off", () => {
    const p = plan([rider({ firstName: "Ettore", lastName: "Bianchetti", stopOut: "Morbegno Stazione", stopBack: "Mantello" })]);
    const html = renderToStaticMarkup(<VanPlan2D plan={p} fleet={NO_FLEET} day="LUNEDÌ" today="2026-10-14" initialVan="p3" initialTab="giro" />);
    expect(html).toContain('data-testid="van-giro"');
    expect(html.indexOf("Morbegno")).toBeLessThan(html.indexOf("Mantello"));
    expect(html).toContain("Salgono 1");
    expect(html).toContain("Ettore B.");
  });
});
