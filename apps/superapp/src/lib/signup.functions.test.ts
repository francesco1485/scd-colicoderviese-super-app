/**
 * Registration server function with Supabase mocked: no network, no e-mail sent.
 * Checks the "everybody registers from scratch" rule (Direzione 14/10/2026): an address that already has an account
 * (e.g. loaded by the office) gets the "scegli la password" e-mail, with the same answer as a new registration.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = {
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(async () => ({ error: null })),
};
const sb = { auth, rpc: vi.fn(async () => ({ data: "RECEIVED", error: null })) };

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
vi.mock("@tanstack/react-start/server", () => ({ getRequestUrl: () => new URL("https://app.example.test/registrati") }));
vi.mock("./supabase.server", () => ({ serverSupabase: () => sb, setRememberPreference: () => undefined, supabaseEnv: () => null }));
vi.mock("./http-policy", () => ({ configuredSiteUrl: () => "https://app.example.test" }));
vi.mock("./request-ip.server", () => ({ clientIp: () => "127.0.0.1" }));

const { signUpWithPassword } = await import("./signup.functions");
const signUp = signUpWithPassword as unknown as (ctx: { data: Record<string, unknown> }) => Promise<{ outcome: string }>;

const form = {
  firstName: "Mario",
  lastName: "Rossi",
  birthDate: "1980-05-01",
  email: "Mario.Rossi@example.it",
  phone: "333 1234567",
  password: "Colico2026!",
  confirm: "Colico2026!",
  consent: true,
  declaration: { kinds: ["GENITORE"], children: [{ firstName: "Luca", lastName: "Rossi", birthYear: "2014" }], note: "", tesserato: "SI" },
};

beforeEach(() => {
  auth.signUp.mockReset();
  auth.resetPasswordForEmail.mockClear();
  sb.rpc.mockClear();
});

describe("signUpWithPassword", () => {
  it("new address: sign-up with the declaration (tesserato kept), no password e-mail", async () => {
    auth.signUp.mockResolvedValueOnce({ data: { user: { id: "u1", identities: [{ id: "i1" }] } }, error: null });
    const out = await signUp({ data: form });
    expect(out.outcome).toBe("CHECK_EMAIL");
    const call = auth.signUp.mock.calls[0]![0] as { email: string; options: { data: { scd_declared: { tesserato: string }; phone: string } } };
    expect(call.email).toBe("mario.rossi@example.it");
    expect(call.options.data.scd_declared.tesserato).toBe("SI");
    expect(call.options.data.phone).toBe("333 1234567");
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("address already in the system: sends the 'scegli la password' e-mail, same answer", async () => {
    auth.signUp.mockResolvedValueOnce({ data: { user: { id: "u2", identities: [] } }, error: null });
    const out = await signUp({ data: form });
    expect(out.outcome).toBe("CHECK_EMAIL");
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("mario.rossi@example.it", { redirectTo: "https://app.example.test/accedi/conferma" });
  });
});
