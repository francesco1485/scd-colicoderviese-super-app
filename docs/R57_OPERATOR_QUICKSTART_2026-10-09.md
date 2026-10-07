# R57 Operator Quickstart — SCD

## Before using the preview

1. Open https://scd-r57-product-preview.onrender.com
2. Confirm `/health` reports `ok:true` and the expected release-candidate commit.
3. Remember: the preview is intentionally read-only for production-impacting actions.
4. Treat R20 as the current authority for identity, roles and scope.

## SCD ONE

Use for public / family / athlete / supporter experience:
- HOME: current club state and week.
- CALENDAR: source-backed matches, training, tournaments and events.
- TEAMS: team directory and next verified activities.
- SOCIAL: verified club/public content.
- PROFILE: local user experience and non-sensitive personalization.

If a section says data is updating, unavailable or unverified, do not manually “complete” it with guessed data.

## SCD CORE

Use for Direction and operational review:
- Private Desk: work-oriented entry point.
- Control Room: priorities, activities, approvals, deadlines and source-linked changes.
- Intake: signed/request flows where runtime adapter status permits.
- Communications: use only authorized paths; no preview send should be treated as production delivery.
- Tournament / Membership / Facilities: respect the visible source-binding state.

## SCD GROW

Use for sponsor/commercial work:
- CRM 360°
- partner records
- pipeline and follow-up
- agenda
- communications
- development projects
- sponsor assets / proof

Do not promote a prospect to a confirmed partner unless the underlying record/source supports it.

## Status discipline

- VERIFIED: safe to demonstrate within the verified scope.
- LIMITED: safe only inside the stated limitation.
- IMPLEMENTED: present but not fully runtime-verified.
- UNVERIFIED / UNAVAILABLE: do not use for operational decisions.

## Fast troubleshooting

### The page loads but data is missing
Check the visible source state first. Missing source data is expected to fail closed.

### A private action does not execute
On preview this can be intentional because `SCD_PREVIEW_SAFE_MODE=true`.

### Calendar / tournaments appear incomplete
Do not invent events. Verify the R20/public-calendar source and provenance.

### Membership or facilities show unknown state
That is the expected launch-safe behavior until source binding is verified.

### A visual or mobile regression appears
Capture the viewport, route and action. The release must remain blocked until the regression is reproduced or disproved.

## Production boundary

Do not:
- merge the release candidate to main;
- deploy production;
- run destructive migrations;
- change production roles/permissions;
- modify personal data merely to make a demo look complete.

Those actions require explicit Direction authorization.
