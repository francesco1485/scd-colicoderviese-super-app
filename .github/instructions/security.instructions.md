---
applyTo: "server.js,lib/**,api/**,platform/**,supabase/**,**/*auth*.js,**/*auth*.ts,**/*security*.js,**/*security*.ts"
---

# SCD security instructions

Security is blocking, not decorative.

Verify:
- authentication source and session trust;
- server-side role/scope authorization;
- RLS consistency where Supabase is involved;
- input validation and output minimization;
- secret handling;
- private document boundaries;
- minor/safeguarding restrictions;
- auditability for privileged actions;
- fail-closed behavior on ambiguous identity, missing source or upstream failure.

Never:
- trust client-selected roles;
- expose account existence through public identity lookup;
- store plaintext permanent passwords/PINs;
- send sensitive access codes into logs;
- add unsupervised adult-minor 1:1 messaging;
- add public talent/psychological ranking of minors;
- bypass authorization or RLS to unblock a test;
- mutate production permissions without explicit human approval.
