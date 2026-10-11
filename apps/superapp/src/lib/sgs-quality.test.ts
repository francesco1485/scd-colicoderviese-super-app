import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  SGS_RULES,
  checkCoaching,
  daysBetween,
  deadlinesFor,
  emptyStatus,
  meetsLevel3Extra,
  meetsMandatory,
  minScore,
  obligationAt,
  organizationalScore,
  parseStatus,
  requirementRows,
  requirementsAt,
  summarize,
  validateRules,
  type ClubStatus,
} from "./sgs-quality";

const repo = (p: string) => fileURLToPath(new URL(`../../../../${p}`, import.meta.url));
const role = (id: string) => SGS_RULES.organizational.find((r) => r.id === id)!;

describe("SGS rules (config/sgs-quality-system.v1.json)", () => {
  it("is the file at the repository root and is valid", () => {
    expect(SGS_RULES).toEqual(JSON.parse(readFileSync(repo("config/sgs-quality-system.v1.json"), "utf8")));
    expect(validateRules()).toEqual([]);
    expect(SGS_RULES.source.id).toBe("CU18_SGS_2026");
  });

  it("encodes the third-level table of the Manuale 2026 (p. 41)", () => {
    const mandatory = requirementsAt(SGS_RULES.organizational, 3).map((r) => r.id).sort();
    expect(mandatory).toEqual(
      [
        "allenatore-portieri",
        "allenatori-sg",
        "delegato-tutela-minori",
        "dirigente-responsabile-sg",
        "medico-sg",
        "organigramma",
        "programma-informazione",
        "referente-qualita",
        "responsabile-adb",
        "responsabile-sg",
        "safeguarding-officer",
        "segretario-adb",
        "segretario-sg",
      ].sort(),
    );
    expect(requirementsAt(SGS_RULES.organizational, 3, "R").map((r) => r.id).sort()).toEqual(["preparatori-atletici", "psicologo"]);
    expect(obligationAt(role("match-analyst"), 3)).toBe("N");
    expect(obligationAt(role("responsabile-adb"), 2)).toBe("N");
  });

  it("has the organizational score thresholds 30/60/100/140/180", () => {
    expect([1, 2, 3, 4, 5].map((l) => minScore(l as 1))).toEqual([30, 60, 100, 140, 180]);
  });

  it("flags an obligation that weakens at a higher level", () => {
    const broken = JSON.parse(JSON.stringify(SGS_RULES));
    broken.organizational[0].levels = ["O", "N", "O", "O", "O"];
    expect(validateRules(broken)).toContain("organigramma: obligation weakens at level 2");
  });
});

describe("deadlines", () => {
  it("counts calendar days", () => {
    expect(daysBetween("2026-10-11", "2026-10-31")).toBe(20);
    expect(daysBetween("2026-10-31", "2026-10-31")).toBe(0);
    expect(daysBetween("2026-11-01", "2026-10-31")).toBe(-1);
  });

  it("lists the third-level deadlines in order with their state", () => {
    const list = deadlinesFor(3, "2026-10-11");
    expect(list[0]).toMatchObject({ id: "dichiarazione-impegno", state: "passed", daysLeft: -11 });
    const oct = list.filter((d) => d.date === "2026-10-31");
    expect(oct.map((d) => d.id)).toContain("progetto-qualificante");
    expect(oct.every((d) => d.state === "due-soon" && d.daysLeft === 20)).toBe(true);
    expect(list.at(-1)).toMatchObject({ id: "relazione-finale", state: "upcoming" });
  });

  it("hides level-3 deadlines for a first-level club", () => {
    expect(deadlinesFor(1, "2026-10-11").map((d) => d.id)).not.toContain("progetto-qualificante");
  });
});

describe("private status parsing", () => {
  it("returns everything unknown when the env is empty or broken", () => {
    expect(parseStatus(undefined)).toEqual(emptyStatus());
    expect(parseStatus("{not json")).toEqual(emptyStatus());
  });

  it("keeps only known ids, statuses, codes and counts", () => {
    const s = parseStatus(
      JSON.stringify({
        asOf: "2026-10-11",
        source: "Organigramma FIGC 24/09",
        declaration: { sent: "UNKNOWN", level: 9 },
        roles: { "medico-sg": "MISSING", "responsabile-sg": "WHATEVER", invented: "COVERED" },
        criteria: { "tutela-minori": "TO_VERIFY" },
        teams: [
          { id: "u16-elite", label: "U16 Élite", category: "allievi", headCoach: "UEFA_C", coachName: "should be ignored" },
          { id: "bad id!", label: "x", category: "allievi" },
          { id: "u12", label: "U12", category: "esordienti", headCoach: "SOMETHING" },
        ],
        players: { pulcini: 30, esordienti: -2, invented: 5 },
        scoreItems: ["segretario-sg", "nope"],
      }),
    );
    expect(s.declaration).toEqual({ sent: "UNKNOWN", level: null });
    expect(s.roles).toEqual({ "medico-sg": "MISSING" });
    expect(s.criteria).toEqual({ "tutela-minori": "TO_VERIFY" });
    expect(s.teams).toEqual([
      { id: "u16-elite", label: "U16 Élite", category: "allievi", headCoach: "UEFA_C" },
      { id: "u12", label: "U12", category: "esordienti", headCoach: "UNKNOWN" },
    ]);
    expect(JSON.stringify(s)).not.toContain("should be ignored");
    expect(s.players).toEqual({ pulcini: 30, esordienti: null });
    expect(s.scoreItems).toEqual(["segretario-sg"]);
  });
});

describe("requirement rows", () => {
  it("shows mandatory first, hides non-mandatory, and separates gaps from open checks", () => {
    const rows = requirementRows(SGS_RULES.organizational, 3, { "medico-sg": "MISSING", "responsabile-adb": "TO_VERIFY", organigramma: "COVERED" });
    expect(rows.some((r) => r.req.id === "match-analyst")).toBe(false);
    expect(rows.findIndex((r) => r.obligation === "R")).toBeGreaterThan(rows.findLastIndex((r) => r.obligation === "O"));
    expect(rows.find((r) => r.req.id === "medico-sg")).toMatchObject({ gap: true, open: false });
    expect(rows.find((r) => r.req.id === "responsabile-adb")).toMatchObject({ gap: false, open: true });
    expect(rows.find((r) => r.req.id === "segretario-sg")).toMatchObject({ status: "UNKNOWN", open: true });
  });

  it("summarizes mandatory roles and criteria", () => {
    const s = summarize({ ...emptyStatus(), roles: { "medico-sg": "MISSING", organigramma: "COVERED" } }, 3);
    expect(s).toMatchObject({ missing: 1, covered: 1 });
    expect(s.mandatoryTotal).toBe(s.missing + s.open + s.covered);
  });
});

describe("coaching rules", () => {
  it("accepts the small-ages alternatives only for Piccoli Amici and Primi Calci", () => {
    expect(meetsMandatory("primi-calci", "SCIENZE_MOTORIE")).toBe(true);
    expect(meetsMandatory("pulcini", "SCIENZE_MOTORIE")).toBe(false);
    expect(meetsMandatory("pulcini", "UEFA_C")).toBe(true);
    expect(meetsLevel3Extra("pulcini", "LIVELLO_E")).toBe(true);
    expect(meetsMandatory("pulcini", "LIVELLO_E")).toBe(false);
  });

  const base = (teams: ClubStatus["teams"], players: ClubStatus["players"] = {}): ClubStatus => ({ ...emptyStatus(), teams, players });

  it("puts the best qualified team of a base category in the mandatory slot", () => {
    const r = checkCoaching(
      base([
        { id: "p16", label: "Pulcini 2016", category: "pulcini", headCoach: "NONE" },
        { id: "p17", label: "Pulcini 2017", category: "pulcini", headCoach: "UEFA_C" },
      ]),
      3,
    );
    expect(r.teams.find((t) => t.team.id === "p17")).toMatchObject({ mandatorySlot: true, check: "ok" });
    expect(r.teams.find((t) => t.team.id === "p16")).toMatchObject({ mandatorySlot: false, check: "gap" });
    expect(r.categories.find((c) => c.category.id === "pulcini")?.check).toBe("ok");
  });

  it("the extra team without qualification is fine below the third level", () => {
    const r = checkCoaching(base([{ id: "p16", label: "Pulcini 2016", category: "pulcini", headCoach: "UEFA_C" }, { id: "p16b", label: "Pulcini B", category: "pulcini", headCoach: "NONE" }]), 2);
    expect(r.teams.find((t) => t.team.id === "p16b")?.check).toBe("ok");
  });

  it("raises the Non Classificato risk when an Allievi team has no UEFA coach or a base category is missing", () => {
    const full = [
      { id: "pa", label: "Piccoli Amici", category: "piccoli-amici" as const, headCoach: "SCIENZE_MOTORIE" },
      { id: "pc", label: "Primi Calci", category: "primi-calci" as const, headCoach: "UEFA_C" },
      { id: "pu", label: "Pulcini", category: "pulcini" as const, headCoach: "UEFA_C" },
      { id: "es", label: "Esordienti", category: "esordienti" as const, headCoach: "UEFA_B" },
      { id: "gi", label: "Giovanissimi", category: "giovanissimi" as const, headCoach: "UEFA_C" },
      { id: "al", label: "Allievi", category: "allievi" as const, headCoach: "UEFA_C" },
    ];
    expect(checkCoaching(base(full), 3).unclassifiedRisk).toBe("no");
    expect(checkCoaching(base(full.map((t) => (t.id === "al" ? { ...t, headCoach: "NONE" } : t))), 3).unclassifiedRisk).toBe("yes");
    expect(checkCoaching(base(full.filter((t) => t.id !== "pa")), 3).unclassifiedRisk).toBe("yes");
    expect(checkCoaching(base(full.map((t) => (t.id === "es" ? { ...t, headCoach: "UNKNOWN" } : t))), 3).unclassifiedRisk).toBe("unknown");
    expect(checkCoaching(emptyStatus(), 3).unclassifiedRisk).toBe("unknown");
  });

  it("checks minimum players and teams per players", () => {
    const r = checkCoaching(base([{ id: "pu", label: "Pulcini", category: "pulcini", headCoach: "UEFA_C" }], { pulcini: 31, esordienti: null }), 3);
    const pulcini = r.categories.find((c) => c.category.id === "pulcini")!;
    expect(pulcini).toMatchObject({ players: 31, belowMinimum: false, tooFewTeams: true });
    expect(r.categories.find((c) => c.category.id === "esordienti")).toMatchObject({ players: null, belowMinimum: null, tooFewTeams: null, check: "absent" });
  });
});

describe("organizational score", () => {
  it("counts only the best item per group", () => {
    const r = organizationalScore(["rsg-allenatore", "rsg-specifica", "segretario-sg", "medico-sg"], 3)!;
    expect(r.points).toBe(30 + 10 + 6);
    expect(r).toMatchObject({ threshold: 100, reached: false });
  });

  it("is null when not assessed", () => {
    expect(organizationalScore(null, 3)).toBeNull();
  });
});
