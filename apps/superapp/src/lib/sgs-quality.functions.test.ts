import { describe, expect, it } from "vitest";

import { organigrammaData } from "./sgs-quality.data";

const status = JSON.stringify({ asOf: "2026-10-11", declaration: { sent: "YES", level: 1 }, roles: { "medico-sg": "MISSING" } });

describe("organigramma server data", () => {
  it("never returns the private status while the area is closed", () => {
    const d = organigrammaData({ SCD_SGS_STATUS_JSON: status }, true);
    expect(d.gate.view).toBe("access");
    expect(d.statusConfigured).toBe(false);
    expect(d.status.roles).toEqual({});
  });

  it("returns it in the staging preview and evaluates the declared level", () => {
    const d = organigrammaData({ SCD_SGS_STATUS_JSON: status, SCD_STAGING_PREVIEW: "1", SCD_STAGING_GATEWAY: "1", SCD_STAGING_PASSWORD: "x".repeat(24) }, true);
    expect(d.gate).toMatchObject({ view: "page", preview: true });
    expect(d.statusConfigured).toBe(true);
    expect(d.level).toBe(1);
    expect(d.status.roles).toEqual({ "medico-sg": "MISSING" });
  });

  it("falls back to the club target level without a status", () => {
    const d = organigrammaData({ SCD_STAGING_PREVIEW: "1" }, false);
    expect(d).toMatchObject({ level: 3, statusConfigured: false });
  });
});
