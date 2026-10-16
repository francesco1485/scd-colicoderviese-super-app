import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  STRUCTURE_AREAS,
  STRUCTURE_KINDS,
  STRUCTURE_SITES,
  STRUCTURE_WRITE_MESSAGES,
  STRUCTURE_WRITER_POSITIONS,
  STRUCTURE_WRITER_ROLES,
} from "./structure-activities";

const path = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const sql = readFileSync(path("../../../../supabase/migrations/20261016_r137_structure_activities_write.sql"), "utf8");
const body = sql
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");
const quoted = (s: string) => [...s.matchAll(/'([A-Za-z_-]+)'/g)].map((m) => m[1]);
const fns = [...body.matchAll(/create or replace function public\.(\w+)\(([^)]*)\)[\s\S]*?\$\$;/g)];
const fn = (name: string) => fns.find((f) => f[1] === name)?.[0] ?? "";
const WRITE_FNS = ["scd_structure_activity_create", "scd_structure_activity_update", "scd_structure_activity_cancel"];

describe("r137 structure activities write (STAGED, registry of migrations)", () => {
  it("is STAGED and NOT applied: only after Francesco writes 'applica r137'", () => {
    expect(sql).toMatch(/^-- r137:/);
    expect(sql).toMatch(/STAGED: NOT APPLIED\. Apply only after Francesco writes "applica r137"/);
    // The only "APPLIED" line is the prerequisite r135.
    const applied = sql.split("\n").filter((l) => /APPLIED on SCD PULSE/.test(l));
    expect(applied.length).toBe(1);
    expect(applied[0]).toMatch(/r135/);
    expect(sql).toMatch(/-- Rollback/);
    expect(sql).toMatch(/-- Engines: TEMPO/);
    expect(sql).toMatch(/Measure:/);
    expect(body).toMatch(/^begin;/m);
    expect(body).toMatch(/^commit;/m);
    // Behaviour test on PGlite, kept next to the r133/r135 ones.
    expect(existsSync(path("../../../../supabase/tests/r137_structure_activities_write.pglite.mjs"))).toBe(true);
  });

  it("fails closed when r135 or the work queue r79 is missing", () => {
    const guard = body.match(/do \$\$[\s\S]*?end;\n\$\$;/)?.[0] ?? "";
    for (const t of ["scd_structure_activities", "scd_proposals", "scd_proposal_events"]) expect(guard).toContain(`to_regclass('public.${t}') is null`);
    expect(guard).toMatch(/raise exception 'r137 prerequisites missing/);
  });

  it("is additive and idempotent: no drop, no delete, no change to r135 or r79 objects", () => {
    expect(body).not.toMatch(/\bdrop\s+(table|column|type|policy|index|function|trigger)\b/i);
    expect(body).not.toMatch(/\btruncate\b|\bdelete from\b/i);
    expect(body).not.toMatch(/alter table public\.scd_(?!structure_activity_events)/i);
    expect(body).not.toMatch(/create or replace function public\.scd_(structure_week|structure_reader|structure_reader_site|proposal_\w+)\(/);
    for (const m of body.matchAll(/create table [^(]*/gi)) expect(m[0]).toMatch(/if not exists/i);
    for (const m of body.matchAll(/create (unique )?index [^(]*/gi)) expect(m[0]).toMatch(/if not exists/i);
    expect(body).not.toMatch(/create function/i);
    expect(body).not.toMatch(/create trigger/i);
  });

  it("uses the existing work queue for the Segreteria notice: no new notification table, no e-mail", () => {
    const tables = [...body.matchAll(/create table if not exists public\.(\w+)/g)].map((m) => m[1]);
    expect(tables).toEqual(["scd_structure_activity_events"]);
    const notify = fn("scd_structure_notify");
    expect(notify).toMatch(/insert into public\.scd_proposals \(/);
    expect(notify).toMatch(/values \(a\.organization_id, 'G04', 'segreteria', 'ALTRO',/);
    expect(notify).toMatch(/'INTERNO', 'MANUAL'/);
    expect(notify).toMatch(/insert into public\.scd_proposal_events/);
    // DERVIO notices are generic: the queue is also read by office positions that do not read Dervio (tesoreria).
    expect(notify).toContain("then 'Struttura Dervio: ' || v_what || ' — apri Attività in struttura'");
    expect(notify).toContain("case when a.site = 'DERVIO' then '' else coalesce(' Motivo: '");
    expect(notify).toMatch(/then jsonb_build_object\('action', 'structure_activity_notice', 'change', p_change, 'activityId', a\.id, 'site', a\.site\)\n/);
    // Registered in the manifest as STAGED.
    const manifest = readFileSync(path("../../../../SCD_SYSTEM_MANIFEST.json"), "utf8");
    expect(manifest).toMatch(/"structure_activities_write": "r137 \(2026-10-16, STAGED NOT APPLIED, applied only after Francesco writes «applica r137»/);
    expect(body).not.toMatch(/scd_notification_outbox|recipient_email|net\.http|pg_net/i);
    // Every write function notifies (UD-156: "segreteria sempre informata"), on both sites.
    for (const name of WRITE_FNS) expect(fn(name), name).toMatch(/public\.scd_structure_notify\(v_row, '(CREATE|UPDATE|CANCEL)'/);
  });

  it("writers are the Direzione role and the presidente / direttore-generale positions, as in lib (UD-159)", () => {
    const w = fn("scd_structure_writer");
    expect(quoted(w.match(/scd_has_org_role\(p_organization_id, array\[([^\]]*)\]/)?.[1] ?? "")).toEqual([...STRUCTURE_WRITER_ROLES]);
    expect(quoted(w.match(/scd_has_position\(p_organization_id, array\[([^\]]*)\]/)?.[1] ?? "")).toEqual([...STRUCTURE_WRITER_POSITIONS]);
    expect(w).toMatch(/language sql\s+stable/);
    expect(w).not.toMatch(/security definer/);
    expect(STRUCTURE_WRITER_ROLES as readonly string[]).not.toContain("SECRETARIAT");
  });

  it("locks every function: fixed search_path, SECURITY DEFINER only where needed, explicit writer check, no anon", () => {
    for (const f of fns) expect(f[0], f[1]).toMatch(/set search_path to 'public'/);
    for (const name of [...WRITE_FNS, "scd_structure_write_access"]) {
      expect(fn(name), name).toMatch(/security definer/);
      expect(body, name).toMatch(new RegExp(`revoke all on function public\\.${name}\\([^)]*\\) from public, anon;`));
      expect(body, name).toMatch(new RegExp(`grant execute on function public\\.${name}\\([^)]*\\) to authenticated;`));
    }
    for (const name of WRITE_FNS) {
      expect(fn(name), name).toMatch(/if auth\.uid\(\) is null or not public\.scd_structure_writer\(p_organization_id\) then\s+raise exception 'not allowed' using errcode = '42501'/);
      expect(fn(name), name).toMatch(/insert into public\.scd_structure_activity_events/);
    }
    for (const name of ["scd_structure_writer", "scd_structure_activity_clean", "scd_structure_activity_json", "scd_structure_notify", "scd_structure_activity_events_block_change"]) {
      expect(fn(name), name).not.toBe("");
      expect(fn(name), name).not.toMatch(/security definer/);
      expect(body, name).toMatch(new RegExp(`revoke all on function public\\.${name}\\([^)]*\\) from public, anon, authenticated;`));
    }
    expect(body).not.toMatch(/to anon\b/i);
    expect(body).not.toMatch(/create policy/i);
    expect(body).not.toMatch(/grant [a-z, ]+ on table/i);
    expect(body).toContain("alter table public.scd_structure_activity_events enable row level security;");
    expect(body).toContain("revoke all on table public.scd_structure_activity_events from anon, authenticated;");
    expect(body).toMatch(/create or replace trigger scd_structure_activity_events_append_only\s+before update or delete/);
    // created_by / actor are never returned
    for (const name of [...WRITE_FNS, "scd_structure_write_access"]) {
      const ret = [...fn(name).matchAll(/return jsonb_build_object\(([^;]*)\);/g)].map((m) => m[1]).join(" ");
      expect(ret, name).not.toMatch(/created_by|actor/);
    }
  });

  it("checks input like lib/structure-activities.ts: same vocabularies, same codes, no contacts", () => {
    const clean = fn("scd_structure_activity_clean");
    expect(quoted(clean.match(/'site', ''\) not in \(([^)]*)\)/)?.[1] ?? "")).toEqual([...STRUCTURE_SITES]);
    expect(quoted(clean.match(/'area', ''\) not in \(([^)]*)\)/)?.[1] ?? "")).toEqual([...STRUCTURE_AREAS]);
    expect(quoted(clean.match(/'kind', ''\) not in \(([^)]*)\)/)?.[1] ?? "")).toEqual([...STRUCTURE_KINDS]);
    expect(clean).toContain("'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}'");
    expect(clean).toContain("'(\\+|00)?[0-9]([ ./-]?[0-9]){8,}'");
    expect(clean).toMatch(/at time zone 'Europe\/Rome'/);
    const codes = new Set([...body.matchAll(/'code', '([a-z_]+)'/g)].map((m) => m[1]));
    expect([...codes].sort()).toEqual(Object.keys(STRUCTURE_WRITE_MESSAGES).sort());
  });
});
