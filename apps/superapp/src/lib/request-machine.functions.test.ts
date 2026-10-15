import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionView } from "./auth.functions";
import type { MachineOutcome, MyConfirmations, RequestFormData, RequestsDesk } from "./request-machine.functions";

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

let session: SessionView;
const rpc = vi.fn();
vi.mock("./auth.functions", () => ({ sessionView: async () => session }));
vi.mock("./supabase.server", () => ({ serverSupabase: () => ({ rpc }) }));

const fns = await import("./request-machine.functions");
type Fn<I, O> = (ctx?: { data: I }) => Promise<O>;
const desk = fns.getRequestsDesk as unknown as Fn<undefined, RequestsDesk>;
const mine = fns.getMyConfirmations as unknown as Fn<undefined, MyConfirmations>;
const create = fns.createRequestDraft as unknown as Fn<Record<string, unknown>, MachineOutcome>;
const decide = fns.decideRequest as unknown as Fn<Record<string, unknown>, MachineOutcome>;
const form = fns.getRequestForm as unknown as Fn<Record<string, unknown>, RequestFormData>;

const ORG = { organizationId: "00000000-0000-0000-0000-000000000001", organization: "scd", role: "SECRETARIAT" };
const as = (roles: string[], role = "SECRETARIAT"): SessionView => ({
  configured: true,
  user: { email: "x@example.test" },
  roles,
  landing: "/aree",
  badge: null,
  hasPassword: true,
  memberships: [{ ...ORG, role }],
});
const missing = { data: null, error: { code: "PGRST202", message: "Could not find the function public.scd_requests_expire" } };

beforeEach(() => {
  rpc.mockReset();
  delete process.env["SCD_STAGING_PREVIEW"];
});

describe("request machine server functions", () => {
  it("keeps the board closed without an allowed position, before touching the database", async () => {
    session = as(["famiglia"], "FAMILY");
    const d = await desk();
    expect(d.gate.view).toBe("access");
    expect(d.rows).toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("fails closed with 'in preparazione' while r133 is not applied", async () => {
    session = as(["segreteria"]);
    rpc.mockResolvedValue(missing);
    const d = await desk();
    expect(d).toMatchObject({ connected: true, ready: false, canEdit: true, rows: [] });
    const w = await create({ data: { channel: "WHATSAPP", teamKey: "u15" } });
    expect(w.ok).toBe(false);
    expect(w.message).toMatch(/in preparazione/);
    expect(await mine()).toEqual({ state: "off" });
    const f = await form({ data: { id: "11111111-1111-1111-1111-111111111111" } });
    expect(f).toMatchObject({ ready: false, row: null });
  });

  it("reads the board for the Direttore Generale (sees all) but marks it read-only", async () => {
    session = as(["direttore-generale"], "STAFF");
    rpc.mockImplementation(async (fn: string) => {
      if (fn === "scd_requests_expire") return { data: 0, error: null };
      if (fn === "scd_requests_board")
        return { data: [{ id: "r1", kind: "AMICHEVOLE", channel: "APP", status: "BOZZA", createdAt: "2026-10-15T10:00:00Z" }, { bogus: true }], error: null };
      return { data: [], error: null };
    });
    const d = await desk();
    expect(d).toMatchObject({ ready: true, canEdit: false });
    expect(d.rows.map((r) => r.id)).toEqual(["r1"]);
  });

  it("hides the confirmation card from people with no part in the machine", async () => {
    session = as(["mister"], "MISTER");
    expect(await mine()).toEqual({ state: "none" });
    session = { ...as([]), user: null };
    expect(await mine()).toEqual({ state: "none" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("validates drafts on the server before calling the database", async () => {
    session = as(["segreteria"]);
    const bad = await create({ data: { channel: "WHATSAPP", teamKey: "u15", date: "2020-01-01", time: "10:00" } });
    expect(bad.ok).toBe(false);
    expect(bad.errors?.["date"]).toMatch(/passata/);
    expect(rpc).not.toHaveBeenCalled();
    await expect(create({ data: { channel: "SMS" } })).rejects.toThrow();
  });

  it("relays the database refusal of a confirmation in plain words", async () => {
    session = as(["responsabile-attivita-base"], "STAFF");
    rpc.mockResolvedValue({ data: { ok: false, code: "forbidden" }, error: null });
    const r = await decide({ data: { id: "11111111-1111-1111-1111-111111111111", decision: "CONFERMA", clubId: null } });
    expect(r).toEqual({ ok: false, message: "Non hai il ruolo per questa operazione." });
    rpc.mockResolvedValue({ data: { ok: false, code: "expired" }, error: null });
    expect((await decide({ data: { id: "11111111-1111-1111-1111-111111111111", decision: "RIFIUTA" } })).message).toMatch(/scaduto/);
    await expect(decide({ data: { id: "nope", decision: "CONFERMA" } })).rejects.toThrow();
  });

  it("answers 'not found' for a malformed form id instead of crashing", async () => {
    session = as(["segreteria"]);
    const f = await form({ data: { id: "not-a-uuid" } });
    expect(f).toMatchObject({ ready: true, row: null, error: "Richiesta non trovata." });
    expect(rpc).not.toHaveBeenCalled();
  });
});
