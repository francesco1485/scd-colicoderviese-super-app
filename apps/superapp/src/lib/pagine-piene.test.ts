/**
 * "Pagine piene" (Francesco 16/10/2026 23:08 «non voglio pagine vuote»): source assertions that the public pages no
 * longer lead with a placeholder and that visitors get real content or real actions. Guards (sessions, members-only
 * prefixes, http-policy) stay as they were.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { isPublicPath, MEMBERS_ONLY_PREFIXES } from "./http-policy";

const read = (rel: string) => readFileSync(resolve(__dirname, "..", rel), "utf8");

describe("/eventi", () => {
  const src = read("routes/eventi.index.tsx");
  it("renders the initiatives section only with initiatives, no 'Nessuna iniziativa' block", () => {
    expect(src).not.toMatch(/Nessuna iniziativa in corso/);
    expect(src).toMatch(/hasContent\(initiatives\) && \(/);
  });
  it("leads with the season's tournaments when no club event is published", () => {
    expect(src).toMatch(/eventi\.length === 0 \? \(\s*\/\/[^\n]*\n\s*<SeasonTournaments \/>/);
    expect(src).toMatch(/TOURNAMENTS\.filter/);
  });
});

describe("/eventi/christmas-lario-cup", () => {
  it("shows the live tournament block only once it starts; before, a single small line", () => {
    const src = read("routes/eventi.christmas-lario-cup.tsx");
    expect(src).toMatch(/phase === "pre" \? \(\s*<p id="live"/);
    expect(src).toMatch(/data-testid="clc-live-line"/);
  });
});

describe("/sostieni", () => {
  const src = read("routes/sostieni.index.tsx");
  it("never shows 'Da attivare' notes or empty catalogue placeholders to visitors", () => {
    expect(src).not.toMatch(/<NotActiveNote/);
    expect(src).not.toMatch(/Catalogo da attivare|in preparazione\.|Altri oggetti in arrivo/);
  });
  it("offers only the actions that work today", () => {
    expect(src).toMatch(/readyActions\(/);
    expect(src).toMatch(/to: "\/sponsor",\s*hash: "proposta"/);
    expect(src).toMatch(/to: "\/sostieni\/fondo-solidale"/);
    // Catalogue, campaigns and proposal form only once the giving engine is open.
    expect(src).toMatch(/\{active && items\.length > 0 && \(/);
    expect(src).toMatch(/a\.id === "proponi" \? active/);
  });
});

describe("/top11", () => {
  const src = read("routes/top11.tsx");
  it("explains how voting works instead of an empty week", () => {
    expect(src).not.toMatch(/Nessun voto la scorsa settimana/);
    expect(src).not.toMatch(/Nessun giocatore votabile/);
    expect(src).toMatch(/<HowItWorks \/>/);
  });
  it("gives visitors both account actions", () => {
    expect(src).toMatch(/to="\/registrati"/);
    expect(src).toMatch(/to="\/accedi"\s*search=\{\{ next: "\/top11" \}\}/);
  });
});

describe("/squadre for visitors", () => {
  const src = read("routes/squadre.tsx");
  it("shows the public categories instead of a lock, rosters stay members-only", () => {
    expect(src).not.toMatch(/MembersOnlyScreen/);
    expect(src).toMatch(/<PublicTeamsScreen teams=\{data\.teams\} \/>/);
    expect(src).not.toMatch(/getPublicRoster|getStaffRoster/);
  });
  it("sends visitors only the fields they see (no crest files, no events, no people)", () => {
    const fields = src.match(/function publicTeams[\s\S]*?\n\}\n/)?.[0] ?? "";
    expect(fields).not.toMatch(/logo|events|roster/);
    expect(src).toMatch(/return \{ signedIn: false as const, teams: publicTeams\(hallTeams\(calendar\.groups\)\) \}/);
  });
  it("keeps /squadre private (no new public prefix)", () => {
    expect(isPublicPath("/squadre")).toBe(false);
    expect(MEMBERS_ONLY_PREFIXES).toContain("/squadre");
  });
});

describe("/crea and /la-mia-scd for visitors", () => {
  it.each(["routes/crea.tsx", "routes/la-mia-scd.tsx"])("%s renders the join page", (file) => {
    expect(read(file)).toMatch(/<JoinClubScreen/);
  });
  it("the join page lists what the account gives and links only to /registrati and /accedi", () => {
    const src = read("components/scd/JoinClub.tsx");
    for (const t of ["Calendario", "Allenamenti", "Il tuo avatar", "Statistiche e classifiche", "Community", "Fantacalcio", "Giochi", "La squadra di tuo figlio", "Pulmino", "Documenti"]) {
      expect(src).toContain(`title: "${t}"`);
    }
    const targets = [...src.matchAll(/to="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(targets)).toEqual(new Set(["/registrati", "/accedi"]));
  });
});
