import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { loadCalendar } from "./public-snapshots";
import { teamCodeForGroup } from "./roster";
import {
  GAP_KINDS,
  MONTHLY_CHECK_PLAN,
  REQUIRED_MATCH_ITEMS,
  gapCounts,
  gapRequestItems,
  isMonth,
  monthLabel,
  monthStart,
  monthlyGaps,
  previousMonth,
  type CalendarMatch,
  type MatchStatusRow,
  type MonthlyInput,
} from "./monthly-check";

const label = (code: string) => code.toUpperCase();
const base = (over: Partial<MonthlyInput> = {}): MonthlyInput => ({
  month: "2026-10",
  today: "2026-11-01",
  matches: [],
  statuses: [],
  sessions: [],
  teamCodeOf: (g) => g,
  teamLabel: label,
  ...over,
});
const m = (id: string, date: string, group = "u15", type = "CAMPIONATO", opponent = "ESEMPIO CALCIO"): CalendarMatch => ({ id, date, group, type, opponent });
const complete = (id: string): MatchStatusRow => ({ sourceRecordId: id, callupsSent: 18, sheetStatus: "READY", tabellino: true, hasSummary: true, hasReferto: true });

describe("monthly check (UD-181)", () => {
  it("has a planned schedule that is NOT active", () => {
    expect(MONTHLY_CHECK_PLAN.cron).toBe("0 8 1 * *");
    expect(MONTHLY_CHECK_PLAN.timezone).toBe("Europe/Rome");
    expect(MONTHLY_CHECK_PLAN.status).toBe("PROPOSED_NOT_SCHEDULED");
  });

  it("handles months", () => {
    expect(isMonth("2026-10")).toBe(true);
    expect(isMonth("2026-13")).toBe(false);
    expect(previousMonth("2026-11-01")).toBe("2026-10");
    expect(previousMonth("2027-01-01")).toBe("2026-12");
    expect(monthStart("2026-10")).toBe("2026-10-01");
    expect(monthLabel("2026-10")).toBe("Ottobre 2026");
    expect(monthlyGaps(base({ month: "ottobre" }))).toEqual([]);
  });

  it("asks for everything when a played match has no record at all (unknown is never complete)", () => {
    const out = monthlyGaps(base({ matches: [m("ev-1", "2026-10-12")] }));
    expect(out).toHaveLength(1);
    expect(out[0]!.teamCode).toBe("u15");
    expect(out[0]!.items.map((i) => i.kind)).toEqual([...REQUIRED_MATCH_ITEMS]);
    expect(out[0]!.items[0]!.label).toBe("U15 contro Esempio Calcio del 12/10: manca la convocazione");
    expect(out[0]!.items.every((i) => i.ref === "ev-1" && i.label.length <= 160)).toBe(true);
  });

  it("lists only what is missing and leaves complete teams out", () => {
    const out = monthlyGaps(
      base({
        matches: [m("ev-1", "2026-10-12"), m("ev-2", "2026-10-19", "u16")],
        statuses: [
          { ...complete("ev-1"), sheetStatus: "DRAFT", hasReferto: false },
          complete("ev-2"),
        ],
      }),
    );
    expect(out.map((t) => t.teamCode)).toEqual(["u15"]);
    expect(out[0]!.items.map((i) => i.kind)).toEqual(["DISTINTA", "REFERTO"]);
    expect(out[0]!.items[0]!.label).toContain("manca la distinta pronta");
  });

  it("checks only played matches of the month and only single-match types", () => {
    const out = monthlyGaps(
      base({
        today: "2026-10-20",
        month: "2026-10",
        matches: [
          m("ev-sep", "2026-09-28"),
          m("ev-today", "2026-10-20"),
          m("ev-next", "2026-10-26"),
          m("ev-tor", "2026-10-05", "u15", "TORNEO"),
          m("ev-other", "2026-10-05", "other"),
          m("ev-ok", "2026-10-05", "u15", "AMICHEVOLE"),
        ],
      }),
    );
    expect(out.flatMap((t) => t.items.map((i) => i.ref))).toEqual(Array(REQUIRED_MATCH_ITEMS.length).fill("ev-ok"));
  });

  it("asks for attendance of held sessions with nothing recorded", () => {
    const out = monthlyGaps(
      base({
        sessions: [
          { id: "s1", teamCode: "2015", startsAt: "2026-10-07T15:30:00Z", status: "DONE", recorded: 14 },
          { id: "s2", teamCode: "2015", startsAt: "2026-10-09T15:30:00Z", status: "PLANNED", recorded: 0 },
          { id: "s3", teamCode: "2015", startsAt: "2026-10-14T15:30:00Z", status: "CANCELLED", recorded: 0 },
          // 31/10 23:30 UTC is already 1 November in Rome: not this month
          { id: "s4", teamCode: "2015", startsAt: "2026-10-31T23:30:00Z", status: "PLANNED", recorded: 0 },
        ],
      }),
    );
    expect(out).toEqual([{ teamCode: "2015", label: "2015", items: [{ kind: "PRESENZE", ref: "s2", label: "2015, allenamento del 09/10: mancano le presenze" }] }]);
  });

  it("works for teams created later: no team is hard-coded", () => {
    const out = monthlyGaps(base({ matches: [m("ev-x", "2026-10-03", "u13-femminile")], required: ["REFERTO"] }));
    expect(out).toEqual([{ teamCode: "u13-femminile", label: "U13-FEMMINILE", items: [{ kind: "REFERTO", ref: "ev-x", label: "U13-FEMMINILE contro Esempio Calcio del 03/10: manca il referto" }] }]);
  });

  it("flattens and counts for the requests", () => {
    const gaps = monthlyGaps(base({ matches: [m("ev-1", "2026-10-12")], sessions: [{ id: "s2", teamCode: "u15", startsAt: "2026-10-09T15:30:00Z", status: "DONE", recorded: 0 }] }));
    const items = gapRequestItems(gaps);
    expect(items).toHaveLength(REQUIRED_MATCH_ITEMS.length + 1);
    expect(items.every((i) => i.teamCode === "u15" && (GAP_KINDS as readonly string[]).includes(i.kind))).toBe(true);
    const counts = gapCounts(gaps);
    expect(counts.PRESENZE).toBe(1);
    expect(counts.REFERTO).toBe(1);
  });

  it("runs on the real calendar copy without names of people", () => {
    const cal = loadCalendar();
    const first = cal.events.find((e) => e.group !== "other" && e.type === "CAMPIONATO");
    expect(first).toBeDefined();
    const month = first!.date.slice(0, 7);
    const out = monthlyGaps({
      month,
      today: "2027-07-01",
      matches: cal.events,
      statuses: [],
      sessions: [],
      teamCodeOf: teamCodeForGroup,
      teamLabel: label,
    });
    expect(out.length).toBeGreaterThan(0);
    for (const t of out) for (const i of t.items) expect(i.label).not.toMatch(/@|\d{6,}/);
  });

  it("matches the item kinds accepted by r118", () => {
    const sql = readFileSync(resolve(__dirname, "../../../../supabase/migrations/20261017_r118_area_allenamenti.sql"), "utf8");
    const check = /item_kind in \(([^)]*)\)/.exec(sql)?.[1] ?? "";
    expect(check.split(",").map((s) => s.trim().replace(/'/g, ""))).toEqual([...GAP_KINDS]);
  });
});
