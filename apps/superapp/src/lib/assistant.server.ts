/**
 * AI assistants on the server (r99, UD-104). Crovi answers on public pages from the public projection only; Genny (or
 * Sky for younger members) answers inside from the Cervellone, read through scd_kb_search with the CALLER'S session
 * (publishable key + request cookies): the database decides INTERNO vs RISERVATO, nothing here elevates access.
 *
 * Order of every answer:
 * 1. signs of distress (fixed referral, cast-safety.ts), safeguarding, plain-words requests (UD-045) and operational
 *    requests of an area persona (orders, registrations, tickets: UD-114) → rules engine, never the model;
 * 2. feature off (SCD_ASSISTANT_AI != "on") or no SCD_ANTHROPIC_API_KEY → rules engine (behaviour of today);
 * 3. rate limit (public 20 / 10 min per IP, staff 60 / hour per user);
 * 4. CONTEXT from real data → Claude (8 s timeout) → JSON parse + output guard;
 * 5. any error, timeout, quota or unreadable answer → rules engine.
 * Area personas of the cast (UD-114, cast-personas.ts) answer from the public projection plus their own area notes,
 * with their voice and extra rules in the system prompt and their output guard on the answer.
 * Logs carry only outcome, persona, latency and token counts: never the question, the context or the answer.
 */
import { createHash } from "node:crypto";

import { anthropicApiKey, callClaude, type FetchLike } from "./anthropic.server";
import {
  AI_TIMEOUT_MS,
  PUBLIC_CONTEXT_TOKENS,
  PUBLIC_LIMIT,
  STAFF_LIMIT,
  SlidingWindowLimiter,
  buildPublicContext,
  buildStaffContext,
  chatPersonaFor,
  isCastPersona,
  isStaff,
  parseAssistantAnswer,
  rateLimitedText,
  systemPrompt,
  userPrompt,
  type AssistantLevel,
  type AssistantPersona,
  type AssistantReply,
  type BuiltContext,
  type PublicContextInput,
} from "./assistant";
import { EMPTY_CAST_FACTS, castAreaContext, isOperationalFor, type CastFacts } from "./cast-personas";
import { detectDistress } from "./cast-safety";
import type { KbResult } from "./knowledge";
import { REQUEST_RE, skyIntent, type SkyReply } from "./sky.functions";

type Env = Readonly<Record<string, string | undefined>>;

export interface AssistantConfig {
  enabled: boolean;
  apiKey: string | null;
}

/** AI is on only when the Direzione set both the flag and a valid key. Default: off. */
export function assistantConfig(env: Env = process.env): AssistantConfig {
  const apiKey = anthropicApiKey(env);
  const flag = (env["SCD_ASSISTANT_AI"] ?? "off").trim().toLowerCase() === "on";
  return { enabled: flag && apiKey !== null, apiKey: flag ? apiKey : null };
}

/**
 * Messages the model must never handle: distress (fixed referral to people, never therapy), safeguarding,
 * operational requests of an area persona (never confirmed or paid in the app) and requests/problems go to the rules
 * engine.
 */
export function bypassesModel(message: string, persona?: AssistantPersona): "distress" | "safeguarding" | "operational" | "request" | null {
  if (detectDistress(message)) return "distress";
  if (skyIntent(message) === "safeguarding") return "safeguarding";
  if (persona && isCastPersona(persona) && isOperationalFor(persona, message)) return "operational";
  if (REQUEST_RE.test(message)) return "request";
  return null;
}

export const publicLimiter = new SlidingWindowLimiter(PUBLIC_LIMIT.max, PUBLIC_LIMIT.windowMs);
export const staffLimiter = new SlidingWindowLimiter(STAFF_LIMIT.max, STAFF_LIMIT.windowMs);

/** Opaque limiter key: IPs and e-mails are never kept in clear in memory or logs. */
export function limiterKey(kind: "ip" | "user", value: string): string {
  return `${kind}:${createHash("sha256").update(value).digest("hex").slice(0, 24)}`;
}

function log(event: string, meta: Record<string, string | number | null>): void {
  console.info(`[assistant] ${event} ${Object.entries(meta).map(([k, v]) => `${k}=${v ?? "-"}`).join(" ")}`);
}

export function romeToday(at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

export interface AnswerDeps {
  env?: Env;
  fetchImpl?: FetchLike;
  /** Rules engine; receives the persona so the fallback keeps its voice (cast-rules.ts). */
  rules: (data: { message: string; persona?: AssistantPersona }) => Promise<SkyReply>;
  now?: () => number;
  /** Real facts for the area personas (ticket office, next home match, tournaments); empty when not given. */
  castFacts?: () => Promise<CastFacts>;
}

function asReply(r: SkyReply, persona: AssistantPersona): AssistantReply {
  return { ...r, ai: false, persona };
}

/** Calls the model with a built CONTEXT; null when anything goes wrong (caller falls back). */
async function modelAnswer(
  message: string,
  persona: AssistantPersona,
  level: AssistantLevel,
  ctx: BuiltContext,
  cfg: AssistantConfig,
  deps: AnswerDeps,
): Promise<AssistantReply | null> {
  if (!cfg.apiKey) return null;
  const t0 = (deps.now ?? Date.now)();
  const out = await callClaude({
    apiKey: cfg.apiKey,
    system: systemPrompt(persona, level, ctx),
    user: userPrompt(message),
    maxTokens: 450,
    temperature: 0.2,
    timeoutMs: AI_TIMEOUT_MS,
    ...(deps.fetchImpl ? { fetchImpl: deps.fetchImpl } : {}),
  });
  const ms = (deps.now ?? Date.now)() - t0;
  if (!out.ok) {
    log("fallback", { persona, level, reason: out.reason, status: out.reason === "http" ? out.status : null, ms });
    return null;
  }
  const parsed = parseAssistantAnswer(out.text, ctx, persona);
  if (!parsed) {
    log("fallback", { persona, level, reason: "unreadable", status: null, ms });
    return null;
  }
  log("ok", { persona, level, ms, in: out.inputTokens, out: out.outputTokens, ctx: ctx.text.length });
  return { ...parsed, ai: true, persona };
}

/* ─────────────────────────────── public (Crovi) ─────────────────────────────── */

export interface PublicAnswerInput {
  message: string;
  /** Already resolved by the caller with chatPersonaFor("public", …): Crovi, Sky or a public area persona. */
  persona: AssistantPersona;
  ip: string;
}

async function areaFor(persona: AssistantPersona, today: string, deps: AnswerDeps) {
  if (!isCastPersona(persona)) return null;
  const facts = deps.castFacts ? await deps.castFacts().catch(() => EMPTY_CAST_FACTS) : EMPTY_CAST_FACTS;
  return castAreaContext(persona, today, facts);
}

export interface PublicDeps extends AnswerDeps {
  loadContext: () => Promise<PublicContextInput>;
}

export async function answerPublic(input: PublicAnswerInput, deps: PublicDeps): Promise<AssistantReply> {
  const cfg = assistantConfig(deps.env);
  const persona = input.persona;
  const rules = async () => asReply(await deps.rules({ message: input.message, persona }), persona);
  if (bypassesModel(input.message, persona) || !cfg.enabled) return rules();
  const rl = publicLimiter.hit(limiterKey("ip", input.ip), (deps.now ?? Date.now)());
  if (!rl.ok) return { text: rateLimitedText(rl.retryAfterSec), mood: "alert", links: [{ label: "Contatti", to: "/contatti" }], ai: false, persona };
  let ctx: BuiltContext;
  try {
    const data = await deps.loadContext();
    ctx = buildPublicContext(data, PUBLIC_CONTEXT_TOKENS, await areaFor(persona, data.today, deps));
  } catch {
    log("fallback", { persona, level: "PUBLIC", reason: "context", status: null, ms: 0 });
    return rules();
  }
  return (await modelAnswer(input.message, persona, "PUBLIC", ctx, cfg, deps)) ?? rules();
}

/* ─────────────────────────────── staff (Genny / Sky) ─────────────────────────────── */

export interface StaffSession {
  user: { email: string } | null;
  roles: readonly string[];
}

export interface StaffDeps extends AnswerDeps {
  session: () => Promise<StaffSession>;
  /** scd_kb_search with the caller's own session; null when the database refuses or is not configured. */
  kbSearch: (q: { query: string | null; onlyDue: boolean; limit: number }) => Promise<KbResult | null>;
  loadPublicContext: () => Promise<PublicContextInput>;
}

/**
 * Inside answer. `requested` is the area persona a page opened with "Chiedi a …" (UD-114): the server re-checks it
 * with chatPersonaFor, so a younger member or an unknown age always gets Sky whatever the browser sent.
 */
export async function answerStaff(message: string, deps: StaffDeps, requested?: string | null): Promise<AssistantReply> {
  const s = await deps.session();
  if (!s.user) {
    return { text: "Per parlare con l'assistente interna devi prima entrare con la tua e-mail.", mood: "info", links: [{ label: "Entra", to: "/accedi" }], ai: false, persona: "sky" };
  }
  const persona = chatPersonaFor("inside", { roles: s.roles, age15plus: null }, requested);
  const cfg = assistantConfig(deps.env);
  const rules = async () => asReply(await deps.rules({ message, persona }), persona);
  if (bypassesModel(message, persona) || !cfg.enabled) return rules();
  const rl = staffLimiter.hit(limiterKey("user", s.user.email.toLowerCase()), (deps.now ?? Date.now)());
  if (!rl.ok) return { text: rateLimitedText(rl.retryAfterSec), mood: "alert", ai: false, persona };

  const today = romeToday(new Date((deps.now ?? Date.now)()));
  let ctx: BuiltContext;
  let level: AssistantLevel = "PUBLIC";
  if (isCastPersona(persona)) {
    // Area personas never read the Cervellone: public projection + their own area notes.
    try {
      const data = await deps.loadPublicContext();
      ctx = buildPublicContext(data, PUBLIC_CONTEXT_TOKENS, await areaFor(persona, today, deps));
    } catch {
      log("fallback", { persona, level, reason: "context", status: null, ms: 0 });
      return rules();
    }
    return (await modelAnswer(message, persona, level, ctx, cfg, deps)) ?? rules();
  }
  try {
    // Only staff positions query the Cervellone; the database still decides what each one sees.
    const [matches, due] = isStaff(s.roles)
      ? await Promise.all([deps.kbSearch({ query: message, onlyDue: false, limit: 8 }), deps.kbSearch({ query: null, onlyDue: true, limit: 10 })])
      : [null, null];
    const kb = matches ?? due;
    if (kb) {
      level = kb.level;
      ctx = buildStaffContext({ today, level: kb.level, query: message, matches: matches?.items ?? [], due: due?.items ?? [] });
    } else {
      ctx = buildPublicContext(await deps.loadPublicContext());
    }
  } catch {
    log("fallback", { persona, level, reason: "context", status: null, ms: 0 });
    return rules();
  }
  return (await modelAnswer(message, persona, level, ctx, cfg, deps)) ?? rules();
}
