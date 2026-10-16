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

describe("Fondo Solidale keeps the ISEE as a band only (Francesco 16/10/2026 «Sì, correggi»)", () => {
  const sql = read("../../../../supabase/migrations/20261014_r101_fondo_adotta.sql");

  it("the migration has no ISEE value column or parameter and the board returns only the band", () => {
    expect(sql).not.toMatch(/^\s+isee_value\s+numeric/m);
    expect(sql).not.toMatch(/p_isee_value/);
    expect(sql).toMatch(/isee_band text not null default 'NON_PRESENTATO' check \(isee_band in \('NON_PRESENTATO','SOTTO_SOGLIA','SOPRA_SOGLIA'\)\)/);
    expect(sql).toMatch(/isee_checked_by uuid references auth\.users/);
    expect(sql).toMatch(/isee_checked_on date/);
    const board = sql.slice(sql.indexOf("function public.scd_fund_board("));
    const body = board.slice(0, board.indexOf("$$;"));
    expect(body).toMatch(/'iseeBand', a\.isee_band/);
    expect(body).not.toMatch(/iseeValue|isee_checked_by/);
  });

  it("the family form and the server function send a band, never a number", () => {
    const form = read("../components/giving/fund-apply.tsx");
    expect(form).toContain("iseeBand: band");
    expect(form).not.toMatch(/iseeValue|inputMode="decimal"/);
    const fns = read("./giving.functions.ts");
    expect(fns).toContain("iseeBand: z.enum(ISEE_BANDS)");
    expect(fns).toContain("p_isee_band: data.iseeBand");
    expect(fns).not.toMatch(/isee_value|iseeValue/);
    const page = read("../components/giving/FundPage.tsx");
    expect(page).not.toMatch(/iseeValue/);
    expect(page).toContain("ISEE_BAND_LABEL[app.iseeBand]");
  });

  it("the audit log never records the band", () => {
    const check = sql.slice(sql.indexOf("function public.scd_fund_check_isee("));
    expect(check.slice(0, check.indexOf("$$;"))).toMatch(/'ISEE_CHECKED', '\{\}'::jsonb/);
  });
});
