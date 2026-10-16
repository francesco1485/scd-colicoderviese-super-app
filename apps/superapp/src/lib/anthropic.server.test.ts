import { describe, expect, it, vi } from "vitest";

import { callClaude, claudeRequestBody, ERROR_EXCERPT_MAX, safeErrorExcerpt } from "./anthropic.server";

const KEY = "sk-ant-test-key-never-real";

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("claudeRequestBody (claude-haiku-5-5)", () => {
  it("sends no sampling parameters, thinking disabled, low effort, a final user turn", () => {
    const b = claudeRequestBody({ system: "S", user: "U", maxTokens: 450 });
    expect(b).toEqual({
      model: "claude-haiku-5-5",
      max_tokens: 450,
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      system: "S",
      messages: [{ role: "user", content: "U" }],
    });
    expect(b).not.toHaveProperty("temperature");
    expect(b).not.toHaveProperty("top_p");
    expect(b).not.toHaveProperty("top_k");
  });
});

describe("safeErrorExcerpt", () => {
  it("redacts keys, flattens whitespace and caps the length", () => {
    const out = safeErrorExcerpt(`bad ${KEY}\n\nmore ${"y".repeat(500)}`)!;
    expect(out).not.toContain("sk-ant-");
    expect(out).toContain("[redacted]");
    expect(out).not.toMatch(/\n/);
    expect(out.length).toBeLessThanOrEqual(ERROR_EXCERPT_MAX);
  });
  it("ignores non-strings and empty text", () => {
    expect(safeErrorExcerpt(undefined)).toBeUndefined();
    expect(safeErrorExcerpt({ a: 1 })).toBeUndefined();
    expect(safeErrorExcerpt("   ")).toBeUndefined();
  });
});

describe("callClaude", () => {
  const base = { apiKey: KEY, system: "S", user: "U", maxTokens: 100, timeoutMs: 5000 };

  it("posts the documented headers and body", async () => {
    const f = vi.fn(async () => json({ content: [{ type: "text", text: "ciao" }], usage: { input_tokens: 3, output_tokens: 1 } }, 200));
    const out = await callClaude({ ...base, fetchImpl: f as never });
    expect(out).toEqual({ ok: true, text: "ciao", inputTokens: 3, outputTokens: 1 });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(init.headers).toMatchObject({ "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" });
    expect(JSON.parse(String(init.body))).toEqual(claudeRequestBody(base));
  });

  it("returns the error type and a sanitized excerpt on a non-2xx", async () => {
    const f = vi.fn(async () => json({ type: "error", error: { type: "invalid_request_error", message: `temperature must be 1 (${KEY})` } }, 400));
    const out = await callClaude({ ...base, fetchImpl: f as never });
    expect(out).toEqual({ ok: false, reason: "http", status: 400, errorType: "invalid_request_error", errorMessage: "temperature must be 1 ([redacted])" });
  });

  it("keeps status only when the error body is not JSON or the type is odd", async () => {
    const f1 = vi.fn(async () => new Response("<html>bad gateway</html>", { status: 502 }));
    expect(await callClaude({ ...base, fetchImpl: f1 as never })).toEqual({ ok: false, reason: "http", status: 502 });
    const f2 = vi.fn(async () => json({ error: { type: "Weird Type!" } }, 400));
    expect(await callClaude({ ...base, fetchImpl: f2 as never })).toEqual({ ok: false, reason: "http", status: 400 });
  });

  it("returns empty when the reply has only thinking blocks", async () => {
    const f = vi.fn(async () => json({ content: [{ type: "thinking", thinking: "" }], stop_reason: "max_tokens" }, 200));
    expect(await callClaude({ ...base, fetchImpl: f as never })).toEqual({ ok: false, reason: "empty" });
  });
});
