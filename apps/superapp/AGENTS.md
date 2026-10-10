> [!NOTE]
> This copy lives in `francesco1485/scd-colicoderviese-super-app` under `apps/superapp` and is
> **not** connected to Lovable. The repository rules in the root `AGENTS.md` and
> `SCD_SYSTEM_MANIFEST.json` apply. The Lovable note below is kept for provenance only.

<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- /calendario reads only the allowlisted public Drive JSON mirror server-side (src/lib/calendar-bridge.server.ts, validated by src/lib/calendar-mirror.ts, 5-min cache) and falls back to the bundled snapshot; never fetch the master XLSX, because it is world-writable and unvalidated.
