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
  | { ok: false; reason: "http"; status: number; errorType?: string; errorMessage?: string }
  | { ok: false; reason: "timeout" | "network" | "empty" };

export interface ClaudeCall {
  apiKey: string;
  system: string;
  user: string;
  maxTokens: number;
  /** Haiku 5.5 effort level; thinking is disabled, which the API allows at `high` or below. */
  effort?: "low" | "medium" | "high";
  timeoutMs: number;
  fetchImpl?: FetchLike;
  model?: string;
}

/** Longest error excerpt kept in logs. */
export const ERROR_EXCERPT_MAX = 160;

/** Safe one-line excerpt of an API error message: no keys, no newlines, capped. */
export function safeErrorExcerpt(message: unknown): string | undefined {
  if (typeof message !== "string") return undefined;
  const clean = message
    .replace(/sk-ant-[A-Za-z0-9_-]*/g, "[redacted]")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return undefined;
  return clean.length > ERROR_EXCERPT_MAX ? `${clean.slice(0, ERROR_EXCERPT_MAX - 1)}…` : clean;
}

/** Only the type and a sanitized excerpt of the error JSON; never the raw body. */
async function readApiError(res: Response): Promise<{ errorType?: string; errorMessage?: string }> {
  try {
    const j = (await res.json()) as { error?: { type?: unknown; message?: unknown } };
    const t = j?.error?.type;
    const errorType = typeof t === "string" && /^[a-z_]{1,64}$/.test(t) ? t : undefined;
    const errorMessage = safeErrorExcerpt(j?.error?.message);
    return { ...(errorType ? { errorType } : {}), ...(errorMessage ? { errorMessage } : {}) };
  } catch {
    return {};
  }
}

/**
 * Request body for claude-haiku-5-5 (platform.claude.com/docs/en/models/haiku-5-5/migration-guide):
 * no temperature/top_p/top_k (non-default values return 400), thinking disabled so that
 * max_tokens is spent on the answer, effort low (thinking may be disabled only at high or below).
 */
export function claudeRequestBody(c: Pick<ClaudeCall, "system" | "user" | "maxTokens" | "model" | "effort">) {
  return {
    model: c.model ?? CLAUDE_MODEL,
    max_tokens: c.maxTokens,
    thinking: { type: "disabled" as const },
    output_config: { effort: c.effort ?? "low" },
    system: c.system,
    messages: [{ role: "user" as const, content: c.user }],
  };
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
      body: JSON.stringify(claudeRequestBody(c)),
      signal: ctrl.signal,
    });
    if (!res.ok) return { ok: false, reason: "http", status: res.status, ...(await readApiError(res)) };
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
