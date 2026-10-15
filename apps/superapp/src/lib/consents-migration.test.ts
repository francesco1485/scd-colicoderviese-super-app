import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const MIG = "../../../../supabase/migrations/";
const r132 = read(`${MIG}20261015_r132_consents_fix.sql`);
const body = r132
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");

const R59_TYPES = [
  "IMMAGINI_ISTITUZIONALI",
  "COMUNICAZIONI_PROMOZIONALI",
  "PULMINO_SERVIZIO",
  "USCITA_AUTONOMA",
  "AVATAR_APP",
  "FOTO_PARTITA_APP",
];
const NEW_TYPES = ["IMMAGINE_NOME", "COMM_EMAIL", "PRESA_VISIONE_INFORMATIVA", "PRESA_VISIONE_AUTISTA"];

describe("r132 scd_person_consents fix (staged, not applied)", () => {
  it("is staged behind an explicit 'applica r132' and documents its rollback", () => {
    expect(r132).toMatch(/STAGED: NOT APPLIED/);
    expect(r132).toContain('"applica r132"');
    expect(r132).toMatch(/-- Rollback/);
    expect(body).toMatch(/^begin;/m);
    expect(body).toMatch(/^commit;/m);
  });

  it("keeps every r59 consent type and adds the types the code already reads", () => {
    const check = body.match(/add constraint scd_person_consents_consent_type_check check \(consent_type in \(([\s\S]*?)\)\);/);
    expect(check).not.toBeNull();
    const allowed = [...(check?.[1] ?? "").matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
    for (const t of [...R59_TYPES, ...NEW_TYPES]) expect(allowed).toContain(t);
    // r90 (Top 11) and r95 (e-mail opt-out) read these types: they must be storable.
    expect(read(`${MIG}20261012_r90_week_votes.sql`)).toContain("consent_type = 'IMMAGINE_NOME'");
    expect(read(`${MIG}20261013_r95_comm_hub.sql`)).toContain("consent_type = 'COMM_EMAIL'");
  });

  it("replaces the per-version unique with one active choice per person and type", () => {
    expect(body).toMatch(
      /create unique index if not exists scd_person_consents_one_active_uidx\s+on public\.scd_person_consents \(person_id, consent_type\)\s+where revoked_at is null;/,
    );
    expect(body).toContain("array['consent_type','person_id','policy_version']");
    // Pre-check raises with counts only, before the swap.
    const precheck = body.indexOf("having count(*) > 1");
    expect(precheck).toBeGreaterThan(-1);
    expect(precheck).toBeLessThan(body.indexOf("create unique index"));
    expect(body).toMatch(/raise exception 'r132 aborted: % person\/consent_type pairs \(% rows\)/);
  });

  it("adds only nullable audit columns, no data changes and no access changes", () => {
    expect(body).toMatch(/add column if not exists given_by_role text[\s\S]*?in \('SELF','GUARDIAN','TUTOR'\)/);
    expect(body).toMatch(/add column if not exists channel text[\s\S]*?in \('APP','MODULO_ONLINE','CARTA','IMPORT'\)/);
    expect(body).toMatch(/add column if not exists revoked_by_person_id uuid[\s\S]*?references public\.scd_people\(id\)/);
    expect(body).not.toMatch(/not null/i);
    expect(body).not.toMatch(/\b(insert into|update public|delete from|truncate)\b/i);
    expect(body).not.toMatch(/\b(grant|create policy|alter policy|disable row level security)\b/i);
  });
});
