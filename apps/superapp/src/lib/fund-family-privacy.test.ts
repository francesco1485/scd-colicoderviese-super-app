import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

describe("Fondo Solidale receives only what the form needs (security review 14/10/2026)", () => {
  it("getMyFamilyForFund blanks birth year, teams, registration and medical certificate", () => {
    const src = read("./roster.functions.ts");
    const fn = src.slice(src.indexOf("export const getMyFamilyForFund"));
    expect(fn).toContain("birthYear: null");
    expect(fn).toContain("teamCodes: []");
    expect(fn).toContain("registrationStatus: null");
    expect(fn).toContain("certificateExpiresAt: null");
    expect(fn).not.toContain("m.medical_certificate_expires_at");
  });

  it("the Fondo Solidale page never loads the full family", () => {
    const page = read("../routes/sostieni.fondo-solidale.tsx");
    expect(page).toContain("getMyFamilyForFund");
    expect(page).not.toMatch(/\bgetMyFamily\b(?!ForFund)/);
  });
});
