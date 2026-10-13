/**
 * One way to call Claude from the server (r87 moderator pattern, reused by the assistants r99).
 * Plain fetch to the Messages API, no SDK. The key comes only from SCD_ANTHROPIC_API_KEY and never leaves the server.
 * Errors are returned as values (never thrown) so every caller can fall back to its rules engine.
 */

export const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
export const ANTHROPIC_VERSION = "2023-06-01";
export const CLAUDE_MODEL = "claude-haiku-5-5";

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/** The API key when it looks like an Anthropic key, otherwise null (feature stays off). */
export function anthropicApiKey(env: Readonly<Record<string, string | undefined>> = process.env): string | null {
  const k = env["SCD_ANTHROPIC_API_KEY"] ?? null;
  return k && k.startsWith("sk-ant-") ? k : null;
}

export type ClaudeOutcome =
  | { ok: true; text: string; inputTokens: number | null; outputTokens: number | null }
  | { ok: false; reason: "http"; status: number }
  | { ok: false; reason: "timeout" | "network" | "empty" };

export interface ClaudeCall {
  apiKey: string;
  system: string;
  user: string;
  maxTokens: number;
  temperature?: number;
  timeoutMs: number;
  fetchImpl?: FetchLike;
  model?: string;
}

export async function callClaude(c: ClaudeCall): Promise<ClaudeOutcome> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), c.timeoutMs);
  try {
    const res = await (c.fetchImpl ?? fetch)(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": c.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: c.model ?? CLAUDE_MODEL,
        max_tokens: c.maxTokens,
        temperature: c.temperature ?? 0,
        system: c.system,
        messages: [{ role: "user", content: c.user }],
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return { ok: false, reason: "http", status: res.status };
    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = (data.content ?? [])
      .filter((x) => x.type === "text")
      .map((x) => x.text ?? "")
      .join("\n")
      .trim();
    if (!text) return { ok: false, reason: "empty" };
    return { ok: true, text, inputTokens: data.usage?.input_tokens ?? null, outputTokens: data.usage?.output_tokens ?? null };
  } catch (e) {
    return { ok: false, reason: ctrl.signal.aborted || (e instanceof Error && e.name === "AbortError") ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}
