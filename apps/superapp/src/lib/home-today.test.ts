/** UD-116 "Oggi e questa settimana": pure filtering for signed-in families and staff, changes from source flags only. */
import { describe, expect, it } from "vitest";

import type { FeedItem } from "./club.types";
import {
  familyChildren,
  firstName,
  matchChanges,
  matchPending,
  nextHomeMatchPerTeam,
  quadroGroups,
  rosterGroups,
  splitWeek,
  tagChildren,
  urgentNotices,
  weekMatches,
  weekTrainings,
} from "./home-today";
import type {
  PublicEvent,
  PublicGroup,
  TrainingSlot,
} from "./public-snapshots";

const G = (id: string, label: string): PublicGroup => ({
  id,
  label,
  color: "#123456",
  logo: null,
  years: [],
  count: 1,
});
const GROUPS = [
  G("u15", "U15 · Giovanissimi"),
  G("u16", "U16 Elite · 2011"),
  G("pulcini", "Pulcini"),
  G("prima", "Prima Squadra"),
  G("piccoli", "Piccoli Amici"),
];

const ev = (
  o: Partial<PublicEvent> & Pick<PublicEvent, "id" | "date" | "group">,
): PublicEvent => ({
  time: "15:00",
  category: "",
  type: "CAMPIONATO",
  homeAway: "CASA",
  opponent: "Rivale",
  venue: "Colico - Campo 1",
  round: "",
  source: "",
  status: "",
  isVariation: false,
  notice: [],
  timeConfirmed: true,
  venueConfirmed: true,
  facilityReview: false,
  ...o,
});

const EVENTS: PublicEvent[] = [
  ev({ id: "a", date: "2026-10-14", group: "u15", time: "18:00" }),
  ev({
    id: "b",
    date: "2026-10-17",
    group: "u16",
    isVariation: true,
    notice: [
      "Orario ufficiale FIGC/LND: 14:30",
      "Utilizzo struttura da verificare",
    ],
  }),
  ev({
    id: "c",
    date: "2026-10-18",
    group: "pulcini",
    homeAway: "FUORI",
    venue: "Lecco",
    timeConfirmed: false,
  }),
  ev({ id: "d", date: "2026-10-25", group: "u15" }),
  ev({ id: "e", date: "2026-10-21", group: "prima", homeAway: "FUORI" }),
  ev({ id: "f", date: "2026-10-28", group: "prima" }),
];

const slot = (
  day: string,
  timeLabel: string,
  C1: string,
  C2 = "",
): TrainingSlot => ({
  day,
  timeLabel,
  start: 0,
  fields: { C1, C2 },
  rooms: { SP1: "", SP2: "", SP3: "", SP4: "" },
});
const SLOTS = [
  slot(
    "MERCOLEDÌ",
    "17:20–18:50",
    "U15 2012/2013 + U12 2015 + U11 2016/2017",
    "Primi Calci 2018-2019 + Piccoli Amici 2020-2021\nDue zone",
  ),
  slot("MERCOLEDÌ", "20:10–21:20", "Under 16"),
  slot("GIOVEDÌ", "18:00–19:30", "Under 13"),
  slot("VENERDÌ", "17:20–18:50", "", "Under 15 2012/2013"),
];
const label = (id: string) => GROUPS.find((g) => g.id === id)?.label ?? id;

describe("home today & week (UD-116)", () => {
  it("limits games to the person's groups and to the coming seven days", () => {
    const mine = weekMatches(EVENTS, GROUPS, "2026-10-14", new Set(["u15"]));
    expect(mine.map((e) => e.id)).toEqual(["a"]);
    const all = weekMatches(EVENTS, GROUPS, "2026-10-14", null);
    expect(all.map((e) => e.id)).toEqual(["a", "b", "c"]);
    expect(
      weekMatches(EVENTS, GROUPS, "2026-10-14", null, 1).map((e) => e.id),
    ).toEqual(["a"]);
    expect(weekMatches(EVENTS, GROUPS, "2026-10-14", new Set())).toEqual([]);
  });

  it("highlights changes only from the master's flags; internal facility checks stay out; unconfirmed is pending, not a change", () => {
    const b = EVENTS.find((e) => e.id === "b")!;
    expect(matchChanges(b)).toEqual([
      "Variazione in calendario",
      "Orario ufficiale FIGC/LND: 14:30",
    ]);
    expect(matchChanges(EVENTS[0]!)).toEqual([]);
    expect(matchPending(EVENTS.find((e) => e.id === "c")!)).toEqual([
      "Orario da confermare",
    ]);
    expect(
      matchPending({ timeConfirmed: false, venueConfirmed: false }),
    ).toEqual(["Orario e campo da confermare"]);
    expect(
      matchPending({ timeConfirmed: true, venueConfirmed: false }),
    ).toEqual(["Campo da confermare"]);
    const week = splitWeek(
      weekMatches(EVENTS, GROUPS, "2026-10-14", null),
      "2026-10-14",
    );
    expect(week.changes).toBe(1);
    expect(week.today.map((e) => e.id)).toEqual(["a"]);
    expect(week.later.map((e) => e.id)).toEqual(["b", "c"]);
  });

  it("gives anonymous visitors the next home game of each team, once per team, from now", () => {
    const next = nextHomeMatchPerTeam(EVENTS, GROUPS, "2026-10-14", "19:00");
    // "a" (today 18:00) has already started at 19:00: the next U15 home game is "d"; away games never count.
    expect(next.map((e) => e.id)).toEqual(["b", "d", "f"]);
    expect(
      nextHomeMatchPerTeam(EVENTS, GROUPS, "2026-10-14", "17:00")[0]!.id,
    ).toBe("a");
  });

  it("reads every team written in a quadro cell, and leaves Under 13 unmatched (no implicit year mapping)", () => {
    expect(quadroGroups("U15 2012/2013 + U12 2015 + U11 2016/2017")).toEqual([
      "u15",
      "2015",
      "pulcini",
    ]);
    expect(
      quadroGroups("Primi Calci 2018-2019 + Piccoli Amici 2020-2021\nDue zone"),
    ).toEqual(["primicalci", "piccoli"]);
    expect(quadroGroups("INTERO — Prima Squadra • Promozione")).toEqual([
      "prima",
    ]);
    expect(
      quadroGroups("Juniores Élite U19 (+ atleti ex U18 integrati)"),
    ).toEqual(["u19"]);
    expect(quadroGroups("Under 13")).toEqual([]);
  });

  it("lists the trainings of the person's groups on weekdays of the coming week (weekly quadro, Colico)", () => {
    // 2026-10-14 is a Wednesday: Wednesday, Thursday, Friday, then Monday and Tuesday have no slot here.
    const u15 = weekTrainings(SLOTS, "2026-10-14", new Set(["u15"]), label);
    expect(u15.map((e) => `${e.date} ${e.time}-${e.end} ${e.place}`)).toEqual([
      "2026-10-14 17:20-18:50 Colico · Campo 1",
      "2026-10-16 17:20-18:50 Colico · Campo 2",
    ]);
    expect(
      u15.every((e) => e.kind === "allenamento" && e.changes.length === 0),
    ).toBe(true);
    const shared = weekTrainings(
      SLOTS,
      "2026-10-14",
      new Set(["u15", "pulcini"]),
      label,
    );
    expect(shared[0]!.groups).toEqual(["u15", "pulcini"]);
    expect(shared[0]!.team).toBe("U15 · Giovanissimi + Pulcini");
    expect(weekTrainings(SLOTS, "2026-10-14", new Set(), label)).toEqual([]);
    // Saturday and Sunday have no quadro.
    expect(
      weekTrainings(SLOTS, "2026-10-17", new Set(["u16"]), label, 2),
    ).toEqual([]);
  });

  it("builds a family's scope from its members: first names only, calendar group ids", () => {
    const kids = familyChildren([
      { displayName: "Mario Rossi", relationship: "SELF", teamCodes: [] },
      { displayName: "Luca Rossi", relationship: "CHILD", teamCodes: ["u15"] },
      {
        displayName: "Sara Rossi",
        relationship: "CHILD",
        teamCodes: ["piccoliamici"],
      },
      {
        displayName: "Nome non indicato",
        relationship: "CHILD",
        teamCodes: ["pulcini"],
      },
    ]);
    expect(kids).toEqual([
      { firstName: "Luca", groups: ["u15"] },
      { firstName: "Sara", groups: ["piccoli"] },
      { firstName: "", groups: ["pulcini"] },
    ]);
    expect(firstName("  Anna  Maria ")).toBe("Anna");
    expect(rosterGroups(["u15", "piccoliamici", "u15"])).toEqual([
      "u15",
      "piccoli",
    ]);
  });

  it("tags each entry with the children it concerns", () => {
    const entries = [
      ...weekMatches(EVENTS, GROUPS, "2026-10-14", new Set(["u15", "pulcini"])),
      ...weekTrainings(SLOTS, "2026-10-14", new Set(["u15", "pulcini"]), label),
    ];
    const tagged = tagChildren(entries, [
      { firstName: "Luca", groups: ["u15"] },
      { firstName: "Teo", groups: ["pulcini"] },
      { firstName: "", groups: ["u15"] },
    ]);
    expect(tagged.find((e) => e.id === "a")!.forNames).toEqual(["Luca"]);
    expect(tagged.find((e) => e.id === "c")!.forNames).toEqual(["Teo"]);
    expect(
      tagged.find((e) => e.kind === "allenamento" && e.groups.length === 2)!
        .forNames,
    ).toEqual(["Luca", "Teo"]);
  });

  it("shows R20 urgent alerts only inside their window and for the right audience", () => {
    const now = Date.parse("2026-10-14T10:00:00Z");
    const item = (o: Partial<FeedItem>): FeedItem => ({
      id: "x",
      kind: "alert",
      title: "Campo chiuso per pioggia",
      priority: 1,
      priorityScore: 0,
      startAt: null,
      endAt: null,
      pinned: false,
      audience: ["public"],
      ...o,
    });
    const list = [
      item({
        id: "ok",
        startAt: "2026-10-14T08:00:00Z",
        endAt: "2026-10-14T20:00:00Z",
      }),
      item({
        id: "future",
        startAt: "2026-10-15T08:00:00Z",
        endAt: "2026-10-15T20:00:00Z",
      }),
      item({
        id: "past",
        startAt: "2026-10-13T08:00:00Z",
        endAt: "2026-10-13T20:00:00Z",
      }),
      item({ id: "noend-today", startAt: "2026-10-14T07:00:00Z" }),
      item({ id: "noend-old", startAt: "2026-10-10T07:00:00Z" }),
      item({ id: "nodates" }),
      item({
        id: "staff",
        startAt: "2026-10-14T08:00:00Z",
        endAt: "2026-10-14T20:00:00Z",
        audience: ["staff"],
      }),
      item({
        id: "news",
        kind: "news",
        startAt: "2026-10-14T08:00:00Z",
        endAt: "2026-10-14T20:00:00Z",
      }),
    ];
    expect(urgentNotices(list, now, false).map((n) => n.id)).toEqual([
      "ok",
      "noend-today",
    ]);
    expect(urgentNotices(list, now, true).map((n) => n.id)).toEqual([
      "ok",
      "noend-today",
      "staff",
    ]);
    expect(urgentNotices([], now, true)).toEqual([]);
  });
});
