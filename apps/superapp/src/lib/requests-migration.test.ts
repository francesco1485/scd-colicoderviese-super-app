import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { EMAIL_PATTERN, PHONE_PATTERN, VENUES, REQUEST_CHANNELS, REQUEST_CONFIRMERS, REQUEST_STATUSES, FORM_STATUSES, MATCH_SCOPES, REQUEST_WATCHERS, dbConfirmerPositions } from "./request-machine";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const sql = read("../../../../supabase/migrations/20261015_r133_requests_machine.sql");
const body = sql
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");
const quoted = (s: string) => [...s.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);

describe("r133 request machine (staged, not applied)", () => {
  it("is staged behind 'applica r133', transactional and documents its rollback", () => {
    expect(sql).toMatch(/STAGED: NOT APPLIED/);
    expect(sql).toContain('"applica r133"');
    expect(sql).toMatch(/-- Rollback/);
    expect(body).toMatch(/^begin;/m);
    expect(body).toMatch(/^commit;/m);
  });

  it("is additive and idempotent: no drop of existing objects, no destructive statements", () => {
    expect(body).not.toMatch(/\bdrop\s+(table|column|type|policy|index)\b/i);
    expect(body).not.toMatch(/\b(truncate|alter table public\.scd_(events|memberships|teams|organizations))\b/i);
    for (const m of body.matchAll(/create table [^(]*/gi)) expect(m[0]).toMatch(/if not exists/i);
    for (const m of body.matchAll(/create (unique )?index [^(]*/gi)) expect(m[0]).toMatch(/if not exists/i);
    expect(body).not.toMatch(/create function/i); // only create or replace
  });

  it("locks the tables: RLS on, no policies, no grants to anon/authenticated", () => {
    for (const t of ["scd_clubs", "scd_requests", "scd_request_events"]) {
      expect(body).toContain(`alter table public.${t} enable row level security;`);
      expect(body).toContain(`revoke all on table public.${t} from anon, authenticated;`);
    }
    expect(body).not.toMatch(/create policy/i);
    expect(body).not.toMatch(/grant [a-z, ]+ on table/i);
    expect(body).not.toMatch(/to anon\b/i);
  });

  it("every function fixes search_path, every security definer is revoked from anon", () => {
    const fns = [...body.matchAll(/create or replace function public\.(\w+)\(([^)]*)\)[\s\S]*?\$\$;/g)];
    expect(fns.length).toBeGreaterThanOrEqual(18);
    for (const f of fns) {
      expect(f[0], f[1]).toMatch(/set search_path to 'public'/);
      if (/security definer/.test(f[0])) expect(body, f[1]).toMatch(new RegExp(`revoke all on function public\\.${f[1]}\\([^)]*\\) from public, anon`));
    }
  });

  it("keeps the vocabularies equal to lib/request-machine.ts", () => {
    const check = (col: string) => quoted(body.match(new RegExp(`${col} text[^,]*?check \\(${col} in \\(([^)]*)\\)`))?.[1] ?? "");
    expect(check("channel")).toEqual([...REQUEST_CHANNELS]);
    expect(quoted(body.match(/status in \(('BOZZA'[^)]*)\)/)?.[1] ?? "")).toEqual([...REQUEST_STATUSES]);
    expect(quoted(body.match(/form_status in \(([^)]*)\)/)?.[1] ?? "")).toEqual([...FORM_STATUSES]);
    expect(quoted(body.match(/v_scope not in \(([^)]*)\)/)?.[1] ?? "")).toEqual([...MATCH_SCOPES]);
    expect(body).toMatch(/kind text not null check \(kind in \('AMICHEVOLE'\)\)/);
    expect(body).not.toMatch(/raw_text|rawText/);
    expect(body).toMatch(/expires_at timestamptz not null default \(now\(\) \+ interval '15 days'\)/);
    expect(body).toContain("least(now() + interval '15 days', r.proposed_starts_at)");
  });

  it("maps groups to confirmer positions exactly like REQUEST_CONFIRMERS (registry positions only)", () => {
    const fn = body.match(/function public\.scd_request_group_confirmers[\s\S]*?\$\$;/)?.[0] ?? "";
    const branches = [...fn.matchAll(/when p_team_key in \(([^)]*)\) then array\[([^\]]*)\]/g)];
    expect(branches).toHaveLength(REQUEST_CONFIRMERS.length);
    for (const b of branches) {
      const groups = [...b[1]!.matchAll(/'([^']+)'/g)].map((m) => m[1]!);
      const positions = [...b[2]!.matchAll(/'([^']+)'/g)].map((m) => m[1]!);
      for (const g of groups) expect(dbConfirmerPositions(g), g).toEqual(positions);
    }
    const all = branches.flatMap((b) => [...b[1]!.matchAll(/'([^']+)'/g)].map((m) => m[1]));
    expect(all.sort()).toEqual(REQUEST_CONFIRMERS.flatMap((r) => r.groups).sort());
  });

  it("notifies the watchers in the app and never sends anything", () => {
    expect(body).toContain(`array[${REQUEST_WATCHERS.map((w) => `'${w}'`).join(",")}]`);
    expect(body).not.toMatch(/scd_notification_outbox|net\.http|pg_net|http_post/i);
  });

  it("keeps the Master Calendario the only public source: confirmation writes an internal STAFF row", () => {
    const decide = body.match(/function public\.scd_request_decide[\s\S]*?\$\$;/)?.[0] ?? "";
    expect(decide).toMatch(/insert into public\.scd_events/);
    expect(decide).toContain("'AMICHEVOLE'");
    expect(decide).toContain("'PLANNED', 'STAFF'");
    expect(body).not.toMatch(/'PUBLIC'/);
    expect(body).toContain("calendar_copied_at timestamptz");
    expect(body).toMatch(/function public\.scd_request_mark_copied[\s\S]*?'CALENDARIO'/);
    expect(decide).toContain("'SCD_RICHIESTE'");
    expect(decide).toContain("form_status = 'DA_PREPARARE'");
    expect(body.match(/insert into public\.scd_events/g)).toHaveLength(1);
    expect(body).not.toMatch(/birth_date|first_name|last_name|phone|fiscal|codice_fiscale/i);
  });

  it("redacts contacts with the same patterns as the app and publishes only known locations", () => {
    const fn = body.match(/function public\.scd_request_redact[\s\S]*?\$\$;/)?.[0] ?? "";
    expect(fn).toContain(`'${EMAIL_PATTERN}', '[email]'`);
    expect(fn).toContain(`'${PHONE_PATTERN}', '[telefono]'`);
    expect(body).toContain("public.scd_request_redact(coalesce(p->>'note', ''))");
    expect(body).toContain("public.scd_request_redact(coalesce(p_note, ''))");
    expect(body).toContain("'PLANNED', 'STAFF', v_loc, 'SCD_RICHIESTE'");
    const venues = [...(body.match(/venue_text in \(([^)]*)\)/)?.[1] ?? "").matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(venues).toEqual([...VENUES]);
  });

  it("closes the helpers to every client role and refuses null payloads", () => {
    for (const h of ["scd_request_group_confirmers(text)", "scd_request_office(uuid)", "scd_request_viewer(uuid)", "scd_request_actor(uuid)", "scd_request_can_confirm(uuid, text)", "scd_request_clean(jsonb)", "scd_request_redact(text)", "scd_request_json(public.scd_requests)"])
      expect(body, h).toContain(`revoke all on function public.${h} from public, anon, authenticated;`);
    expect(body).toContain("if p is null or jsonb_typeof(p) <> 'object' or octet_length(p::text) > 4000");
    expect(body).toContain("if p is null or jsonb_typeof(p) <> 'object' or char_length(v_name)");
  });

  it("sends an edited waiting request back to the draft and cancels confirmed ones with their calendar row", () => {
    const upd = body.match(/function public\.scd_request_update[\s\S]*?\$\$;/)?.[0] ?? "";
    expect(upd).toContain("status = 'BOZZA', sent_at = null");
    const cancel = body.match(/function public\.scd_request_cancel[\s\S]*?\$\$;/)?.[0] ?? "";
    expect(cancel).toContain("r.status not in ('BOZZA','DA_CONFERMARE','CONFERMATA')");
    expect(cancel).toContain("update public.scd_events set status = 'CANCELLED'");
  });

  it("requires the birth year for Esordienti and home/away before sending and confirming", () => {
    const send = body.match(/function public\.scd_request_send[\s\S]*?\$\$;/)?.[0] ?? "";
    const decide = body.match(/function public\.scd_request_decide[\s\S]*?\$\$;/)?.[0] ?? "";
    for (const f of [send, decide]) expect(f).toContain("if r.team_key = 'esordienti' then return jsonb_build_object('ok', false, 'code', 'team_year')");
    expect(send).toContain("r.payload->>'homeAway' is null");
    expect(decide).toContain("if r.payload->>'homeAway' is null then return jsonb_build_object('ok', false, 'code', 'incomplete')");
  });

  it("keeps the log append-only", () => {
    expect(body).toMatch(/before update or delete on public\.scd_request_events/);
    expect(body).toMatch(/'scd_request_events is append-only'/);
  });
});
