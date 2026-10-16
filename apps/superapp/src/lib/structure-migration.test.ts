import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { findArea } from "./areas";
import {
  STRUCTURE_AREAS,
  STRUCTURE_KINDS,
  STRUCTURE_READER_POSITIONS,
  STRUCTURE_READER_POSITIONS_BY_SITE,
  STRUCTURE_READER_ROLES,
  STRUCTURE_SITES,
  STRUCTURE_STATUSES,
  WEEK_OFFSET_MAX,
  WEEK_OFFSET_MIN,
} from "./structure-activities";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const sql = read("../../../../supabase/migrations/20261016_r135_structure_activities.sql");
const body = sql
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");
const quoted = (s: string) => [...s.matchAll(/'([A-Za-z_-]+)'/g)].map((m) => m[1]);
const checkList = (col: string) => quoted(body.match(new RegExp(`${col} text not null[^,]*?check \\(${col} in \\(([^)]*)\\)`))?.[1] ?? "");

describe("r135 structure activities (staged, not applied)", () => {
  it("is staged behind 'applica r135', transactional, documents engines, measure and rollback", () => {
    expect(sql).toMatch(/STAGED: NOT APPLIED/);
    expect(sql).toContain('"applica r135"');
    expect(sql).toMatch(/-- Rollback/);
    expect(sql).toMatch(/-- Engines: TEMPO/);
    expect(sql).toMatch(/Measure:/);
    expect(body).toMatch(/^begin;/m);
    expect(body).toMatch(/^commit;/m);
  });

  it("is additive and idempotent: no drop, no change to existing tables", () => {
    expect(body).not.toMatch(/\bdrop\s+(table|column|type|policy|index|function)\b/i);
    expect(body).not.toMatch(/\btruncate\b|\bdelete from\b|\bupdate public\./i);
    expect(body).not.toMatch(/alter table public\.scd_(?!structure_activities)/i);
    for (const m of body.matchAll(/create table [^(]*/gi)) expect(m[0]).toMatch(/if not exists/i);
    for (const m of body.matchAll(/create (unique )?index [^(]*/gi)) expect(m[0]).toMatch(/if not exists/i);
    expect(body).not.toMatch(/create function/i);
  });

  it("locks the table: RLS on, no policies, no table grants, staff-only read function", () => {
    expect(body).toContain("alter table public.scd_structure_activities enable row level security;");
    expect(body).toContain("revoke all on table public.scd_structure_activities from anon, authenticated;");
    expect(body).not.toMatch(/create policy/i);
    expect(body).not.toMatch(/grant [a-z, ]+ on table/i);
    expect(body).not.toMatch(/to anon\b/i);
    const fns = [...body.matchAll(/create or replace function public\.(\w+)\(([^)]*)\)[\s\S]*?\$\$;/g)];
    expect(fns.map((f) => f[1])).toEqual(["scd_structure_reader_site", "scd_structure_reader", "scd_structure_week"]);
    for (const f of fns) {
      expect(f[0], f[1]).toMatch(/set search_path to 'public'/);
      expect(body, f[1]).toMatch(new RegExp(`revoke all on function public\\.${f[1]}\\([^)]*\\) from public, anon`));
    }
    // The readers are internal checks: not callable by authenticated either (only through scd_structure_week).
    expect(body).toContain("revoke all on function public.scd_structure_reader(uuid) from public, anon, authenticated;");
    expect(body).toContain("revoke all on function public.scd_structure_reader_site(uuid, text) from public, anon, authenticated;");
    expect(body).not.toMatch(/grant execute on function public\.scd_structure_reader/i);
    for (const name of ["scd_structure_reader_site", "scd_structure_reader"]) {
      const f = fns.find((x) => x[1] === name)![0];
      expect(f, name).toMatch(/language sql\s+stable/);
      expect(f, name).not.toMatch(/security definer/);
    }
    const week = fns.find((f) => f[1] === "scd_structure_week")![0];
    expect(week).toMatch(/security definer/);
    expect(week).toMatch(/auth\.uid\(\) is null or not public\.scd_structure_reader\(/);
    // Only rows of the sites the caller reads, and the list of those sites for the page (UD-156).
    expect(week).toMatch(/public\.scd_structure_reader_site\(p_organization_id, x\.site\)/);
    expect(week).toMatch(/a\.site = any\(v_sites\)/);
    expect(week).toContain("'readableSites', to_jsonb(v_sites)");
    expect(week).toMatch(/p_to - p_from > 42/);
    expect(week).not.toMatch(/created_by/);
  });

  it("refuses phone numbers written with spaces, dots, slashes or dashes in title and notes", () => {
    const phone = "'(\\+|00)?[0-9]([ ./-]?[0-9]){8,}'";
    expect(body.split(phone).length - 1).toBe(2);
    const re = /(\+|00)?[0-9]([ ./-]?[0-9]){8,}/;
    for (const t of ["333 123 4567", "333.123.4567", "333/123/4567", "0341-93.12.34", "+393331234567"]) expect(t).toMatch(re);
    for (const t of ["Apertura 07:30", "Serata soci 2026", "Campo 1 e 2"]) expect(t).not.toMatch(re);
  });

  it("keeps the vocabularies equal to lib/structure-activities.ts", () => {
    expect(checkList("site")).toEqual([...STRUCTURE_SITES]);
    expect(checkList("area")).toEqual([...STRUCTURE_AREAS]);
    expect(checkList("kind")).toEqual([...STRUCTURE_KINDS]);
    expect(checkList("status")).toEqual([...STRUCTURE_STATUSES]);
  });

  it("reads per site with the same roles and positions as lib/structure-activities.ts (UD-156)", () => {
    const fn = body.match(/function public\.scd_structure_reader_site[\s\S]*?\$\$;/)?.[0] ?? "";
    const branch = (site: string) => fn.match(new RegExp(`when '${site}' then([\\s\\S]*?)(?=when '|else false)`))?.[1] ?? "";
    for (const site of STRUCTURE_SITES) {
      const b = branch(site);
      expect(b, site).not.toBe("");
      expect(quoted(b.match(/scd_has_org_role\(p_organization_id, array\[([^\]]*)\]/)?.[1] ?? ""), site).toEqual([...STRUCTURE_READER_ROLES]);
      expect(quoted(b.match(/scd_has_position\(p_organization_id, array\[([^\]]*)\]/)?.[1] ?? ""), site).toEqual([...STRUCTURE_READER_POSITIONS_BY_SITE[site]]);
    }
    expect(fn).toMatch(/else false/);
    // The any-site gate is exactly the union of the sites.
    const any = body.match(/function public\.scd_structure_reader\(p_organization_id uuid\)[\s\S]*?\$\$;/)?.[0] ?? "";
    for (const site of STRUCTURE_SITES) expect(any).toContain(`public.scd_structure_reader_site(p_organization_id, '${site}')`);
    expect(any).not.toMatch(/scd_has_position|scd_has_org_role/);
    // "Segreteria sempre informata": the rule for the future write path is written in the header.
    expect(sql).toMatch(/every insert, change or\s*\n--\s*cancellation of a DERVIO row must notify the Segreteria/);
    const area = findArea("struttura");
    expect(area?.path).toBe("/gestionale/struttura");
    expect(area?.parentId).toBe("gestionale");
    // Registry = positions of the database read + segreteria (the SECRETARIAT role); direzione sees every area.
    expect([...(area?.roles ?? [])].sort()).toEqual([...STRUCTURE_READER_POSITIONS, "segreteria"].sort());
  });

  it("stores no personal data: role ids only, contacts refused in title and notes", () => {
    expect(body).toMatch(/responsible_role text check \(responsible_role is null or responsible_role ~ '\^\[a-z0-9-\]\{2,60\}\$'\)/);
    for (const col of ["title", "notes"]) {
      const def = body.match(new RegExp(`\\n  ${col} text[\\s\\S]*?\\)\\),?\\n`))?.[0] ?? "";
      expect(def, col).toContain("!~ '[A-Za-z0-9._%+-]+@");
      expect(def, col).toContain("!~ '(\\+|00)?[0-9]([ ./-]?[0-9]){8,}'");
    }
    expect(body).not.toMatch(/birth|codice_fiscale|phone|email text|person_id|athlete/i);
  });

  it("the page window fits the 42 days the read function allows", () => {
    expect((WEEK_OFFSET_MAX - WEEK_OFFSET_MIN + 1) * 7).toBeLessThanOrEqual(42);
  });
});
