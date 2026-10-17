import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { DOC_KINDS } from "./my-documents";

// r144 is checked on its text here; its behaviour runs on PGlite in supabase/tests/r144_my_documents.pglite.mjs
// (PGlite has no pg_cron, so the cron block is checked only here).
const path = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const sql = readFileSync(
  path("../../../../supabase/migrations/20261017_r144_my_documents.sql"),
  "utf8",
);
const body = sql
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");
const fns = [
  ...body.matchAll(
    /create or replace function public\.(\w+)\(([^)]*)\)[\s\S]*?\n\$\$;/g,
  ),
];
const fn = (name: string) => fns.find((f) => f[1] === name)?.[0] ?? "";
const PUBLIC_FNS = [
  "scd_my_documents",
  "scd_doc_lamp",
  "scd_doc_upload_target",
  "scd_doc_review",
  "scd_doc_request_create",
  "scd_doc_office_board",
  "scd_team_documents_ok",
  "scd_doc_set_expiry_mail",
  "scd_doc_office_can",
];
const INTERNAL_FNS = [
  "scd_doc_circle",
  "scd_doc_due",
  "scd_doc_expiry_run",
  "scd_doc_user_is_direzione",
];
/** Called only by the server with the service key, after the Drive upload, with the verified user id. */
const SERVICE_FNS = ["scd_doc_register_upload"];
const NEW_TABLES = [
  "scd_document_requests",
  "scd_document_settings",
  "scd_document_notices",
];

describe("r144 my documents (STAGED, not applied)", () => {
  it("is staged behind 'applica r144', targets SCD PULSE only, says why, engines, measure and rollback", () => {
    expect(sql).toMatch(/^-- r144:/);
    expect(sql).toMatch(
      /STAGED: NOT APPLIED\. Apply only after Francesco writes "applica r144"/,
    );
    expect(sql).toMatch(
      /Target: SCD PULSE \(ndevtxxijbcnskgysdit\)\. Never on dfnwzwutvnwiitiffwvr/,
    );
    expect(sql).toContain(
      "«se c'è un documento scaduto deve accendersi una lampadina dentro e inviare la notifica via mail»",
    );
    expect(sql).toMatch(/-- Engines: TEMPO/);
    expect(sql).toMatch(/-- Measure:/);
    expect(sql).toMatch(/-- Rollback/);
    expect(body).toMatch(/^begin;/m);
    expect(body.trimEnd()).toMatch(/commit;$/);
    expect(
      existsSync(
        path("../../../../supabase/tests/r144_my_documents.pglite.mjs"),
      ),
    ).toBe(true);
    const manifest = readFileSync(
      path("../../../../SCD_SYSTEM_MANIFEST.json"),
      "utf8",
    );
    expect(manifest).toMatch(
      /"my_documents": "r144 \(2026-10-17, STAGED NOT APPLIED, applied only after Francesco writes «applica r144»/,
    );
  });

  it("fails closed when a prerequisite is missing", () => {
    const guard = body.match(/do \$\$[\s\S]*?end;\n\$\$;/)?.[0] ?? "";
    for (const t of [
      "scd_documents",
      "scd_family_members",
      "scd_athletes",
      "scd_person_consents",
      "scd_comm_settings",
      "scd_comm_messages",
    ])
      expect(guard).toContain(`to_regclass('public.${t}') is null`);
    for (const f of [
      "scd_my_person_ids(uuid)",
      "scd_my_team_ids(uuid)",
      "scd_set_certificate(uuid, uuid, date, text, boolean, text)",
      "scd_comm_resolve_envelopes(uuid, jsonb)",
    ])
      expect(guard).toContain(`to_regprocedure('public.${f}') is null`);
    expect(guard).toMatch(/raise exception 'r144 prerequisites missing/);
  });

  it("is additive except the documented read tightening", () => {
    const drops = [...body.matchAll(/\bdrop\s+\w+[^;]*;/gi)].map((m) => m[0]);
    expect(drops).toEqual([
      'drop policy if exists "scd_documents_select_member" on public.scd_documents;',
    ]);
    expect(body).toContain(
      'create policy "scd_documents_select_office" on public.scd_documents for select to authenticated',
    );
    expect(body).not.toMatch(/\btruncate\b|\bdelete from\b/i);
    for (const m of body.matchAll(/create table [^(]*/gi))
      expect(m[0]).toMatch(/if not exists/i);
    for (const m of body.matchAll(/create (unique )?index [^(]*/gi))
      expect(m[0]).toMatch(/if not exists/i);
    for (const m of body.matchAll(/add column [^,;]*/gi))
      expect(m[0]).toMatch(/add column if not exists/i);
    expect(body).not.toMatch(
      /alter table public\.scd_(athletes|people|comm_\w+|family_members)\b/,
    );
    expect(body).not.toMatch(/create function/i);
  });

  it("locks new tables: RLS on, no policies, no grants", () => {
    for (const t of NEW_TABLES) {
      expect(body).toContain(
        `alter table public.${t} enable row level security;`,
      );
      expect(body).toContain(
        `revoke all on table public.${t} from anon, authenticated;`,
      );
      expect(body).not.toMatch(
        new RegExp(`create policy[^;]*on public\\.${t}\\b`),
      );
    }
    expect(body).not.toMatch(/grant [a-z, ]+ on table/i);
    expect(body).not.toMatch(/to anon\b/i);
  });

  it("locks every function: fixed search_path, no anon, internal helpers closed to authenticated", () => {
    expect(fns.length).toBeGreaterThanOrEqual(
      PUBLIC_FNS.length + INTERNAL_FNS.length,
    );
    for (const f of fns)
      expect(f[0], f[1]).toMatch(/set search_path to 'public'/);
    for (const name of PUBLIC_FNS) {
      expect(fn(name), name).not.toBe("");
      expect(body, name).toMatch(
        new RegExp(
          `revoke all on function public\\.${name}\\([^)]*\\) from public, anon;`,
        ),
      );
      expect(body, name).toMatch(
        new RegExp(
          `grant execute on function public\\.${name}\\([^)]*\\) to authenticated;`,
        ),
      );
    }
    for (const name of INTERNAL_FNS) {
      expect(fn(name), name).toMatch(/security definer/);
      expect(body, name).toMatch(
        new RegExp(
          `revoke all on function public\\.${name}\\([^)]*\\) from public, anon, authenticated;`,
        ),
      );
      expect(body, name).not.toMatch(
        new RegExp(`grant execute on function public\\.${name}\\(`),
      );
    }
    for (const name of SERVICE_FNS) {
      expect(fn(name), name).toMatch(/security definer/);
      expect(body, name).toMatch(
        new RegExp(
          `revoke all on function public\\.${name}\\([^)]*\\) from public, anon, authenticated;`,
        ),
      );
      expect(body, name).toMatch(
        new RegExp(
          `grant execute on function public\\.${name}\\([^)]*\\) to service_role;`,
        ),
      );
      expect(body, name).not.toMatch(
        new RegExp(
          `grant execute on function public\\.${name}\\([^)]*\\) to authenticated`,
        ),
      );
    }
    expect(fn("scd_doc_register_upload")).toMatch(/p_user_id uuid, p_organization_id uuid/);
    expect(fn("scd_doc_register_upload")).toContain(
      "if auth.uid() is distinct from p_user_id then return",
    );
    for (const name of [
      "scd_my_documents",
      "scd_doc_review",
      "scd_doc_request_create",
      "scd_doc_office_board",
    ])
      expect(fn(name), name).toMatch(/security definer/);
  });

  it("mirrors the kind catalogue of lib/my-documents.ts exactly", () => {
    const k = fn("scd_doc_kinds");
    const rows = [
      ...k.matchAll(
        /\('([A-Z_0-9]+)', '(FIRMATO|CONSEGNATO)', '([A-Z]+)', (true|false), '([A-Z_]+)'\)/g,
      ),
    ].map((m) => ({
      code: m[1],
      section: m[2],
      docClass: m[3],
      hasExpiry: m[4] === "true",
      required: m[5],
    }));
    expect(rows).toEqual(
      DOC_KINDS.map(({ code, section, docClass, hasExpiry, required }) => ({
        code,
        section,
        docClass,
        hasExpiry,
        required,
      })),
    );
  });

  it("keeps the certificate in scd_athletes (r66) and never returns Drive ids to families", () => {
    expect(fn("scd_doc_review")).toContain(
      "perform public.scd_set_certificate(p_organization_id, v_athlete, p_expires_at, p_cert_kind, true,",
    );
    expect(fn("scd_doc_due")).toContain("a.medical_certificate_expires_at");
    expect(fn("scd_my_documents")).not.toMatch(
      /drive_file_id|driveFileId|file_name|uploaded_by/,
    );
    expect(fn("scd_team_documents_ok")).toMatch(
      /returns table \(team_id uuid, person_id uuid, in_regola boolean\)/,
    );
    // other guardians never in the circle; unknown birth date = minor only for children or athletes
    expect(fn("scd_doc_circle")).toContain("and not coalesce(fm2.is_guardian, false)");
    expect(fn("scd_doc_circle")).not.toMatch(
      /coalesce\(public\.scd_is_minor\(p\.birth_date\), true\)/,
    );
    // certificate state only from scd_athletes; unknown expiry is never «in regola»
    expect(fn("scd_doc_state")).toContain("when p_expires is null then 'DA_VERIFICARE'");
    expect(fn("scd_my_documents")).toContain(
      "'expiresAt', case when k.code = 'CERTIFICATO_MEDICO' then a.medical_certificate_expires_at else",
    );
    expect(fn("scd_my_documents")).not.toMatch(/coalesce\(a\.medical_certificate_expires_at, approved/);
    expect(body).toContain("check (status is distinct from 'APPROVATO' or verified_at is not null)");
    // the daily cap answers before the file reaches the Drive
    expect(fn("scd_doc_upload_target")).toMatch(/>= 30 then\s+return jsonb_build_object\('ok', false, 'code', 'TOO_MANY'\)/);
    // literal % and _ in the people search
    expect(fn("scd_doc_office_board")).toContain("ilike '%' || v_like || '%' escape");
  });

  it("sends expiry notices only through the r95 outbox, three switches on, minors rule of r95", () => {
    const run = fn("scd_doc_expiry_run");
    expect(run).toMatch(
      /coalesce\(s\.expiry_mail_enabled, false\) and coalesce\(cs\.sending_enabled, false\) and coalesce\(cs\.gmail_connected, false\)/,
    );
    expect(run).toContain(
      "from public.scd_comm_resolve_envelopes(v_org.id, v_audience) e",
    );
    expect(run).toContain("insert into public.scd_comm_recipients");
    expect(run).not.toMatch(/certificat|sanitari|isee/i);
    expect(body).not.toMatch(/net\.http|pg_net|http_post/i);
    expect(run).toContain("public.scd_doc_user_is_direzione(o.id, s.enabled_by) as can_send");
    expect(run).toContain("when v_person.n = 1 then '1 documento scaduto o in scadenza'");
    expect(fn("scd_doc_set_expiry_mail")).toMatch(
      /'DIREZIONE' = any\(public\.scd_comm_offices\(p_organization_id\)\)/,
    );
    expect(body).toMatch(/expiry_mail_enabled boolean not null default false/);
  });

  it("schedules exactly one daily job, idempotently, inside the markers cut by the PGlite test", () => {
    const block =
      body.match(
        /do \$\$\nbegin\n {2}if not exists \(select 1 from pg_available_extensions where name = 'pg_cron'\)[\s\S]*?scd_doc_expiry_notices not scheduled exactly once[\s\S]*?\$\$;/,
      )?.[0] ?? "";
    expect(block).not.toBe("");
    expect(sql).toMatch(
      /-- >>> r144 cron[\s\S]*cron\.schedule[\s\S]*-- <<< r144 cron/,
    );
    const schedules = [
      ...body.matchAll(/cron\.schedule\('([^']*)', '([^']*)', '([^']*)'\)/g),
    ].map((m) => m.slice(1));
    expect(schedules).toEqual([
      [
        "scd_doc_expiry_notices",
        "5 6 * * *",
        "select public.scd_doc_expiry_run();",
      ],
    ]);
    expect(body).toContain(
      "from cron.job where jobname = 'scd_doc_expiry_notices'",
    );
    expect(body).toContain("perform cron.unschedule(v_job.jobid);");
  });

  it("audits writes with ids and counts only", () => {
    for (const name of [
      "scd_doc_register_upload",
      "scd_doc_review",
      "scd_doc_request_create",
      "scd_doc_set_expiry_mail",
    ])
      expect(fn(name), name).toMatch(/insert into public\.scd_audit_events/);
    const payloads = [...body.matchAll(/jsonb_build_object\('kind'[^;]*/g)]
      .map((m) => m[0])
      .join(" ");
    expect(payloads).not.toMatch(
      /first_name|last_name|display_name|file_name|email/,
    );
  });
});
