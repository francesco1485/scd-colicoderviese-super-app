# APP AI MANIFEST — SCD Commercial / Lia / Command Platform

PROJECT: SCD Commercial Development + Lia operational platform
AI_BRANCH: ai-scd-commercial-lia
SOURCE_BRANCH: r42-commercial-development-os
RUNTIME: Render staging services scd-commercial-r42-staging and scd-lia-r42-staging
CANONICAL_REPOSITORY: francesco1485/scd-colicoderviese-super-app

GOAL:
Audit, reconcile and evolve the commercial/Lia capabilities as modules of the SCD ecosystem, not as a second SCD operating system.

MANDATORY:
- SCD_SYSTEM_MANIFEST.json and AGENTS.md remain binding.
- R20 remains authoritative where the manifest says so.
- Command Platform must remain an orchestration layer, not a duplicate identity or data core.
- No fake sponsor/commercial data.
- No production deploy from this AI branch.

FIRST MISSION:
Audit current r42 implementation, identify reusable capabilities, stale code, auth assumptions, Render dependencies, test coverage and a safe integration path with current R56/R57 architecture.
