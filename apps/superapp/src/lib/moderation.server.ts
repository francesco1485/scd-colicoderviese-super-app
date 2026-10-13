/**
 * Moderatore automatico, lato server (r87): chiama Claude con il regolamento quando SCD_ANTHROPIC_API_KEY è presente,
 * altrimenti applica la regola di fiducia dell'autore. Il verdetto arriva al database con il token segreto
 * (SCD_MODERATION_TOKEN, di cui il database conosce solo l'hash). Nessun dato di minori parte verso l'esterno:
 * il testo del post è già passato dalle regole del database che bloccano i nomi dei tesserati minorenni.
 */
import {
  MODERATION_RULES,
  moderationUserMessage,
  parseModerationAnswer,
  trustVerdict,
  type ModerationResult,
} from "./moderation";

import { anthropicApiKey, callClaude } from "./anthropic.server";

export function moderationEnv(
  env: Readonly<Record<string, string | undefined>> = process.env,
): { token: string | null; apiKey: string | null } {
  const token = env["SCD_MODERATION_TOKEN"] ?? null;
  return {
    token: token && token.length >= 20 ? token : null,
    apiKey: anthropicApiKey(env),
  };
}

/** The AI verdict, or the trust verdict when AI is not configured or fails (never ALLOW on a failure). */
export async function moderate(input: {
  channelLabel: string;
  baseActivity: boolean;
  authorKind: string;
  title: string | null;
  body: string;
  trusted: boolean;
}): Promise<ModerationResult> {
  const { apiKey } = moderationEnv();
  if (!apiKey) return trustVerdict(input.trusted);
  const out = await callClaude({
    apiKey,
    system: MODERATION_RULES,
    user: moderationUserMessage(input),
    maxTokens: 300,
    temperature: 0,
    timeoutMs: 12_000,
  });
  if (out.ok) return parseModerationAnswer(out.text);
  if (out.reason === "http")
    return {
      verdict: "REVIEW",
      reason: `Moderatore non disponibile (${out.status}): lo vede una persona.`,
      engine: "ai",
      categories: [],
    };
  if (out.reason === "empty") return parseModerationAnswer("");
  return {
    verdict: "REVIEW",
    reason: "Moderatore non raggiungibile: lo vede una persona.",
    engine: "ai",
    categories: [],
  };
}
