---
applyTo: "**/*.html,**/*.css,**/*.js,**/*.jsx,**/*.ts,**/*.tsx"
---

# SCD frontend instructions

Follow the repository-wide SCD instructions and `SCD_SYSTEM_MANIFEST.json`.

For UI changes:
- preserve one responsive product across mobile, tablet and desktop;
- do not create generic SaaS card walls;
- do not invent sports, sponsor, event, identity or operational data;
- represent missing or unverified data explicitly and fail closed;
- preserve semantic HTML, keyboard navigation, visible focus, sufficient contrast and meaningful loading/empty/error/offline states;
- use progressive enhancement and minimize bundle/runtime cost;
- never implement authorization only in the client;
- preserve the canonical EVENT_ID / PERSON_ID / TEAM_ID relationships where displayed;
- keep public and private experience goals distinct: public = emotion/media/live/discovery/community; private = speed/clarity/priority/action/control;
- add or update tests when behavior changes;
- report both mobile and desktop verification for release-candidate UI work.
