import { describe, expect, test } from "vitest";

import {
  FOLLOW_KEY,
  dayOf,
  dayStrip,
  followedFirst,
  gameIcon,
  gamesOn,
  isDayView,
  liveGames,
  matchClock,
  nextForFollowed,
  nextGameDay,
  nextKickoff,
  parseFollowed,
  previousGameDay,
  readFollowed,
  todayOf,
  toggleFollowed,
  typePrefix,
  writeFollowed,
} from "./calendario-live";
import { loadCalendar, type PublicEvent } from "./public-snapshots";

const cal = loadCalendar();

function ev(p: Partial<PublicEvent>): PublicEvent {
  return {
    id: p.id ?? "x", date: p.date ?? "2026-10-17", time: p.time ?? "15:00", group: p.group ?? "u15", category: "", type: p.type ?? "CAMPIONATO",
    homeAway: p.homeAway ?? "CASA", opponent: p.opponent ?? "", venue: "", round: "", source: "", status: "OFFICIAL_CALENDAR",
    isVariation: false, notice: [], timeConfirmed: true, venueConfirmed: true, facilityReview: false,
  };
}
// 17/10/2026 15:00 Europe/Rome (CEST, UTC+2) = 13:00Z
const KICK = Date.parse("2026-10-17T13:00:00Z");

describe("IERI / OGGI / DOMANI", () => {
  test("three tabs around today, across month ends", () => {
    expect(dayStrip("2026-10-15").map((d) => [d.key, d.label, d.date])).toEqual([
      ["ieri", "Ieri", "2026-10-14"],
      ["oggi", "Oggi", "2026-10-15"],
      ["domani", "Domani", "2026-10-16"],
    ]);
    expect(dayOf("domani", "2026-10-31")).toBe("2026-11-01");
    expect(dayOf("ieri", "2026-11-01")).toBe("2026-10-31");
    expect(isDayView("oggi")).toBe(true);
    expect(isDayView("settimana")).toBe(false);
  });

  test("games of a day from the real calendar, in kick-off order", () => {
    const sat = gamesOn(cal.events, "2026-10-17");
    expect(sat.length).toBeGreaterThan(0);
    expect(sat.every((e) => e.date === "2026-10-17")).toBe(true);
    expect(sat.map((e) => e.time)).toEqual([...sat.map((e) => e.time)].sort());
    expect(gamesOn([ev({ id: "a", time: "" }), ev({ id: "b", time: "09:30" })], "2026-10-17").map((e) => e.id)).toEqual(["b", "a"]);
  });

  test("empty day points to the nearest game day, never invents one", () => {
    expect(nextGameDay(cal.events, "2026-10-15")).toBe("2026-10-17");
    expect(previousGameDay(cal.events, "2026-10-15")).toBe("2026-10-11");
    expect(nextGameDay(cal.events, "2099-01-01")).toBeNull();
    expect(previousGameDay([], "2026-10-15")).toBeNull();
  });
});

describe("live minute", () => {
  const e = ev({ date: "2026-10-17", time: "15:00" });
  test("before, during and after the scheduled kick-off", () => {
    expect(matchClock(e, KICK - 60_000)).toEqual({ state: "next", minute: null, label: "15:00" });
    expect(matchClock(e, KICK)).toEqual({ state: "live", minute: 1, label: "1'" });
    expect(matchClock(e, KICK + 36 * 60_000 + 5_000)).toMatchObject({ state: "live", minute: 37, label: "37'" });
    expect(matchClock(e, KICK + 95 * 60_000)).toMatchObject({ state: "live", label: "90'+" });
    expect(matchClock(e, KICK + 105 * 60_000).state).toBe("done");
  });
  test("no time: never live, never a minute", () => {
    expect(matchClock(ev({ time: "" }), KICK)).toEqual({ state: "unknown", minute: null, label: "Orario da definire" });
  });
  test("live list and next kick-off", () => {
    const list = [e, ev({ id: "later", date: "2026-10-18", time: "10:30" }), ev({ id: "notime", time: "" })];
    expect(liveGames(list, KICK + 10 * 60_000).map((x) => x.id)).toEqual(["x"]);
    expect(liveGames(list, KICK - 1).length).toBe(0);
    expect(nextKickoff(list, KICK + 1)?.e.id).toBe("later");
    expect(nextKickoff(list, KICK - 1)?.startMs).toBe(KICK);
    expect(nextKickoff(list, Date.parse("2027-01-01T00:00:00Z"))).toBeNull();
  });
});

describe("row icon and type", () => {
  test("ball for matches, trophy for cups and tournaments", () => {
    expect(gameIcon("CAMPIONATO")).toBe("ball");
    expect(gameIcon("AMICHEVOLE")).toBe("ball");
    expect(gameIcon("COPPA")).toBe("trophy");
    expect(gameIcon("torneo")).toBe("trophy");
    expect(typePrefix("CAMPIONATO")).toBe("");
    expect(typePrefix("")).toBe("");
    expect(typePrefix("COPPA")).toBe("Coppa");
  });
});

describe("Le mie squadre (followed teams)", () => {
  test("parse keeps only short ids, no duplicates, max 12", () => {
    expect(parseFollowed(null)).toEqual([]);
    expect(parseFollowed("not json")).toEqual([]);
    expect(parseFollowed('{"a":1}')).toEqual([]);
    expect(parseFollowed('["u15","u15",3,"<script>","prima"]')).toEqual(["u15", "prima"]);
    expect(parseFollowed(JSON.stringify(Array.from({ length: 20 }, (_, i) => `g${i}`))).length).toBe(12);
  });

  test("storage access is wrapped: blocked storage gives [] / false", () => {
    const blocked = { getItem: () => { throw new Error("SecurityError"); }, setItem: () => { throw new Error("QuotaExceeded"); } };
    expect(readFollowed(blocked)).toEqual([]);
    expect(writeFollowed(blocked, ["u15"])).toBe(false);
    expect(readFollowed(null)).toEqual([]);
    expect(writeFollowed(undefined, ["u15"])).toBe(false);
    const mem = new Map<string, string>();
    const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    expect(writeFollowed(store, ["u15", "bad id!", "prima"])).toBe(true);
    expect(mem.get(FOLLOW_KEY)).toBe('["u15","prima"]');
    expect(readFollowed(store)).toEqual(["u15", "prima"]);
  });

  test("toggle adds last and removes", () => {
    expect(toggleFollowed([], "u15")).toEqual(["u15"]);
    expect(toggleFollowed(["u15"], "prima")).toEqual(["u15", "prima"]);
    expect(toggleFollowed(["u15", "prima"], "u15")).toEqual(["prima"]);
    expect(toggleFollowed(["u15"], "x y")).toEqual(["u15"]);
  });

  test("followed teams come first, teams without games stay out", () => {
    const order = followedFirst(cal.groups, ["prima", "u15", "nope"]).map((g) => g.id);
    expect(order.slice(0, 2)).toEqual(["prima", "u15"]);
    expect(order).not.toContain("nope");
    expect(order.filter((id) => id === "prima").length).toBe(1);
    expect(followedFirst(cal.groups, []).every((g) => g.count > 0)).toBe(true);
  });

  test("next game of each followed team from the real calendar", () => {
    const now = Date.parse("2026-10-15T08:00:00Z");
    const next = nextForFollowed(cal.events, ["prima", "u15"], now);
    expect(next.map((e) => e.group).sort()).toEqual(["prima", "u15"]);
    expect(next.every((e) => e.date >= "2026-10-15")).toBe(true);
    expect(next[0]!.date <= next[1]!.date).toBe(true);
    expect(nextForFollowed(cal.events, [], now)).toEqual([]);
  });

  test("Rome date of an instant", () => {
    expect(todayOf(Date.parse("2026-10-15T22:30:00Z"))).toBe("2026-10-16");
    expect(todayOf(Date.parse("2026-10-15T08:00:00Z"))).toBe("2026-10-15");
  });
});
