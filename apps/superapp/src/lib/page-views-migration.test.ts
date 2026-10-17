import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { PUBLIC_PREFIXES } from "./http-policy";
import { PAGE_DEVICES, PAGE_SOURCES, PUBLIC_PATH_SEGMENTS } from "./page-views";

// r141 is exercised in PGlite by supabase/tests/r141_app_page_views.pglite.mjs (without pg_cron); here its text is
// checked for the guarantees that must never drift, and the SQL lists are compared with the TypeScript mirror.
const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const sql = read(
  "../../../../supabase/migrations/20261017_r141_app_page_views.sql",
);
const body = sql
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");
const quoted = (s: string) => [...s.matchAll(/'([^']+)'/g)].map((m) => m[1]);

describe("r141 app page views (staged, not applied)", () => {
  it("is staged behind 'applica r141', targets SCD PULSE only, has a rollback", () => {
    expect(sql).toMatch(/STAGED: NOT APPLIED/);
    expect(sql).toContain('"applica r141"');
    expect(sql).toMatch(/Target: SCD PULSE \(ndevtxxijbcnskgysdit\)/);
    expect(sql).toMatch(/Never on dfnwzwutvnwiitiffwvr/);
    expect(sql).toMatch(/-- Rollback/);
    expect(body).toMatch(/^begin;/m);
    expect(body.trimEnd()).toMatch(/commit;$/);
  });

  it("stores aggregated counters only, behind RLS with no policies and no direct grants", () => {
    const table = body.match(
      /create table if not exists public\.scd_app_page_views_daily \(([\s\S]*?)\n\);/,
    )![1]!;
    const cols = [...table.matchAll(/^\s+([a-z_]+) (date|text|integer)/gm)].map(
      (m) => m[1],
    );
    expect(cols).toEqual(["day", "path", "source", "device", "views"]);
    expect(table).toContain("primary key (day, path, source, device)");
    expect(body).not.toMatch(/\b(ip|user_id|user_agent|cookie)\b/i);
    expect(body).toContain(
      "alter table public.scd_app_page_views_daily enable row level security;",
    );
    expect(body).toContain(
      "revoke all on table public.scd_app_page_views_daily from public, anon, authenticated;",
    );
    expect(body).not.toMatch(/create policy/i);
    expect(body).not.toMatch(
      /grant [a-z, ]+ on (table )?public\.scd_app_page_views_daily/i,
    );
  });

  it("every function is SECURITY DEFINER with an empty search_path and the designed grants", () => {
    const fns = [
      ...body.matchAll(/create or replace function (public\.[a-z_]+)\(/g),
    ].map((m) => m[1]);
    expect(fns).toEqual([
      "public.scd_track_page_view",
      "public.scd_app_stats",
      "public.scd_app_page_views_purge",
    ]);
    expect(body.match(/security definer set search_path = ''/g)).toHaveLength(
      3,
    );
    expect(body).toContain(
      "grant execute on function public.scd_track_page_view(text, text, text) to service_role;",
    );
    expect(body).not.toMatch(
      /scd_track_page_view\(text, text, text\) to [^;]*\b(anon|authenticated)\b/,
    );
    expect(body).toContain(
      "grant execute on function public.scd_app_stats(integer) to authenticated;",
    );
    expect(body).toContain(
      "grant execute on function public.scd_app_page_views_purge() to service_role;",
    );
    expect(body).not.toMatch(/scd_app_stats\(integer\) to anon/);
    expect(body).toContain(
      "raise exception 'forbidden' using errcode = '42501';",
    );
    expect(body).toContain(
      "public.scd_has_org_role(o.id, array['DIRECTION']::public.scd_role[])",
    );
  });

  it("public allowlist, sources and devices match the TypeScript mirror and http-policy", () => {
    const allow = body.match(
      /not \(v_segments\[1\] = any \(array\[([\s\S]*?)\]\)\)/,
    )![1]!;
    expect(quoted(allow)).toEqual([...PUBLIC_PATH_SEGMENTS]);
    // the allowlist is exactly the public prefixes of http-policy.ts, without the registration flow /entra
    expect([...PUBLIC_PATH_SEGMENTS].sort()).toEqual(
      PUBLIC_PREFIXES.filter((p) => p !== "/entra")
        .map((p) => p.slice(1))
        .sort(),
    );
    for (const p of [
      "gestionale",
      "direzione",
      "core",
      "accedi",
      "quadro",
      "entra",
      "grow",
      "segreteria",
      "famiglia",
    ])
      expect(PUBLIC_PATH_SEGMENTS).not.toContain(p);
    expect(body).toContain(
      "if char_length(p_path) > 2048 then return; end if;",
    );
    const src = body.match(/p_source not in \(([^)]*)\)/)![1]!;
    expect(quoted(src)).toEqual([...PAGE_SOURCES]);
    const dev = body.match(/p_device not in \(([^)]*)\)/)![1]!;
    expect(quoted(dev)).toEqual([...PAGE_DEVICES]);
    expect(body).toContain("char_length(v_path) > 120");
    expect(body).toContain("where t.views < 100000");
    expect(body).toContain("(now() at time zone 'Europe/Rome')::date");
  });

  it("purges after 25 months with exactly one daily pg_cron job, idempotently", () => {
    expect(body).toContain("interval '25 months'");
    expect(body).toContain(
      "from pg_available_extensions where name = 'pg_cron'",
    );
    expect(body).toContain("perform cron.unschedule(v_job.jobid);");
    const schedules = [
      ...body.matchAll(/cron\.schedule\('([^']*)', '([^']*)', '([^']*)'\)/g),
    ].map((m) => m.slice(1));
    expect(schedules).toEqual([
      [
        "scd_app_page_views_purge",
        "27 1 * * *",
        "select public.scd_app_page_views_purge();",
      ],
    ]);
  });
});
