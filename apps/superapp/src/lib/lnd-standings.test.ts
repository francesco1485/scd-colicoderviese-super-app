import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import raw from "@/data/classifiche-lnd-snapshot.json";

import {
  LND_COMPETITIONS,
  LndParseError,
  competitionUrl,
  competitionsOfTeam,
  cupRecord,
  fetchedLabel,
  isBaseActivityGroup,
  latestResults,
  loadLndSnapshot,
  ourPlayedMatches,
  ourStanding,
  outcomeForUs,
  parseLndPage,
  parseLndStandingsJson,
  pendingNote,
  standingsApiUrl,
  teamName,
} from "./lnd-standings";

const fixture = (name: string) => readFileSync(resolve(__dirname, "__fixtures__", name), "utf8");

describe("LND page parser (fixture: gare.lnd.it Promozione girone D, giornata 5, fetched 17/10/2026)", () => {
  const page = parseLndPage(fixture("lnd-pr-d-giornata-5.html"));

  it("reads championship, group and matchday", () => {
    expect(page.championship).toEqual({ code: "PR", name: "PROMOZIONE" });
    expect(page.group).toEqual({ code: "D", name: "Girone D" });
    expect(page.currentMatchday).toMatchObject({ number: 5, leg: "first", startDate: "2026-10-11" });
    expect(page.matchdays.length).toBeGreaterThanOrEqual(15);
  });

  it("reads the played matches with the official score and the LND outcome text", () => {
    expect(page.matches).toHaveLength(8);
    const ours = ourPlayedMatches(page.matches);
    expect(ours).toEqual([
      {
        lndMatchId: 10385703,
        date: "2026-10-11",
        time: "15:30",
        home: "COLICODERVIESE ASD",
        away: "ALTA BRIANZA TAVERNERIO",
        homeGoals: 0,
        awayGoals: 4,
        played: true,
        label: "Da Giudice sportivo",
        rest: false,
      },
    ]);
  });

  it("reads the standings rows exactly as published", () => {
    expect(page.standings.length).toBe(16);
    expect(page.standings[0]).toMatchObject({ pos: 1 });
    for (const r of page.standings) expect(r.v + r.n + r.p, r.team).toBe(r.g);
  });

  it("never turns the 0-0 of an unplayed match into a score", () => {
    const html = fixture("lnd-pr-d-giornata-5.html").replace(/"isPlayed":true/g, '"isPlayed":false');
    const p = parseLndPage(html);
    expect(p.matches.every((m) => m.homeGoals === null && m.awayGoals === null)).toBe(true);
    expect(ourPlayedMatches(p.matches)).toEqual([]);
  });

  it("fails loudly on the LND error page and on a page without data", () => {
    expect(() => parseLndPage(fixture("lnd-error.html"))).toThrow(LndParseError);
    expect(() => parseLndPage(fixture("lnd-error.html"))).toThrow(/non raggiungibile/);
    expect(() => parseLndPage("<html></html>")).toThrow(/data-page script not found/);
  });
});

describe("LND standings JSON (fixture: Juniores U19 Élite girone C, 17/10/2026)", () => {
  const rows = parseLndStandingsJson(fixture("lnd-ri-c-classifica.json"));

  it("maps team/pos/pt/g/v/n/p/gf/gs and finds our row", () => {
    expect(rows).toHaveLength(16);
    expect(ourStanding(rows)).toEqual({ team: "colicoderviese asd", pos: 12, pt: 6, g: 5, v: 2, n: 0, p: 3, gf: 7, gs: 14 });
  });

  it("rejects a row with a missing number instead of guessing it", () => {
    expect(() => parseLndStandingsJson('{"standings":[{"team":"x","position":1,"points":null}]}')).toThrow(LndParseError);
    expect(() => parseLndStandingsJson("not json")).toThrow(LndParseError);
  });
});

describe("LND registry and urls", () => {
  it("lists 4 championships and 3 cups, none for the attività di base", () => {
    expect(LND_COMPETITIONS.filter((c) => c.kind === "CAMPIONATO").map((c) => c.team)).toEqual(["prima", "u19", "u16", "u15"]);
    expect(LND_COMPETITIONS.filter((c) => c.kind === "COPPA").map((c) => `${c.championship}/${c.group}`)).toEqual(["CR/11", "CG/6", "DL/15"]);
    expect(LND_COMPETITIONS.some((c) => isBaseActivityGroup(c.team))).toBe(false);
    expect(LND_COMPETITIONS.filter((c) => c.kind === "COPPA").every((c) => !c.hasStandings)).toBe(true);
  });

  it("builds gare.lnd.it urls", () => {
    const pr = LND_COMPETITIONS[0]!;
    expect(competitionUrl(pr)).toBe("https://gare.lnd.it/competizione/lombardia?campionato=PR&girone=D");
    expect(competitionUrl(pr, { number: 5, leg: "first" })).toBe("https://gare.lnd.it/competizione/lombardia?campionato=PR&girone=D&giornata=5&leg=first");
    expect(standingsApiUrl(pr)).toBe("https://gare.lnd.it/api/quadro-gare/girone/10/PR/D/classifica");
  });
});

describe("committed snapshot (src/data/classifiche-lnd-snapshot.json)", () => {
  const s = loadLndSnapshot(raw);

  it("keeps every competition with source and fetch time on gare.lnd.it", () => {
    expect(s.competitions).toHaveLength(7);
    for (const c of s.competitions) {
      expect(c.source_url.startsWith("https://gare.lnd.it/competizione/lombardia?"), c.id).toBe(true);
      expect(Number.isNaN(Date.parse(c.fetched_at)), c.id).toBe(false);
    }
  });

  it("matches the positions verified on gare.lnd.it on 17/10/2026", () => {
    const pos = (team: string) => {
      const c = competitionsOfTeam(s, team).find((x) => x.kind === "CAMPIONATO")!;
      const us = ourStanding(c.standings)!;
      return [us.pos, c.standings!.length, us.pt];
    };
    expect(pos("prima")).toEqual([14, 16, 3]);
    expect(pos("u19")).toEqual([12, 16, 6]);
    expect(pos("u16")).toEqual([7, 16, 7]);
    expect(pos("u15")).toEqual([8, 13, 3]);
  });

  it("counts the cup records from the official results (Coppa Italia 1V 1P, U19 0V 2P, U15 0V 2P)", () => {
    const rec = (id: string) => cupRecord(s.competitions.find((c) => c.id === id)!);
    expect(rec("prima-coppa-italia-11")).toMatchObject({ v: 1, p: 1 });
    expect(rec("u19-coppa-lombardia-6")).toMatchObject({ v: 0, p: 2 });
    expect(rec("u15-coppa-lombardia-15")).toMatchObject({ v: 0, p: 2 });
    for (const c of s.competitions.filter((x) => x.kind === "COPPA")) expect(c.standings).toBeNull();
  });

  it("shows nothing for the attività di base", () => {
    for (const g of ["piccoli", "primicalci", "pulcini", "esordienti", "2014", "2015"]) {
      expect(competitionsOfTeam(s, g)).toEqual([]);
      expect(latestResults(s, g)).toEqual([]);
    }
  });

  it("orders the last results newest first, across championship and cup", () => {
    const r = latestResults(s, "prima", 5);
    expect(r).toHaveLength(5);
    expect(r.map((x) => x.date)).toEqual([...r.map((x) => x.date)].sort().reverse());
    expect(r.some((x) => x.competition.kind === "COPPA")).toBe(true);
  });

  it("carries club names only: no people, no logos", () => {
    const text = JSON.stringify(raw);
    expect(text).not.toMatch(/logo|lndimg|player|giocator|nome|cognome/i);
  });

  it("drops entries that are not official or not well formed", () => {
    const bad = loadLndSnapshot({
      competitions: [
        { id: "prima-promozione-d", source_url: "https://www.tuttocampo.it/x", fetched_at: "2026-10-17T10:00:00Z" },
        { id: "inventato", source_url: "https://gare.lnd.it/x", fetched_at: "2026-10-17T10:00:00Z" },
        {
          id: "u19-juniores-elite-c",
          source_url: "https://gare.lnd.it/x",
          fetched_at: "2026-10-17T10:00:00Z",
          standings: [{ team: "a", pos: 1, pt: null }],
          results: [{ lnd_match_id: 1, date: "2026-10-01", home: "A", away: "B", home_goals: null, away_goals: 1 }],
        },
      ],
    });
    expect(bad.competitions.map((c) => c.id)).toEqual(["u19-juniores-elite-c"]);
    expect(bad.competitions[0]!.standings).toBeNull();
    expect(bad.competitions[0]!.results).toEqual([]);
  });
});

describe("display helpers", () => {
  it("outcome for our club, never for a row without us or with us on both sides", () => {
    expect(outcomeForUs({ home: "COLICODERVIESE ASD", away: "X", home_goals: 3, away_goals: 2 })).toBe("V");
    expect(outcomeForUs({ home: "X", away: "COLICODERVIESE ASD", home_goals: 0, away_goals: 0 })).toBe("N");
    expect(outcomeForUs({ home: "X", away: "COLICODERVIESE ASD", home_goals: 4, away_goals: 2 })).toBe("P");
    expect(outcomeForUs({ home: "X", away: "Y", home_goals: 1, away_goals: 0 })).toBeNull();
  });

  it("names, pending note and fetch date", () => {
    expect(teamName("colicoderviese asd")).toBe("ColicoDerviese");
    expect(teamName("lesmo ssd arl")).toBe("LESMO SSD ARL");
    expect(pendingNote("attesa decisioni organi disciplinari")).toMatch(/Giudice sportivo/);
    expect(pendingNote("Da Giudice sportivo")).toBeNull();
    expect(fetchedLabel("2026-10-17T10:50:03.523Z")).toBe("17/10/2026 alle 12:50");
    expect(fetchedLabel("x")).toBe("data non nota");
  });
});
