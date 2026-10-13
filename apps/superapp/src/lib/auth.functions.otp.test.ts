/**
 * Server functions of the e-mail code sign-in, with Supabase mocked: no network, no real e-mail is ever sent.
 * createServerFn is replaced by a minimal builder (validator → handler) so the real validators and handlers run.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = {
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  signInWithPassword: vi.fn(),
  getUser: vi.fn(),
};
const sb = { auth, rpc: vi.fn(async () => ({ data: [] })) };
const setRemember = vi.fn();

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate: (d: unknown) => unknown = (d) => d;
    const builder = {
      inputValidator(fn: (d: unknown) => unknown) {
        validate = fn;
        return builder;
      },
      handler(fn: (ctx: { data: unknown }) => unknown) {
        return async (ctx: { data?: unknown } = {}) => fn({ data: validate(ctx.data) });
      },
    };
    return builder;
  },
}));
vi.mock("@tanstack/react-start/server", () => ({ getRequestUrl: () => new URL("https://app.example.test/accedi") }));
vi.mock("./supabase.server", () => ({ serverSupabase: () => sb, setRememberPreference: (r: boolean) => setRemember(r) }));
vi.mock("./http-policy", () => ({ configuredSiteUrl: () => "https://app.example.test" }));

const { verifyEmailCode, requestMagicLink, signInWithPassword, confirmTokenHash } = await import("./auth.functions");

type Fn<I, O> = (ctx: { data: I }) => Promise<O>;
const verify = verifyEmailCode as unknown as Fn<Record<string, unknown>, { ok: boolean; next: string; message: string; kind?: string }>;
const send = requestMagicLink as unknown as Fn<Record<string, unknown>, { sent: boolean; message: string; retryAfter: number | null; rateLimited: boolean }>;
const password = signInWithPassword as unknown as Fn<Record<string, unknown>, { ok: boolean; message: string; kind?: string }>;
const tokenHash = confirmTokenHash as unknown as Fn<Record<string, unknown>, { ok: boolean; message: string; kind?: string }>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("verifyEmailCode", () => {
  it("strips spaces and calls verifyOtp with type email", async () => {
    auth.verifyOtp.mockResolvedValueOnce({ data: { session: { access_token: "x" }, user: { user_metadata: { scd_password_set: true } } }, error: null });
    const out = await verify({ data: { email: "Nome@Esempio.it", token: "123 456", next: "/aree", remember: false } });
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: "nome@esempio.it", token: "123456", type: "email" });
    expect(setRemember).toHaveBeenCalledWith(false);
    expect(out.ok).toBe(true);
  });

  it("refuses anything that is not exactly 6 digits before calling Supabase", async () => {
    for (const token of ["12345", "1234567", "12a456", ""]) {
      await expect(verify({ data: { email: "a@b.it", token } })).rejects.toThrow();
    }
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("maps a wrong or expired code to the Italian message", async () => {
    auth.verifyOtp.mockResolvedValueOnce({ data: { session: null, user: null }, error: { status: 403, code: "otp_expired", message: "Token has expired or is invalid" } });
    const out = await verify({ data: { email: "a@b.it", token: "000000" } });
    expect(out).toMatchObject({ ok: false, kind: "otp_invalid", message: "Codice non valido o scaduto: chiedine uno nuovo" });
  });
});

describe("requestMagicLink", () => {
  it("reports the rate limit with the provider wait", async () => {
    auth.signInWithOtp.mockResolvedValueOnce({ error: { status: 429, code: "over_email_send_rate_limit", message: "For security purposes, you can only request this after 37 seconds." } });
    const out = await send({ data: { email: "a@b.it" } });
    expect(out).toEqual({ sent: false, rateLimited: true, retryAfter: 37, message: "Troppe richieste in poco tempo: aspetta 37 secondi e riprova una sola volta" });
  });

  it("reports an SMTP failure without raw text", async () => {
    auth.signInWithOtp.mockResolvedValueOnce({ error: { status: 500, code: "unexpected_failure", message: "Error sending magic link email: 535 auth failed" } });
    const out = await send({ data: { email: "a@b.it" } });
    expect(out.sent).toBe(false);
    expect(out.message).toBe("Il servizio di invio mail non risponde: avvisa la segreteria");
  });

  it("answers the same for unknown and known addresses", async () => {
    auth.signInWithOtp.mockResolvedValueOnce({ error: { status: 422, code: "otp_disabled", message: "Signups not allowed for otp" } });
    const unknown = await send({ data: { email: "x@b.it" } });
    auth.signInWithOtp.mockResolvedValueOnce({ error: null });
    const known = await send({ data: { email: "a@b.it" } });
    expect(unknown).toEqual(known);
    expect(known.sent).toBe(true);
    expect(auth.signInWithOtp).toHaveBeenLastCalledWith(expect.objectContaining({ email: "a@b.it", options: expect.objectContaining({ shouldCreateUser: false }) }));
  });
});

describe("signInWithPassword", () => {
  it("invalid credentials point to the e-mail link or code", async () => {
    auth.signInWithPassword.mockResolvedValueOnce({ error: { status: 400, code: "invalid_credentials", message: "Invalid login credentials" } });
    const out = await password({ data: { email: "a@b.it", password: "sbagliata1", remember: true } });
    expect(out.ok).toBe(false);
    expect(out.kind).toBe("invalid_credentials");
    expect(out.message).toContain("Se non hai mai impostato una password, usa il link o il codice via email");
  });
});

describe("confirmTokenHash", () => {
  it("verifies the hash only when called (after the Entra click)", async () => {
    auth.verifyOtp.mockResolvedValueOnce({ data: { session: null, user: null }, error: { status: 403, message: "Email link is invalid or has expired" } });
    const out = await tokenHash({ data: { tokenHash: "pkce_0123456789abcdef0123" } });
    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "pkce_0123456789abcdef0123", type: "email" });
    expect(out).toMatchObject({ ok: false, kind: "otp_invalid" });
  });
});
