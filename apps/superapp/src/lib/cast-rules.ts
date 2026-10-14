/**
 * Rules engine of the assistant personas (no AI): used when SCD_ASSISTANT_AI is off or the key is missing, and as the
 * fallback / pre-router of the AI (assistant.server.ts). Order of every answer, the same for all personas:
 * 1. signs of distress → fixed referral to real people (cast-safety.ts, UD-111), for every persona;
 * 2. safeguarding → the general rules engine (skyRulesAnswer: reserved channel only);
 * 3. operational requests of an area persona (orders, team registrations, tickets) → fixed reply that collects the
 *    request for a person, never a confirmation or a payment; other plain-words requests or problems (UD-045) → the
 *    general requests engine;
 * 4. keyword intents of the persona → persona-flavoured answers from curated copy and real facts;
 * 5. general intents (calendar, contacts, …) → the general rules engine;
 * 6. nothing matched → the persona's own default (who they are, today's tip, quick links).
 * Pure apart from the injected general engine, so it is tested without R20 or the network.
 */
import type { AssistantPersona } from "./assistant";
import { detectDistress, distressReferral } from "./cast-safety";
import {
  EMPTY_CAST_FACTS,
  castDefaultReply,
  castIntentReply,
  castOperationalReply,
  isCastPersona,
  isOperationalFor,
  type CastFacts,
} from "./cast-personas";
import { REQUEST_RE, skyIntent, type SkyReply } from "./sky.functions";

export type GeneralRules = (data: { message: string }) => Promise<SkyReply>;

export interface CastRulesInput {
  message: string;
  persona?: AssistantPersona | undefined;
}

export interface CastRulesDeps {
  general: GeneralRules;
  facts?: CastFacts;
  /** Rome day (YYYY-MM-DD) for the daily tip. */
  day: string;
}

/** Why the rules engine answered as it did (tests and logs; never the message). */
export type CastRulesRoute = "distress" | "general-safety" | "operational" | "persona" | "general" | "default";

export function castRulesRoute(message: string, persona?: AssistantPersona): CastRulesRoute {
  if (detectDistress(message)) return "distress";
  if (skyIntent(message) === "safeguarding") return "general-safety";
  const cast = persona && isCastPersona(persona) ? persona : null;
  // An order or a registration for an area persona is collected for a person before the generic requests engine.
  if (cast && isOperationalFor(cast, message)) return "operational";
  if (REQUEST_RE.test(message)) return "general-safety";
  return cast ? "persona" : "general";
}

export async function castRulesAnswer(input: CastRulesInput, deps: CastRulesDeps): Promise<SkyReply> {
  const { message, persona } = input;
  const distress = detectDistress(message);
  if (distress) return distressReferral(distress);
  const route = castRulesRoute(message, persona);
  if (route === "general-safety" || route === "general" || !persona || !isCastPersona(persona)) return deps.general({ message });
  if (route === "operational") return castOperationalReply(persona);
  const own = castIntentReply(persona, message, deps.facts ?? EMPTY_CAST_FACTS);
  if (own) return own;
  if (skyIntent(message)) return deps.general({ message });
  return castDefaultReply(persona, deps.day);
}
