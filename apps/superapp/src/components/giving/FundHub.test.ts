import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { findArea } from "@/lib/areas";
import { PUBLIC_PREFIXES, cacheControlFor, isPublicPath } from "@/lib/http-policy";
import { HUB_PATH, HUB_VIEWS, SUPPORTERS_ACCESS_OPEN, SUPPORTERS_NO_ACCESS, parseHubView } from "./FundHub";

const read = (p: string) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

describe("Fondo Solidale hub /fondo («piattaforma a sé», Francesco 16/10/2026)", () => {
  const route = read("../../routes/fondo.tsx");
  const hub = read("./FundHub.tsx");

  it("uses the same loader and gate as /tesoreria/fondo-solidale and stays private", () => {
    const old = read("../../routes/tesoreria_.fondo-solidale.tsx");
    expect(route).toContain("loader: () => getFundBoard({ data: {} })");
    expect(old).toContain("loader: () => getFundBoard({ data: {} })");
    expect(route).toContain('{ name: "robots", content: "noindex" }');
    expect(HUB_PATH).toBe("/fondo");
    expect(PUBLIC_PREFIXES.some((p) => HUB_PATH.startsWith(p))).toBe(false);
    expect(isPublicPath("/fondo")).toBe(false);
    expect(cacheControlFor("/fondo")).toBe("private, no-store, max-age=0");
    expect(cacheControlFor("/sostieni/fondo-solidale")).toBe("private, no-store, max-age=0");
  });

  it("has Gestione (the Fund page), Sostenitori (no access yet) and Vetrina (link to the public page)", () => {
    expect(HUB_VIEWS).toEqual(["gestione", "sostenitori", "vetrina"]);
    expect(parseHubView("x")).toBe("gestione");
    expect(parseHubView("vetrina")).toBe("vetrina");
    expect(hub).toContain("<FundPage initial={initial} shell={shell} />");
    expect(SUPPORTERS_ACCESS_OPEN).toBe(false);
    expect(SUPPORTERS_NO_ACCESS).toBe("Nessun accesso attivo per ora");
    expect(hub).toContain('to="/sostieni/fondo-solidale"');
  });

  it("shows sections only when the gate shows the structure and never supporter data while closed", () => {
    expect(hub).toContain("showsStructure(gate)");
    expect(hub).toContain('const data = gate.state === "open" ? board : null;');
    expect(hub).not.toMatch(/iseeBand|applicantName|contactEmail/);
  });

  it("uses the club colours with purpose (navy head, azzurro supporters, sole showcase)", () => {
    expect(hub).toContain("TONES.navy");
    expect(hub).toContain('tone="azzurro"');
    expect(hub).toContain('tone="sole"');
    expect(hub).not.toContain("#8fa3c7");
  });

  it("is registered in the area registry as design", () => {
    const a = findArea("fondo");
    expect(a?.path).toBe("/fondo");
    expect(a?.status).toBe("design");
  });
});
