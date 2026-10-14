/**
 * Rules engine of Vera's chat (no AI): used when SCD_ASSISTANT_AI is off or the key is missing, and as the fallback /
 * pre-router of the AI (assistant.server.ts). Order of every answer (UD-121: one chat, Vera, with an optional area):
 * 1. signs of distress → fixed referral to real people (cast-safety.ts, UD-111), for every persona and area;
 * 2. safeguarding → the general rules engine (skyRulesAnswer: reserved channel only);
 * 3. operational requests of the area (orders, team registrations, sponsor contracts) or a ticket purchase → fixed
 *    reply that collects the request for a person, never a confirmation or a payment; other plain-words requests or
 *    problems (UD-045) → the general requests engine (it opens a request for the secretariat);
 * 4. keyword intents of the area → answers from curated copy and real facts;
 * 5. general intents (calendar, contacts, …) → the general rules engine;
 * 6. Vera's own topics (ticket office she absorbed, fixed refusals of the tip-only topics: diets, medicines, plans);
 * 7. nothing matched → with an area, Vera's hand-over to the face of the area (today's tip, action buttons);
 *    without an area, the general rules engine.
 * Pure apart from the injected general engine, so it is tested without R20 or the network.
 */
import type { AssistantPersona } from "./assistant";
import { detectDistress, distressReferral } from "./cast-safety";
import {
  EMPTY_CAST_FACTS,
  castIntentReply,
  castOperationalReply,
  isChatArea,
  isOperationalFor,
  isTicketRequest,
  veraAreaReply,
  veraTopicReply,
  type CastFacts,
  type ChatAreaId,
} from "./cast-personas";
import { REQUEST_RE, skyIntent, type SkyReply } from "./sky.functions";

export type GeneralRules = (data: { message: string }) => Promise<SkyReply>;

export interface CastRulesInput {
  message: string;
  persona?: AssistantPersona | undefined;
  /** Area of Vera's chat (already resolved with assistant.ts resolveChat); ignored for Sky. */
  area?: ChatAreaId | null | undefined;
}

export interface CastRulesDeps {
  general: GeneralRules;
  facts?: CastFacts;
  /** Rome day (YYYY-MM-DD) for the daily tip. */
  day: string;
}

/** Why the rules engine answered as it did (tests and logs; never the message). */
export type CastRulesRoute = "distress" | "general-safety" | "operational" | "area" | "vera" | "general";

function veraArea(persona: AssistantPersona | undefined, area: ChatAreaId | null | undefined): ChatAreaId | null {
  return persona !== "sky" && isChatArea(area) ? area : null;
}

export function castRulesRoute(message: string, persona?: AssistantPersona, area?: ChatAreaId | null): CastRulesRoute {
  if (detectDistress(message)) return "distress";
  if (skyIntent(message) === "safeguarding") return "general-safety";
  if (persona === "sky") return "general";
  const a = veraArea(persona, area);
  // An order or a registration for an area is collected for a person before the generic requests engine.
  if (a && isOperationalFor(a, message)) return "operational";
  if (isTicketRequest(message)) return "operational";
  if (REQUEST_RE.test(message)) return "general-safety";
  return a ? "area" : "vera";
}

export async function castRulesAnswer(input: CastRulesInput, deps: CastRulesDeps): Promise<SkyReply> {
  const { message, persona } = input;
  const distress = detectDistress(message);
  if (distress) return distressReferral(distress);
  const route = castRulesRoute(message, persona, input.area);
  if (route === "general-safety" || route === "general") return deps.general({ message });
  const area = veraArea(persona, input.area);
  const facts = deps.facts ?? EMPTY_CAST_FACTS;
  if (route === "operational") return castOperationalReply(area && isOperationalFor(area, message) ? area : "biglietteria");
  if (area) {
    const own = castIntentReply(area, message, facts);
    if (own) return own;
  }
  if (skyIntent(message)) return deps.general({ message });
  const topic = veraTopicReply(message, facts);
  if (topic) return topic;
  return area ? veraAreaReply(area, deps.day) : deps.general({ message });
}
