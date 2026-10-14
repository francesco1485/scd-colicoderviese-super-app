import { afterEach, describe, expect, it, vi } from "vitest";

import type { PublicContextInput } from "./assistant";
import { answerPublic, answerStaff, assistantConfig, bypassesModel, type StaffDeps } from "./assistant.server";
import type { KbResult } from "./knowledge";
import type { SkyReply } from "./sky.functions";

const KEY = "sk-ant-test-key-never-real";
const ON = { SCD_ASSISTANT_AI: "on", SCD_ANTHROPIC_API_KEY: KEY };

const RULES: SkyReply = { text: "risposta delle regole", mood: "info", links: [{ label: "Calendario", to: "/calendario" }] };

function ctxInput(): PublicContextInput {
  return {
    today: "2026-10-13",
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

function claudeResponse(text: string, status = 200): Response {
  return new Response(JSON.stringify({ content: [{ type: "text", text }], usage: { input_tokens: 900, output_tokens: 60 } }), { status, headers: { "content-type": "application/json" } });
}

let ipSeq = 0;
const nextIp = () => `10.0.0.${++ipSeq}`;

function pub(env: Record<string, string>, fetchImpl: ReturnType<typeof vi.fn>, message = "Quando gioca la prima squadra?") {
  const rules = vi.fn(async () => RULES);
  const loadContext = vi.fn(async () => ctxInput());
  return {
    rules,
    loadContext,
    run: () => answerPublic({ message, persona: "crovi", ip: nextIp() }, { env, fetchImpl: fetchImpl as never, rules, loadContext }),
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("feature flag and key", () => {
  it("is off by default and without a valid key", () => {
    expect(assistantConfig({}).enabled).toBe(false);
    expect(assistantConfig({ SCD_ANTHROPIC_API_KEY: KEY }).enabled).toBe(false);
    expect(assistantConfig({ SCD_ASSISTANT_AI: "on" }).enabled).toBe(false);
    expect(assistantConfig({ SCD_ASSISTANT_AI: "on", SCD_ANTHROPIC_API_KEY: "not-a-key" }).enabled).toBe(false);
    expect(assistantConfig(ON).enabled).toBe(true);
    expect(assistantConfig({ ...ON, SCD_ASSISTANT_AI: "off" }).apiKey).toBeNull();
  });
});

describe("public assistant (Crovi)", () => {
  it("answers with the rules engine when the flag is off: no call to the API", async () => {
    const f = vi.fn();
    const t = pub({ SCD_ANTHROPIC_API_KEY: KEY }, f);
    const r = await t.run();
    expect(f).not.toHaveBeenCalled();
    expect(r).toMatchObject({ text: RULES.text, ai: false, persona: "crovi" });
  });

  it("answers with the rules engine when the key is missing", async () => {
    const f = vi.fn();
    const r = await pub({ SCD_ASSISTANT_AI: "on" }, f).run();
    expect(f).not.toHaveBeenCalled();
    expect(r.ai).toBe(false);
  });

  it("uses Claude with the public context and returns a guarded SkyReply", async () => {
    const f = vi.fn(async () => claudeResponse('{"text":"Scrivi a sportclubcolico@gmail.com o a spam@evil.com","mood":"success","links":[{"label":"Contatti","to":"/contatti"},{"label":"X","to":"https://evil.example"}]}'));
    const t = pub(ON, f);
    const r = await t.run();
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe(KEY);
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    const body = JSON.parse(String(init.body)) as { model: string; system: string; messages: { content: string }[] };
    expect(body.model).toBe("claude-haiku-5-5");
    expect(body.system).toContain("CONTESTO:");
    expect(body.messages[0]!.content).toContain("Quando gioca la prima squadra?");
    expect(r).toEqual({ text: "Scrivi a sportclubcolico@gmail.com o a [contatto rimosso]", mood: "success", links: [{ label: "Contatti", to: "/contatti" }], ai: true, persona: "crovi" });
    expect(t.rules).not.toHaveBeenCalled();
  });

  it("falls back to the rules engine on an HTTP error (quota, overload)", async () => {
    for (const status of [429, 500, 529]) {
      const t = pub(ON, vi.fn(async () => claudeResponse("x", status)));
      const r = await t.run();
      expect(r).toMatchObject({ text: RULES.text, ai: false });
      expect(t.rules).toHaveBeenCalledTimes(1);
    }
  });

  it("falls back on a network error and on an unreadable answer", async () => {
    const a = await pub(ON, vi.fn(async () => { throw new TypeError("fetch failed"); })).run();
    expect(a.ai).toBe(false);
    const b = await pub(ON, vi.fn(async () => claudeResponse('{"text": broken'))).run();
    expect(b.ai).toBe(false);
  });

  it("falls back after the 8 s timeout", async () => {
    vi.useFakeTimers();
    const f = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_res, rej) => {
          init?.signal?.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" })));
        }),
    );
    const t = pub(ON, f);
    const p = t.run();
    await vi.advanceTimersByTimeAsync(8001);
    const r = await p;
    expect(r).toMatchObject({ text: RULES.text, ai: false });
  });

  it("never sends safeguarding messages to the model", async () => {
    const f = vi.fn();
    const t = pub(ON, f, "devo segnalare un caso di bullismo");
    const r = await t.run();
    expect(f).not.toHaveBeenCalled();
    expect(t.rules).toHaveBeenCalledWith({ message: "devo segnalare un caso di bullismo" });
    expect(r.ai).toBe(false);
  });

  it("never sends distress to the model: the rules engine answers with the fixed referral (UD-111)", async () => {
    const f = vi.fn();
    const t = pub(ON, f, "mi sento giù e non ce la faccio più");
    const r = await t.run();
    expect(f).not.toHaveBeenCalled();
    expect(t.rules).toHaveBeenCalledWith({ message: "mi sento giù e non ce la faccio più" });
    expect(r.ai).toBe(false);
  });

  it("routes requests and problems to the requests engine, not the model (UD-045)", async () => {
    const f = vi.fn();
    const t = pub(ON, f, "manca il sapone in lavanderia");
    await t.run();
    expect(f).not.toHaveBeenCalled();
    expect(t.rules).toHaveBeenCalled();
    expect(bypassesModel("spogliatoio 2 senza acqua calda")).toBe("request");
    expect(bypassesModel("abuso in spogliatoio")).toBe("safeguarding");
    expect(bypassesModel("prima della partita ho l'ansia")).toBe("distress");
    expect(bypassesModel("voglio farla finita")).toBe("distress");
    expect(bypassesModel("quando gioca la juniores?")).toBeNull();
  });

  it("limits each IP to 20 AI messages in 10 minutes", async () => {
    const f = vi.fn(async () => claudeResponse('{"text":"ok"}'));
    const rules = vi.fn(async () => RULES);
    const loadContext = vi.fn(async () => ctxInput());
    const ip = "192.168.50.50";
    const now = () => 1_000_000;
    for (let i = 0; i < 20; i++) expect((await answerPublic({ message: "ciao", persona: "crovi", ip }, { env: ON, fetchImpl: f as never, rules, loadContext, now })).ai).toBe(true);
    const r = await answerPublic({ message: "ciao", persona: "crovi", ip }, { env: ON, fetchImpl: f as never, rules, loadContext, now });
    expect(r.ai).toBe(false);
    expect(r.mood).toBe("alert");
    expect(r.text).toMatch(/riprova tra 10 minuti/);
    expect(f).toHaveBeenCalledTimes(20);
  });

  it("falls back when the context cannot be loaded", async () => {
    const f = vi.fn();
    const rules = vi.fn(async () => RULES);
    const r = await answerPublic({ message: "ciao", persona: "crovi", ip: nextIp() }, { env: ON, fetchImpl: f as never, rules, loadContext: async () => { throw new Error("drive down"); } });
    expect(f).not.toHaveBeenCalled();
    expect(r.ai).toBe(false);
  });
});

describe("staff assistant (Genny / Sky)", () => {
  const kbResult: KbResult = {
    level: "INTERNO",
    counts: {},
    items: [{ id: "1", kind: "DOCUMENTO", area: "IMPIANTI_COMUNI", season: "2026/27", title: "Omologazione Dervio", summary: "Rinnovo", entity: null, date: null, due: "2026-12-01", status: "APERTO", amount: 500, source: "", link: "https://drive.google.com/file/d/x", tags: [] }],
  };

  let userSeq = 0;
  function staff(roles: string[], fetchImpl: ReturnType<typeof vi.fn>, env: Record<string, string> = ON, kb: KbResult | null = kbResult) {
    const email = `persona${++userSeq}@example.org`;
    const kbSearch = vi.fn(async () => kb);
    const rules = vi.fn(async () => RULES);
    const loadPublicContext = vi.fn(async () => ctxInput());
    const deps: StaffDeps = { env, fetchImpl: fetchImpl as never, rules, kbSearch, loadPublicContext, session: async () => ({ user: { email }, roles }) };
    return { deps, kbSearch, rules, loadPublicContext };
  }

  it("asks the Cervellone with the caller's session and answers as Genny with the database level", async () => {
    const f = vi.fn(async () => claudeResponse('{"text":"Omologazione Dervio aperta, scade il 01/12.","links":[{"label":"Documento","to":"https://drive.google.com/file/d/x"}]}'));
    const t = staff(["segreteria"], f);
    const r = await answerStaff("omologazione dervio", t.deps);
    expect(t.kbSearch).toHaveBeenCalledWith({ query: "omologazione dervio", onlyDue: false, limit: 8 });
    expect(t.kbSearch).toHaveBeenCalledWith({ query: null, onlyDue: true, limit: 10 });
    const body = JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body)) as { system: string };
    expect(body.system).toContain("livello INTERNO");
    expect(body.system).toContain("Omologazione Dervio");
    expect(body.system).not.toContain("500");
    expect(r).toMatchObject({ ai: true, persona: "genny", links: [{ label: "Documento", to: "https://drive.google.com/file/d/x" }] });
  });

  it("never queries the Cervellone for non-staff members: Sky with public data for athletes", async () => {
    const f = vi.fn(async () => claudeResponse('{"text":"Ciao!"}'));
    const t = staff(["atleta"], f);
    const r = await answerStaff("quando gioco?", t.deps);
    expect(t.kbSearch).not.toHaveBeenCalled();
    expect(t.loadPublicContext).toHaveBeenCalled();
    expect(r).toMatchObject({ ai: true, persona: "sky" });
  });

  it("uses public data when the database refuses the Cervellone", async () => {
    const f = vi.fn(async () => claudeResponse('{"text":"ok"}'));
    const t = staff(["mister"], f, ON, null);
    await answerStaff("domanda", t.deps);
    expect(t.loadPublicContext).toHaveBeenCalled();
    const body = JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body)) as { system: string };
    expect(body.system).toContain("SOLO i dati pubblici");
  });

  it("keeps today's behaviour when the flag is off", async () => {
    const f = vi.fn();
    const t = staff(["direzione"], f, {});
    const r = await answerStaff("scadenze", t.deps);
    expect(f).not.toHaveBeenCalled();
    expect(t.kbSearch).not.toHaveBeenCalled();
    expect(r).toMatchObject({ text: RULES.text, ai: false, persona: "genny" });
  });

  it("routes safeguarding and requests to the rules engine before anything else", async () => {
    const f = vi.fn();
    const t = staff(["direzione"], f);
    await answerStaff("segnalazione di molestie", t.deps);
    await answerStaff("il faro del campo 2 è rotto", t.deps);
    expect(f).not.toHaveBeenCalled();
    expect(t.kbSearch).not.toHaveBeenCalled();
    expect(t.rules).toHaveBeenCalledTimes(2);
  });

  it("asks to sign in when there is no session", async () => {
    const f = vi.fn();
    const r = await answerStaff("ciao", { ...staff([], f).deps, session: async () => ({ user: null, roles: [] }) });
    expect(f).not.toHaveBeenCalled();
    expect(r.links?.[0]?.to).toBe("/accedi");
  });

  it("limits each user to 60 AI messages per hour", async () => {
    const f = vi.fn(async () => claudeResponse('{"text":"ok"}'));
    const t = staff(["segreteria"], f);
    const deps = { ...t.deps, now: () => 5_000_000 };
    for (let i = 0; i < 60; i++) expect((await answerStaff("ciao", deps)).ai).toBe(true);
    const r = await answerStaff("ciao", deps);
    expect(r).toMatchObject({ ai: false, mood: "alert" });
  });
});
