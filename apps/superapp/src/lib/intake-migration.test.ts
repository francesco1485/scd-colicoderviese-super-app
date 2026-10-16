import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  HEALTH_PATTERN,
  INTAKE_AREAS,
  INTAKE_DERVIO_ALWAYS,
  INTAKE_DERVIO_EXCLUDED,
  INTAKE_FIELDS,
  INTAKE_KINDS,
  INTAKE_RULES,
  INTAKE_SLUG,
  INTAKE_STATUSES,
  INTAKE_TOURNAMENT_IDS,
  INTAKE_WATCHERS,
  INTAKE_ALWAYS_DECIDE,
  PAYMENT_STATUSES,
} from "./intake-kinds";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const sql = read("../../../../supabase/migrations/20261017_r139_requests_intake.sql");
const body = sql
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");
const quoted = (s: string) => [...s.matchAll(/'([^']+)'/g)].map((m) => m[1]!);
const fn = (name: string) => body.match(new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\$\\$;`))?.[0] ?? "";

describe("r139 Vetrina richieste (staged, not applied)", () => {
  it("is staged behind 'applica r139', guarded, transactional, with a rollback", () => {
    expect(sql).toMatch(/STAGED: NOT APPLIED/);
    expect(sql).toContain('"applica r139"');
    expect(sql).toMatch(/Never on dfnwzwutvnwiitiffwvr/);
    expect(sql).toMatch(/-- Rollback/);
    expect(body).toMatch(/^begin;/m);
    expect(body).toMatch(/^commit;/m);
    expect(body).toContain("r139 prerequisites missing");
  });

  it("never drops tables, columns or data; recreates checks by column", () => {
    expect(body).not.toMatch(/\bdrop\s+(table|column|type|policy|index|function)\b/i);
    expect(body).not.toMatch(/\btruncate\b|\bdelete from public\.scd_requests\b/i);
    for (const m of body.matchAll(/create table [^(]*/gi)) expect(m[0]).toMatch(/if not exists/i);
    for (const m of body.matchAll(/add column .*/gi)) expect(m[0]).toMatch(/^add column if not exists /i);
    expect(body).not.toMatch(/create function/i);
  });

  it("locks the contacts table and grants nothing to anon", () => {
    expect(body).toContain("alter table public.scd_request_contacts enable row level security;");
    expect(body).toContain("revoke all on table public.scd_request_contacts from anon, authenticated;");
    expect(body).not.toMatch(/create policy/i);
    expect(body).not.toMatch(/grant [a-z, ]+ on table/i);
    expect(body).not.toMatch(/to anon\b/i);
    expect(body).toMatch(/grant execute on function public\.scd_request_ingest\(uuid, jsonb\) to service_role;/);
    expect(body).not.toMatch(/grant execute on function public\.scd_request_ingest\(uuid, jsonb\) to authenticated/);
    expect(body).not.toMatch(/grant execute on function public\.scd_request_contacts_purge\(\) to authenticated/);
  });

  it("every function fixes search_path; every security definer is revoked from anon", () => {
    const fns = [...body.matchAll(/create or replace function public\.(\w+)\(([^)]*)\)[\s\S]*?\$\$;/g)];
    expect(fns.length).toBeGreaterThanOrEqual(17);
    for (const f of fns) {
      expect(f[0], f[1]).toMatch(/set search_path to 'public'/);
      expect(body, f[1]).toMatch(new RegExp(`revoke all on function public\\.${f[1]}\\([^)]*\\) from public, anon`));
    }
  });

  it("sends nothing (in-app notices only)", () => {
    expect(body).not.toMatch(/scd_notification_outbox|net\.http|pg_net|http_post|smtp/i);
  });

  it("keeps kinds, statuses, areas and payment states equal to lib/intake-kinds.ts", () => {
    expect(quoted(body.match(/scd_requests_kind_check check \(kind in \(([\s\S]*?)\)\)/)?.[1] ?? "")).toEqual(["AMICHEVOLE", ...INTAKE_KINDS]);
    expect(JSON.parse(fn("scd_intake_kinds").match(/'(\[[^\]]*\])'::jsonb/)?.[1] ?? "[]")).toEqual([...INTAKE_KINDS]);
    const kindStatus = body.match(/kind <> 'AMICHEVOLE' and status in \(([^)]*)\)/)?.[1] ?? "";
    expect(quoted(kindStatus).sort()).toEqual([...INTAKE_STATUSES].sort());
    expect(quoted(body.match(/area is null or area in \(([^)]*)\)/)?.[1] ?? "")).toEqual([...INTAKE_AREAS]);
    expect(quoted(body.match(/payment_status is null or payment_status in \(([^)]*)\)/)?.[1] ?? "")).toEqual([...PAYMENT_STATUSES]);
  });

  it("mirrors the rules of every kind (area, topic, positions, site, payment link)", () => {
    const rules = fn("scd_request_kind_rules");
    for (const k of INTAKE_KINDS) {
      const block = rules.match(new RegExp(`when '${k}' then jsonb_build_object\\(([\\s\\S]*?)'paymentLink', (true|false)\\)`));
      expect(block, k).not.toBeNull();
      const b = block![1]!;
      const r = INTAKE_RULES[k];
      expect(b, k).toContain(`'area', '${r.area}'`);
      expect(b, k).toContain(`'topic', '${r.topic}'`);
      for (const set of ["deciders", "preparers", "informed", "owners"] as const) {
        const arr = quoted(b.match(new RegExp(`'${set}', jsonb_build_array\\(([^)]*)\\)`))?.[1] ?? "");
        expect(arr, `${k} ${set}`).toEqual([...r[set]]);
      }
      expect(b, k).toContain(`'siteRequired', ${r.siteRequired}`);
      expect(block![2], k).toBe(String(r.paymentLink));
    }
  });

  it("mirrors the always-deciders, watchers and the UD-156 Dervio sets", () => {
    const pos = fn("scd_request_kind_positions");
    expect(quoted(pos.match(/v_always text\[\] := array\[([^\]]*)\]/)?.[1] ?? "")).toEqual([...INTAKE_ALWAYS_DECIDE]);
    expect(quoted(pos.match(/v_watchers text\[\] := array\[([^\]]*)\]/)?.[1] ?? "")).toEqual([...INTAKE_WATCHERS]);
    expect(quoted(pos.match(/v_dervio_always text\[\] := array\[([^\]]*)\]/)?.[1] ?? "")).toEqual([...INTAKE_DERVIO_ALWAYS]);
    expect(quoted(pos.match(/v_dervio_excluded text\[\] := array\[([^\]]*)\]/)?.[1] ?? "")).toEqual([...INTAKE_DERVIO_EXCLUDED]);
  });

  it("mirrors the field whitelist, tournaments, slugs and the health words", () => {
    const clean = fn("scd_request_clean_intake");
    for (const k of INTAKE_KINDS) {
      const arr = quoted(clean.match(new RegExp(`when '${k}' then array\\[([^\\]]*)\\]`))?.[1] ?? "");
      expect(arr, k).toEqual([...INTAKE_FIELDS[k]]);
    }
    expect(quoted(clean.match(/not in \(('christmas[^)]*)\)/)?.[1] ?? "")).toEqual([...INTAKE_TOURNAMENT_IDS]);
    const ingest = fn("scd_request_ingest");
    for (const k of INTAKE_KINDS) expect(ingest, k).toContain(`'${INTAKE_SLUG[k]}' then '${k}'`);
    const words = fn("scd_request_intake_text").match(/~\* '\(([^)]*)\)'/)?.[1];
    expect(`(${words})`).toBe(HEALTH_PATTERN.source);
  });

  it("keeps the friendlies page for friendlies only (r133 reads filtered)", () => {
    for (const name of ["scd_requests_board", "scd_request_form", "scd_request_notices"]) expect(fn(name), name).toContain("kind = 'AMICHEVOLE'");
    expect(body).toMatch(/kind = 'AMICHEVOLE' and status in \('BOZZA','DA_CONFERMARE','CONFERMATA','RIFIUTATA','SCADUTA','ANNULLATA'\)/);
  });

  it("writes payments only for the position tesoreria and only after acceptance", () => {
    const pay = fn("scd_intake_payment_set");
    expect(pay).toContain("scd_has_position(p_organization_id, array['tesoreria'])");
    expect(pay).not.toMatch(/DIRECTION/);
    expect(pay).toContain("r.status not in ('ACCETTATA','IN_GESTIONE','CHIUSA')");
    expect(body).toContain("and (payment_status is null or status in ('ACCETTATA','IN_GESTIONE','CHIUSA'))");
  });
});
