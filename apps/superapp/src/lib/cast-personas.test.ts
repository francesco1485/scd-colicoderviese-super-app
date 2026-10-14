import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { CAST_ROSTER, rosterEntry } from "./assistant-cast";
import { PUBLIC_CHAT_AREAS, buildPublicContext, parseAssistantAnswer, personaRules, resolveChat, systemPrompt, type BuiltContext, type PublicContextInput } from "./assistant";
import {
  CAST_FACES,
  CAST_PERSONAS,
  CAST_PERSONA_IDS,
  CHAT_AREA_IDS,
  FACE_IDS,
  PRESENCE_HOMES,
  TIP_ONLY_IDS,
  VERA_PRESENCE,
  castAreaContext,
  castCopyProblems,
  castIntentReply,
  castOperationalReply,
  dailyCastTip,
  isChatArea,
  isOperationalFor,
  veraAnswerProblems,
  veraAreaReply,
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

const PRESENCES: readonly PresenceId[] = [...CAST_PERSONA_IDS, "vera"];
const tipsOf = (id: PresenceId) => (id === "vera" ? VERA_PRESENCE.tips : CAST_PERSONAS[id].tips);

describe("simplified cast (UD-118): Vera + four faces + tips of the day", () => {
  it("covers every roster area once, with the kind decided by the Direzione", () => {
    expect(new Set(CAST_PERSONA_IDS).size).toBe(CAST_PERSONA_IDS.length);
    expect([...CAST_PERSONA_IDS].sort()).toEqual(CAST_ROSTER.filter((r) => r.presence !== "CHAT_PERSONA").map((r) => r.id).sort());
    for (const id of CAST_PERSONA_IDS) {
      expect(CAST_PERSONAS[id].id).toBe(id);
      expect(CAST_PERSONAS[id].kind, id).toBe(rosterEntry(id).presence);
    }
    expect(CAST_PERSONA_IDS.filter((id) => CAST_PERSONAS[id].kind === "FACE").sort()).toEqual(["accoglienza-chef", "mentore-tornei", "volto-sponsor"]);
    expect([...TIP_ONLY_IDS].sort()).toEqual(["acanfora", "era", "mental-coach", "musica-relax", "preparatore-atletico"]);
    expect(CAST_PERSONAS.biglietteria.kind).toBe("ABSORBED");
  });

  it("has no chat entry for the tip-only characters: no chat area, no surface, no hand-over, no chat questions", () => {
    for (const id of TIP_ONLY_IDS) {
      const d = CAST_PERSONAS[id];
      expect(isChatArea(id), id).toBe(false);
      expect(CHAT_AREA_IDS as readonly string[]).not.toContain(id);
      expect(d.surfaces, id).toEqual({ public: false, inside: false });
      expect(d.handoff, id).toBeNull();
      expect(d.chatQuick, id).toEqual([]);
      expect(d.operational, id).toBeNull();
      for (const surface of ["public", "inside"] as const) expect(resolveChat(surface, { roles: ["segreteria"], age15plus: null }, id).area, `${surface}/${id}`).toBeNull();
    }
  });

  it("opens Vera's chat with the faces and the ticket office only, each with a hand-over and chat questions", () => {
    expect([...CHAT_AREA_IDS].sort()).toEqual(["accoglienza-chef", "biglietteria", "mentore-tornei", "volto-sponsor"]);
    for (const id of CHAT_AREA_IDS) {
      const d = CAST_PERSONAS[id];
      expect(d.handoff, id).toBeTruthy();
      expect(d.chatQuick.length, id).toBeGreaterThanOrEqual(2);
    }
    expect(CAST_PERSONAS["accoglienza-chef"].handoff).toMatch(/^Per la Club House ti aiuta lo Chef/);
  });

  it("gives each of the four faces 2-3 actions on pages that exist, and a home page that exists", () => {
    const paths = routePaths();
    expect(FACE_IDS).toEqual(["accoglienza-chef", "volto-sponsor", "mentore-tornei", "sky"]);
    for (const id of FACE_IDS) {
      const f = CAST_FACES[id];
      expect(f.actions.length, id).toBeGreaterThanOrEqual(2);
      expect(f.actions.length, id).toBeLessThanOrEqual(3);
      for (const l of f.actions) expect(paths.has(l.to), `${id} -> ${l.to}`).toBe(true);
      expect(paths.has(f.home.to), `${id} home -> ${f.home.to}`).toBe(true);
      expect(f.does.length, id).toBeGreaterThan(20);
    }
    expect(CAST_FACES["volto-sponsor"].actions.some((a) => a.to === "/sponsor")).toBe(true);
    expect(CAST_FACES["mentore-tornei"].actions.some((a) => a.hash === "iscrizioni")).toBe(true);
    expect(CAST_FACES["accoglienza-chef"].actions.map((a) => a.hash)).toEqual(expect.arrayContaining(["richiesta-ordine", "sondaggi-piatti"]));
    expect(CAST_FACES.sky.area).toBeNull();
  });

  it("keeps Sky's face in the kids' world: no commercial action, no chat area", () => {
    for (const a of CAST_FACES.sky.actions) expect(a.to, a.label).not.toMatch(/sponsor|partner|shop|kit|card|tesoreria|crm/);
    expect(CAST_FACES.sky.does).toMatch(/under 14/);
  });

  it("keeps neutral role labels while the names are to be decided, never an invented personal name", () => {
    for (const id of CAST_PERSONA_IDS) {
      const d = CAST_PERSONAS[id];
      const r = rosterEntry(d.rosterId);
      expect(d.nameTbd, id).toBe(r.nameTbd);
      if (d.nameTbd) expect(d.label, id).toMatch(/^(Lo|La|Il|L'|Musica)/);
      else expect(d.label, id).toBe(r.label);
    }
    expect(CAST_PERSONAS["accoglienza-chef"].label).toBe("Lo Chef");
    expect(VERA_PRESENCE.label).toBe("Vera");
  });

  it("writes every piece of curated copy within the rules: no digits but 112, no diet, drug, therapy or plan wording", () => {
    for (const id of PRESENCES) {
      const tips = tipsOf(id);
      expect(tips.length, id).toBeGreaterThanOrEqual(6);
      for (const t of tips) expect(castCopyProblems(id, `${t.title} ${t.text}`), `${id}/${t.key}`).toEqual([]);
      const disclaimer = id === "vera" ? VERA_PRESENCE.disclaimer : CAST_PERSONAS[id].disclaimer;
      expect(castCopyProblems(id, disclaimer), id).toEqual([]);
      if (id !== "vera") {
        const d = CAST_PERSONAS[id];
        expect(castCopyProblems(id, d.does), id).toEqual([]);
        if (d.handoff) expect(castCopyProblems(id, d.handoff), id).toEqual([]);
        for (const n of d.notes) expect(castCopyProblems(id, n.text), id).toEqual([]);
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
    for (const id of PRESENCES) for (const t of tipsOf(id)) expect(detectDistress(`${t.title} ${t.text}`), `${id}/${t.key}`).toBeNull();
  });

  it("links every presence to pages that exist, with a home page that exists", () => {
    const paths = routePaths();
    for (const id of PRESENCES) {
      const quick = id === "vera" ? VERA_PRESENCE.quick : CAST_PERSONAS[id].quick;
      expect(quick.length, id).toBeGreaterThanOrEqual(2);
      expect(quick.length, id).toBeLessThanOrEqual(3);
      for (const l of quick) expect(paths.has(l.to), `${id} -> ${l.to}`).toBe(true);
      expect(paths.has(PRESENCE_HOMES[id].to), `${id} home -> ${PRESENCE_HOMES[id].to}`).toBe(true);
    }
    for (const id of CAST_PERSONA_IDS) for (const n of CAST_PERSONAS[id].notes) if (n.to) expect(paths.has(n.to), `${id} note -> ${n.to}`).toBe(true);
  });

  it("points public areas only to public pages", async () => {
    const { isPublicPath } = await import("./http-policy");
    expect([...PUBLIC_CHAT_AREAS].sort()).toEqual(["biglietteria", "mentore-tornei", "volto-sponsor"]);
    for (const id of PUBLIC_CHAT_AREAS) for (const l of CAST_PERSONAS[id].quick) expect(isPublicPath(l.to), `${id} -> ${l.to}`).toBe(true);
  });
});

describe("daily tip", () => {
  it("is deterministic by Rome day, the same for everybody, and cycles through every tip", () => {
    for (const id of PRESENCES) {
      expect(dailyCastTip(id, "2026-10-14")).toEqual(dailyCastTip(id, "2026-10-14"));
      const tips = tipsOf(id);
      const seen = new Set<string>();
      for (let d = 1; d <= tips.length; d++) seen.add(dailyCastTip(id, `2026-11-${String(d).padStart(2, "0")}`).key);
      expect(seen.size, id).toBe(tips.length);
    }
  });

  it("changes from one day to the next", () => {
    expect(dailyCastTip("vera", "2026-10-14").key).not.toBe(dailyCastTip("vera", "2026-10-15").key);
  });
});

describe("area routing (one rule for chat, button and server)", () => {
  const family = { roles: ["famiglia"], age15plus: null };
  const athlete = { roles: ["atleta"], age15plus: null };
  const staff = { roles: ["segreteria"], age15plus: null };

  it("keeps Vera's general chat when nothing or something unknown is asked", () => {
    expect(resolveChat("public", null)).toEqual({ persona: "vera", area: null });
    expect(resolveChat("public", null, "hacker")).toEqual({ persona: "vera", area: null });
    expect(resolveChat("inside", staff, "vera")).toEqual({ persona: "vera", area: null });
    expect(resolveChat("inside", athlete, null)).toEqual({ persona: "sky", area: null });
  });

  it("opens only the public-data areas on public pages", () => {
    expect(resolveChat("public", null, "biglietteria")).toEqual({ persona: "vera", area: "biglietteria" });
    expect(resolveChat("public", null, "mentore-tornei")).toEqual({ persona: "vera", area: "mentore-tornei" });
    expect(resolveChat("public", null, "volto-sponsor")).toEqual({ persona: "vera", area: "volto-sponsor" });
    expect(resolveChat("public", family, "accoglienza-chef")).toEqual({ persona: "vera", area: null });
  });

  it("opens areas inside only for staff and adult members; younger members and unknown ages keep Sky, without area", () => {
    for (const id of CHAT_AREA_IDS) {
      expect(resolveChat("inside", family, id)).toEqual({ persona: "vera", area: id });
      expect(resolveChat("inside", staff, id)).toEqual({ persona: "vera", area: id });
      expect(resolveChat("inside", athlete, id)).toEqual({ persona: "sky", area: null });
      expect(resolveChat("inside", null, id)).toEqual({ persona: "sky", area: null });
      expect(resolveChat("inside", { roles: ["segreteria"], age15plus: false }, id)).toEqual({ persona: "sky", area: null });
    }
  });
});

describe("system prompt of Vera with an area", () => {
  const ctx: BuiltContext = { text: "## Dati\nNiente", links: new Set(["/famiglia"]), emails: new Set(), phones: new Set(), truncated: false };

  it("carries Vera's voice and rules, the area's hand-over and hard rules, with the same JSON output", () => {
    for (const area of CHAT_AREA_IDS) {
      const p = systemPrompt("vera", "PUBLIC", ctx, area);
      expect(p).toMatch(/Sei Vera, la reception/);
      for (const r of personaRules("vera", area)) expect(p).toContain(r);
      expect(p).toContain(CAST_PERSONAS[area].handoff!);
      expect(p).toMatch(/non confermarle mai e non chiedere pagamenti/);
      expect(p).toMatch(/non fare terapia/);
      expect(p).toContain('{"text":"risposta","mood":"info|success|alert"');
      expect(p.indexOf("</final_checks>")).toBeLessThan(p.indexOf("<context>"));
    }
    expect(systemPrompt("vera", "PUBLIC", ctx, "accoglienza-chef")).toMatch(/SQUBY\/SumUp/);
    expect(systemPrompt("sky", "PUBLIC", ctx, "accoglienza-chef")).not.toMatch(/SQUBY/);
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

describe("output guard of Vera", () => {
  const ctx: BuiltContext = { text: "", links: new Set(["/famiglia"]), emails: new Set(), phones: new Set(), truncated: false };

  it("drops answers that confirm an order, a ticket or a payment (the rules engine answers instead)", () => {
    expect(parseAssistantAnswer('{"text":"Perfetto, ho confermato il tuo ordine per sabato!"}', ctx, "vera")).toBeNull();
    expect(parseAssistantAnswer('{"text":"Il biglietto è confermato, pagamento ricevuto."}', ctx, "vera", false)).toBeNull();
    expect(veraAnswerProblems("La tua iscrizione è confermata")).not.toEqual([]);
  });

  it("keeps the limits of the tip-only topics in Vera's mouth: no therapy, diet, drugs or personal plans", () => {
    expect(parseAssistantAnswer('{"text":"Facciamo una piccola terapia insieme."}', ctx, "vera")).toBeNull();
    expect(parseAssistantAnswer('{"text":"La diagnosi è stress da gara."}', ctx, "vera")).toBeNull();
    expect(parseAssistantAnswer('{"text":"Segui una dieta leggera e controlla il peso."}', ctx, "vera")).toBeNull();
    expect(parseAssistantAnswer('{"text":"Fai tre serie da dieci ripetizioni."}', ctx, "vera")).toBeNull();
    expect(parseAssistantAnswer('{"text":"Prendi un antidolorifico."}', ctx, "vera")).toBeNull();
    // Staff reading the Cervellone (non-strict): only the confirmation guard.
    expect(parseAssistantAnswer('{"text":"Il fornitore dei farmaci dell\'infermeria è nel Cervellone."}', ctx, "vera", false)).not.toBeNull();
  });

  it("keeps good answers and the link allowlist", () => {
    const r = parseAssistantAnswer('{"text":"Compila la richiesta nell\'area famiglia (fonte: Club House): conferma una persona e si paga alla cassa.","links":[{"label":"Richiesta","to":"/famiglia"},{"label":"Fuori","to":"/admin"}]}', ctx, "vera");
    expect(r?.links).toEqual([{ label: "Richiesta", to: "/famiglia" }]);
  });
});

describe("rules-engine answers of the areas (AI off)", () => {
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

  it("refuses plans, numbers and medicines with fixed copy", () => {
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
    expect(isOperationalFor("mental-coach", "vorrei un appuntamento")).toBe(false);
    for (const id of CHAT_AREA_IDS) {
      const r = castOperationalReply(id);
      expect(veraAnswerProblems(r.text), id).toEqual([]);
      expect(r.text, id).not.toMatch(/confermat[oa] (il|la|tuo|tua)/);
      expect(r.links?.length, id).toBeGreaterThan(0);
    }
    expect(castOperationalReply("accoglienza-chef").text).toMatch(/si paga alla cassa del club, mai in chat/);
  });

  it("hands over to the face of the area with today's tip and its actions when nothing matches", () => {
    for (const id of CHAT_AREA_IDS) {
      const r = veraAreaReply(id, "2026-10-14");
      expect(r.text, id).toContain(CAST_PERSONAS[id].handoff!);
      expect(r.text, id).toContain(dailyCastTip(id, "2026-10-14").text);
      expect(r.links?.length, id).toBeGreaterThanOrEqual(2);
    }
    expect(veraAreaReply("accoglienza-chef", "2026-10-14").links?.[0]?.to).toBe("/famiglia#richiesta-ordine");
  });
});
