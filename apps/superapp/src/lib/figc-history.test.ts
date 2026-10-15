/**
 * Synthetic data only ("ATLETA UNO", clubs "SOCIETA ESEMPIO"): no real player, matricola or club.
 */
import { describe, expect, it } from "vitest";

import {
  EXPORT_FILE_VERSION,
  OWN_CLUB_CODE,
  birthYearOf,
  carriesBirthDate,
  computeHistory,
  dmyToIso,
  filterDepartures,
  groupByBirthYear,
  isSeason,
  nextSeason,
  parseClub,
  parseExportFile,
  parseMovement,
  parseReleaseNote,
  prevSeason,
  publicName,
  releaseLabel,
  searchPlayers,
  seasonOf,
  shortSeason,
  splitName,
  timeline,
  type HistoryCareer,
  type HistoryRoster,
} from "./figc-history";

const OWN = `${OWN_CLUB_CODE} S.D.C. CLUB DI PROVA`;

function file(over: Record<string, unknown> = {}) {
  return {
    kind: "scd-figc-export",
    version: EXPORT_FILE_VERSION,
    club_code: OWN_CLUB_CODE,
    season: "2026/2027",
    read_at: "2026-10-15T09:30:00.000Z",
    roster: [
      { matricola: "1000001", name: "ATLETA UNO", birth_year: 2012, sector: "S", season: "2026/2027" },
      { matricola: "1000002", name: "ATLETA DOPPIO DUE", birth_year: null, sector: "D", season: "2026/2027" },
    ],
    career: [
      { matricola: "1000001", season: "2025/2026", movement: "AG AGGIORNAMENTO DI POSIZIONE", club: OWN, status: "3 DILETTANTE", date: "01/09/2025", note: "Svincolo : *X TERMINE AUTOMATICO tess. giov. del: 01/07/2026" },
      { matricola: "1000002", season: "2025/2026", movement: "TD TRASFERIMENTO DEFINITIVO", club: "90001 SOCIETA ESEMPIO A", status: null, date: "", note: null },
    ],
    ...over,
  };
}

describe("seasons", () => {
  it("validates and moves between seasons", () => {
    expect(isSeason("2025/2026")).toBe(true);
    expect(isSeason("2025/2027")).toBe(false);
    expect(isSeason("25/26")).toBe(false);
    expect(prevSeason("2026/2027")).toBe("2025/2026");
    expect(nextSeason("2026/2027")).toBe("2027/2028");
    expect(seasonOf("2026-06-30")).toBe("2025/2026");
    expect(seasonOf("2026-07-01")).toBe("2026/2027");
    expect(shortSeason("2026/2027")).toBe("2026/27");
  });
});

describe("portal field parsing", () => {
  it("splits COGNOME NOME at the last space", () => {
    expect(splitName("ATLETA UNO")).toEqual({ lastName: "ATLETA", firstName: "UNO" });
    expect(splitName("  ATLETA  DOPPIO   DUE ")).toEqual({ lastName: "ATLETA DOPPIO", firstName: "DUE" });
    expect(splitName("SOLO")).toEqual({ lastName: "SOLO", firstName: "" });
  });

  it("reads movement, club, release note and dates", () => {
    expect(parseMovement("AG AGGIORNAMENTO DI POSIZIONE")).toEqual({ code: "AG", label: "AGGIORNAMENTO DI POSIZIONE" });
    expect(parseMovement("SV")).toEqual({ code: "SV", label: "" });
    expect(parseMovement("aggiornamento")).toBeNull();
    expect(parseClub("90001 SOCIETA ESEMPIO A")).toEqual({ code: "90001", name: "SOCIETA ESEMPIO A" });
    expect(parseClub("SOCIETA SENZA CODICE")).toBeNull();
    expect(parseReleaseNote("Svincolo : *X TERMINE AUTOMATICO tess. giov. del: 01/07/2026")).toEqual({ code: "*X", date: "2026-07-01" });
    expect(parseReleaseNote("Svincolo: $ da parte della società 15/12/2025")).toEqual({ code: "$", date: "2025-12-15" });
    expect(parseReleaseNote(null)).toEqual({ code: null, date: null });
    expect(dmyToIso("31/02/2026")).toBeNull();
    expect(dmyToIso("01/07/2026")).toBe("2026-07-01");
    expect(birthYearOf("05/03/2012")).toBe(2012);
    expect(birthYearOf("")).toBeNull();
  });

  it("labels release codes in Italian and keeps unknown codes raw", () => {
    expect(releaseLabel("*X")).toBe("Termine automatico tesseramento giovanile");
    expect(releaseLabel("*Y")).toBe("Svincolo di dicembre SGS");
    expect(releaseLabel("*T")).toBe("Svincolo per inattività");
    expect(releaseLabel("*8")).toBe("Svincolo calciatore straniero");
    expect(releaseLabel("RC")).toBe("Risoluzione contratto");
    expect(releaseLabel("$")).toBe("Svincolo da parte della società");
    expect(releaseLabel("*7")).toBe("Scadenza contratto/vincolo");
    expect(releaseLabel("*Q")).toBe("*Q");
    expect(releaseLabel(null)).toBeNull();
  });

  it("shows first name + surname initial only", () => {
    expect(publicName("UNO", "ATLETA")).toBe("Uno A.");
    expect(publicName("ANNA MARIA", "DE ESEMPIO")).toBe("Anna Maria D.");
    expect(publicName("", "ATLETA")).toBe("A.");
  });
});

describe("parseExportFile", () => {
  it("turns a valid export into roster and career rows, birth year only", () => {
    const r = parseExportFile(JSON.stringify(file()));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.roster).toEqual([
      { season: "2026/2027", matricola: "1000001", sector: "S", last_name: "ATLETA", first_name: "UNO", birth_year: 2012 },
      { season: "2026/2027", matricola: "1000002", sector: "D", last_name: "ATLETA DOPPIO", first_name: "DUE", birth_year: null },
    ]);
    expect(r.data.career[0]).toEqual({
      matricola: "1000001",
      season: "2025/2026",
      movement_code: "AG",
      movement_label: "AGGIORNAMENTO DI POSIZIONE",
      club_code: OWN_CLUB_CODE,
      club_name: "S.D.C. CLUB DI PROVA",
      is_own_club: true,
      status_code: "3 DILETTANTE",
      event_date: "2025-09-01",
      release_code: "*X",
      release_date: "2026-07-01",
    });
    expect(r.data.career[1]).toMatchObject({ is_own_club: false, event_date: null, status_code: null });
    expect(r.data.players).toBe(2);
    // Minimisation: no birth date anywhere in the rows, only the year.
    const out = JSON.stringify(r.data);
    expect(out).not.toMatch(/birth_date/);
    expect(out).toContain('"birth_year":2012');
  });

  it("refuses invalid files", () => {
    expect(parseExportFile("not json")).toEqual({ ok: false, error: "Il file non è un JSON valido." });
    expect(parseExportFile(JSON.stringify(file({ kind: "other" }))).ok).toBe(false);
    expect(EXPORT_FILE_VERSION).toBe(2);
    expect(parseExportFile(JSON.stringify(file({ version: 1 }))).ok).toBe(false);
    expect(parseExportFile(JSON.stringify(file({ version: 3 }))).ok).toBe(false);
    const badYear = file();
    (badYear.roster as Array<Record<string, unknown>>)[0]!["birth_year"] = "2012";
    expect(parseExportFile(JSON.stringify(badYear)).ok).toBe(false);
    (badYear.roster as Array<Record<string, unknown>>)[0]!["birth_year"] = 2012.5;
    expect(parseExportFile(JSON.stringify(badYear)).ok).toBe(false);
    (badYear.roster as Array<Record<string, unknown>>)[0]!["birth_year"] = 1850;
    expect(parseExportFile(JSON.stringify(badYear)).ok).toBe(false);
    expect(parseExportFile(JSON.stringify(file({ season: "2026/2028" }))).ok).toBe(false);
    expect(parseExportFile(JSON.stringify(file({ read_at: "ieri" }))).ok).toBe(false);
    const badMat = file();
    (badMat.roster as Array<Record<string, unknown>>)[0]!["matricola"] = "12";
    expect(parseExportFile(JSON.stringify(badMat)).ok).toBe(false);
  });

  it("refuses a file carrying a full birth date (version 1 files), with a plain message", () => {
    const withDate = file();
    (withDate.roster as Array<Record<string, unknown>>)[0]!["birth_date"] = "05/03/2012";
    expect(carriesBirthDate(withDate)).toBe(true);
    expect(carriesBirthDate(file())).toBe(false);
    const r = parseExportFile(JSON.stringify(withDate));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/data di nascita completa/);
    // Even with birth_year present, an extra birth_date is refused.
    const both = file();
    (both.roster as Array<Record<string, unknown>>)[1]!["birth_date"] = "";
    expect(parseExportFile(JSON.stringify(both)).ok).toBe(false);
  });

  it("refuses a file carrying a fiscal code or any unknown field", () => {
    const withCf = file();
    (withCf.roster as Array<Record<string, unknown>>)[0]!["fiscal_code"] = "XXXXXX00X00X000X";
    const r = parseExportFile(JSON.stringify(withCf));
    expect(r.ok).toBe(false);
    expect(parseExportFile(JSON.stringify({ ...file(), extra: 1 })).ok).toBe(false);
  });

  it("refuses another club's export and oversize files", () => {
    const r = parseExportFile(JSON.stringify(file({ club_code: "90001" })));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/altra società/);
    expect(parseExportFile("x".repeat(3_000_001)).ok).toBe(false);
  });

  it("merges duplicate rows and skips unreadable career rows", () => {
    const f = file();
    const c = f.career as Array<Record<string, unknown>>;
    c.push({ ...c[0]!, note: null, status: null });
    c.push({ matricola: "1000001", season: "2024/2025", movement: "??", club: OWN, status: null, date: "", note: null });
    (f.roster as Array<Record<string, unknown>>).push({ ...(f.roster as Array<Record<string, unknown>>)[0]! });
    const r = parseExportFile(JSON.stringify(f));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.roster).toHaveLength(2);
    expect(r.data.career).toHaveLength(2);
    expect(r.data.career[0]).toMatchObject({ release_code: "*X", status_code: "3 DILETTANTE" });
    expect(r.data.skipped).toBe(1);
  });
});

/* -------------------------------------------------- views */

const R = (season: string, matricola: string, first: string, sector: "D" | "S", birthYear: number | null): HistoryRoster => ({ season, matricola, sector, lastName: "ATLETA", firstName: first, birthYear });
const C = (matricola: string, season: string, own: boolean, over: Partial<HistoryCareer> = {}): HistoryCareer => ({
  matricola,
  season,
  movementCode: "AG",
  movementLabel: "AGGIORNAMENTO DI POSIZIONE",
  clubCode: own ? OWN_CLUB_CODE : "90001",
  clubName: own ? "S.D.C. CLUB DI PROVA" : "SOCIETA ESEMPIO A",
  own,
  statusCode: null,
  eventDate: `${season.slice(0, 4)}-09-01`,
  releaseCode: null,
  releaseDate: null,
  ...over,
});

const roster: HistoryRoster[] = [
  // 2025/2026
  R("2025/2026", "1000001", "UNO", "S", 2012),
  R("2025/2026", "1000005", "CINQUE", "S", 2011),
  R("2025/2026", "1000006", "SEI", "D", 2005),
  // 2026/2027
  R("2026/2027", "1000001", "UNO", "S", 2012), // confermato (roster N-1)
  R("2026/2027", "1000002", "DUE", "S", 2012), // rientro (with us in 2023/2024)
  R("2026/2027", "1000003", "TRE", "D", 2006), // nuovo (from SOCIETA ESEMPIO B)
  R("2026/2027", "1000004", "QUATTRO", "S", 2018), // primo
  R("2026/2027", "1000007", "SETTE", "D", 2004), // confermato via career row N-1
];
const career: HistoryCareer[] = [
  C("1000002", "2023/2024", true),
  C("1000002", "2024/2025", false),
  C("1000003", "2024/2025", false, { clubCode: "90002", clubName: "SOCIETA ESEMPIO C" }),
  C("1000003", "2025/2026", false, { clubCode: "90003", clubName: "SOCIETA ESEMPIO B" }),
  C("1000007", "2025/2026", true),
  C("1000005", "2025/2026", true, { releaseCode: "*X", releaseDate: "2026-07-01" }),
  C("1000005", "2026/2027", false, { clubCode: "90004", clubName: "SOCIETA ESEMPIO D", eventDate: "2026-08-20" }),
  C("1000006", "2025/2026", true, { releaseCode: "$", releaseDate: "2026-06-30" }),
];

describe("computeHistory", () => {
  const v = computeHistory(roster, career);

  it("picks the latest season and its previous one", () => {
    expect(v.seasons).toEqual(["2025/2026", "2026/2027"]);
    expect(v.current).toBe("2026/2027");
    expect(v.previous).toBe("2025/2026");
  });

  it("classifies every current player", () => {
    const cls = Object.fromEntries(v.currentPlayers.map((p) => [p.matricola, p.cls]));
    expect(cls).toEqual({ "1000001": "CONFERMATO", "1000002": "RIENTRO", "1000003": "NUOVO", "1000004": "PRIMO", "1000007": "CONFERMATO" });
    expect(v.currentPlayers.find((p) => p.matricola === "1000003")!.originClub).toBe("SOCIETA ESEMPIO B");
    expect(v.currentPlayers.find((p) => p.matricola === "1000002")!.lastOwnSeason).toBe("2023/2024");
  });

  it("counts the breakdown by sector", () => {
    expect(v.breakdown.S).toEqual({ CONFERMATO: 1, RIENTRO: 1, NUOVO: 0, PRIMO: 1 });
    expect(v.breakdown.D).toEqual({ CONFERMATO: 1, RIENTRO: 0, NUOVO: 1, PRIMO: 0 });
  });

  it("builds the season table with unknown kept as null", () => {
    const [first, second] = v.table;
    expect(second).toEqual({ season: "2026/2027", rosa: 5, bySector: { D: 2, S: 3 }, confermati: 2, entrati: 3, usciti: 2 });
    // 2025/2026: the 2024/2025 roster was never loaded and the storico was read for 2026/2027's
    // players only, so who was confirmed in 2025/2026 is unknown (not 0).
    expect(first).toEqual({ season: "2025/2026", rosa: 3, bySector: { D: 1, S: 2 }, confermati: null, entrati: null, usciti: null });
    // A season with no data at all before it: confermati/entrati unknown, not zero.
    const lone = computeHistory([R("2020/2021", "1000009", "NOVE", "S", 2010)], []);
    expect(lone.table[0]).toMatchObject({ confermati: null, entrati: null, usciti: null });
  });

  it("groups arrivals by origin club", () => {
    expect(v.arrivals).toEqual([{ club: "SOCIETA ESEMPIO B", count: 1 }]);
  });

  it("lists who did not come back with the release and the new club", () => {
    const d = Object.fromEntries(v.departures.map((x) => [x.matricola, x]));
    expect(Object.keys(d).sort()).toEqual(["1000005", "1000006"]);
    expect(d["1000005"]).toMatchObject({ name: "Cinque A.", birthYear: 2011, sector: "S", lastOwnSeason: "2025/2026", releaseCode: "*X", releaseLabel: "Termine automatico tesseramento giovanile", releaseDate: "2026-07-01", nowAt: "SOCIETA ESEMPIO D" });
    expect(d["1000006"]).toMatchObject({ releaseLabel: "Svincolo da parte della società", nowAt: null, sector: "D" });
    expect(v.lossesByYear).toEqual([
      { birthYear: 2011, D: 0, S: 1, total: 1 },
      { birthYear: 2005, D: 1, S: 0, total: 1 },
    ]);
  });

  it("filters, groups and searches without showing surnames", () => {
    expect(filterDepartures(v.departures, "D", "").map((x) => x.matricola)).toEqual(["1000006"]);
    expect(filterDepartures(v.departures, "tutti", "cinque").map((x) => x.matricola)).toEqual(["1000005"]);
    expect(groupByBirthYear(v.departures).map((g) => g.birthYear)).toEqual([2011, 2005]);
    expect(searchPlayers(v.players, "atleta tre").map((p) => p.matricola)).toEqual(["1000003"]);
    expect(searchPlayers(v.players, "1000004").map((p) => p.name)).toEqual(["Quattro A."]);
    expect(searchPlayers(v.players, "a")).toEqual([]);
    for (const p of v.players) expect(p.name).not.toMatch(/ATLETA|Atleta /);
  });

  it("builds a player's timeline with our club highlighted", () => {
    const t = v.timelines["1000002"]!;
    expect(t.map((x) => [x.season, x.own])).toEqual([
      ["2023/2024", true],
      ["2024/2025", false],
      ["2026/2027", true],
    ]);
    expect(t[2]!.movement).toBe("Tabulato SGS");
    expect(timeline("1000005", roster, career).find((x) => x.release)!.release).toBe("Termine automatico tesseramento giovanile");
  });

  it("handles no data", () => {
    const e = computeHistory([], []);
    expect(e.current).toBeNull();
    expect(e.table).toEqual([]);
    expect(e.departures).toEqual([]);
  });
});
