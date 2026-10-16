import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// PGlite has no pg_cron, so r140 is checked on its text (r139 keeps its own PGlite test).
const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const sql = read("../../../../supabase/migrations/20261017_r140_intake_contacts_purge_job.sql");
const r139 = read("../../../../supabase/migrations/20261017_r139_requests_intake.sql");
const strip = (s: string) =>
  s
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
const body = strip(sql);

describe("r140 intake contacts purge job (staged, not applied)", () => {
  it("is staged behind 'applica r140', targets SCD PULSE only, has a rollback", () => {
    expect(sql).toMatch(/STAGED: NOT APPLIED/);
    expect(sql).toContain('"applica r140"');
    expect(sql).toMatch(/Target: SCD PULSE \(ndevtxxijbcnskgysdit\)/);
    expect(sql).toMatch(/Never on dfnwzwutvnwiitiffwvr/);
    expect(sql).toMatch(/-- Rollback/);
    expect(sql).toContain("«12 mesi»");
    expect(body).toMatch(/^begin;/m);
    expect(body.trimEnd()).toMatch(/commit;$/);
  });

  it("guards on r139 and pg_cron availability", () => {
    expect(body).toContain("to_regprocedure('public.scd_request_contacts_purge()') is null");
    expect(body).toContain("from pg_available_extensions where name = 'pg_cron'");
    expect(body).toContain("create extension if not exists pg_cron with schema pg_catalog;");
  });

  it("schedules exactly one daily job with the purge statement, idempotently", () => {
    expect(body).toContain("from cron.job where jobname = 'scd_intake_contacts_purge'");
    expect(body).toContain("perform cron.unschedule(v_job.jobid);");
    const schedules = [...body.matchAll(/cron\.schedule\('([^']*)', '([^']*)', '([^']*)'\)/g)].map((m) => m.slice(1));
    expect(schedules).toEqual([
      ["scd_intake_contacts_purge", "17 1 * * *", "select public.scd_request_contacts_purge();"],
    ]);
    expect(body.match(/cron\.schedule\(/g)).toHaveLength(1);
    expect(body).toContain("has_function_privilege(current_user, 'public.scd_request_contacts_purge()', 'execute')");
  });

  it("changes nothing else: no grants, revokes, tables, policies or functions", () => {
    expect(body).not.toMatch(/\bgrant\b/i);
    expect(body).not.toMatch(/\brevoke\b/i);
    expect(body).not.toMatch(/\banon\b|\bauthenticated\b/i);
    expect(body).not.toMatch(/create (or replace )?function/i);
    expect(body).not.toMatch(/create table|alter table|create policy|drop /i);
    expect(body).not.toMatch(/\bdelete from\b|\bupdate public\./i);
  });

  it("keeps the retention periods decided by Francesco as coded in r139", () => {
    const r139Body = strip(r139);
    expect(r139Body).toMatch(/true, now\(\) \+ interval '12 months'\);/);
    expect(r139Body).toContain(
      "update public.scd_request_contacts set purge_after = least(purge_after, now() + interval '6 months') where request_id = r.id;",
    );
    expect(r139Body).toContain(
      "update public.scd_request_contacts set purge_after = now() + interval '12 months' where request_id = r.id;",
    );
    expect(r139Body).toContain("delete from public.scd_request_contacts where purge_after <= now()");
  });
});
