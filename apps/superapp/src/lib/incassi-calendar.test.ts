import { describe, expect, it } from "vitest";

import {
  buildIncassiMonth,
  incassiTotals,
  monthWeeks,
  shiftMonth,
  siteOf,
  unattributedPos,
  type CalendarMatch,
} from "./incassi-calendar";
import { type LedgerEntry } from "./ledger";
import { buildPrimaNota } from "./prima-nota";

const m = (
  o: Partial<CalendarMatch> & { id: string; date: string },
): CalendarMatch => ({
  time: "15:30",
  group: "prima",
  type: "CAMPIONATO",
  homeAway: "CASA",
  opponent: "Squadra Esempio",
  venue: "COLICO - CAMPO 1",
  ...o,
});
function e(
  o: Partial<LedgerEntry> & { code: string; amount: number },
): LedgerEntry {
  return {
    bookedAt: "2026-10-04T19:00:00+02:00",
    kind: "ALTRO",
    fee: 0,
    balance: null,
    category: "ENTRATA_DA_CLASSIFICARE",
    months: [],
    counterparty: null,
    family: false,
    matchState: "NON_APPLICABILE",
    linkKind: null,
    linkRef: null,
    linkLabel: null,
    verifiedAt: null,
    note: null,
    ...o,
  };
}

describe("calendar grid", () => {
  it("builds Monday-first weeks", () => {
    const w = monthWeeks("2026-10");
    expect(w[0]?.[0]).toBe("2026-09-28");
    expect(w.at(-1)?.at(-1)).toBe("2026-11-01");
    expect(w.every((x) => x.length === 7)).toBe(true);
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
  it("reads the site from the venue", () => {
    expect(siteOf("COLICO - CAMPO 2")).toBe("colico");
    expect(siteOf("Dervio - Comunale")).toBe("dervio");
    expect(siteOf("Costa Masnaga - C.S.")).toBeNull();
  });
});

describe("buildIncassiMonth", () => {
  const events = [
    m({ id: "a", date: "2026-10-04" }),
    m({ id: "b", date: "2026-10-04", group: "u15", time: "10:00" }),
    m({ id: "c", date: "2026-10-18", group: "u16" }),
    m({ id: "d", date: "2026-10-11", homeAway: "FUORI" }),
    m({ id: "e", date: "2026-10-10", group: "u15", venue: "DERVIO - CAMPO" }),
  ];
  const { rows } = buildPrimaNota([
    e({ code: "t1", amount: 180, note: "incasso biglietteria" }),
    e({ code: "c1", amount: 95.5, note: "bar club house" }),
    e({
      code: "pos",
      amount: 300,
      kind: "SUMUP_ACCREDITO",
      category: "INCASSI_SUMUP",
      counterparty: "SumUp",
    }),
  ]);
  const days = buildIncassiMonth("2026-10", events, rows, "2026-10-13");
  const day = (d: string) => days.find((x) => x.date === d);

  it("lists home matches with tariff and the tills of the site", () => {
    const d4 = day("2026-10-04");
    expect(d4?.matches.map((x) => x.match.id)).toEqual(["b", "a"]);
    expect(d4?.matches[1]?.tariff?.intero).toBe(10);
    expect(d4?.matches[0]?.office).toBe("gratuito");
    expect(d4?.tills).toEqual([
      {
        kind: "biglietteria",
        site: "colico",
        registered: 180,
        rows: 1,
        state: "registrato",
      },
      {
        kind: "club-house",
        site: "colico",
        registered: 95.5,
        rows: 1,
        state: "registrato",
      },
    ]);
    expect(day("2026-10-11")?.matches).toHaveLength(0);
  });

  it("marks past days without takings as da registrare and future ones as in programma", () => {
    expect(day("2026-10-10")?.tills).toEqual([
      {
        kind: "club-house",
        site: "dervio",
        registered: null,
        rows: 0,
        state: "da-registrare",
      },
    ]);
    expect(day("2026-10-18")?.tills.map((t) => t.state)).toEqual([
      "in-programma",
      "in-programma",
    ]);
  });

  it("totals the month and keeps POS credits apart", () => {
    const t = incassiTotals(days);
    expect(t).toEqual({
      registered: 275.5,
      ticketing: 180,
      clubHouse: 95.5,
      toRegister: 1,
      planned: 2,
      matches: 4,
      ticketedMatches: 2,
    });
    expect(unattributedPos(rows, "2026-10")).toEqual({ count: 1, total: 300 });
  });
});
