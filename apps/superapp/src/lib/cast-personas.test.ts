import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { CAST_ROSTER, rosterEntry } from "./assistant-cast";
import { PUBLIC_CAST_PERSONAS, buildPublicContext, chatPersonaFor, parseAssistantAnswer, personaRules, personaVoice, systemPrompt, type BuiltContext, type PublicContextInput } from "./assistant";
import {
  CAST_PERSONAS,
  CAST_PERSONA_IDS,
  GENNY_PRESENCE,
  PRESENCE_HOMES,
  castAnswerProblems,
  castAreaContext,
  castCopyProblems,
  castDefaultReply,
  castIntentReply,
  castOperationalReply,
  dailyCastTip,
  isOperationalFor,
  type CastFacts,
  type PresenceId,
} from "./cast-personas";
import { detectDistress } from "./cast-safety";

/** Every full path of the route tree (the generated file is the source of truth of what pages exist). */
function routePaths(): Set<string> {
  const src = readFileSync(resolve(__dirname, "../routeTree.gen.ts"), "utf8");
  const block = src.slice(src.indexOf("export interface FileRoutesByFullPath"), src.indexOf("}", src.indexOf("export interface FileRoutesByFullPath")));
  return new Set([...block.matchAll(/'([^']+)': typeof/g)].map((m) => m[1]!.replace(/\/$/, "") || "/"));
}

const PRESENCES: readonly PresenceId[] = [...CAST_PERSONA_IDS, "genny"];

describe("area personas registry (UD-114)", () => {
  it("covers every roster character except Genny's helper role, once", () => {
    expect(new Set(CAST_PERSONA_IDS).size).toBe(CAST_PERSONA_IDS.length);
    expect([...CAST_PERSONA_IDS].sort()).toEqual(CAST_ROSTER.filter((r) => r.presence === "AREA_PERSONA").map((r) => r.id).sort());
    for (const id of CAST_PERSONA_IDS) expect(CAST_PERSONAS[id].id).toBe(id);
  });

  it("keeps neutral role labels while the names are to be decided, never an invented personal name", () => {
    for (const id of CAST_PERSONA_IDS) {
      const d = CAST_PERSONAS[id];
      const r = rosterEntry(d.rosterId);
      expect(d.nameTbd, id).toBe(r.nameTbd);
      if (d.nameTbd) {
        expect(d.label, id).toMatch(/^(Lo|La|Il|L'|Musica)/);
        expect(d.voice, id).toMatch(/nome ancora da decidere/);
      } else expect(d.label, id).toBe(r.label);
    }
    expect(CAST_PERSONAS["accoglienza-chef"].label).toBe("Lo chef");
    expect(CAST_PERSONAS.biglietteria.label).toBe("La biglietteria");
  });

  it("writes every piece of curated copy within the rules: no digits but 112, no diet, drug, therapy or plan wording", () => {
    for (const id of PRESENCES) {
      const tips = id === "genny" ? GENNY_PRESENCE.tips : CAST_PERSONAS[id].tips;
      expect(tips.length, id).toBeGreaterThanOrEqual(6);
      for (const t of tips) expect(castCopyProblems(id, `${t.title} ${t.text}`), `${id}/${t.key}`).toEqual([]);
      const disclaimer = id === "genny" ? GENNY_PRESENCE.disclaimer : CAST_PERSONAS[id].disclaimer;
      expect(castCopyProblems(id, disclaimer), id).toEqual([]);
      if (id !== "genny") {
        expect(castCopyProblems(id, CAST_PERSONAS[id].chat.greeting), id).toEqual([]);
        for (const n of CAST_PERSONAS[id].notes) expect(castCopyProblems(id, n.text), id).toEqual([]);
      }
    }
  });

  it("catches broken copy with the guards", () => {
    expect(castCopyProblems("era", "Mangia 200 grammi di pasta")).not.toEqual([]);
    expect(castCopyProblems("era", "Una dieta per perdere peso")).not.toEqual([]);
    expect(castCopyProblems("musica-relax", "Questa è una terapia per l'ansia")).not.toEqual([]);
    expect(castCopyProblems("mental-coach", "Ti faccio una diagnosi")).not.toEqual([]);
    expect(castCopyProblems("preparatore-atletico", "La tua scheda personale")).not.toEqual([]);
    expect(castCopyProblems("acanfora", "Prendi un antidolorifico")).not.toEqual([]);
    expect(castCopyProblems("biglietteria", "Il biglietto costa 10 euro")).not.toEqual([]);
    expect(castCopyProblems("acanfora", "Chiama il 112")).toEqual([]);
  });

  it("never lets a distress pattern sit in curated copy (it would trigger the referral on itself)", () => {
    for (const id of PRESENCES) {
      const tips = id === "genny" ? GENNY_PRESENCE.tips : CAST_PERSONAS[id].tips;
      for (const t of tips) expect(detectDistress(`${t.title} ${t.text}`), `${id}/${t.key}`).toBeNull();
    }
  });

  it("gives every persona 2-4 quick actions to pages that exist, and a home page that exists", () => {
    const paths = routePaths();
    expect(paths.has("/famiglia")).toBe(true);
    for (const id of PRESENCES) {
      const quick = id === "genny" ? GENNY_PRESENCE.quick : CAST_PERSONAS[id].quick;
      expect(quick.length, id).toBeGreaterThanOrEqual(2);
      expect(quick.length, id).toBeLessThanOrEqual(4);
      for (const l of quick) expect(paths.has(l.to), `${id} -> ${l.to}`).toBe(true);
      expect(paths.has(PRESENCE_HOMES[id].to), `${id} home -> ${PRESENCE_HOMES[id].to}`).toBe(true);
    }
    for (const id of CAST_PERSONA_IDS) for (const n of CAST_PERSONAS[id].notes) if (n.to) expect(paths.has(n.to), `${id} note -> ${n.to}`).toBe(true);
  });

  it("points public personas only to public pages", async () => {
    const { isPublicPath } = await import("./http-policy");
    for (const id of PUBLIC_CAST_PERSONAS) for (const l of CAST_PERSONAS[id].quick) expect(isPublicPath(l.to), `${id} -> ${l.to}`).toBe(true);
  });
});

describe("daily tip", () => {
  it("is deterministic by Rome day, the same for everybody, and cycles through every tip", () => {
    for (const id of PRESENCES) {
      expect(dailyCastTip(id, "2026-10-14")).toEqual(dailyCastTip(id, "2026-10-14"));
      const tips = id === "genny" ? GENNY_PRESENCE.tips : CAST_PERSONAS[id].tips;
      const seen = new Set<string>();
      for (let d = 1; d <= tips.length; d++) seen.add(dailyCastTip(id, `2026-11-${String(d).padStart(2, "0")}`).key);
      expect(seen.size, id).toBe(tips.length);
    }
  });

  it("changes from one day to the next", () => {
    expect(dailyCastTip("biglietteria", "2026-10-14").key).not.toBe(dailyCastTip("biglietteria", "2026-10-15").key);
  });
});

describe("persona routing (one rule for chat, button and server)", () => {
  const family = { roles: ["famiglia"], age15plus: null };
  const athlete = { roles: ["atleta"], age15plus: null };
  const staff = { roles: ["segreteria"], age15plus: null };

  it("keeps the base helper when nothing or something unknown is asked", () => {
    expect(chatPersonaFor("public", null)).toBe("crovi");
    expect(chatPersonaFor("public", null, "hacker")).toBe("crovi");
    expect(chatPersonaFor("inside", staff, "genny")).toBe("genny");
    expect(chatPersonaFor("inside", athlete, null)).toBe("sky");
  });

  it("opens only the public-data personas on public pages", () => {
    expect([...PUBLIC_CAST_PERSONAS].sort()).toEqual(["biglietteria", "mentore-tornei", "volto-sponsor"]);
    expect(chatPersonaFor("public", null, "biglietteria")).toBe("biglietteria");
    expect(chatPersonaFor("public", null, "mentore-tornei")).toBe("mentore-tornei");
    for (const inside of ["accoglienza-chef", "era", "acanfora", "mental-coach", "musica-relax", "preparatore-atletico"]) expect(chatPersonaFor("public", family, inside)).toBe("crovi");
  });

  it("opens area personas inside only for staff and adult members; younger members and unknown ages keep Sky", () => {
    for (const id of CAST_PERSONA_IDS) {
      expect(chatPersonaFor("inside", family, id)).toBe(id);
      expect(chatPersonaFor("inside", staff, id)).toBe(id);
      expect(chatPersonaFor("inside", athlete, id)).toBe("sky");
      expect(chatPersonaFor("inside", null, id)).toBe("sky");
      expect(chatPersonaFor("inside", { roles: ["segreteria"], age15plus: false }, id)).toBe("sky");
    }
  });
});

describe("system prompt of an area persona", () => {
  const ctx: BuiltContext = { text: "## Dati\nNiente", links: new Set(["/famiglia"]), emails: new Set(), phones: new Set(), truncated: false };

  it("carries the persona voice, the shared persona rules and its own hard rules, with the same JSON output", () => {
    for (const id of CAST_PERSONA_IDS) {
      const p = systemPrompt(id, "PUBLIC", ctx);
      expect(p).toContain(personaVoice(id));
      for (const r of personaRules(id)) expect(p).toContain(r);
      expect(p).toMatch(/non confermarle mai e non chiedere pagamenti/);
      expect(p).toMatch(/non fare terapia/);
      expect(p).toContain('{"text":"risposta","mood":"info|success|alert"');
      expect(p.indexOf("</final_checks>")).toBeLessThan(p.indexOf("<context>"));
    }
    expect(systemPrompt("musica-relax", "PUBLIC", ctx)).toMatch(/Non sei uno psicologo/);
    expect(systemPrompt("mental-coach", "PUBLIC", ctx)).toMatch(/minori senza i genitori/);
    expect(systemPrompt("accoglienza-chef", "PUBLIC", ctx)).toMatch(/SQUBY\/SumUp/);
    expect(systemPrompt("crovi", "PUBLIC", ctx)).not.toMatch(/personaggio originale dell'app/);
  });

  it("puts the area first in the context so the cap never cuts it", () => {
    const input: PublicContextInput = {
      today: "2026-10-14",
      calendar: null,
      clubEvents: [],
      contacts: { email: "sportclubcolico@gmail.com", pec: "calciocolicoderviese@pec.it", site: "https://www.colicoderviese.it/", address: "Via Lido SNC, 23823 Colico (LC)" },
      sites: [],
      ticketing: null,
      registration: { interests: [], affiliations: [] },
      sponsorPackages: [],
      sponsorNames: [],
      resultLinks: [],
      safeguardingSubject: "RISERVATO - SAFEGUARDING",
    };
    const area = castAreaContext("accoglienza-chef", "2026-10-14");
    const built = buildPublicContext(input, 300, area);
    expect(built.text).toContain(area.title);
    expect(built.text.indexOf(area.title)).toBeLessThan(built.text.indexOf("Contatti ufficiali") === -1 ? Infinity : built.text.indexOf("Contatti ufficiali"));
    expect(built.links.has("/famiglia")).toBe(true);
  });

  it("lists real tournaments and the next home match in the area context, and says when there are none", () => {
    const facts: CastFacts = { ticketing: null, nextHomeMatch: "domenica 18/10 ore 15:30, Prima Squadra contro AVVERSARIO", tournaments: ["Christmas Lario Cup, 8 dicembre 2026, Colico (in programma)"] };
    expect(castAreaContext("mentore-tornei", "2026-10-14", facts).lines.map((l) => l.text).join("\n")).toContain("Christmas Lario Cup");
    expect(castAreaContext("biglietteria", "2026-10-14", facts).lines.map((l) => l.text).join("\n")).toContain("AVVERSARIO");
    expect(castAreaContext("mentore-tornei", "2026-10-14").lines.map((l) => l.text).join("\n")).toContain("Nessun torneo");
  });
});

describe("output guard of an area persona", () => {
  const ctx: BuiltContext = { text: "", links: new Set(["/famiglia"]), emails: new Set(), phones: new Set(), truncated: false };

  it("drops answers that confirm an order, a ticket or a payment (the rules engine answers instead)", () => {
    expect(parseAssistantAnswer('{"text":"Perfetto, ho confermato il tuo ordine per sabato!"}', ctx, "accoglienza-chef")).toBeNull();
    expect(parseAssistantAnswer('{"text":"Il biglietto è confermato, pagamento ricevuto."}', ctx, "biglietteria")).toBeNull();
    expect(castAnswerProblems("mentore-tornei", "La tua iscrizione è confermata")).not.toEqual([]);
  });

  it("drops therapy wording for Musica e relax and the Mental coach, numbers and plans for Era and the Preparatore", () => {
    expect(parseAssistantAnswer('{"text":"Facciamo una piccola terapia insieme."}', ctx, "musica-relax")).toBeNull();
    expect(parseAssistantAnswer('{"text":"La diagnosi è stress da gara."}', ctx, "mental-coach")).toBeNull();
    expect(parseAssistantAnswer('{"text":"Mangia 80 grammi di pasta."}', ctx, "era")).toBeNull();
    expect(parseAssistantAnswer('{"text":"Fai 3 serie da 10 ripetizioni."}', ctx, "preparatore-atletico")).toBeNull();
    expect(parseAssistantAnswer('{"text":"Prendi un antidolorifico."}', ctx, "acanfora")).toBeNull();
  });

  it("keeps good answers and the link allowlist", () => {
    const r = parseAssistantAnswer('{"text":"Compila la richiesta nell\'area famiglia: conferma una persona e si paga alla cassa.","links":[{"label":"Richiesta","to":"/famiglia"},{"label":"Fuori","to":"/admin"}]}', ctx, "accoglienza-chef");
    expect(r?.links).toEqual([{ label: "Richiesta", to: "/famiglia" }]);
  });
});

describe("rules-engine answers of the personas (AI off)", () => {
  const facts: CastFacts = {
    ticketing: {
      status: "CONFIRMED",
      where: "Biglietteria all'ingresso visitatori.",
      howToPay: ["Contanti"],
      tariffs: { P: { label: "Promozione", intero: 10, ridotto: 5 } },
      ridottoNote: "da 12 a 18 anni",
      bambiniNote: "Bambini fino a 12 anni: ingresso gratuito",
      freeCompetitions: "Altri campionati: gratis",
      members: "Tesserati: gratis",
      cup: "Coppa: paga chi non è tesserato",
    },
    nextHomeMatch: "domenica 18/10 ore 15:30, Prima Squadra contro AVVERSARIO",
    tournaments: ["Christmas Lario Cup, 8 dicembre 2026, Colico (in programma)"],
  };

  it("quotes only real ticket facts, and hides prices that are not confirmed", () => {
    expect(castIntentReply("biglietteria", "quanto costa il biglietto?", facts)?.text).toMatch(/intero 10 €, ridotto 5 €/);
    expect(castIntentReply("biglietteria", "quanto costa?", { ...facts, ticketing: { ...facts.ticketing!, status: "PENDING" } })?.text).toMatch(/non sono ancora confermati/);
    expect(castIntentReply("biglietteria", "chi entra gratis?", facts)?.text).toMatch(/Bambini fino a 12 anni/);
    expect(castIntentReply("biglietteria", "prossima partita in casa", facts)?.text).toMatch(/AVVERSARIO/);
    expect(castIntentReply("biglietteria", "prossima partita in casa")?.text).toMatch(/Non vedo partite/);
    expect(castIntentReply("mentore-tornei", "qual è il prossimo torneo?", facts)?.text).toMatch(/Christmas Lario Cup/);
  });

  it("refuses plans, numbers and medicines in the persona's voice", () => {
    expect(castIntentReply("era", "mi fai una dieta per mio figlio?")?.text).toMatch(/Non do piani/);
    expect(castIntentReply("preparatore-atletico", "mi fai una scheda personale?")?.text).toMatch(/non li do/);
    expect(castIntentReply("acanfora", "che farmaco gli do?")?.text).toMatch(/Non indico farmaci/);
    expect(castIntentReply("accoglienza-chef", "ho un'allergia alle noci")?.text).toMatch(/di persona/);
  });

  it("collects operational requests for a person, never confirmed, never paid", () => {
    expect(isOperationalFor("accoglienza-chef", "vorrei ordinare una torta per la festa")).toBe(true);
    expect(isOperationalFor("biglietteria", "posso comprare il biglietto qui?")).toBe(true);
    expect(isOperationalFor("mentore-tornei", "vorremmo iscrivere la nostra squadra")).toBe(true);
    expect(isOperationalFor("musica-relax", "vorrei ordinare")).toBe(false);
    for (const id of ["accoglienza-chef", "biglietteria", "mentore-tornei", "mental-coach", "volto-sponsor"] as const) {
      const r = castOperationalReply(id);
      expect(castAnswerProblems(id, r.text), id).toEqual([]);
      expect(r.text, id).not.toMatch(/confermat[oa] (il|la|tuo|tua)/);
      expect(r.links?.length, id).toBeGreaterThan(0);
    }
    expect(castOperationalReply("accoglienza-chef").text).toMatch(/si paga alla cassa del club, mai in chat/);
  });

  it("answers with the persona's own default when nothing matches: who, today's tip, quick links", () => {
    for (const id of CAST_PERSONA_IDS) {
      const r = castDefaultReply(id, "2026-10-14");
      expect(r.text, id).toContain(dailyCastTip(id, "2026-10-14").text);
      expect(r.links?.length, id).toBeGreaterThanOrEqual(2);
    }
  });
});
