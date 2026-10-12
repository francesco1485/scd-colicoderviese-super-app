import { describe, expect, it } from "vitest";

import {
  channelsFrom,
  isBaseActivityChannel,
  isChannelKey,
  composeFeed,
  orderFeed,
  parseCounts,
  parseFollows,
  parsePost,
  parsePosts,
  postError,
  postableChannels,
  timeAgo,
  type Post,
} from "./social";
import type { Team } from "./universe";

const team = (id: string, short: string): Team => ({
  id,
  label: short,
  short,
  code: short.slice(0, 3).toUpperCase(),
  color: "#123456",
  group: "base",
});
const post = (
  id: string,
  channel: string,
  at: string,
  extra: Partial<Post> = {},
): Post => ({
  id,
  channel,
  kind: "NEWS",
  title: null,
  body: `post ${id}`,
  mediaUrl: null,
  liveUrl: null,
  status: "APPROVED",
  publishedAt: at,
  createdAt: at,
  decisionNote: null,
  forza: 0,
  mine: false,
  own: false,
  authorKind: "STAFF",
  verdict: null,
  reasons: [],
  reports: 0,
  ...extra,
});

describe("social", () => {
  it("accepts only the channel shapes the database accepts", () => {
    expect(isChannelKey("club")).toBe(true);
    expect(isChannelKey("team:u15")).toBe(true);
    expect(isChannelKey("event:christmas-lario-cup-2026")).toBe(true);
    expect(isChannelKey("team:U15")).toBe(false);
    expect(isChannelKey("person:mario")).toBe(false);
    expect(isChannelKey("")).toBe(false);
  });

  it("knows the attività di base channels (no results)", () => {
    expect(isBaseActivityChannel("team:pulcini")).toBe(true);
    expect(isBaseActivityChannel("team:2014")).toBe(true);
    expect(isBaseActivityChannel("team:prima")).toBe(false);
    expect(isBaseActivityChannel("club")).toBe(false);
  });

  it("builds channels from real teams and events, club first; staff never post as the club", () => {
    const ch = channelsFrom(
      [team("prima", "Prima"), team("u15", "U15")],
      [
        {
          id: "clc",
          title: "Christmas Lario Cup",
          href: "/eventi/christmas-lario-cup",
        },
      ],
    );
    expect(ch.map((c) => c.key)).toEqual([
      "club",
      "team:prima",
      "team:u15",
      "event:clc",
    ]);
    expect(ch[1]!.href).toBe("/squadre/prima");
    expect(postableChannels(ch, false).map((c) => c.key)).toEqual([
      "team:prima",
      "team:u15",
      "event:clc",
    ]);
    expect(postableChannels(ch, true)).toHaveLength(4);
  });

  it("parses posts strictly and drops malformed rows", () => {
    const ok = parsePost({
      id: "a",
      channel: "team:u15",
      kind: "MATCH",
      body: "x",
      status: "APPROVED",
      forza: "3",
      mine: true,
      publishedAt: "2026-10-12T10:00:00Z",
    });
    expect(ok).toMatchObject({
      id: "a",
      kind: "MATCH",
      forza: 3,
      mine: true,
      own: false,
      title: null,
    });
    expect(
      parsePost({
        id: "b",
        channel: "nope",
        kind: "NEWS",
        body: "x",
        status: "APPROVED",
      }),
    ).toBeNull();
    expect(
      parsePost({
        id: "c",
        channel: "club",
        kind: "VIDEO",
        body: "x",
        status: "APPROVED",
      }),
    ).toBeNull();
    expect(
      parsePosts([
        {
          id: "d",
          channel: "club",
          kind: "NEWS",
          body: "x",
          status: "PENDING",
        },
        null,
        3,
      ]),
    ).toHaveLength(1);
    expect(parseFollows(["club", "bad key", "team:u15"])).toEqual([
      "club",
      "team:u15",
    ]);
    expect(
      parseCounts({ club: 4, "team:u15": "2", bad: 1, "team:x": -1 }),
    ).toEqual({ club: 4, "team:u15": 2 });
    expect(parseCounts([1])).toEqual({});
  });

  it("orders the feed: followed first in Per te, everything newest-first in Tutti, only live in Dirette", () => {
    const posts = [
      post("1", "club", "2026-10-12T08:00:00Z"),
      post("2", "team:u15", "2026-10-12T09:00:00Z"),
      post("3", "team:prima", "2026-10-12T10:00:00Z", { kind: "LIVE" }),
      post("4", "team:u15", "2026-10-11T10:00:00Z", { status: "PENDING" }),
    ];
    expect(orderFeed(posts, "tutti", ["team:u15"]).map((p) => p.id)).toEqual([
      "3",
      "2",
      "1",
    ]);
    expect(orderFeed(posts, "perte", ["team:u15"]).map((p) => p.id)).toEqual([
      "2",
      "3",
      "1",
    ]);
    expect(orderFeed(posts, "perte", []).map((p) => p.id)).toEqual([
      "3",
      "2",
      "1",
    ]);
    expect(orderFeed(posts, "dirette", []).map((p) => p.id)).toEqual(["3"]);
  });

  it("explains refusals in Italian and formats time", () => {
    expect(postError("checks")).toMatch(/minori/);
    expect(postError("zzz")).toMatch(/Riprova/);
    const now = Date.parse("2026-10-12T12:00:00Z");
    expect(timeAgo("2026-10-12T11:59:40Z", now)).toBe("adesso");
    expect(timeAgo("2026-10-12T11:30:00Z", now)).toBe("30 min fa");
    expect(timeAgo("2026-10-12T09:00:00Z", now)).toBe("3 ore fa");
    expect(timeAgo("2026-10-11T09:00:00Z", now)).toBe("ieri");
    expect(timeAgo("2026-09-20T09:00:00Z", now)).toMatch(/20 set/);
    expect(timeAgo(null, now)).toBe("");
  });

  it("composes the feed: week first, one extra after every second post, empty note only without posts", () => {
    const posts = [
      post("1", "club", "2026-10-12T08:00:00Z"),
      post("2", "club", "2026-10-12T09:00:00Z"),
      post("3", "club", "2026-10-12T10:00:00Z"),
    ];
    const kinds = composeFeed(posts, ["m1", "m2"], true, "ev", "tutti").map(
      (n) => n.k,
    );
    expect(kinds).toEqual([
      "week",
      "post",
      "match",
      "post",
      "post",
      "match",
      "sponsor",
      "event",
      "top11",
      "press",
    ]);
    expect(
      composeFeed([], ["m1"], false, null, "perte").map((n) => n.k),
    ).toEqual(["week", "match", "top11", "press", "empty"]);
    expect(composeFeed([], [], false, null, "dirette").map((n) => n.k)).toEqual(
      ["empty"],
    );
  });
});
