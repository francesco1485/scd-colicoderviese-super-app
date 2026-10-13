/**
 * AI assistants on the server (r99, UD-104). Crovi answers on public pages from the public projection only; Era (or
 * Sky for younger members) answers inside from the Cervellone, read through scd_kb_search with the CALLER'S session
 * (publishable key + request cookies): the database decides INTERNO vs RISERVATO, nothing here elevates access.
 *
 * Order of every answer:
 * 1. safeguarding and plain-words requests (UD-045) → rules engine (askSky), never the model;
 * 2. feature off (SCD_ASSISTANT_AI != "on") or no SCD_ANTHROPIC_API_KEY → rules engine (behaviour of today);
 * 3. rate limit (public 20 / 10 min per IP, staff 60 / hour per user);
 * 4. CONTEXT from real data → Claude (8 s timeout) → JSON parse + output guard;
 * 5. any error, timeout, quota or unreadable answer → rules engine.
 * Logs carry only outcome, persona, latency and token counts: never the question, the context or the answer.
 */
import { createHash } from "node:crypto";

import { anthropicApiKey, callClaude, type FetchLike } from "./anthropic.server";
import {
  AI_TIMEOUT_MS,
  PUBLIC_LIMIT,
  STAFF_LIMIT,
  SlidingWindowLimiter,
  buildPublicContext,
  buildStaffContext,
  insidePersonaFor,
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

/** Messages the model must never handle: safeguarding and requests/problems go to the rules engine. */
export function bypassesModel(message: string): "safeguarding" | "request" | null {
  if (skyIntent(message) === "safeguarding") return "safeguarding";
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
  rules: (data: { message: string }) => Promise<SkyReply>;
  now?: () => number;
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
  const parsed = parseAssistantAnswer(out.text, ctx);
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
  persona: "crovi" | "sky";
  ip: string;
}

export interface PublicDeps extends AnswerDeps {
  loadContext: () => Promise<PublicContextInput>;
}

export async function answerPublic(input: PublicAnswerInput, deps: PublicDeps): Promise<AssistantReply> {
  const cfg = assistantConfig(deps.env);
  if (bypassesModel(input.message) || !cfg.enabled) return asReply(await deps.rules({ message: input.message }), input.persona);
  const rl = publicLimiter.hit(limiterKey("ip", input.ip), (deps.now ?? Date.now)());
  if (!rl.ok) return { text: rateLimitedText(rl.retryAfterSec), mood: "alert", links: [{ label: "Contatti", to: "/contatti" }], ai: false, persona: input.persona };
  let ctx: BuiltContext;
  try {
    ctx = buildPublicContext(await deps.loadContext());
  } catch {
    log("fallback", { persona: input.persona, level: "PUBLIC", reason: "context", status: null, ms: 0 });
    return asReply(await deps.rules({ message: input.message }), input.persona);
  }
  return (await modelAnswer(input.message, input.persona, "PUBLIC", ctx, cfg, deps)) ?? asReply(await deps.rules({ message: input.message }), input.persona);
}

/* ─────────────────────────────── staff (Era / Sky) ─────────────────────────────── */

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

export async function answerStaff(message: string, deps: StaffDeps): Promise<AssistantReply> {
  const s = await deps.session();
  if (!s.user) {
    return { text: "Per parlare con l'assistente interna devi prima entrare con la tua e-mail.", mood: "info", links: [{ label: "Entra", to: "/accedi" }], ai: false, persona: "sky" };
  }
  const persona = insidePersonaFor(s.roles);
  const cfg = assistantConfig(deps.env);
  if (bypassesModel(message) || !cfg.enabled) return asReply(await deps.rules({ message }), persona);
  const rl = staffLimiter.hit(limiterKey("user", s.user.email.toLowerCase()), (deps.now ?? Date.now)());
  if (!rl.ok) return { text: rateLimitedText(rl.retryAfterSec), mood: "alert", ai: false, persona };

  const today = romeToday(new Date((deps.now ?? Date.now)()));
  let ctx: BuiltContext;
  let level: AssistantLevel = "PUBLIC";
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
    return asReply(await deps.rules({ message }), persona);
  }
  return (await modelAnswer(message, persona, level, ctx, cfg, deps)) ?? asReply(await deps.rules({ message }), persona);
}
