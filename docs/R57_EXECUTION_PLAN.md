# R57 — Production Runtime Reconciliation

## Objective

Create a verified factual baseline and reconcile runtime, database, CI and production evidence before new product feature development.

## R57.1 Repository and runtime audit

Inspect and classify:
- runtime entrypoints
- frontend/public/private surfaces
- backend/API routes
- package scripts
- current test suite
- environment dependencies
- source registry and provenance paths
- identity/auth/role/scope implementation
- Calendar Fusion / EVENT implementation
- legacy and duplicate runtime paths
- mocks, fixtures and dead code

Output:
- architecture map
- runtime map
- data flow map
- authorization map
- KEEP / ENHANCE / FIX / INTEGRATE / COMPLETE / REMOVE_WITH_REASON
- blockers and safe next action

No product features and no production mutation.

## R57.2 Supabase R53 -> R56 reconciliation

Compare production migration state against R54-R56 contracts.
Classify each requirement:
- UI_ONLY
- RUNTIME_ONLY
- SCHEMA_ALREADY_PRESENT
- SCHEMA_REQUIRED
- STAGED
- MISSING

Prepare migrations/tests only. Do not apply production migrations.

## R57.3 CI/CD evidence

Establish repeatable checks for:
- manifest
- domain contracts
- syntax
- smoke/regression
- security-sensitive surfaces

Do not claim CI green unless a real workflow/run exists.

## R57.4 Render reconciliation

Classify services:
- CANONICAL
- STAGING
- LEGACY
- ARCHIVE_CANDIDATE
- DELETE_CANDIDATE

Do not delete services during R57 audit.

## R57.5 Branch / PR reconciliation

Review stale PRs and branches.
For each:
- RECOVER
- INTEGRATE
- SUPERSEDED
- CLOSE

No forced merge of stale branches.

## R57.6 Production evidence gate

Release candidate must prove:
- exact commit
- tests
- database compatibility
- production runtime health
- rollback
- known limitations

States:
DESIGNED -> IMPLEMENTED -> TESTED -> DEPLOYED -> PRODUCTION_VERIFIED
