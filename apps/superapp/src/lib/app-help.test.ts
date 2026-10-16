import { describe, expect, it, vi } from "vitest";

import { APP_HELP_REPLY, isExplicitAppQuestion, isLegacyAppHelp } from "./app-help";
import type { PublicContextInput } from "./assistant";
import { answerPublic, answerStaff, type StaffDeps } from "./assistant.server";
import { castRulesAnswer } from "./cast-rules";
import type { SkyReply } from "./sky.functions";

const KEY = "sk-ant-test-key-never-real";
const ON = { SCD_ASSISTANT_AI: "on", SCD_ANTHROPIC_API_KEY: KEY };
const OFF = { SCD_ANTHROPIC_API_KEY: KEY };
const TRIAL = "Mio figlio ha 7 anni e non ha mai giocato: come funziona il primo allenamento di prova?";
const RULES: SkyReply = { text: "risposta delle regole", mood: "info" };

function ctxInput(): PublicContextInput {
  return {
    today: "2026-10-16",
    calendar: { groups: [], events: [] },
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
}

function claudeOk(text: string): Response {
  return new Response(JSON.stringify({ content: [{ type: "text", text }], usage: { input_tokens: 10, output_tokens: 10 } }), { status: 200, headers: { "content-type": "application/json" } });
}

let ipSeq = 0;
function ask(message: string, env: Record<string, string>, fetchImpl = vi.fn(async () => claudeOk('{"text":"Risposta del modello con le fonti del club."}'))) {
  const rules = vi.fn(async () => RULES);
  const loadContext = vi.fn(async () => ctxInput());
  const run = () => answerPublic({ message, persona: "vera", ip: `10.9.0.${++ipSeq}` }, { env, fetchImpl: fetchImpl as never, rules, loadContext });
  return { rules, loadContext, fetchImpl, run };
}

describe("isExplicitAppQuestion: fixed guide only for explicit app / login questions", () => {
  it("matches questions about the app and its account", () => {
    for (const q of [
      "Come funziona l'app?",
      "come funziona l'applicazione",
      "a cosa serve la super app?",
      "come si usa l'app",
      "Come mi registro?",
      "come faccio ad accedere?",
      "Non riesco ad accedere",
      "come posso accedere all'app",
      "ho dimenticato la password",
      "Come funziona l'app",
    ]) {
      expect(isExplicitAppQuestion(q), q).toBe(true);
    }
  });

  it("does not match generic 'come funziona' questions about the club", () => {
    for (const q of [
      TRIAL,
      "come funziona la scuola calcio?",
      "come funziona il tesseramento?",
      "a cosa serve il certificato medico?",
      "come funziona il fondo solidale?",
      "c'è una guida per i genitori dei piccoli?",
    ]) {
      expect(isExplicitAppQuestion(q), q).toBe(false);
    }
  });

  it("the legacy wide match still covers the old cases (used only without the model)", () => {
    expect(isLegacyAppHelp(TRIAL)).toBe(true);
    expect(isLegacyAppHelp("guida")).toBe(true);
    expect(isLegacyAppHelp("quando gioca la prima squadra")).toBe(false);
  });
});

describe("answerPublic: fewer fixed answers (Francesco 16/10/2026 13:10)", () => {
  it("sends the parent's trial-training question to the model when the AI is on", async () => {
    const t = ask(TRIAL, ON);
    const r = await t.run();
    expect(t.fetchImpl).toHaveBeenCalledTimes(1);
    expect(t.loadContext).toHaveBeenCalled();
    expect(t.rules).not.toHaveBeenCalled();
    expect(r.ai).toBe(true);
    expect(r.text).not.toBe(APP_HELP_REPLY.text);
  });

  it("explicit app questions still get the fixed guide, without calling the model", async () => {
    for (const q of ["Come funziona l'app", "Come mi registro?"]) {
      const t = ask(q, ON);
      const r = await t.run();
      expect(t.fetchImpl, q).not.toHaveBeenCalled();
      expect(r).toMatchObject({ text: APP_HELP_REPLY.text, ai: false, persona: "vera", links: APP_HELP_REPLY.links });
    }
  });

  it("AI off: behaviour unchanged, the generic 'come funziona' still gets the app guide", async () => {
    const t = ask(TRIAL, OFF);
    const r = await t.run();
    expect(t.fetchImpl).not.toHaveBeenCalled();
    expect(r).toMatchObject({ text: APP_HELP_REPLY.text, ai: false });
    const other = ask("quando gioca la prima squadra?", OFF);
    expect(await other.run()).toMatchObject({ text: RULES.text, ai: false });
  });

  it("model failure: falls back to the same rules as without the key", async () => {
    const t = ask(TRIAL, ON, vi.fn(async () => new Response("{}", { status: 500 })));
    const r = await t.run();
    expect(t.fetchImpl).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ text: APP_HELP_REPLY.text, ai: false });
  });

  it("safeguarding and distress stay first, even inside an app question", async () => {
    for (const env of [ON, OFF]) {
      for (const q of ["come funziona l'app per segnalare un abuso?", "come mi registro? mi sento giù", "non voglio più vivere"]) {
        const t = ask(q, env);
        const r = await t.run();
        expect(t.fetchImpl, q).not.toHaveBeenCalled();
        expect(t.rules, q).toHaveBeenCalledTimes(1);
        expect(r.text, q).toBe(RULES.text);
      }
    }
  });

  it("with the real rules engine, safeguarding inside an app question gets the reserved channel", async () => {
    const general = vi.fn(async () => RULES);
    const rules = (d: { message: string }) => castRulesAnswer(d, { general, day: "2026-10-16" });
    const r = await answerPublic({ message: "come funziona l'app per segnalare un abuso?", persona: "vera", ip: "10.9.1.1" }, { env: ON, fetchImpl: vi.fn() as never, rules, loadContext: async () => ctxInput() });
    expect(general).toHaveBeenCalledTimes(1);
    expect(r.text).not.toBe(APP_HELP_REPLY.text);
  });
});

describe("answerStaff: same narrowing inside", () => {
  function deps(env: Record<string, string>, fetchImpl: ReturnType<typeof vi.fn>): StaffDeps {
    return {
      env,
      fetchImpl: fetchImpl as never,
      rules: vi.fn(async () => RULES),
      kbSearch: vi.fn(async () => null),
      loadPublicContext: vi.fn(async () => ctxInput()),
      session: async () => ({ user: { email: `genitore${++ipSeq}@example.org` }, roles: ["genitore"] }),
    };
  }

  it("generic 'come funziona' goes to the model; explicit app question gets the guide", async () => {
    const f = vi.fn(async () => claudeOk('{"text":"Risposta del modello."}'));
    expect(await answerStaff(TRIAL, deps(ON, f))).toMatchObject({ ai: true });
    expect(f).toHaveBeenCalledTimes(1);
    const g = vi.fn();
    expect(await answerStaff("come funziona l'app?", deps(ON, g))).toMatchObject({ text: APP_HELP_REPLY.text, ai: false });
    expect(g).not.toHaveBeenCalled();
    expect(await answerStaff(TRIAL, deps(OFF, g))).toMatchObject({ text: APP_HELP_REPLY.text, ai: false });
  });
});
