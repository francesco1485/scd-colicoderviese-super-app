import { describe, expect, it } from "vitest";

import {
  byCategory,
  deadlineCalendar,
  familyNext,
  feeTotals,
  filterCount,
  filterPositions,
  itDateTime,
  nextInstalment,
  parseFeeBoard,
  parseMyFees,
  schedule,
  type FeePosition,
} from "./fees";

function pos(over: Partial<FeePosition>): FeePosition {
  return {
    code: "A1", name: null, birthYear: 2015, category: "Pulcini", feeTotal: 300, paid: 0, residual: 300, overdue: 0,
    status: null, override: null, group: "REGOLARE", noticeSent: true, noticeDate: null, plan: null, instalments: [],
    fund: false, familyRule: null, action: null, linked: false, ...over,
  };
}

describe("parseFeeBoard", () => {
  it("reads the database shape and drops invalid rows", () => {
    const b = parseFeeBoard({
      season: "2026/27",
      sync: { synced_at: "2026-10-12T08:00:00Z", source_modified_at: null, counts: { positions: 2, linked: 1 } },
      positions: [
        { code: "X1", name: "Nome Prova", feeTotal: "350.00", paid: 100, residual: 250, overdue: 0, group: "REGOLARE", plan: "2 RATE", instalments: [175, "175"], fund: true, linked: true },
        { code: "", group: "SALDATO" },
        { code: "X2", group: "WEIRD", plan: "4 RATE", instalments: null },
      ],
    });
    expect(b?.sync).toEqual({ syncedAt: "2026-10-12T08:00:00Z", sourceModifiedAt: null, positions: 2, linked: 1 });
    expect(b?.positions).toHaveLength(2);
    expect(b?.positions[0]).toMatchObject({ code: "X1", feeTotal: 350, instalments: [175, 175], fund: true, linked: true, plan: "2 RATE" });
    expect(b?.positions[1]).toMatchObject({ code: "X2", group: "DA_VERIFICARE", plan: null, instalments: [] });
  });

  it("returns null for anything that is not an object (not office staff)", () => {
    expect(parseFeeBoard(null)).toBeNull();
    expect(parseFeeBoard([])).toBeNull();
  });
});

describe("parseMyFees", () => {
  it("never shows excluded positions to families", () => {
    const f = parseMyFees([
      { personId: "p1", name: "A", group: "SALDATO", feeTotal: 300, paid: 300 },
      { personId: "p2", name: "B", group: "ESCLUSO" },
      { name: "no id" },
    ]);
    expect(f.map((x) => x.personId)).toEqual(["p1"]);
  });
});

describe("feeTotals", () => {
  it("sums in cents and keeps excluded positions out of the money", () => {
    const t = feeTotals([
      pos({ code: "1", feeTotal: 0.1, paid: 0.2, residual: -0.1, group: "SALDATO", linked: true }),
      pos({ code: "2", feeTotal: 0.2, paid: 0, residual: 0.2, overdue: 0.2, group: "IN_RITARDO", fund: true }),
      pos({ code: "3", feeTotal: 1000, paid: 0, residual: 1000, group: "ESCLUSO" }),
    ]);
    expect(t.feeTotal).toBe(0.3);
    expect(t.paid).toBe(0.2);
    expect(t.overdue).toBe(0.2);
    expect(t).toMatchObject({ counted: 2, excluded: 1, late: 1, linked: 1, fund: 1 });
    expect(t.groups.ESCLUSO).toBe(1);
  });
});

describe("byCategory", () => {
  it("groups by category, oldest first, unknown category last", () => {
    const rows = byCategory([
      pos({ code: "1", category: "Pulcini", birthYear: 2016 }),
      pos({ code: "2", category: null, birthYear: 2010 }),
      pos({ code: "3", category: "Allievi", birthYear: 2010, overdue: 50, group: "IN_RITARDO" }),
      pos({ code: "4", category: "Pulcini", birthYear: 2017, group: "DA_COMUNICARE" }),
      pos({ code: "5", category: "Prima squadra", group: "ESCLUSO" }),
    ]);
    expect(rows.map((r) => r.category)).toEqual(["Allievi", "Pulcini", "Categoria da verificare"]);
    expect(rows[0]).toMatchObject({ people: 1, overdue: 50, late: 1 });
    expect(rows[1]).toMatchObject({ people: 2, feeTotal: 600, toCheck: 1 });
  });
});

describe("filterPositions", () => {
  const list = [
    pos({ code: "B", group: "REGOLARE" }),
    pos({ code: "C", group: "IN_RITARDO", overdue: 10 }),
    pos({ code: "D", group: "IN_RITARDO", overdue: 90, name: "Élise Rossi" }),
    pos({ code: "E", group: "DA_COMUNICARE" }),
  ];
  it("work list: late first (most overdue first), then to communicate", () => {
    expect(filterPositions(list, "lavoro", "").map((p) => p.code)).toEqual(["D", "C", "E"]);
    expect(filterCount(list, "tutti")).toBe(4);
  });
  it("search ignores accents and case", () => {
    expect(filterPositions(list, "tutti", "elise").map((p) => p.code)).toEqual(["D"]);
  });
});

describe("schedule", () => {
  const p = { plan: "3 RATE" as const, instalments: [100, 100, 100], paid: 150 };
  it("maps amounts to the season dates and covers them in order", () => {
    const s = schedule(p, "2026/27", "2026-11-05");
    expect(s.map((i) => [i.due, i.covered, i.late])).toEqual([
      ["2026-10-15", true, false],
      ["2026-10-31", false, true],
      ["2026-11-30", false, false],
    ]);
    expect(nextInstalment(p, "2026/27", "2026-11-05")?.n).toBe(2);
  });
  it("has no dates for an unknown season or plan", () => {
    expect(schedule({ plan: null, instalments: [300], paid: 0 }, "2026/27", "2026-10-12")[0]?.due).toBeNull();
    expect(schedule(p, "2030/31", "2026-10-12")[0]?.due).toBeNull();
  });
});

describe("deadlineCalendar", () => {
  it("lists every season date with open amounts", () => {
    const cal = deadlineCalendar([
      pos({ code: "1", plan: "2 RATE", instalments: [150, 150], paid: 150 }),
      pos({ code: "2", plan: "UNICA", instalments: [280], paid: 0 }),
      pos({ code: "3", plan: "UNICA", instalments: [280], paid: 0, group: "ESCLUSO" }),
    ], "2026/27", "2026-10-12");
    expect(cal.map((r) => r.due)).toEqual(["2026-10-15", "2026-10-31", "2026-11-30"]);
    expect(cal[0]).toMatchObject({ people: 1, amount: 150, open: 0 });
    expect(cal[1]).toMatchObject({ people: 1, amount: 280, open: 280 });
    expect(cal[2]).toMatchObject({ people: 1, open: 150 });
  });
});

describe("familyNext", () => {
  const base = { personId: "p", name: "A", feeTotal: 300, paid: 0, residual: 300, overdue: 0, group: "REGOLARE" as const, plan: "2 RATE" as const, instalments: [150, 150], noticeSent: true };
  it("tells the next instalment in plain words", () => {
    expect(familyNext(base, "2026/27", "2026-10-12")).toBe("Prossima rata entro il 15/10/2026: 150,00 €.");
    expect(familyNext({ ...base, group: "IN_RITARDO" }, "2026/27", "2026-10-20")).toContain("Rata scaduta il 15/10/2026");
  });
  it("never shows amounts before the fee is communicated", () => {
    expect(familyNext({ ...base, noticeSent: false }, "2026/27", "2026-10-12")).toBe("La segreteria ti invierà importo e scadenze.");
    expect(familyNext({ ...base, group: "SALDATO" }, "2026/27", "2026-10-12")).toBe("Quota saldata. Grazie!");
  });
});

describe("itDateTime", () => {
  it("formats in Rome time", () => {
    expect(itDateTime("2026-10-12T04:10:00Z")).toBe("12/10/2026 alle 06:10");
    expect(itDateTime("bad")).toBe("—");
  });
});
