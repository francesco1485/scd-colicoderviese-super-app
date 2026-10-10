# Third-party design skills

Design and motion skills vendored for agents working in this repository (local sessions and the nightly build agent).
They guide design quality only; they never override `AGENTS.md`, `SCD_SYSTEM_MANIFEST.json`, the SCD visual rules
(official assets only, realistic 3D characters, no children's faces, palette derived from the official crest) or the approval gates.

| Folder | Upstream | Commit | License |
| --- | --- | --- | --- |
| `impeccable/` | https://github.com/pbakaus/impeccable (`.claude/skills/impeccable`) | d631a88 | Apache-2.0 (`impeccable/LICENSE`) |
| `taste-skill/`, `taste-redesign-skill/`, `taste-brandkit/`, `taste-imagegen-frontend-mobile/`, `taste-imagegen-frontend-web/`, `taste-image-to-code-skill/` | https://github.com/leonxlnx/taste-skill (`skills/*`) | 717446e | MIT (`LICENSE` in each folder) |
| `emil-design-eng/`, `emil-animate/`, `emil-review-animations/`, `emil-find-animation-opportunities/`, `emil-animation-vocabulary/`, `emil-improve-animations/`, `emil-break-ui/` | https://github.com/emilkowalski/skills (`skills/*`) | e8a175d | MIT (`LICENSE` in each folder) |

Vendored on 2026-10-10 without modification, apart from folder names. Impeccable's `scripts/` talk only to `localhost`;
do not run its `npx` updater or live-browser server in CI or production.

## Precedence for SCD work

1. `AGENTS.md` gates and the manifest.
2. SCD visual rules (`config/scd-visual-references.v1.json`, `config/scd-assets.v1.json`).
3. These skills, for craft: hierarchy, typography, spacing, colour systems, motion, polish and critique.
