# SCD AUTOMATION PLANE

## Canonical pipeline
INGEST -> CLASSIFY -> DEDUPE -> NORMALIZE -> ENTITY_LINK -> RULE/DECISION -> HUMAN_GATE_WHEN_REQUIRED -> ACT -> AUDIT -> RETRY/RECOVER.

## Gmail
Use broad intake, then classify. Preserve message/thread IDs. Do not mark read until the complete workflow succeeds. Record retry/error state.

## Drive
Preserve originals and route according to the canonical five-folder tree. Store file IDs and provenance, not detached copies unless required.

## Calendar
One canonical EVENT_ID. Google Calendar is a projection/sync target, never a second truth.

## Sports sources
FIGC/LND/CRL official sources take precedence. Tuttocampo is secondary. Conflicts become PENDING_REVIEW.

## R22
Long-running or external actions use R22 command/job contracts with idempotency, correlation ID, retries, audit and rollback.

## Human approval
Required for critical actions involving roles, permissions, payments, registrations, sensitive documents, safeguarding or destructive mutations.

## Priority implementation sequence
1. Gmail broad classifier + dedupe + audit.
2. Drive routing + document registry.
3. Task/deadline extraction.
4. Calendar/Event creation with human gate.
5. FIGC/LND change adapters.
6. Sponsor follow-up automation.
7. Observability dashboard.
