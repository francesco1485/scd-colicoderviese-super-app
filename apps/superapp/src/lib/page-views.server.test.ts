import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./comm/sync.server", () => ({ serviceSupabase: () => null }));
vi.mock("./request-ip.server", () => ({ clientIp: () => "203.0.113.9" }));
vi.mock("./auth.functions", () => ({ sessionView: vi.fn() }));
vi.mock("./supabase.server", () => ({
  serverSupabase: () => null,
  supabaseEnv: () => null,
}));

import { TRACK_LIMIT_PER_MINUTE, recordPageView } from "./page-views.server";

const rpcOk = () => ({ rpc: vi.fn(async () => ({ error: null })) });
const page = {
  path: "/calendario?utm_source=ig",
  source: "instagram" as const,
  device: "phone" as const,
};

afterEach(() => vi.restoreAllMocks());

describe("recordPageView (r143, service role only)", () => {
  it("calls the RPC with the normalised path through the service client", async () => {
    const c = rpcOk();
    const r = await recordPageView(page, {
      production: true,
      ip: () => "198.51.100.1",
      client: () => c,
    });
    expect(r).toEqual({ ok: true });
    expect(c.rpc).toHaveBeenCalledWith("scd_track_page_view", {
      p_path: "/calendario",
      p_source: "instagram",
      p_device: "phone",
    });
  });

  it("stays off without the service key, off the production build, and for non-public paths", async () => {
    expect(
      await recordPageView(page, {
        production: true,
        ip: () => "198.51.100.2",
      }),
    ).toEqual({ ok: false });
    const c = rpcOk();
    expect(
      await recordPageView(page, {
        production: false,
        ip: () => "198.51.100.3",
        client: () => c,
      }),
    ).toEqual({ ok: false });
    expect(
      await recordPageView(
        { ...page, path: "/gestionale/numeri" },
        { production: true, ip: () => "198.51.100.3", client: () => c },
      ),
    ).toEqual({ ok: false });
    expect(
      await recordPageView(
        { ...page, path: "/entra" },
        { production: true, ip: () => "198.51.100.3", client: () => c },
      ),
    ).toEqual({ ok: false });
    expect(c.rpc).not.toHaveBeenCalled();
  });

  it("limits one address to 60 pages a minute, other addresses unaffected", async () => {
    const c = rpcOk();
    const deps = {
      production: true,
      ip: () => "198.51.100.50",
      client: () => c,
    };
    for (let i = 0; i < TRACK_LIMIT_PER_MINUTE; i++)
      expect((await recordPageView(page, deps)).ok).toBe(true);
    expect((await recordPageView(page, deps)).ok).toBe(false);
    expect(c.rpc).toHaveBeenCalledTimes(TRACK_LIMIT_PER_MINUTE);
    expect(
      (await recordPageView(page, { ...deps, ip: () => "198.51.100.51" })).ok,
    ).toBe(true);
  });

  it("is silent while r143 is missing and logs only the error code once live", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const missing = {
      rpc: vi.fn(async () => ({ error: { code: "PGRST202", message: "x" } })),
    };
    expect(
      (
        await recordPageView(page, {
          production: true,
          ip: () => "198.51.100.60",
          client: () => missing,
        })
      ).ok,
    ).toBe(false);
    expect(warn).not.toHaveBeenCalled();
    const failing = {
      rpc: vi.fn(async () => ({
        error: { code: "57014", message: "secret detail /calendario" },
      })),
    };
    expect(
      (
        await recordPageView(page, {
          production: true,
          ip: () => "198.51.100.61",
          client: () => failing,
        })
      ).ok,
    ).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toBe(
      "[numeri] scd_track_page_view non riuscita: codice 57014",
    );
    expect(String(warn.mock.calls[0])).not.toMatch(/198\.51|calendario|secret/);
  });

  it("never throws, even when the client does", async () => {
    const boom = {
      rpc: vi.fn(async () => {
        throw new Error("network");
      }),
    };
    expect(
      await recordPageView(page, {
        production: true,
        ip: () => "198.51.100.70",
        client: () => boom,
      }),
    ).toEqual({ ok: false });
  });
});
