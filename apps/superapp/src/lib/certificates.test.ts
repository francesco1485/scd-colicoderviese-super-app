import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { certCounts, certTodo, daysLeft, filterCerts, teamProgress, toCertRow, validateCertDate, type CertRow } from "./certificates";

const TODAY = "2026-10-11";
const row = (o: Partial<CertRow>): CertRow => ({
  athleteId: crypto.randomUUID(),
  name: "Atleta",
  birthYear: 2012,
  minor: true,
  teamCode: "u15",
  teamName: "Under 15",
  registrationStatus: "APPROVATO_FIGC",
  expiresAt: null,
  status: null,
  kind: null,
  checkedAt: null,
  ...o,
});

describe("certificate register", () => {
  it("orders the work: missing, expired, expiring, declared, done", () => {
    expect(certTodo({ expiresAt: null, status: null }, TODAY)).toBe("manca");
    expect(certTodo({ expiresAt: "2026-10-10", status: "VERIFIED" }, TODAY)).toBe("scaduto");
    expect(certTodo({ expiresAt: "2026-11-01", status: "VERIFIED" }, TODAY)).toBe("in-scadenza");
    expect(certTodo({ expiresAt: "2027-06-01", status: "DECLARED" }, TODAY)).toBe("da-controllare");
    expect(certTodo({ expiresAt: "2027-06-01", status: "VERIFIED" }, TODAY)).toBe("a-posto");
  });

  it("drops status and kind when there is no date", () => {
    const r = toCertRow({ athlete_id: "a", display_name: " Mario ", birth_year: 2012, is_minor: true, team_code: "u15", team_name: "U15", registration_status: null, expires_at: null, status: "VERIFIED", kind: "AGONISTICO", checked_at: null });
    expect(r.status).toBeNull();
    expect(r.kind).toBeNull();
    expect(r.name).toBe("Mario");
  });

  it("filters 'da fare' and counts an athlete in two teams once", () => {
    const id = crypto.randomUUID();
    const rows = [
      row({ athleteId: id, name: "Rossi", teamCode: "u15" }),
      row({ athleteId: id, name: "Rossi", teamCode: "u16", teamName: "Under 16" }),
      row({ name: "Bianchi", expiresAt: "2027-06-01", status: "VERIFIED" }),
      row({ name: "Verdi", expiresAt: "2025-01-01", status: "DECLARED" }),
    ];
    expect(filterCerts(rows, {}, TODAY).map((r) => r.name)).toEqual(["Rossi", "Rossi", "Verdi"]);
    expect(filterCerts(rows, { team: "u16" }, TODAY)).toHaveLength(1);
    expect(filterCerts(rows, { todo: "a-posto" }, TODAY).map((r) => r.name)).toEqual(["Bianchi"]);
    expect(filterCerts(rows, { todo: "tutti", q: "verd" }, TODAY).map((r) => r.name)).toEqual(["Verdi"]);
    const c = certCounts(rows, TODAY);
    expect(c.total).toBe(3);
    expect(c.manca).toBe(1);
    expect(c.scaduto).toBe(1);
    expect(c["a-posto"]).toBe(1);
  });

  it("counts per team who can play today", () => {
    const rows = [row({ expiresAt: "2026-10-20" }), row({ expiresAt: null }), row({ teamCode: "prima", teamName: "Prima", expiresAt: "2026-10-01" })];
    expect(teamProgress(rows, TODAY)).toEqual([
      { code: "u15", name: "Under 15", total: 2, ok: 1 },
      { code: "prima", name: "Prima", total: 1, ok: 0 },
    ]);
  });

  it("validates the date with the same window as the database", () => {
    expect(validateCertDate("", TODAY)).toBeNull();
    expect(validateCertDate("2027-09-30", TODAY)).toBeNull();
    expect(validateCertDate("2027-02-30", TODAY)).toBe("Data non valida.");
    expect(validateCertDate("2029-01-01", TODAY)).toMatch(/un anno/);
    expect(validateCertDate("2022-01-01", TODAY)).toMatch(/vecchia/);
    expect(daysLeft("2026-10-21", TODAY)).toBe(10);
    expect(daysLeft(null, TODAY)).toBeNull();
  });

  it("keeps the app window equal to scd_set_certificate (r66)", () => {
    const sql = readFileSync(fileURLToPath(new URL("../../../../supabase/migrations/20261011_r66_certificate_register.sql", import.meta.url)), "utf8");
    expect(sql).toContain("current_date - interval '3 years'");
    expect(sql).toContain("current_date + interval '2 years'");
    expect(sql).toContain("array['DIRECTION','SECRETARIAT']::public.scd_role[]");
  });
});
