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

const MODEL = "claude-haiku-5-5";

export function moderationEnv(
  env: Readonly<Record<string, string | undefined>> = process.env,
): { token: string | null; apiKey: string | null } {
  const token = env["SCD_MODERATION_TOKEN"] ?? null;
  const apiKey = env["SCD_ANTHROPIC_API_KEY"] ?? null;
  return {
    token: token && token.length >= 20 ? token : null,
    apiKey: apiKey && apiKey.startsWith("sk-ant-") ? apiKey : null,
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
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12_000);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        temperature: 0,
        system: MODERATION_RULES,
        messages: [{ role: "user", content: moderationUserMessage(input) }],
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok)
      return {
        verdict: "REVIEW",
        reason: `Moderatore non disponibile (${res.status}): lo vede una persona.`,
        engine: "ai",
        categories: [],
      };
    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = (data.content ?? [])
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("\n");
    return parseModerationAnswer(text);
  } catch {
    return {
      verdict: "REVIEW",
      reason: "Moderatore non raggiungibile: lo vede una persona.",
      engine: "ai",
      categories: [],
    };
  }
}
