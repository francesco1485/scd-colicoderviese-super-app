import { describe, expect, it } from "vitest";

import { VAN_UNITS } from "./pulmini-vans";
import {
  IDEA_AUDIENCE_UNKNOWN,
  SPONSOR_IDEAS,
  choiceById,
  choiceIdsUnique,
  choiceRequestNote,
  choiceTopic,
  ideaAudience,
  parseChoiceParam,
} from "./sponsor-ideas";
import { PARTNER_PACKAGES, hypeWordsIn } from "./sponsor-packages";
import { SPONSORS } from "./sponsors";
import { TOURNAMENTS } from "./tournaments";

const copyOf = (i: (typeof SPONSOR_IDEAS)[number]) => [i.title, i.where, i.community, i.audience ?? "", ...i.gets, ...i.facts].join(" \n ");

describe("SPONSOR_IDEAS", () => {
  it("covers the assets asked: tournaments, pulmini, palestra, infermeria, Fondo Solidale, kit", () => {
    const scenes = new Set(SPONSOR_IDEAS.map((i) => i.scene));
    for (const s of ["torneo", "pulmino", "palestra", "infermeria", "fondo", "kit"]) expect(scenes.has(s as never), s).toBe(true);
    expect(SPONSOR_IDEAS.length).toBeGreaterThanOrEqual(6);
  });

  it("each idea names the asset, the community value, what the sponsor gets and its source", () => {
    for (const i of SPONSOR_IDEAS) {
      expect(i.id).toMatch(/^idea-[a-z0-9-]{2,35}$/);
      expect(i.title.length, i.id).toBeGreaterThan(3);
      expect(i.where.length, i.id).toBeGreaterThan(5);
      expect(i.community.length, i.id).toBeGreaterThan(30);
      expect(i.gets.length, i.id).toBeGreaterThanOrEqual(2);
      expect(i.gets.length, i.id).toBeLessThanOrEqual(3);
      expect(i.source.length, i.id).toBeGreaterThan(5);
    }
  });

  it("ids are unique and never collide with a package id", () => {
    expect(choiceIdsUnique()).toBe(true);
    const pkg = new Set(PARTNER_PACKAGES.map((p) => p.id));
    for (const i of SPONSOR_IDEAS) expect(pkg.has(i.id)).toBe(false);
  });

  it("no price, no amount, no reach number, no hype", () => {
    for (const i of SPONSOR_IDEAS) {
      const t = copyOf(i);
      expect(t, i.id).not.toMatch(/€|\beuro\b|prezz|sconto|gratis|visualizzazion|impression|contatti|follower/i);
      expect(hypeWordsIn(t), i.id).toEqual([]);
      if (i.audience) expect(i.audience, i.id).not.toMatch(/\d/);
    }
  });

  it("an unknown audience is «da confermare», never zero", () => {
    expect(ideaAudience({ audience: null })).toBe(IDEA_AUDIENCE_UNKNOWN);
    expect(IDEA_AUDIENCE_UNKNOWN).toBe("da confermare");
  });

  it("numbers only from the repo: pulmini count and lines, confirmed teams of the female cup", () => {
    const pulmini = SPONSOR_IDEAS.find((i) => i.id === "idea-pulmini")!;
    expect(pulmini.facts).toContain(`${VAN_UNITS.length} pulmini`);
    for (const v of VAN_UNITS) expect(pulmini.facts).toContain(`Linea ${v.line}`);
    const female = SPONSOR_IDEAS.find((i) => i.id === "idea-clc-female")!;
    const t = TOURNAMENTS.find((x) => x.id === "christmas-lario-cup-female")!;
    if (t.confirmedTeams.length > 0) expect(female.facts).toContain(`${t.confirmedTeams.length} squadre già confermate`);
    expect(female.facts).toContain(t.when);
  });

  it("never names a current sponsor and never a child", () => {
    const names = SPONSORS.flatMap((s) => (s.name && s.nameVerified ? [s.name.toLowerCase()] : []));
    for (const i of SPONSOR_IDEAS) for (const n of names) expect(copyOf(i).toLowerCase().includes(n), `${i.id} → ${n}`).toBe(false);
    const pulmini = copyOf(SPONSOR_IDEAS.find((i) => i.id === "idea-pulmini")!);
    for (const v of VAN_UNITS) for (const s of v.boardRoute ?? []) if (s.place) expect(pulmini).not.toContain(s.place);
  });

  it("Sostieni links only to existing public pages", () => {
    for (const i of SPONSOR_IDEAS) if (i.sostieni) expect(["/sostieni", "/sostieni/fondo-solidale"]).toContain(i.sostieni.href);
  });
});

describe("choice helpers (?pacchetto= for packages and ideas)", () => {
  it("accepts known package and idea ids only", () => {
    expect(parseChoiceParam("ledwall")).toBe("ledwall");
    expect(parseChoiceParam("idea-pulmini")).toBe("idea-pulmini");
    expect(parseChoiceParam("seggiolino")).toBeUndefined();
    expect(parseChoiceParam("idea-inventata")).toBeUndefined();
    expect(parseChoiceParam(7)).toBeUndefined();
  });

  it("names the choice in the message and the e-mail subject", () => {
    expect(choiceRequestNote("tornei")).toBe("Mi interessa il pacchetto «Tornei».");
    expect(choiceRequestNote("idea-fondo-solidale")).toBe("Mi interessa l'idea «Fondo Solidale».");
    expect(choiceRequestNote("x")).toBe("");
    expect(choiceTopic(choiceById("idea-pulmini")!)).toBe("Idea I pulmini del club");
    expect(choiceTopic(choiceById("maglia-kit")!)).toBe("Pacchetto Maglia e kit");
  });
});
