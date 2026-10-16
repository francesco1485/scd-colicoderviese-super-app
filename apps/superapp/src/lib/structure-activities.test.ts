import { describe, expect, it } from "vitest";

import type { PublicEvent, TrainingSlot } from "./public-snapshots";
import {
  activityItem,
  buildStructureWeek,
  homeVenue,
  parseStructureActivities,
  siteBadge,
  siteCount,
  structureWindow,
  type StructureActivity,
} from "./structure-activities";

const slot = (day: string, timeLabel: string, C1: string, C2 = ""): TrainingSlot => ({
  day,
  timeLabel,
  start: 0,
  fields: { C1, C2 },
  rooms: { SP1: "", SP2: "", SP3: "", SP4: "" },
});

const event = (p: Partial<PublicEvent>): PublicEvent => ({
  id: "E1",
  date: "2026-10-17",
  time: "15:00",
  group: "u15",
  category: "Giovanissimi U15",
  type: "CAMPIONATO",
  homeAway: "CASA",
  opponent: "ALTRA SQUADRA",
  venue: "COLICO - CAMPO 1",
  round: "1A",
  source: "FIGC/LND",
  status: "OFFICIAL_CALENDAR",
  isVariation: false,
  notice: [],
  timeConfirmed: true,
  venueConfirmed: true,
  facilityReview: false,
  ...p,
});

const act = (p: Partial<StructureActivity>): StructureActivity => ({
  id: "11111111-1111-4111-8111-111111111111",
  site: "COLICO",
  area: "CLUB_HOUSE",
  kind: "ATTIVITA_SERALE",
  title: "Serata soci",
  startsAt: "2026-10-16T17:00:00Z", // 19:00 in Rome (CEST)
  endsAt: "2026-10-16T21:00:00Z",
  responsibleRole: "responsabile-club-house",
  covered: true,
  status: "PREVISTA",
  notes: null,
  ...p,
});

// Friday 16 October 2026: the week runs from Monday 12 to Sunday 18.
const TODAY = "2026-10-16";

describe("week grouping of Attività in struttura", () => {
  it("builds Monday to Sunday of today's week, both sites, seven days each", () => {
    const w = buildStructureWeek({ today: TODAY, offset: 0, slots: [], events: [], activities: null });
    expect(w.from).toBe("2026-10-12");
    expect(w.to).toBe("2026-10-18");
    expect(w.days).toHaveLength(7);
    expect(w.sites.COLICO.map((d) => d.date)).toEqual(w.days);
    expect(w.sites.DERVIO.map((d) => d.date)).toEqual(w.days);
    expect(buildStructureWeek({ today: TODAY, offset: 1, slots: [], events: [], activities: null }).from).toBe("2026-10-19");
  });

  it("puts quadro trainings on Colico fields of the right weekday, sorted by time", () => {
    const slots = [slot("VENERDÌ", "18:30–20:00", "U15 2012/2013", "U19"), slot("VENERDÌ", "17:00–18:30", "Pulcini 2016-2017"), slot("LUNEDÌ", "17:00–18:30", "U12 2015")];
    const w = buildStructureWeek({ today: TODAY, offset: 0, slots, events: [], activities: null });
    const fri = w.sites.COLICO.find((d) => d.date === "2026-10-16")!;
    expect(fri.items.map((i) => [i.start, i.place, i.kind])).toEqual([
      ["17:00", "Campo 1", "ALLENAMENTO"],
      ["18:30", "Campo 1", "ALLENAMENTO"],
      ["18:30", "Campo 2", "ALLENAMENTO"],
    ]);
    expect(w.sites.COLICO.find((d) => d.date === "2026-10-12")!.items).toHaveLength(1);
    // The quadro has no Dervio rows and no weekend rows.
    expect(w.sites.DERVIO.every((d) => d.items.length === 0)).toBe(true);
    expect(w.sites.COLICO.find((d) => d.date === "2026-10-17")!.items).toHaveLength(0);
  });

  it("keeps only home matches at the club's centres inside the week", () => {
    const events = [
      event({ id: "A" }),
      event({ id: "B", venue: "DERVIO - CAMPO 1", date: "2026-10-18", time: "10:30" }),
      event({ id: "C", homeAway: "FUORI", venue: "Lecco - Stadio" }),
      event({ id: "D", date: "2026-10-25" }),
      event({ id: "E", venue: "Lecco - Stadio" }),
    ];
    const w = buildStructureWeek({ today: TODAY, offset: 0, slots: [], events, activities: null });
    const colico = w.sites.COLICO.flatMap((d) => d.items);
    const dervio = w.sites.DERVIO.flatMap((d) => d.items);
    expect(colico.map((i) => i.id)).toEqual(["cal-A"]);
    expect(colico[0]!).toMatchObject({ kind: "GARA", place: "Campo 1", title: "Giovanissimi U15 · con ALTRA SQUADRA", source: "CALENDARIO" });
    expect(dervio.map((i) => i.id)).toEqual(["cal-B"]);
  });

  it("places r135 activities on their Rome day and time", () => {
    const late = act({ id: "22222222-2222-4222-8222-222222222222", startsAt: "2026-10-18T22:30:00Z", endsAt: "2026-10-18T23:00:00Z", site: "DERVIO" });
    expect(activityItem(late)).toMatchObject({ date: "2026-10-19", start: "00:30" }); // Monday in Rome, next week
    const w = buildStructureWeek({ today: TODAY, offset: 0, slots: [], events: [], activities: [act({}), late] });
    const fri = w.sites.COLICO.find((d) => d.date === "2026-10-16")!;
    expect(fri.items[0]).toMatchObject({ start: "19:00", end: "23:00", place: "Club House", covered: null, source: "STRUTTURA" });
    expect(w.sites.DERVIO.flatMap((d) => d.items)).toHaveLength(0);
  });

  it("KPIs: shift numbers are unknown (null) while r135 is not readable, never zero", () => {
    const w = buildStructureWeek({ today: TODAY, offset: 0, slots: [slot("LUNEDÌ", "17:00–18:30", "U12")], events: [event({})], activities: null });
    expect(w.kpi).toEqual({ activities: 2, uncoveredShifts: null, clubHouseEvenings: null });
  });

  it("KPIs: uncovered shifts and distinct Club House evenings, cancelled rows excluded", () => {
    const activities = [
      act({}),
      act({ id: "33333333-3333-4333-8333-333333333333", kind: "EVENTO", startsAt: "2026-10-16T18:00:00Z", endsAt: "2026-10-16T20:00:00Z" }), // same evening
      act({ id: "44444444-4444-4444-8444-444444444444", area: "CAMPO", kind: "APERTURA", startsAt: "2026-10-17T05:30:00Z", endsAt: "2026-10-17T06:00:00Z", covered: false }),
      act({ id: "55555555-5555-4555-8555-555555555555", area: "SPOGLIATOI", kind: "CHIUSURA", startsAt: "2026-10-17T20:00:00Z", endsAt: "2026-10-17T20:30:00Z", covered: true }),
      act({ id: "66666666-6666-4666-8666-666666666666", area: "PALESTRA", kind: "TURNO_VOLONTARIO", startsAt: "2026-10-14T16:00:00Z", endsAt: "2026-10-14T18:00:00Z", covered: false, status: "ANNULLATA" }),
      act({ id: "77777777-7777-4777-8777-777777777777", kind: "ATTIVITA_SERALE", startsAt: "2026-10-13T17:00:00Z", endsAt: "2026-10-13T19:00:00Z", site: "DERVIO" }),
    ];
    const w = buildStructureWeek({ today: TODAY, offset: 0, slots: [], events: [], activities });
    expect(w.kpi).toEqual({ activities: 5, uncoveredShifts: 1, clubHouseEvenings: 2 });
    expect(siteCount(w, "COLICO")).toBe(4);
    expect(siteCount(w, "DERVIO")).toBe(1);
    const shift = w.sites.COLICO.flatMap((d) => d.items).find((i) => i.kind === "APERTURA")!;
    expect(shift).toMatchObject({ covered: false, start: "07:30", responsibleRole: "responsabile-club-house" });
    expect(w.sites.COLICO.flatMap((d) => d.items).find((i) => i.kind === "TURNO_VOLONTARIO")!.cancelled).toBe(true);
  });

  it("Dervio with no home matches never yields 0 as a display value (its trainings are unknown)", () => {
    const slots = [slot("LUNEDÌ", "17:00–18:30", "U12")];
    for (const activities of [null, []] as const) {
      const w = buildStructureWeek({ today: TODAY, offset: 0, slots, events: [], activities });
      const b = siteBadge(w, "DERVIO");
      expect(b.value).toBe("—");
      expect(b.value).not.toBe("0");
      expect(b.srText).toBe("dato non completo");
      expect(b.note).toBeNull();
      // Colico is complete for what the Quadro knows: its number shows as it is.
      expect(siteBadge(w, "COLICO")).toEqual({ value: "1", note: null, srText: null });
    }
    // An away match or a match at Colico does not make Dervio known.
    const w = buildStructureWeek({
      today: TODAY,
      offset: 0,
      slots: [],
      events: [event({ id: "A", homeAway: "FUORI", venue: "DERVIO - CAMPO 1" }), event({ id: "B" })],
      activities: [],
    });
    expect(siteBadge(w, "DERVIO").value).toBe("—");
    expect(siteBadge(w, "COLICO").value).toBe("1");
  });

  it("Dervio with home matches shows the number with 'solo gare'; with r135 rows it is 'parziale'", () => {
    const events = [event({ id: "B", venue: "DERVIO - CAMPO 1", date: "2026-10-18", time: "10:30" })];
    const onlyMatches = buildStructureWeek({ today: TODAY, offset: 0, slots: [], events, activities: null });
    expect(siteBadge(onlyMatches, "DERVIO")).toEqual({ value: "1", note: "solo gare", srText: "dato non completo: allenamenti non presenti nel quadro" });
    const mixed = buildStructureWeek({
      today: TODAY,
      offset: 0,
      slots: [],
      events,
      activities: [act({ id: "88888888-8888-4888-8888-888888888888", site: "DERVIO" })],
    });
    expect(siteBadge(mixed, "DERVIO")).toMatchObject({ value: "2", note: "parziale" });
    // A cancelled Dervio row alone does not turn "—" into a number.
    const cancelled = buildStructureWeek({
      today: TODAY,
      offset: 0,
      slots: [],
      events: [],
      activities: [act({ id: "99999999-9999-4999-8999-999999999999", site: "DERVIO", status: "ANNULLATA" })],
    });
    expect(siteBadge(cancelled, "DERVIO").value).toBe("—");
  });

  it("an applied but empty register gives real zeros", () => {
    const w = buildStructureWeek({ today: TODAY, offset: 0, slots: [], events: [], activities: [] });
    expect(w.kpi).toEqual({ activities: 0, uncoveredShifts: 0, clubHouseEvenings: 0 });
  });

  it("reads the window of five weeks the page can browse (r135 allows 42 days)", () => {
    expect(structureWindow(TODAY)).toEqual({ from: "2026-10-05", to: "2026-11-08" });
  });
});

describe("parsing r135 rows", () => {
  it("drops malformed rows and names in the responsible field", () => {
    const good = { id: "11111111-1111-4111-8111-111111111111", site: "COLICO", area: "CAMPO", kind: "APERTURA", title: " Apertura ", startsAt: "2026-10-17T05:30:00Z", endsAt: "2026-10-17T06:00:00Z", responsibleRole: "responsabile-campi", covered: false, status: "PREVISTA", notes: "" };
    const rows = parseStructureActivities([
      good,
      { ...good, id: "not-a-uuid" },
      { ...good, site: "LECCO" },
      { ...good, kind: "PARTITA" },
      { ...good, startsAt: "ieri" },
      { ...good, title: "" },
      { ...good, id: "22222222-2222-4222-8222-222222222222", responsibleRole: "Mario Rossi", status: "ANNULLATA", covered: "yes" },
      null,
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ title: "Apertura", notes: null, responsibleRole: "responsabile-campi" });
    expect(rows[1]).toMatchObject({ responsibleRole: null, status: "ANNULLATA", covered: false });
    expect(parseStructureActivities({ rows: [] })).toEqual([]);
  });

  it("recognises only the club's centres as venues", () => {
    expect(homeVenue("COLICO - CAMPO 2")).toEqual({ site: "COLICO", place: "Campo 2" });
    expect(homeVenue("Dervio")).toEqual({ site: "DERVIO", place: "Campo" });
    expect(homeVenue("Colicodervio - X")).toBeNull();
    expect(homeVenue("Lecco - Stadio")).toBeNull();
  });
});
