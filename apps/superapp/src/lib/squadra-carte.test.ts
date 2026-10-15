import { describe, expect, it } from "vitest";

import type { RosterPlayer } from "./public-roster";
import {
  cardName,
  deckMode,
  deckTeams,
  flipHint,
  minimizeDeck,
  pickTeam,
  playerCards,
  roleCounts,
  staffCards,
  staffRole,
  teamShortName,
  teamText,
} from "./squadra-carte";
import type { StaffPerson } from "./staff-roster";

const p = (id: string, name: string, role: RosterPlayer["role"], adult = true): RosterPlayer => ({ id, name, role, adult });

const s = (id: string, name: string, role: string, teams: string[], kind: StaffPerson["kind"] = "staff"): StaffPerson => ({
  id,
  name,
  role,
  kind,
  teams,
  areas: [],
  avatar: null,
});

describe("squadra carte · players", () => {
  it("orders by role P, D, C, A, then players without role, names in Italian order", () => {
    const cards = playerCards([
      p("1", "Zeta Uno", "A"),
      p("2", "Bruno Due", "D"),
      p("3", "Aldo Tre", null),
      p("4", "Èrcole Quattro", "P"),
      p("5", "Andrea Cinque", "D"),
      p("6", "Carlo Sei", "C"),
      p("7", "Alberto Sette", "P"),
    ]);
    expect(cards.map((c) => c.id)).toEqual(["7", "4", "5", "2", "6", "1", "3"]);
  });

  it("maps codes, labels and descriptions; unknown role gets a dash and an honest text", () => {
    const [gk, none] = playerCards([p("1", "Mario Rossi", "P"), p("2", "Luca B.", null, false)]);
    expect(gk).toMatchObject({ code: "P", roleLabel: "Portiere" });
    expect(gk!.description).toMatch(/porta/);
    expect(none).toMatchObject({ code: "–", roleLabel: "Ruolo da definire" });
    expect(none!.description).toMatch(/non ancora indicato/);
  });

  it("never adds data: a minor's name stays exactly as the function returned it", () => {
    const [c] = playerCards([p("m1", "Christian B.", "C", false)]);
    expect(c!.name).toBe("Christian B.");
    expect(Object.keys(c!).sort()).toEqual(["code", "description", "id", "name", "role", "roleLabel"]);
  });

  it("counts roles for the header and skips empty roles", () => {
    const cards = playerCards([p("1", "A", "P"), p("2", "B", "A"), p("3", "C", "A"), p("4", "D", null)]);
    expect(roleCounts(cards)).toEqual([
      { role: "P", label: "Portiere", count: 1 },
      { role: "A", label: "Attaccante", count: 2 },
    ]);
  });
});

describe("squadra carte · visibility", () => {
  it("refused calls show nothing", () => {
    expect(deckMode("prima", false)).toBe("unauthorized");
    expect(deckMode("pulcini", false)).toBe("unauthorized");
  });

  it("player cards only on the official named teams", () => {
    for (const t of ["prima", "u19", "u16", "u15"]) expect(deckMode(t, true)).toBe("players");
  });

  it("base-activity teams show only the count (and staff), never player cards", () => {
    for (const t of ["2014", "2015", "pulcini", "primicalci", "piccoli", "esordienti"]) expect(deckMode(t, true)).toBe("count");
  });

  it("unknown teams fall back to the count", () => {
    expect(deckMode("u18", true)).toBe("count");
  });
});

describe("squadra carte · staff", () => {
  const people: StaffPerson[] = [
    s("dir", "Dario Dirigente", "Dirigente accompagnatore", ["Prima"], "dirigente"),
    s("all", "Mario Mister", "Allenatore", ["Prima Squadra"], "mister"),
    s("prep", "Pietro Preparatore", "Preparatore atletico", ["Prima"], "mister"),
    s("port", "Paolo Portieri", "Allenatore dei portieri", ["Prima"], "mister"),
    s("vice", "Vito Vice", "Secondo allenatore", ["Prima"], "mister"),
    s("aut", "Aldo Autista", "Autista pulmino", ["Prima"], "autista"),
    s("u15", "Ugo Quindici", "Allenatore U15", ["U15"], "mister"),
    s("g15", "Gino Giovanissimi", "Dirigente", ["Giovanissimi"], "dirigente"),
    s("e14", "Elio Esordienti", "Allenatore annata 2014", ["2014"], "mister"),
  ];

  it("maps role labels to codes and groups", () => {
    expect(staffRole("Allenatore")).toEqual({ rank: 0, code: "ALL", group: "Allenatore" });
    expect(staffRole("Secondo allenatore U16")).toMatchObject({ code: "VICE" });
    expect(staffRole("Preparatore atletico")).toMatchObject({ code: "PREP" });
    expect(staffRole("Allenatore dei portieri")).toMatchObject({ code: "PREP" });
    expect(staffRole("Team manager")).toMatchObject({ code: "DIR" });
    expect(staffRole("Responsabile tecnico")).toMatchObject({ code: "RESP" });
    expect(staffRole("Magazziniere")).toMatchObject({ code: "STAFF", group: "Staff" });
  });

  it("orders head coach, vice, preparatori, dirigenti and drops drivers", () => {
    const prima = staffCards(people, { id: "prima", label: "Prima Squadra", years: [] });
    expect(prima.map((c) => c.id)).toEqual(["all", "vice", "port", "prep", "dir"]);
  });

  it("matches the annata by id, calendar label or birth year", () => {
    expect(staffCards(people, { id: "u15", label: "U15 · Giovanissimi", years: [] }).map((c) => c.id)).toEqual(["u15", "g15"]);
    expect(staffCards(people, { id: "2014", label: "Esordienti · 2014", years: ["2014"] }).map((c) => c.id)).toEqual(["e14"]);
    expect(staffCards(people, { id: "piccoli", label: "Piccoli Amici", years: [] })).toEqual([]);
  });

  it("team text joins id, label and years", () => {
    expect(teamText({ id: "u16", label: "U16 Elite · 2011", years: ["2011"] })).toBe("u16 U16 Elite · 2011 2011");
  });
});

describe("squadra carte · switcher", () => {
  it("puts the Prima Squadra first and keeps the rest in order", () => {
    expect(deckTeams([{ id: "u19" }, { id: "prima" }, { id: "u15" }]).map((t) => t.id)).toEqual(["prima", "u19", "u15"]);
  });

  it("accepts only known teams from the URL", () => {
    const ids = ["prima", "u19", "pulcini"];
    expect(pickTeam("U19", ids)).toBe("u19");
    expect(pickTeam("../admin", ids)).toBe("prima");
    expect(pickTeam(undefined, ids)).toBe("prima");
    expect(pickTeam("x", ["pulcini"])).toBe("pulcini");
    expect(pickTeam("x", [])).toBeNull();
  });

  it("short names and flip hints", () => {
    expect(teamShortName("Esordienti · 2014")).toBe("Esordienti 2014");
    expect(flipHint(false)).toMatch(/girare/);
    expect(flipHint(true)).toMatch(/tornare/);
  });
});

describe("squadra carte · minimisation (review 15/10)", () => {
  it("minors always first name + initial, adults as written", () => {
    expect(cardName({ name: "Luca Verdi", adult: false })).toBe("Luca V.");
    expect(cardName({ name: "Luca De Santis", adult: false })).toBe("Luca S.");
    expect(cardName({ name: "Luca V.", adult: false })).toBe("Luca V.");
    expect(cardName({ name: "Luca", adult: false })).toBe("Luca");
    expect(cardName({ name: "Marco Rossi", adult: true })).toBe("Marco Rossi");
  });
  it("no player names for base teams; only this team's staff, without avatars or drivers", () => {
    const team = { id: "u15", label: "U15 Giovanissimi", years: ["2011"] };
    const base = { id: "pulcini", label: "Pulcini", years: ["2016"] };
    const roster = { team: "u15", count: 2, players: [p("a", "Luca Verdi", "D", false), p("b", "Ugo Neri", "C", true)] };
    const staff = {
      authorized: true,
      asOf: null,
      people: [
        { ...s("1", "Mario Bianchi", "Allenatore", ["U15"]), avatar: "/x.webp", areas: ["pulmini"] },
        s("2", "Gino Gialli", "Dirigente", ["Prima"]),
        s("3", "Aldo Blu", "Autista", ["U15"], "autista"),
      ],
    };
    const out = minimizeDeck(roster, staff, team);
    expect(out.roster?.players.map((x) => x.name)).toEqual(["Luca V.", "Ugo Neri"]);
    expect(out.staff.people.map((x) => x.id)).toEqual(["1"]);
    expect(out.staff.people[0]?.avatar).toBeNull();
    expect(out.staff.people[0]?.areas).toEqual([]);
    expect(minimizeDeck({ ...roster, team: "pulcini" }, staff, base).roster?.players).toEqual([]);
    expect(minimizeDeck(null, staff, null).staff.people).toEqual([]);
  });
});
