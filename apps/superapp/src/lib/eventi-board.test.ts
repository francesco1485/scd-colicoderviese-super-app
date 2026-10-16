import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { TONES, toneAt } from "@/components/home/tones";
import { CLC_DAY, EVENT_KINDS, clcAhead, countdownWords, dateBlock, daysBetween, otherTournaments } from "./eventi-board";

const APP = resolve(__dirname, "../..");
const read = (f: string) => readFileSync(resolve(APP, f), "utf8");

describe("eventi board helpers", () => {
  it("Christmas Lario Cup is Tuesday 8 December 2026 (VERIFIED)", () => {
    expect(CLC_DAY).toBe("2026-12-08");
    expect(dateBlock(CLC_DAY)).toEqual({ day: "8", month: "dic", weekday: "mar", year: "2026" });
  });

  it("counts whole days and words the countdown", () => {
    expect(daysBetween("2026-10-16", "2026-12-08")).toBe(53);
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2); // DST change
    expect(daysBetween("bad", "2026-12-08")).toBeNull();
    expect(countdownWords("2026-10-16", CLC_DAY)).toBe("tra 53 giorni");
    expect(countdownWords("2026-12-07", CLC_DAY)).toBe("domani");
    expect(countdownWords("2026-12-08", CLC_DAY)).toBe("oggi");
    expect(countdownWords("2026-12-09", CLC_DAY)).toBeNull();
    expect(clcAhead("2026-12-08")).toBe(true);
    expect(clcAhead("2026-12-09")).toBe(false);
  });

  it("unknown dates stay unknown (never a made-up day)", () => {
    expect(dateBlock(null)).toBeNull();
    expect(dateBlock("2027-02-30x")).toBeNull();
  });

  it("other tournaments exclude the featured cup and keep Nasazzi 22–23 May 2027", () => {
    const list = otherTournaments("2026-10-16");
    expect(list.some((t) => t.id.startsWith("christmas-lario-cup"))).toBe(false);
    const nasazzi = list.find((t) => t.id === "memorial-jose-nasazzi");
    expect(nasazzi?.when).toBe("22–23 maggio 2027");
    expect(nasazzi?.date).toBe("2027-05-22");
  });

  it("one club colour per kind, with purpose", () => {
    expect(EVENT_KINDS.torneo.tone).toBe("sole");
    expect(EVENT_KINDS.iniziativa.tone).toBe("azzurro");
    expect(EVENT_KINDS.club.tone).toBe("navy");
    expect(TONES.sole.cta).toBe("scd-navy-btn");
    expect(toneAt(4)).toBe("azzurro");
  });
});

describe("eventi, tornei e comunità in SCD METAL (source)", () => {
  const eventi = read("src/routes/eventi.index.tsx");
  const clc = read("src/routes/eventi.christmas-lario-cup.tsx");
  const community = read("src/routes/community.tsx");
  const lezioni = read("src/routes/eventi.lezioni-tecnico-coordinative.tsx");
  const css = read("src/styles.css");

  it("styles carry the azzurro and sole bands and the navy button", () => {
    for (const c of [".scd-band-azzurro {", ".scd-band-sole {", ".scd-navy-btn {"]) expect(css).toContain(c);
  });

  it("compact headers, no tall photo hero", () => {
    for (const s of [eventi, community, lezioni]) {
      expect(s).toMatch(/<MetalPageHeader /);
      expect(s).not.toMatch(/PageHero|hero-colico|lario-header/);
    }
    expect(clc).toMatch(/className="scd-band relative overflow-hidden/);
    expect(clc).not.toMatch(/lario-header|function Snow|KitTexture|100svh/);
  });

  it("/eventi keeps every existing entry and link", () => {
    for (const id of ["eventi-clc", "eventi-iniziative", "eventi-iniziative-empty", "eventi-lotteria", "eventi-initiative-"])
      expect(eventi).toContain(id);
    expect(eventi).toContain('id="iniziative"');
    expect(eventi).toContain("{lottery && <LotteryRow"); // lotteria only when published (UD-115/UD-132)
    for (const to of ['"/eventi/christmas-lario-cup"', '"/eventi/lotteria-dello-sport"', '"/calendario"', '"/tornei"'])
      expect(eventi).toContain(to);
    expect(eventi).toContain("scd-band-sole");
    expect(eventi).toContain("scd-navy-btn");
    // never gold on yellow
    expect(eventi).not.toMatch(/scd-band-sole[^"]*scd-gold/);
  });

  it("CLC header keeps anchors, countdown and actions", () => {
    for (const k of ['id="clc-t"', 'data-testid="clc-countdown"', 'href="#iscrizioni"', 'id="iscrizioni"', "<ShareButton", 'role="status"'])
      expect(clc).toContain(k);
  });

  it("/community keeps every door and states the rules (UD-137)", () => {
    for (const to of ['"/fantacalcio"', '"/top11"', '"/squadre"', '"/crea"', '"/rassegna-stampa"', 'to: "/"']) expect(community).toContain(to);
    expect(community).toContain("Solo squadre agonistiche");
    expect(community).toContain("Giocatori con nome e iniziale");
    expect(community).toContain("Per votare serve un account del club");
    expect(community).toContain("Sotto i 14 anni con l'account della famiglia");
    expect(community).toContain("Attività di base esclusa");
    expect(community).not.toContain("Nessuna classifica individuale dei minori");
    expect(community).not.toMatch(/lotteria|adotta/i);
  });
});
