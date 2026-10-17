# Supabase behaviour tests (PGlite)

Each `rNNN_*.pglite.mjs` file applies the real migration to an in-memory Postgres (PGlite) and checks its behaviour.
No remote database is touched. PGlite is not a dependency of the app: install it once in a throwaway folder and point
`PGLITE_DIR` at it. Run from the repository root:

```sh
npm install --prefix /tmp/scd-pglite @electric-sql/pglite@0.5.10
PGLITE_DIR=/tmp/scd-pglite node supabase/tests/r138_position_catalog.pglite.mjs
PGLITE_DIR=/tmp/scd-pglite node supabase/tests/r114_transport_ack.pglite.mjs
for t in supabase/tests/*.pglite.mjs; do PGLITE_DIR=/tmp/scd-pglite node "$t" || echo "FAIL $t"; done
```

Exit code 0 = every assertion passed. Staged migrations are applied to SCD PULSE only after Francesco writes
"applica rNNN"; never on project dfnwzwutvnwiitiffwvr.
