/** UD-116 weekend results: only from a real source with both scores; base activity never shows a result. */
import { describe, expect, it } from "vitest";

import type { FeedItem, Match } from "./club.types";
import { weekendResults } from "./home-results";

const m = (o: Partial<Match>): Match => ({
  id: "m",
  competizione: "",
  squadra: "Prima Squadra",
  casa: "COLICODERVIESE",
  ospite: "RIVALE",
  startAt: "2026-10-11T13:30:00Z",
  dataLabel: "",
  golCasa: 2,
  golOspite: 1,
  ...o,
});
const item = (match: Match, o: Partial<FeedItem> = {}): FeedItem => ({
  id: `f-${match.id}`,
  kind: "result",
  title: "Risultato",
  priority: 3,
  priorityScore: 0,
  startAt: null,
  endAt: null,
  pinned: false,
  audience: ["public"],
  match,
  ...o,
});

describe("weekend results (UD-116)", () => {
  it("is empty without a source (block hidden, never a placeholder)", () => {
    expect(weekendResults(null, "2026-10-13")).toEqual([]);
    expect(
      weekendResults({ items: [], lastResult: null }, "2026-10-13"),
    ).toEqual([]);
  });

  it("keeps results of the last three days with both scores, newest first, once per match", () => {
    const rows = weekendResults(
      {
        lastResult: m({ id: "a" }),
        items: [
          item(m({ id: "a" })),
          item(
            m({
              id: "b",
              squadra: "Juniores U19",
              startAt: "2026-10-12T08:00:00Z",
            }),
          ),
          item(m({ id: "old", startAt: "2026-10-04T13:30:00Z" })),
          item(m({ id: "noscore", golOspite: null })),
          item(m({ id: "staff" }), { audience: ["staff"] }),
          item(m({ id: "news" }), { kind: "news" }),
        ],
      },
      "2026-10-13",
    );
    expect(rows.map((r) => r.id)).toEqual(["b", "a"]);
    expect(rows[1]).toMatchObject({
      homeGoals: 2,
      awayGoals: 1,
      date: "2026-10-11",
    });
  });

  it("never shows a result of the attività di base (SGS)", () => {
    for (const squadra of [
      "Pulcini",
      "Primi Calci",
      "Piccoli Amici",
      "Esordienti 2014",
      "U12 2015",
    ])
      expect(
        weekendResults({ items: [], lastResult: m({ squadra }) }, "2026-10-13"),
        squadra,
      ).toEqual([]);
  });
});
