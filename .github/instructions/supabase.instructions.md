---
applyTo: "supabase/**,**/*supabase*.js,**/*supabase*.ts,**/*supabase*.mjs"
---

# SCD Supabase / database instructions

Follow `SCD_SYSTEM_MANIFEST.json`, `AGENTS.md` and repository-wide SCD instructions.

Database rules:
- SCD PULSE is the canonical Supabase project for the current SCD platform.
- Do not create a second database or auth system.
- Do not apply production migrations without explicit human approval.
- Migrations must be forward, reviewable and rollback-aware.
- Preserve RLS and server-side authorization.
- Never weaken RLS to make a feature pass.
- Never hardcode generated production IDs, secrets or credentials.
- Keep provenance, authority and verification status for imported/official data.
- Missing verified data must fail closed.
- Safeguarding and sensitive personal data must remain isolated from ordinary CRM/chat/analytics flows.
- Before proposing a schema change, verify whether an existing table/view/function already satisfies the need.
- Every schema change must state affected entities, policies, indexes, backfill requirements, migration risk and rollback.
- For R57, reconcile R53 production migrations against R54-R56 runtime contracts without mutating production.
