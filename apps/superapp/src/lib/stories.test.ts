import { describe, expect, it } from "vitest";

import type { WeekItem } from "./home-week";
import type { Sponsor } from "./sponsors";
import { buildStories, isUnseen, parseSeen, sponsorOfTheDay } from "./stories";
import type { Team } from "./universe";

const item = (
  id: string,
  date: string,
  time: string,
  group: string,
  homeAway: "CASA" | "FUORI",
): WeekItem => ({
  id,
  date,
  time,
  title: `${id} match`,
  kind: "Gara",
  origin: "calendario",
  homeAway,
  venue: "Campo",
  group,
  groupLabel: group,
  certain: true,
  facilityReview: false,
  isVariation: false,
  dedupeKey: id,
});
const team = (id: string, short: string): Team => ({
  id,
  label: short,
  short,
  code: short.slice(0, 3).toUpperCase(),
  color: "#123456",
  group: "base",
});
const sponsors: Sponsor[] = [
  { slug: "a", name: "Alfa", nameVerified: true, src: "/a.webp" },
  { slug: "x", name: null, nameVerified: false, src: "/x.webp" },
  { slug: "b", name: "Beta", nameVerified: true, src: "/b.webp" },
];
const NOW = Date.parse("2026-10-12T08:00:00Z");

describe("stories", () => {
  const teams = [
    team("prima", "Prima"),
    team("u15", "U15"),
    team("pulcini", "Pulcini"),
  ];
  const items = [
    item("A", "2026-10-18", "15:30", "prima", "CASA"),
    item("B", "2026-10-17", "10:30", "u15", "FUORI"),
    item("C", "2026-10-25", "10:00", "pulcini", "FUORI"),
    {
      ...item("D", "2026-10-14", "20:00", "prima", "CASA"),
      kind: "Evento" as const,
    },
  ];
  const events = [
    {
      id: "clc",
      title: "Christmas Lario Cup",
      when: "8 dicembre",
      text: "Torneo",
      href: "/eventi/christmas-lario-cup",
      image: "/x.webp",
      date: "2026-12-08",
    },
  ];

  it("builds a club story and one story per team playing within 7 days, earliest first", () => {
    const s = buildStories({
      items,
      teams,
      today: "2026-10-12",
      nowMs: NOW,
      sponsors,
      events,
    });
    expect(s.map((x) => x.id)).toEqual(["club", "team-u15", "team-prima"]);
    const club = s[0]!;
    expect(club.slides.map((x) => x.kind)).toEqual([
      "week",
      "match",
      "sponsor",
      "event",
    ]);
    const week = club.slides[0] as Extract<
      (typeof club.slides)[number],
      { kind: "week" }
    >;
    expect([week.games, week.home, week.away]).toEqual([2, 1, 1]);
    expect(s[1]!.slides.map((x) => x.kind)).toEqual(["match", "cta"]);
  });

  it("drops finished matches and builds nothing invented when the week is empty", () => {
    const s = buildStories({
      items,
      teams,
      today: "2026-10-19",
      nowMs: Date.parse("2026-10-19T08:00:00Z"),
      sponsors: [],
      events: [],
    });
    expect(s.map((x) => x.id)).toEqual(["club", "team-pulcini"]);
    expect(
      buildStories({
        items: [],
        teams,
        today: "2026-10-12",
        nowMs: NOW,
        sponsors: [],
        events: [],
      }),
    ).toEqual([]);
  });

  it("rotates only confirmed sponsors, same one all day", () => {
    const a = sponsorOfTheDay(sponsors, "2026-10-12");
    const b = sponsorOfTheDay(sponsors, "2026-10-13");
    expect([a?.slug, b?.slug].sort()).toEqual(["a", "b"]);
    expect(sponsorOfTheDay(sponsors, "2026-10-12")).toBe(a);
    expect(sponsorOfTheDay([sponsors[1]!], "2026-10-12")).toBeNull();
  });

  it("tracks seen stories per device and survives bad storage", () => {
    const st = { id: "club", signature: "x|y" };
    expect(isUnseen(st, {})).toBe(true);
    expect(isUnseen(st, { club: "x|y" })).toBe(false);
    expect(isUnseen(st, { club: "x" })).toBe(true);
    expect(parseSeen("not json")).toEqual({});
    expect(parseSeen('{"club":"a","bad":3}')).toEqual({ club: "a" });
  });
});
