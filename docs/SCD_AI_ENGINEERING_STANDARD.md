# SCD AI Engineering Standard

This document is the reusable development standard for SCD digital products.

## Purpose

Use one engineering method across every SCD web app or repository while keeping each product's real architecture and data sources explicit.

## Mandatory operating cycle

`STATE -> REQUIREMENTS -> EXISTING SYSTEM CHECK -> DOMAIN/DATA CONTRACT -> IMPLEMENT -> TEST -> PR -> REVIEW -> MERGE -> DEPLOY -> PRODUCTION EVIDENCE`

## Shared principles

1. One canonical source of truth per domain.
2. No parallel app/database/auth/calendar/private-area unless explicitly approved.
3. No invented operational, sports, sponsor, financial, identity or administrative data.
4. Progressive evolution before rewrite.
5. Server-side authorization.
6. Provenance for external data.
7. Mobile and desktop are first-class responsive compositions.
8. Accessibility, performance and security are release requirements.
9. Production mutation requires explicit authorization.
10. "Complete" means production evidence, not merely generated code.

## Common agent roles

- SCD Master: orchestration and architecture.
- SCD Architect: full-stack design and implementation.
- SCD QA Security: independent validation and risk review.
- SCD Release: release gate, rollback and production evidence.

Project-specific repositories may add domain specialists, but they must inherit this standard.

## Repository onboarding checklist

Each SCD repository should contain:
- `.github/copilot-instructions.md`
- `AGENTS.md` or equivalent binding agent rules
- `.github/agents/` custom agents
- `.github/instructions/` path-specific rules as needed
- a machine-readable manifest or architecture contract for non-trivial products
- build/test scripts
- a documented production runtime
- a documented rollback path

## Shared command vocabulary

- `SCD:STATE` factual current state
- `SCD:EXPERT` classify domains, risk and toolchain
- `SCD:ARCHITECT` architecture + vision-to-code protocol
- `SCD:NO-DUPLICATE` search before creating
- `SCD:DATA` entities and data contracts
- `SCD:SOURCE` authority/provenance
- `SCD:BUILD` implement vertical slice
- `SCD:TEST` QA
- `SCD:SECURITY` auth/RLS/privacy/safeguarding
- `SCD:RELEASE` release gate
- `SCD:RUN` orchestrate the next safe work block

## Cross-project rule

Common standards may be reused across all SCD repositories. Project-specific architecture, entities, migrations and runtime facts must never be copied blindly from another app.
