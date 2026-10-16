import { describe, expect, it } from "vitest";

import { CLUB_EVENTS } from "./club-events";
import { FEE_DEADLINES } from "./fees";
import type { KbItem } from "./knowledge";
import { loadCalendar, type PublicEvent, type PublicGroup } from "./public-snapshots";
import {
  SEASON,
  buildSeasonPlan,
  calendarCoverage,
  coversMonth,
  dayHeading,
  daysOfMonth,
  defaultMonth,
  eventItems,
  feeItems,
  filterPlan,
  isPlanFilter,
  knowledgeItems,
  matchItems,
  mergePlan,
  monthCounts,
  monthLabel,
  seasonMonths,
  sgsItems,
  stepMonth,
  upcomingDeadlines,
  type PlanInput,
} from "./season-planning";
import { SGS_RULES, deadlinesFor, type Level } from "./sgs-quality";
import { TOURNAMENTS, type TournamentEdition } from "./tournaments";

const group: PublicGroup = { id: "u15", label: "U15 · Giovanissimi", color: "#2a9cb7", logo: null, years: [], count: 0 };
const ev = (over: Partial<PublicEvent>): PublicEvent => ({
  id: "E1",
  date: "2026-10-18",
  time: "10:30",
  group: "u15",
  category: "U15 Giovanissimi",
  type: "CAMPIONATO",
  homeAway: "CASA",
  opponent: "DUBINO",
  venue: "COLICO - CAMPO 1",
  round: "5A",
  source: "FIGC/LND",
  status: "OFFICIAL_CALENDAR",
  isVariation: false,
  notice: [],
  timeConfirmed: true,
  venueConfirmed: true,
  facilityReview: false,
  ...over,
});
const kb = (over: Partial<KbItem>): KbItem => ({
  id: "k1",
  kind: "DOCUMENTO",
  area: "SEGRETERIA",
  season: "2026/27",
  title: "Rinnovo affiliazione",
  summary: null,
  entity: "LND",
  date: null,
  due: "2026-11-05",
  status: "APERTO",
  amount: null,
  source: "Drive",
  link: null,
  tags: [],
  ...over,
});

const baseInput = (over: Partial<PlanInput> = {}): PlanInput => ({
  today: "2026-10-16",
  calendar: { events: [ev({})], groups: [group], sourceModifiedAt: "2026-10-15T09:47:00Z", origin: "fallback" },
  tournaments: TOURNAMENTS,
  clubEvents: CLUB_EVENTS,
  feeDeadlines: FEE_DEADLINES["2026/27"],
  sgs: { deadlines: deadlinesFor(3, "2026-10-16"), level: 3 },
  knowledge: [kb({})],
  ...over,
});

describe("season frame", () => {
  it("has twelve months from July 2026 to June 2027", () => {
    const m = seasonMonths();
    expect(m).toHaveLength(12);
    expect(m[0]).toMatchObject({ key: "2026-07", label: "Luglio", year: 2026 });
    expect(m[11]).toMatchObject({ key: "2027-06", label: "Giugno", year: 2027 });
    expect(new Set(m.map((x) => x.key)).size).toBe(12);
  });

  it("opens on today's month, clamped to the season", () => {
    expect(defaultMonth("2026-10-16")).toBe("2026-10");
    expect(defaultMonth("2026-05-01")).toBe("2026-07");
    expect(defaultMonth("2027-09-01")).toBe("2027-06");
  });

  it("steps months inside the season only", () => {
    expect(stepMonth("2026-10", 1)).toBe("2026-11");
    expect(stepMonth("2026-12", 1)).toBe("2027-01");
    expect(stepMonth("2026-07", -1)).toBeNull();
    expect(stepMonth("2027-06", 1)).toBeNull();
    expect(monthLabel("2027-01")).toBe("Gennaio 2027");
  });

  it("writes Italian day headings", () => {
    expect(dayHeading("2026-12-08")).toBe("Martedì 8 dicembre");
    expect(dayHeading("2026-10-17")).toBe("Sabato 17 ottobre");
  });

  it("accepts only the four filters", () => {
    expect(isPlanFilter("gare")).toBe(true);
    expect(isPlanFilter("partite")).toBe(false);
    expect(isPlanFilter(undefined)).toBe(false);
  });
});

describe("sources to rows", () => {
  it("turns official matches into rows with our team, opponent, place and team colour", () => {
    const [m] = matchItems([ev({})], [group], () => "#217c92");
    expect(m).toMatchObject({ kind: "gara", origin: "calendario", date: "2026-10-18", time: "10:30", color: "#217c92", href: "/calendario" });
    expect(m!.title).toMatch(/^ColicoDerviese U15 vs /);
    expect(m!.place?.replace(/\u00a0/g, " ")).toBe("Colico - Campo 1");
    const away = matchItems([ev({ homeAway: "FUORI", id: "E2" })], [group])[0]!;
    expect(away.title).toMatch(/ vs ColicoDerviese U15$/);
  });

  it("keeps matches outside the season and malformed times out", () => {
    const rows = matchItems([ev({ date: "2027-07-02" }), ev({ id: "E3", time: "da definire" })], [group]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.time).toBeNull();
  });

  it("lists dated tournaments once (Christmas Lario Cup is both a tournament and a club event) and returns undated apart", () => {
    const { dated, undated } = eventItems(TOURNAMENTS, CLUB_EVENTS);
    const dec8 = dated.filter((d) => d.date === "2026-12-08");
    // Maschile and Female Edition are two tournaments on the same day; the club event duplicates them.
    expect(dec8.map((d) => d.title)).toEqual(["Christmas Lario Cup", "Christmas Lario Cup Female"]);
    expect(dated.some((d) => d.id === "evento:christmas-lario-cup-2026")).toBe(false);
    expect(dated.find((d) => d.id === "torneo:memorial-jose-nasazzi")?.detail).toContain("date da confermare");
    expect(undated.map((t) => t.id)).toContain("memorial-sandro-guattini");
  });

  it("keeps a club event that no tournament covers", () => {
    const only: TournamentEdition[] = [];
    const { dated } = eventItems(only, CLUB_EVENTS);
    expect(dated).toHaveLength(1);
    expect(dated[0]).toMatchObject({ id: "evento:christmas-lario-cup-2026", kind: "evento", href: "/eventi/christmas-lario-cup" });
  });

  it("groups fee instalments by day with every plan due that day", () => {
    const rows = feeItems(FEE_DEADLINES["2026/27"]);
    expect(rows.map((r) => r.date).sort()).toEqual(["2026-10-15", "2026-10-31", "2026-11-30"]);
    const oct31 = rows.find((r) => r.date === "2026-10-31")!;
    expect(oct31.detail).toBe("unica soluzione · 2ª rata di 3 rate");
    expect(rows.find((r) => r.date === "2026-10-15")!.detail).toBe("1ª rata di 2 rate · 1ª rata di 3 rate");
    expect(feeItems(undefined)).toEqual([]);
  });

  it("marks SGS deadlines as federal for the target level only", () => {
    const level = SGS_RULES.targetLevel as Level;
    const rows = sgsItems(deadlinesFor(level, "2026-10-16"));
    expect(rows.length).toBe(SGS_RULES.deadlines.filter((d) => d.fromLevel <= level).length);
    expect(rows.every((r) => r.federal && r.kind === "scadenza" && r.origin === "sgs")).toBe(true);
    expect(sgsItems(deadlinesFor(1, "2026-10-16")).some((r) => r.id === "sgs:progetto-qualificante")).toBe(false);
  });

  it("keeps Cervellone deadlines inside the season and flags federal bodies", () => {
    const rows = knowledgeItems([kb({}), kb({ id: "k2", entity: "Comune di Dervio", due: "2026-12-01T00:00:00Z" }), kb({ id: "k3", due: null }), kb({ id: "k4", due: "2027-08-01" })]);
    expect(rows.map((r) => r.id)).toEqual(["kb:k1", "kb:k2"]);
    expect(rows[0]!.federal).toBe(true);
    expect(rows[1]).toMatchObject({ federal: false, date: "2026-12-01" });
  });
});

describe("aggregation", () => {
  it("orders by day, deadlines and events before matches, then time; duplicate ids once", () => {
    const a = matchItems([ev({ id: "A", time: "15:00" }), ev({ id: "B", time: "09:00" })], [group]);
    const f = feeItems({ UNICA: ["2026-10-18"] });
    const merged = mergePlan(a, f, a);
    expect(merged.map((i) => i.id)).toEqual(["quote:2026-10-18", "gara:B", "gara:A"]);
  });

  it("filters by kind and groups a month by day", () => {
    const plan = buildSeasonPlan(baseInput());
    expect(filterPlan(plan.items, "gare").every((i) => i.kind === "gara")).toBe(true);
    expect(filterPlan(plan.items, "eventi").every((i) => i.kind === "evento")).toBe(true);
    expect(filterPlan(plan.items, "scadenze").every((i) => i.kind === "scadenza")).toBe(true);
    expect(filterPlan(plan.items, "tutto")).toHaveLength(plan.items.length);
    const dec = daysOfMonth(plan.items, "2026-12");
    expect(dec.find((d) => d.day === "2026-12-08")?.items.length).toBe(2);
    expect(dec.map((d) => d.day)).toEqual([...dec.map((d) => d.day)].sort());
  });

  it("counts every season month", () => {
    const plan = buildSeasonPlan(baseInput());
    expect(plan.counts).toHaveLength(12);
    const oct = plan.counts.find((c) => c.key === "2026-10")!;
    expect(oct.gare).toBe(1);
    expect(oct.scadenze).toBeGreaterThanOrEqual(2);
    // No calendar read: matches are unknown in every month, never 0.
    expect(monthCounts([], seasonMonths()).every((c) => c.gare === null && c.eventi === 0 && c.scadenze === 0)).toBe(true);
  });

  it("marks months outside the published calendar as unknown for matches", () => {
    const plan = buildSeasonPlan(baseInput({ calendar: { ...loadCalendar(), origin: "fallback" } }));
    expect(plan.coverage).toEqual({ from: "2026-09", to: "2027-05" });
    const by = new Map(plan.counts.map((c) => [c.key, c]));
    expect(by.get("2026-08")!.gare).toBeNull();
    expect(by.get("2027-06")!.gare).toBeNull();
    expect(by.get("2026-10")!.gare).toBeGreaterThan(0);
    expect(coversMonth(plan.coverage, "2027-01")).toBe(true);
    expect(coversMonth(null, "2027-01")).toBe(false);
    expect(calendarCoverage([])).toBeNull();
  });

  it("counts deadlines from today to 30 days ahead, inclusive", () => {
    const rows = feeItems({ X: ["2026-10-15", "2026-10-16", "2026-11-15", "2026-11-16"] });
    expect(upcomingDeadlines(rows, "2026-10-16").map((r) => r.date)).toEqual(["2026-10-16", "2026-11-15"]);
  });

  it("KPIs: matches unknown without calendar, partial due count without Cervellone", () => {
    const full = buildSeasonPlan(baseInput());
    expect(full.kpis.matches).toBe(1);
    expect(full.kpis.events).toBe(3);
    // LND/CRL deadlines are not connected yet, so the due count stays partial even with every other source.
    expect(full.kpis.duePartial).toBe(true);
    // 31/10 fees + SGS level-3 deadlines on 31/10 + Cervellone 05/11 + fee 30/11? (outside 30 days) — computed, not hard-coded.
    expect(full.kpis.dueSoon).toBe(upcomingDeadlines(full.items, "2026-10-16").length);
    expect(full.kpis.dueSoon).toBeGreaterThan(0);

    const none = buildSeasonPlan(baseInput({ calendar: null, knowledge: null }));
    expect(none.kpis.matches).toBeNull();
    expect(none.kpis.duePartial).toBe(true);
    expect(none.sources.find((s) => s.id === "calendario")).toMatchObject({ state: "da collegare", master: "Master Calendario 2026/27" });
    expect(none.sources.find((s) => s.id === "cervellone")).toMatchObject({ state: "da collegare", master: "SCD CERVELLONE · Catalogo e Memoria (Drive)" });
    expect(none.sources.find((s) => s.id === "lnd")?.state).toBe("da collegare");
  });

  it("works on the real bundled calendar: every match inside the season, nothing invented", () => {
    const cal = loadCalendar();
    const plan = buildSeasonPlan(baseInput({ calendar: { ...cal, origin: "fallback" } }));
    const games = plan.items.filter((i) => i.kind === "gara");
    expect(games.length).toBe(cal.events.filter((e) => e.date >= SEASON.from && e.date <= SEASON.to).length);
    expect(games.every((g) => g.date >= SEASON.from && g.date <= SEASON.to)).toBe(true);
    expect(plan.sources.find((s) => s.id === "calendario")?.note).toBe("copia di sicurezza inclusa nell'app");
  });

  it("due count is partial while any deadline source is not connected, and flags Cervellone failures", () => {
    const plan = buildSeasonPlan(baseInput());
    const lnd = plan.sources.find((x) => x.id === "lnd");
    expect(lnd?.state).toBe("da collegare");
    expect(plan.kpis.duePartial).toBe(true);

    const failed = buildSeasonPlan(baseInput({ knowledge: null, knowledgeStatus: "error" }));
    expect(failed.sources.find((x) => x.id === "cervellone")).toMatchObject({ state: "da collegare", note: "lettura non riuscita, riprova" });
    expect(failed.kpis.duePartial).toBe(true);

    const truncated = buildSeasonPlan(baseInput({ knowledgeStatus: "truncated" }));
    expect(truncated.sources.find((x) => x.id === "cervellone")?.note).toBe("parziale: troppe voci, mostrate solo le prime");
    expect(truncated.kpis.duePartial).toBe(true);
  });
});
