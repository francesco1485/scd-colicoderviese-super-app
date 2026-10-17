#!/usr/bin/env node
// One-off import of past enrolments into «I miei documenti» (r142): Tally «Modulo Iscrizioni 2026/2027» (VLAJNy),
// staff form (PdeZNV) and the Drive folders `Cognome_Nome_Ruolo` -> scd_documents rows (acceptances with the submission
// date, delivered files with their Drive id, certificate expiry from the form).
//
// DRY RUN by default: prints COUNTS ONLY (no names, no ids, no file names) and writes nothing.
// Write mode is NOT to be run by an agent: only after «applica r142» and Francesco's explicit go, with
//   --write --org <uuid> --i-confirm-r142-applied  and env SCD_SUPABASE_URL + SCD_SUPABASE_SECRET_KEY.
//
// Inputs (JSON files exported by the Segreteria or by Make; keep them OUTSIDE the repository):
//   --vlajny <file>   Tally API export {questions:[{id,title,type}], submissions:[{id,submittedAt,responses:[{questionId,answer}]}]}
//   --pdeznv <file>   same shape, staff form
//   --drive <file>    [{ "name": "Cognome_Nome_Ruolo", "files": [{ "id": "<drive id>", "name": "<file name>" }] }]
//   --people <file>   [{ id, first_name, last_name, birth_date }]  (offline); without it the people are read (SELECT only)
//                     from SCD PULSE with SCD_SUPABASE_URL + SCD_SUPABASE_SECRET_KEY.
// Run: node scripts/import-enrolment-documents.mjs --vlajny /tmp/x.json --drive /tmp/d.json --people /tmp/p.json
// Node >= 22.18 (type stripping) loads the shared mapping in apps/superapp/src/lib/enrolment-import.ts.
// PROPOSED: the question-title patterns (name, surname, birth date, documents) must be checked against the real forms.
import { readFileSync } from "node:fs";

const lib = await import(new URL("../apps/superapp/src/lib/enrolment-import.ts", import.meta.url).href);

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const flag = (name) => args.includes(`--${name}`);
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const PROJECT_REF = "ndevtxxijbcnskgysdit"; // SCD PULSE only. Never dfnwzwutvnwiitiffwvr.

function supabaseEnv() {
  const url = (process.env.SCD_SUPABASE_URL ?? "").trim();
  const key = (process.env.SCD_SUPABASE_SECRET_KEY ?? "").trim();
  if (!url || !key) return null;
  if (url !== `https://${PROJECT_REF}.supabase.co`) throw new Error("SCD_SUPABASE_URL is not SCD PULSE: refusing.");
  return { url, key };
}

async function rest(env, path, init = {}) {
  const res = await fetch(`${env.url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: env.key, Authorization: `Bearer ${env.key}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Supabase ${init.method ?? "GET"} ${path.split("?")[0]} failed: HTTP ${res.status}`);
  return res.status === 204 ? null : res.json();
}

const NAME_Q = /^nome\b|nome (dell'|del |atleta|giocatore)/i;
const SURNAME_Q = /cognome/i;
const BIRTH_Q = /data di nascita|nato il|nata il/i;

/** Tally export -> TallySubmission[] (field values only, kept in memory, never printed). */
function tallySubmissions(json) {
  const qs = new Map((json.questions ?? []).map((q) => [q.id, q]));
  return (json.submissions ?? []).map((s) => {
    const fields = (s.responses ?? []).map((r) => {
      const q = qs.get(r.questionId) ?? { title: "", type: "" };
      return { title: String(q.title ?? ""), type: String(q.type ?? ""), value: r.answer };
    });
    const first = (re) => {
      const f = fields.find((x) => re.test(x.title) && typeof x.value === "string");
      return f ? String(f.value) : null;
    };
    return { id: String(s.id), submittedAt: String(s.submittedAt ?? ""), firstName: first(NAME_Q), lastName: first(SURNAME_Q), birthDate: first(BIRTH_Q), fields };
  });
}

async function loadPeople(env) {
  const file = opt("people");
  const raw = file ? readJson(file) : env ? await rest(env, "scd_people?select=id,first_name,last_name,birth_date&status=neq.ARCHIVED") : null;
  if (!raw) throw new Error("No people: pass --people <file> or set SCD_SUPABASE_URL + SCD_SUPABASE_SECRET_KEY (read-only).");
  return raw.map((p) => ({ id: p.id, firstName: p.first_name ?? "", lastName: p.last_name ?? "", birthDate: p.birth_date ?? null }));
}

async function main() {
  const env = supabaseEnv();
  const people = await loadPeople(env);
  const v = opt("vlajny") ? tallySubmissions(readJson(opt("vlajny"))) : [];
  const s = opt("pdeznv") ? tallySubmissions(readJson(opt("pdeznv"))) : [];
  const drive = opt("drive") ? readJson(opt("drive")) : [];
  const mv = lib.mapSubmissions(v, people, "TALLY_VLAJNY");
  const ms = lib.mapSubmissions(s, people, "TALLY_PDEZNV");
  const md = lib.mapDriveFolders(drive, people);
  const summary = lib.summarize(
    { count: v.length + s.length, matched: mv.matched + ms.matched, unmatched: mv.unmatched + ms.unmatched, certificateDates: mv.certificateDates + ms.certificateDates, rows: [...mv.rows, ...ms.rows] },
    { count: drive.length, matched: md.matched, ambiguousOrUnknown: md.ambiguousOrUnknown, unclassified: md.unclassified, rows: md.rows },
  );
  const write = flag("write");
  console.log(JSON.stringify({ mode: write ? "WRITE" : "DRY_RUN", ...summary }, null, 2));
  if (!write) return;

  const org = opt("org");
  if (!env || !org || !/^[0-9a-f-]{36}$/i.test(org) || !flag("i-confirm-r142-applied")) {
    throw new Error("Write mode needs --org <uuid>, --i-confirm-r142-applied and SCD_SUPABASE_URL + SCD_SUPABASE_SECRET_KEY.");
  }
  const rows = [...mv.rows, ...ms.rows, ...md.rows];
  const existing = new Set(
    (await rest(env, `scd_documents?select=source_id,source_record_id&organization_id=eq.${org}&source_record_id=not.is.null`)).map(
      (r) => `${r.source_id}|${r.source_record_id}`,
    ),
  );
  const fresh = rows.filter((r) => !existing.has(`${r.sourceId}|${r.sourceRecordId}`));
  for (let i = 0; i < fresh.length; i += 200) {
    const batch = fresh.slice(i, i + 200).map((r) => ({
      organization_id: org, person_id: r.personId, document_type: r.kind, title: r.kind, visibility: "FAMILY",
      section: r.section, status: r.status, accepted_at: r.acceptedAt, expires_at: r.expiresAt, drive_file_id: r.driveFileId,
      source_id: r.sourceId, source_record_id: r.sourceRecordId, review_note: r.section === "CONSEGNATO" ? "importato dall'iscrizione 2026/27" : null,
    }));
    await rest(env, "scd_documents", { method: "POST", body: JSON.stringify(batch), headers: { Prefer: "return=minimal" } });
  }
  await rest(env, `scd_document_settings?organization_id=eq.${org}`, {
    method: "PATCH", body: JSON.stringify({ enrolment_import_at: new Date().toISOString() }), headers: { Prefer: "return=minimal" },
  });
  console.log(JSON.stringify({ written: fresh.length, skippedExisting: rows.length - fresh.length }));
}

main().catch((e) => {
  // Messages carry no personal data (HTTP status and paths only).
  console.error(String(e?.message ?? e));
  process.exit(1);
});
