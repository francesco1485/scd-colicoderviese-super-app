/**
 * UD-108: vans under the trainings with children's names for the transport staff only.
 * Every name below is an invented TEST FIXTURE (no real child of the club).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SlotVans, VanDetailPanel, VanLines } from "@/components/scd/PulminiVans";
import raw from "@/data/quadro-snapshot-20261009.json";

import { parseQuadro } from "./public-snapshots";
import {
  PHONE_PATTERN,
  RIDER_NAME_FORMAT,
  buildVanPlan,
  payloadStrings,
  placeRider,
  rideFlag,
  riderDisplayName,
  shortTeam,
  teamKeys,
  vanFromVehicle,
  vanRoute,
  vanUnit,
  type VanPlan,
} from "./pulmini-vans";
import { NAMES_LOCKED_NOTE, NAMES_NOT_COPIED_NOTE, slotInputs, vansFromSources } from "./pulmini-vans.functions";

const SLOTS = slotInputs(parseQuadro(raw).slots);
const PAGE = { view: "page", preview: false } as const;
const PREVIEW = { view: "page", preview: true } as const;

const days = (o: Record<string, string>) => ({ LUN_A: "NO", LUN_R: "NO", MAR_A: "NO", MAR_R: "NO", MER_A: "NO", MER_R: "NO", GIO_A: "NO", GIO_R: "NO", VEN_A: "NO", VEN_R: "NO", ...o });

/** Fake riders: names are invented; phones, parents, codes and stops are there to prove they never leave. */
const FIXTURE_ROSTER = {
  canSeeNames: true,
  riders: [
    { firstName: "ALFIO", lastName: "FINTOLINI", teamGroup: "U12 2015", serviceStatus: "ATTIVO", line: "VALTELLINA", days: days({ LUN_A: "DA CONFERMARE", LUN_R: "DA CONFERMARE", MER_A: "DA CONFERMARE" }), phone: "333 1234567", parentPhone: "+39 345 7654321", personId: "AT-9999", stopOut: "Via Inventata 1", note: "allergia" },
    { firstName: "bruna", lastName: "provetta", teamGroup: "U15 2012-2013", serviceStatus: "PROVVISORIO", line: "NORD/VALCHIAVENNA", days: days({ LUN_A: "SI", VEN_A: "DA CONFERMARE", VEN_R: "DA CONFERMARE" }) },
    { firstName: "Carlo", lastName: "Esempietti", teamGroup: "PULCINI 2016-2017", serviceStatus: "ATTIVO", line: "LAGO/LECCO", days: days({ LUN_A: "DA CONFERMARE" }) },
    { firstName: "Dario", lastName: "Campionetti", teamGroup: "U16 ELITE 2011", serviceStatus: "ATTIVO", line: "NORD/VALCHIAVENNA", days: days({ LUN_A: "DA CONFERMARE" }) },
    { firstName: "Elio", lastName: "Spentini", teamGroup: "U13 2014", serviceStatus: "NON ATTIVO", line: "VALTELLINA", days: days({ MAR_A: "DA CONFERMARE" }) },
    { firstName: "Fede", lastName: "Mezzetti", teamGroup: "U13 2014", serviceStatus: "ATTIVO", line: "LAGO/LECCO", vehicle: "P2", days: days({ MAR_A: "DA CONFERMARE", GIO_A: "DA CONFERMARE" }) },
  ],
};
const FAKE_SURNAMES = ["FINTOLINI", "Fintolini", "provetta", "Provetta", "Esempietti", "Campionetti", "Mezzetti"];
const FAKE_NAMES = ["Alfio F.", "Bruna P.", "Carlo E.", "Fede M."];

const BOARD = {
  canManage: true,
  sync: { synced_at: "2026-10-12T17:02:33Z", source_modified_at: "2026-10-12T16:38:35Z" },
  stops: [
    { line: "VALTELLINA", position: 20, town: "TRAONA", place: "Punto da definire", eta: null },
    { line: "VALTELLINA", position: 10, town: "MANTELLO", place: "Punto comune", eta: "17:05" },
    { line: "LAGO / LECCO", position: 10, town: "LECCO", place: "Bennet", eta: null },
  ],
  // The board never carries names (r74); a stray name here must still be dropped by the allowlist.
  riders: FIXTURE_ROSTER.riders.map(({ firstName, teamGroup, serviceStatus, line, days: d }) => ({ firstName, teamGroup, serviceStatus, line, days: d })),
  drivers: [{ name: "Autista A", phone: "347 1112223" }],
};

function json(v: unknown): string {
  return JSON.stringify(v);
}

describe("name format (single switch)", () => {
  it("defaults to first name + surname initial", () => {
    expect(RIDER_NAME_FORMAT).toBe("FIRST_NAME_SURNAME_INITIAL");
    expect(riderDisplayName("MATTIA", "ROSSI")).toBe("Mattia R.");
    expect(riderDisplayName("anna maria", "de luca")).toBe("Anna Maria D.");
    expect(riderDisplayName("Mattia", "Rossi", "FULL_NAME")).toBe("Mattia Rossi");
  });
  it("drops values that are not names", () => {
    expect(riderDisplayName("333 1234567", "Rossi")).toBeNull();
    expect(riderDisplayName("", "Rossi")).toBeNull();
    expect(riderDisplayName("Mattia", "a@b.it")).toBe("Mattia");
  });
});

describe("van placement", () => {
  it("prefers the vehicle, then the exact line", () => {
    expect(vanFromVehicle("P3")).toBe("p3");
    expect(vanFromVehicle("Pulmino 4")).toBe("p4");
    expect(vanFromVehicle("BUS-01")).toBe("p1");
    expect(vanFromVehicle("P5")).toBeNull();
    expect(placeRider("P2", "LAGO/LECCO")).toEqual({ van: "p2", by: "vehicle" });
    expect(placeRider(null, "VALTELLINA")).toEqual({ van: "p3", by: "line" });
    expect(placeRider(null, "NORD/VALCHIAVENNA")).toEqual({ van: "p4", by: "line" });
  });
  it("reports why a rider cannot be placed", () => {
    expect(placeRider(null, "LAGO/LECCO")).toMatchObject({ van: null, reason: expect.stringContaining("LAGO/LECCO") });
    expect(placeRider(null, "DA VERIFICARE")).toMatchObject({ van: null, reason: "Linea da verificare nel Master" });
    expect(placeRider(null, "COLICO")).toMatchObject({ van: null });
  });
  it("reads flags and team keys", () => {
    expect(rideFlag("DA CONFERMARE")).toBe("ask");
    expect(rideFlag("NO")).toBe("no");
    expect(rideFlag("SI")).toBe("yes");
    expect(teamKeys("Under 13")).toEqual(["U13"]);
    expect(teamKeys("U15 2012/2013 + U12 2015 + U11 2016/2017")).toEqual(expect.arrayContaining(["U15", "U12", "PULCINI"]));
    expect(shortTeam("U15 2012-2013")).toBe("U15");
    expect(shortTeam("PULCINI 2016-2017")).toBe("Pulcini");
  });
});

describe("routes", () => {
  it("uses the Master stops in order, with times only when present", () => {
    const r = vanRoute(vanUnit("p3"), BOARD.stops);
    expect(r.source).toBe("master");
    expect(r.stops.map((s) => s.town)).toEqual(["Mantello", "Traona"]);
    expect(r.stops[0]!.eta).toBe("17:05");
    expect(r.stops[1]!.eta).toBeNull();
  });
  it("marks the combined LAGO/LECCO line and falls back to the line board without times", () => {
    expect(vanRoute(vanUnit("p1"), BOARD.stops).note).toContain("LAGO/LECCO");
    const board = vanRoute(vanUnit("p4"), null);
    expect(board.source).toBe("board");
    expect(board.note).toContain("tavola linee 2026/27, da confermare");
    expect(board.stops.every((s) => s.eta === null)).toBe(true);
    expect(vanRoute(vanUnit("p2"), null).source).toBe("none");
  });
});

describe("plan under the trainings", () => {
  const plan = vansFromSources({ gate: PAGE, board: BOARD, roster: FIXTURE_ROSTER, slots: SLOTS })!;

  it("puts each rider on the van of the slot, andata and ritorno", () => {
    const mon = plan.slots.find((s) => s.day === "LUNEDÌ" && s.start === 1040)!;
    const p3 = mon.vans.find((v) => v.van === "p3")!;
    expect(p3.out.map((r) => r.name)).toEqual(["Alfio F."]);
    expect(p3.back.map((r) => r.name)).toEqual(["Alfio F."]);
    const p4 = mon.vans.find((v) => v.van === "p4")!;
    expect(p4.out.map((r) => r.name)).toEqual(["Bruna P."]);
    expect(p4.out[0]!.provisional).toBe(true);
    expect(mon.unplaced[0]!.riders.map((r) => r.name)).toEqual(["Carlo E."]);
  });

  it("keeps the service rule: U16 slot is not served, counted only", () => {
    const u16 = plan.slots.find((s) => s.day === "LUNEDÌ" && s.start === 1210)!;
    expect(u16.served).toBe("no");
    expect(u16.vans).toEqual([]);
    expect(u16.notServed).toBe(1);
  });

  it("places by vehicle when the Master has it, skips inactive riders", () => {
    const tue = plan.slots.find((s) => s.day === "MARTEDÌ" && s.start === 1080)!;
    expect(tue.vans.map((v) => [v.van, v.out.map((r) => r.name)])).toEqual([["p2", ["Fede M."]]]);
    expect(plan.counts).toEqual({ active: 5, placed: 4, unplaced: 1 });
    expect(json(plan)).not.toContain("Elio");
  });

  it("lists who is always on board per van with the days", () => {
    const p3 = plan.vans.find((v) => v.id === "p3")!;
    expect(p3.regulars.map((r) => r.name)).toEqual(["Alfio F."]);
    expect(p3.regulars[0]!.days.MER).toEqual({ out: "ask", back: "no" });
    expect(p3.destination).toBe("Centro Sportivo Colico");
    expect(p3.seats).toBe(8);
  });

  it("never carries phones, parents, codes, stops of a child, notes or full surnames", () => {
    const text = payloadStrings(plan).join("\n");
    expect(PHONE_PATTERN.test(text)).toBe(false);
    for (const s of ["AT-9999", "Via Inventata", "allergia", "345", "Autista A", ...FAKE_SURNAMES]) expect(text).not.toContain(s);
    for (const n of FAKE_NAMES) expect(text).toContain(n);
  });
});

describe("fail-closed access", () => {
  it("staging preview: no names even if the database answered", () => {
    const plan = vansFromSources({ gate: PREVIEW, board: BOARD, roster: FIXTURE_ROSTER, slots: SLOTS })!;
    expect(plan.mode).toBe("locked");
    expect(plan.namesNote).toBe(NAMES_LOCKED_NOTE);
    const text = json(plan);
    for (const n of [...FAKE_NAMES, "Alfio", "Bruna"]) expect(text).not.toContain(n);
    expect(plan.slots.every((s) => s.vans.length === 0)).toBe(true);
  });
  it("closed gate: nothing at all", () => {
    expect(vansFromSources({ gate: { view: "access", preview: false }, board: BOARD, roster: FIXTURE_ROSTER, slots: SLOTS })).toBeNull();
  });
  it("database refused the board: locked, roster ignored", () => {
    const plan = vansFromSources({ gate: PAGE, board: null, roster: FIXTURE_ROSTER, slots: SLOTS })!;
    expect(plan.mode).toBe("locked");
    expect(json(plan)).not.toContain("Alfio");
  });
  it("board without roster (r99 not applied): counts by team, stray names dropped", () => {
    const plan = vansFromSources({ gate: PAGE, board: BOARD, roster: null, slots: SLOTS })!;
    expect(plan.mode).toBe("no-names");
    expect(plan.namesNote).toBe(NAMES_NOT_COPIED_NOTE);
    expect(json(plan)).not.toMatch(/Alfio|ALFIO|Bruna|bruna/);
    expect(plan.slots.find((s) => s.day === "LUNEDÌ" && s.start === 1040)!.vans.length).toBe(2);
  });
  it("roster without the database's permission flag: no names", () => {
    const plan = vansFromSources({ gate: PAGE, board: BOARD, roster: { riders: FIXTURE_ROSTER.riders }, slots: SLOTS })!;
    expect(plan.mode).toBe("no-names");
    expect(json(plan)).not.toContain("Alfio");
  });
});

describe("server-rendered HTML", () => {
  const html = (plan: VanPlan) =>
    [
      ...plan.slots.map((s) => renderToStaticMarkup(<SlotVans slot={s} plan={plan} onOpen={() => {}} />)),
      ...plan.vans.map((v) => renderToStaticMarkup(<VanDetailPanel van={v} plan={plan} />)),
      renderToStaticMarkup(<VanLines plan={plan} onOpen={() => {}} />),
    ].join("\n");

  it("anonymous / preview: no names, lock line shown", () => {
    const out = html(vansFromSources({ gate: PREVIEW, board: null, roster: null, slots: SLOTS })!);
    expect(out).toContain("Nomi visibili solo con accesso del Responsabile servizio pulmini");
    for (const n of [...FAKE_NAMES, "Alfio", "Bruna"]) expect(out).not.toContain(n);
    expect(out).toContain("Pulmino 3 · Valtellina");
    expect(out).toContain("tavola linee 2026/27, da confermare");
  });

  it("allowed role fixture: names under the trainings and in the van sheet, never phones", () => {
    const out = html(vansFromSources({ gate: PAGE, board: BOARD, roster: FIXTURE_ROSTER, slots: SLOTS })!);
    for (const n of FAKE_NAMES) expect(out).toContain(n);
    expect(PHONE_PATTERN.test(out.replace(/<[^>]+>/g, " "))).toBe(false);
    for (const s of FAKE_SURNAMES) expect(out).not.toContain(s);
    expect(out).toContain("Chi c&#x27;è sempre");
    expect(out).toContain("Centro Sportivo Colico");
  });

  it("builds without riders at all (empty master)", () => {
    const plan = buildVanPlan({ riders: [], withNames: false, stops: [], slots: SLOTS, asOf: null });
    expect(plan.counts.active).toBe(0);
    expect(html(plan)).toContain("Pulmino 1 · Lago");
  });
});
