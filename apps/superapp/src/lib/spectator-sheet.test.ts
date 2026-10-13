import { describe, expect, it } from "vitest";

import { rulesFor } from "./match-sheet";
import type { MatchSheetData } from "./match-sheet.functions";
import type { PublicEvent } from "./public-snapshots";
import {
  BASE_ACTIVITY_NOTE,
  buildSpectatorSheet,
  competitionLabel,
  fieldLabel,
  isBaseActivity,
  isCertainlyAdult,
  orderByShirt,
  parseOpponentList,
  roundLabel,
  spectatorName,
} from "./spectator-sheet";

const event = (over: Partial<PublicEvent> = {}): PublicEvent => ({
  id: "EVT-PRIMA-1A-X-CASA",
  date: "2026-10-18",
  time: "15:30",
  group: "prima",
  category: "Prima Squadra",
  type: "CAMPIONATO",
  homeAway: "CASA",
  opponent: "A. CASATI CALCIO ARCORE",
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

// Invented people only.
const sheet = (
  teamCode: string,
  over: Partial<MatchSheetData> = {},
): MatchSheetData => ({
  state: "ok",
  matchId: "m1",
  teamCode,
  rules: rulesFor(teamCode),
  locked: false,
  status: "READY",
  updatedAt: null,
  players: [
    { athleteId: "a3", shirt: 14, starter: false },
    { athleteId: "a1", shirt: 9, starter: true },
    { athleteId: "a2", shirt: 1, starter: true },
    { athleteId: "gone", shirt: 7, starter: true },
  ],
  staff: [
    { personId: "s2", role: "ALLENATORE", displayName: "Gianni Rusconi" },
    {
      personId: "s1",
      role: "DIRIGENTE_ACCOMPAGNATORE",
      displayName: "Sergio Panzeri",
    },
  ],
  captain: "a1",
  vice: "a2",
  note: "",
  calledUp: [
    {
      athleteId: "a1",
      displayName: "Marco Valsecchi",
      birthYear: 1999,
      response: "CONFIRMED",
      lastShirt: 9,
    },
    {
      athleteId: "a2",
      displayName: "Luca Bianchi",
      birthYear: 2008,
      response: "CONFIRMED",
      lastShirt: 1,
    },
    {
      athleteId: "a3",
      displayName: "Davide De Luca",
      birthYear: null,
      response: "CONFIRMED",
      lastShirt: null,
    },
  ],
  candidates: [],
  ...over,
});

describe("age rule", () => {
  it("is adult only when 18 for sure on the match day, from the birth year alone", () => {
    expect(isCertainlyAdult(2007, "2026-10-18")).toBe(true);
    expect(isCertainlyAdult(2008, "2026-10-18")).toBe(false);
    expect(isCertainlyAdult(2008, "2026-12-31")).toBe(true);
    expect(isCertainlyAdult(null, "2026-10-18")).toBe(false);
    expect(isCertainlyAdult(2000, "not-a-date")).toBe(false);
  });

  it("prints adults in full and minors as first name + surname initial", () => {
    expect(spectatorName("Marco Valsecchi", true)).toBe("Marco Valsecchi");
    expect(spectatorName("Luca Bianchi", false)).toBe("Luca B.");
    expect(spectatorName("Davide De Luca", false)).toBe("Davide D.");
    expect(spectatorName("  LUCA   BIANCHI ", false)).toBe("Luca B.");
    expect(spectatorName("MARCO D'ANGELO", true)).toBe("Marco D'Angelo");
    expect(spectatorName("Luca", false)).toBe("Luca");
    expect(spectatorName("", false)).toBe("—");
  });
});

describe("attività di base", () => {
  it("recognises base categories by team code, group or label and fails closed", () => {
    expect(isBaseActivity({ teamCode: "prima", group: "prima" })).toBe(false);
    expect(isBaseActivity({ teamCode: "u15", group: "u15" })).toBe(false);
    expect(isBaseActivity({ teamCode: "", group: "u19" })).toBe(false);
    for (const group of [
      "pulcini",
      "primicalci",
      "piccoli",
      "2014",
      "2015",
      "esordienti",
    ])
      expect(isBaseActivity({ group })).toBe(true);
    expect(isBaseActivity({ teamCode: "u12", group: "x" })).toBe(true);
    expect(
      isBaseActivity({ teamCode: "prima", label: "Esordienti 2014" }),
    ).toBe(true);
    expect(isBaseActivity({})).toBe(true);
  });

  it("prints no names at all for base activity", () => {
    const s = buildSpectatorSheet(
      event({ group: "pulcini", category: "Pulcini Misti 7v7" }),
      "Pulcini",
      sheet("pulcini"),
    );
    expect(s.state).toBe("ok");
    expect(s.base).toBe(true);
    expect(s.players).toEqual([]);
    expect(s.staff).toEqual([]);
    expect(JSON.stringify(s)).not.toMatch(/Valsecchi|Bianchi|Luca|Rusconi/);
    expect(BASE_ACTIVITY_NOTE).toBe(
      "Elenco giocatori non pubblicato (attività di base)",
    );
  });
});

describe("ordering", () => {
  it("orders by shirt, starters first when the team has starters", () => {
    const l = [
      { shirt: 12, starter: false },
      { shirt: 4, starter: true },
      { shirt: 2, starter: false },
      { shirt: 1, starter: true },
    ];
    expect(orderByShirt(l, true).map((x) => x.shirt)).toEqual([1, 4, 2, 12]);
    expect(orderByShirt(l, false).map((x) => x.shirt)).toEqual([1, 2, 4, 12]);
  });
});

describe("labels", () => {
  it("formats round, competition and field", () => {
    expect(roundLabel("1A")).toBe("1ª giornata · andata");
    expect(roundLabel("12R")).toBe("12ª giornata · ritorno");
    expect(roundLabel("")).toBe("");
    expect(roundLabel("Semifinale")).toBe("Semifinale");
    expect(competitionLabel("CAMPIONATO", "Juniores U19 Élite")).toBe(
      "Campionato · Juniores U19 Élite",
    );
    expect(competitionLabel("", "")).toBe("Gara");
    expect(fieldLabel("COLICO - CAMPO 1")).toBe("Colico · Campo 1");
    expect(fieldLabel("")).toBe("Campo da definire");
  });
});

describe("buildSpectatorSheet", () => {
  it("Prima Squadra: adults in full, a minor or unknown birth year as initial, ordered, staff by role", () => {
    const s = buildSpectatorSheet(event(), "Prima Squadra", sheet("prima"));
    expect(s.state).toBe("ok");
    expect(s.base).toBe(false);
    expect(s.splitStarters).toBe(true);
    expect(s.players).toEqual([
      { shirt: 1, name: "Luca B.", starter: true, mark: "VC" },
      { shirt: 9, name: "Marco Valsecchi", starter: true, mark: "C" },
      { shirt: 14, name: "Davide D.", starter: false, mark: null },
    ]);
    expect(s.staff).toEqual([
      { role: "Dirigente accompagnatore", name: "Sergio Panzeri" },
      { role: "Allenatore", name: "Gianni Rusconi" },
    ]);
    expect(s.competition).toBe("Campionato · Prima Squadra");
    expect(s.round).toBe("5ª giornata · andata");
    expect(s.field).toBe("Colico · Campo 1");
    expect(s.blankLines).toBe(20);
  });

  it("youth teams: everyone as initial even when the birth year says adult", () => {
    const s = buildSpectatorSheet(
      event({ group: "u16", category: "U16 Élite" }),
      "U16",
      sheet("u16"),
    );
    expect(s.players.map((p) => p.name)).toEqual([
      "Luca B.",
      "Marco V.",
      "Davide D.",
    ]);
  });

  it("never returns ids, birth years or call-up responses", () => {
    const json = JSON.stringify(
      buildSpectatorSheet(event(), "Prima Squadra", sheet("prima")),
    );
    expect(json).not.toMatch(/a1|a2|a3|1999|2008|CONFIRMED|athleteId|birth/);
  });

  it("refuses away matches and unknown events, reports signed-out and errors", () => {
    expect(
      buildSpectatorSheet(
        event({ homeAway: "FUORI" }),
        "Prima Squadra",
        sheet("prima"),
      ).state,
    ).toBe("not-home");
    expect(
      buildSpectatorSheet(
        event({ homeAway: "FUORI" }),
        "Prima Squadra",
        sheet("prima"),
      ).players,
    ).toEqual([]);
    expect(buildSpectatorSheet(null, "", null).state).toBe("no-event");
    expect(buildSpectatorSheet(event(), "Prima Squadra", null).state).toBe(
      "signed-out",
    );
    expect(
      buildSpectatorSheet(event(), "Prima Squadra", {
        ...sheet("prima"),
        state: "error",
      }).state,
    ).toBe("error");
  });

  it("without a call-up yet prints the header and empty lines", () => {
    const s = buildSpectatorSheet(event(), "Prima Squadra", {
      ...sheet("prima"),
      state: "no-match",
      players: [],
      calledUp: [],
    });
    expect(s.state).toBe("ok");
    expect(s.players).toEqual([]);
    expect(s.blankLines).toBe(20);
  });
});

describe("parseOpponentList", () => {
  it("reads 'number name' lines, skips junk and duplicates, initials for youth", () => {
    const text =
      "10 Mario Rossi\n 1. Paolo Verdi\nsenza numero\n10 Doppio Numero\n7) Gianni Neri";
    expect(parseOpponentList(text, "u19")).toEqual([
      { shirt: 1, name: "Paolo V.", starter: false, mark: null },
      { shirt: 7, name: "Gianni N.", starter: false, mark: null },
      { shirt: 10, name: "Mario R.", starter: false, mark: null },
    ]);
    expect(parseOpponentList(text, "prima").map((l) => l.name)).toEqual([
      "Paolo Verdi",
      "Gianni Neri",
      "Mario Rossi",
    ]);
    expect(parseOpponentList("1 A\n2 B\n3 C", "prima", 2)).toHaveLength(2);
  });
});
