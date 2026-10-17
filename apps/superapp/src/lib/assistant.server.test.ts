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
    run: () => answerPublic({ message, persona: "vera", ip: nextIp() }, { env, fetchImpl: fetchImpl as never, rules, loadContext }),
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

describe("public assistant (Iride, UD-121)", () => {
  it("answers with the rules engine when the flag is off: no call to the API", async () => {
    const f = vi.fn();
    const t = pub({ SCD_ANTHROPIC_API_KEY: KEY }, f);
    const r = await t.run();
    expect(f).not.toHaveBeenCalled();
    expect(r).toMatchObject({ text: RULES.text, ai: false, persona: "vera" });
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
    // Haiku 5.5: no sampling parameters (400), thinking off so max_tokens goes to the answer.
    const raw = body as unknown as Record<string, unknown>;
    expect(raw).not.toHaveProperty("temperature");
    expect(raw).not.toHaveProperty("top_p");
    expect(raw).not.toHaveProperty("top_k");
    expect(raw["thinking"]).toEqual({ type: "disabled" });
    expect(raw["output_config"]).toEqual({ effort: "low" });
    expect(r).toEqual({ text: "Scrivi a sportclubcolico@gmail.com o a [contatto rimosso]", mood: "success", links: [{ label: "Contatti", to: "/contatti" }], ai: true, persona: "vera", area: null });
    expect(t.rules).not.toHaveBeenCalled();
  });

  it("logs only the sanitized API error type and excerpt on a 400, never user text or key", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const errBody = { type: "error", error: { type: "invalid_request_error", message: `temperature: bad value for ${KEY}\n${"x".repeat(400)}` } };
    const t = pub(ON, vi.fn(async () => new Response(JSON.stringify(errBody), { status: 400, headers: { "content-type": "application/json" } })), "segreto-utente-123");
    const r = await t.run();
    expect(r).toMatchObject({ text: RULES.text, ai: false });
    const line = info.mock.calls.map((c) => String(c[0])).find((l) => l.startsWith("[assistant] fallback"));
    info.mockRestore();
    expect(line).toContain("reason=http status=400 errType=invalid_request_error errMsg=");
    expect(line).toContain("[redacted]");
    expect(line).not.toContain("sk-ant-");
    expect(line).not.toContain("segreto-utente-123");
    expect(line!.length).toBeLessThan(400);
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
    expect(t.rules).toHaveBeenCalledWith({ message: "devo segnalare un caso di bullismo", persona: "vera", area: null });
    expect(r.ai).toBe(false);
  });

  it("never sends distress to the model: the rules engine answers with the fixed referral (UD-111)", async () => {
    const f = vi.fn();
    const t = pub(ON, f, "mi sento giù e non ce la faccio più");
    const r = await t.run();
    expect(f).not.toHaveBeenCalled();
    expect(t.rules).toHaveBeenCalledWith({ message: "mi sento giù e non ce la faccio più", persona: "vera", area: null });
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
    for (let i = 0; i < 20; i++) expect((await answerPublic({ message: "ciao", persona: "vera", ip }, { env: ON, fetchImpl: f as never, rules, loadContext, now })).ai).toBe(true);
    const r = await answerPublic({ message: "ciao", persona: "vera", ip }, { env: ON, fetchImpl: f as never, rules, loadContext, now });
    expect(r.ai).toBe(false);
    expect(r.mood).toBe("alert");
    expect(r.text).toMatch(/riprova tra 10 minuti/);
    expect(f).toHaveBeenCalledTimes(20);
  });

  it("falls back when the context cannot be loaded", async () => {
    const f = vi.fn();
    const rules = vi.fn(async () => RULES);
    const r = await answerPublic({ message: "ciao", persona: "vera", ip: nextIp() }, { env: ON, fetchImpl: f as never, rules, loadContext: async () => { throw new Error("drive down"); } });
    expect(f).not.toHaveBeenCalled();
    expect(r.ai).toBe(false);
  });
});

describe("inside assistant (Iride / Sky)", () => {
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

  it("asks the Cervellone with the caller's session and answers as Iride with the database level", async () => {
    const f = vi.fn(async () => claudeResponse('{"text":"Omologazione Dervio aperta, scade il 01/12.","links":[{"label":"Documento","to":"https://drive.google.com/file/d/x"}]}'));
    const t = staff(["segreteria"], f);
    const r = await answerStaff("omologazione dervio", t.deps);
    expect(t.kbSearch).toHaveBeenCalledWith({ query: "omologazione dervio", onlyDue: false, limit: 8 });
    expect(t.kbSearch).toHaveBeenCalledWith({ query: null, onlyDue: true, limit: 10 });
    const body = JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body)) as { system: string };
    expect(body.system).toContain("livello INTERNO");
    expect(body.system).toContain("Omologazione Dervio");
    expect(body.system).not.toContain("500");
    expect(r).toMatchObject({ ai: true, persona: "vera", links: [{ label: "Documento", to: "https://drive.google.com/file/d/x" }] });
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
    expect(r).toMatchObject({ text: RULES.text, ai: false, persona: "vera" });
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

describe("Iride's chat opened with an area (UD-121: one chat, faces hand over)", () => {
  let seq = 0;
  function inside(roles: string[], fetchImpl: ReturnType<typeof vi.fn>, env: Record<string, string> = ON) {
    const email = `cast${++seq}@example.org`;
    const kbSearch = vi.fn(async () => null);
    const rules = vi.fn(async () => RULES);
    const loadPublicContext = vi.fn(async () => ctxInput());
    const deps: StaffDeps = { env, fetchImpl: fetchImpl as never, rules, kbSearch, loadPublicContext, session: async () => ({ user: { email }, roles }) };
    return { deps, kbSearch, rules, loadPublicContext };
  }

  function systemOf(f: ReturnType<typeof vi.fn>): string {
    return (JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body)) as { system: string }).system;
  }

  it("answers as Iride with the Club House area: the chef's rules and notes, never the Cervellone", async () => {
    const f = vi.fn(async () => claudeResponse('{"text":"Il listino non è ancora pubblicato: per la festa compila la richiesta nell\'area famiglia (fonte: Club House).","links":[{"label":"Richiesta","to":"/famiglia"}]}'));
    const t = inside(["segreteria"], f);
    const r = await answerStaff("cosa c'è in menu?", t.deps, "accoglienza-chef");
    expect(t.kbSearch).not.toHaveBeenCalled();
    const sys = systemOf(f);
    expect(sys).toContain("Sei Iride, l'assistente AI della segreteria");
    expect(sys).toContain("Per la Club House ti aiuta Garrison, lo Chef");
    expect(sys).toContain("SQUBY/SumUp");
    expect(sys).toContain("Area: Garrison");
    expect(sys).toMatch(/Cita sempre la fonte/);
    expect(r).toMatchObject({ ai: true, persona: "vera", area: "accoglienza-chef", links: [{ label: "Richiesta", to: "/famiglia" }] });
  });

  it("re-checks on the server: an athlete asking for an area gets Sky, without the area", async () => {
    const f = vi.fn(async () => claudeResponse('{"text":"Ciao!"}'));
    const t = inside(["atleta"], f);
    const r = await answerStaff("cosa c'è in menu?", t.deps, "accoglienza-chef");
    expect(r).toMatchObject({ persona: "sky", area: null });
    expect(systemOf(f)).toContain("Sei Crovi");
  });

  it("maps legacy and tip-only requests to Vera's general chat (no chat for Era, Acanfora, coach, preparatore, relax)", async () => {
    for (const legacy of ["admin", "genny", "crovi", "era", "acanfora", "mental-coach", "preparatore-atletico", "musica-relax"]) {
      const f = vi.fn(async () => claudeResponse('{"text":"ok"}'));
      const t = inside(["segreteria"], f);
      const r = await answerStaff("ciao", t.deps, legacy);
      expect(r, legacy).toMatchObject({ persona: "vera", area: null });
    }
  });

  it("never sends an order to the model: the rules engine collects it in the Club House area", async () => {
    const f = vi.fn();
    const t = inside(["famiglia"], f);
    const r = await answerStaff("vorrei ordinare una torta per il compleanno", t.deps, "accoglienza-chef");
    expect(f).not.toHaveBeenCalled();
    expect(t.rules).toHaveBeenCalledWith({ message: "vorrei ordinare una torta per il compleanno", persona: "vera", area: "accoglienza-chef" });
    expect(r).toMatchObject({ persona: "vera", area: "accoglienza-chef" });
    expect(bypassesModel("posso comprare il biglietto qui?", "biglietteria")).toBe("operational");
    expect(bypassesModel("posso comprare il biglietto qui?")).toBe("operational");
    expect(bypassesModel("vorrei ordinare una torta", null)).toBeNull();
  });

  it("never sends distress to the model, whatever the area", async () => {
    for (const area of ["volto-sponsor", "mentore-tornei", "accoglienza-chef", "biglietteria", null]) {
      const f = vi.fn();
      const t = inside(["famiglia"], f);
      await answerStaff("prima della partita ho l'ansia", t.deps, area);
      expect(f, String(area)).not.toHaveBeenCalled();
      expect(bypassesModel("mi sento giù", area as never)).toBe("distress");
    }
  });

  it("falls back to the rules engine when the model breaks Iride's rules (therapy, diets, drugs, confirmations)", async () => {
    for (const bad of ["Facciamo una terapia di respirazione.", "Segui questa dieta.", "Prendi un antidolorifico.", "Perfetto, ho confermato il tuo ordine!"]) {
      const f = vi.fn(async () => claudeResponse(JSON.stringify({ text: bad })));
      const t = inside(["famiglia"], f);
      const r = await answerStaff("una domanda", t.deps, "accoglienza-chef");
      expect(f).toHaveBeenCalled();
      expect(r, bad).toMatchObject({ ai: false, persona: "vera", text: RULES.text });
    }
  });

  it("opens Iride with a public area on public pages with its notes and real facts", async () => {
    const f = vi.fn(async () => claudeResponse('{"text":"Christmas Lario Cup in programma (fonte: Tornei)."}'));
    const rules = vi.fn(async () => RULES);
    const r = await answerPublic(
      { message: "che tornei ci sono?", persona: "vera", area: "mentore-tornei", ip: nextIp() },
      { env: ON, fetchImpl: f as never, rules, loadContext: async () => ctxInput(), castFacts: async () => ({ ticketing: null, nextHomeMatch: null, tournaments: ["Christmas Lario Cup, 8 dicembre 2026, Colico (in programma)"] }) },
    );
    expect(systemOf(f)).toContain("Torneo: Christmas Lario Cup");
    expect(systemOf(f)).toContain("Mentore dei tornei");
    expect(r).toMatchObject({ ai: true, persona: "vera", area: "mentore-tornei" });
  });

  it("keeps the area on the rules engine when the AI is off", async () => {
    const f = vi.fn();
    const t = inside(["famiglia"], f, {});
    const r = await answerStaff("ciao", t.deps, "volto-sponsor");
    expect(f).not.toHaveBeenCalled();
    expect(t.rules).toHaveBeenCalledWith({ message: "ciao", persona: "vera", area: "volto-sponsor" });
    expect(r).toMatchObject({ persona: "vera", area: "volto-sponsor" });
  });
});

describe("answerPublic · club directions (B7)", () => {
  it("answers \"come arrivo al campo?\" with the master's streets and Maps links, without the model or the context", async () => {
    const f = vi.fn();
    const t = pub(ON, f, "come arrivo al campo?");
    const r = await t.run();
    expect(f).not.toHaveBeenCalled();
    expect(t.loadContext).not.toHaveBeenCalled();
    expect(r.ai).toBe(false);
    expect(r.text).toContain("Via Lido SNC");
    expect(r.text).toContain("Via Guglielmo Marconi 1");
    expect(r.links?.filter((l) => l.to.startsWith("https://www.google.com/maps/")).length).toBe(2);
  });

  it("safeguarding and distress still win over a directions question", async () => {
    const f = vi.fn();
    const t = pub(ON, f, "ho subito un abuso, come arrivo al campo?");
    await t.run();
    expect(t.rules).toHaveBeenCalled();
    expect(f).not.toHaveBeenCalled();
  });

  it("contacts questions still reach the model", async () => {
    const f = vi.fn(async () => claudeResponse('{"text":"Scrivi alla segreteria.","mood":"info","links":[]}'));
    const t = pub(ON, f, "qual è l'indirizzo email della società?");
    await t.run();
    expect(f).toHaveBeenCalled();
  });
});

describe("Crovi on public pages (UD-184) and result reports (UD-182)", () => {
  const systemOf = (f: ReturnType<typeof vi.fn>): string =>
    (JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body)) as { system: string }).system;
  it("answers «Segnala un risultato» with the fixed hand-off: no model, no score written", async () => {
    const f = vi.fn(async () => claudeResponse('{"text":"3-1 per noi!"}'));
    const t = pub(ON, f, "Segnala un risultato");
    const r = await t.run();
    expect(f).not.toHaveBeenCalled();
    expect(r.ai).toBe(false);
    expect(r.text).toMatch(/fonte ufficiale LND/);
    expect(r.text).toMatch(/Segreteria/);
    expect(r.links?.map((l) => l.to)).toEqual(["/contatti", "/classifiche"]);
  });

  it("speaks with Crovi's switchboard voice for persona 'sky'", async () => {
    const f = vi.fn(async () => claudeResponse('{"text":"Ciao!"}'));
    await answerPublic(
      { message: "Quando gioca la prima squadra?", persona: "sky", ip: nextIp() },
      { env: ON, fetchImpl: f as never, rules: vi.fn(async () => RULES), loadContext: vi.fn(async () => ctxInput()) },
    );
    const sys = systemOf(f);
    expect(sys).toContain("Sei Crovi");
    expect(sys).toMatch(/centralinista/);
    expect(sys).toMatch(/Iride per la segreteria, Garrison per la Club House, Enea per i tornei/);
  });
});
