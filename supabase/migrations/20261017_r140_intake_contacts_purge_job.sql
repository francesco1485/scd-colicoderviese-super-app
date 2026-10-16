-- r140: daily job that deletes the expired contacts of external requests (r139 scd_request_contacts) (2026-10-16,
-- chat PC range r130-r149, next after r139).
-- STAGED: NOT APPLIED. Apply only after Francesco writes "applica r140". Never apply from an agent.
-- Target: SCD PULSE (ndevtxxijbcnskgysdit). Never on dfnwzwutvnwiitiffwvr.
-- Requires: r139 (public.scd_request_contacts, public.scd_request_contacts_purge()) live. r139 was applied on SCD PULSE
-- 16/10/2026 17:53 (it has no row in supabase_migrations.schema_migrations). A guard below stops the migration when the
-- function is missing or pg_cron is not available on the server.
--
-- Live state read before writing this file (read-only, 16/10/2026 evening, VERIFIED):
--   * pg_available_extensions: pg_cron 1.6.4 available, NOT installed; no schema "cron", so no scheduled job exists.
--   * installed: plpgsql, pg_stat_statements, uuid-ossp, pgcrypto, supabase_vault. Database TimeZone = UTC.
--   * scd_request_contacts_purge(): SECURITY DEFINER, owner postgres, search_path public, returns the number of
--     deleted contacts (each logged CONTATTI_CANCELLATI in scd_request_events); EXECUTE only for postgres and
--     service_role (acl {postgres=X/postgres,service_role=X/postgres}); 0 rows in scd_request_contacts.
--
-- Why (Francesco, DG, 16/10/2026 ~19:20, VERIFIED): to the question «Per quanto teniamo i recapiti di chi scrive
-- dall'esterno?» he answered «12 mesi»: 12 months from receipt, 6 months after RIFIUTATA/ANNULLATA, 12 months after
-- CHIUSA. These are the periods already coded in r139 (scd_request_ingest: purge_after = now() + 12 months;
-- scd_intake_decide: RIFIUTATA/ANNULLATA -> least(purge_after, now() + 6 months), CHIUSA -> now() + 12 months),
-- unchanged here. r139 deletes nothing by itself: this job calls the purge every day.
--
-- What it does (and nothing else):
--   1. create extension pg_cron (Supabase installs it in pg_catalog; its objects live in schema cron).
--   2. one daily job 'scd_intake_contacts_purge' at 01:17 UTC = 03:17 Europe/Rome in summer time (CEST), 02:17 in
--      winter time (CET); pg_cron reads the schedule in UTC (cron.timezone default GMT). Idempotent: a job with the
--      same name is unscheduled first. The command is only `select public.scd_request_contacts_purge();`.
--   3. the job runs as the user that schedules it (cron.job.username = current_user, postgres when applied with
--      apply_migration), which already has EXECUTE on the function. No new grants: anon and authenticated get nothing,
--      the function ACL and the r139 tables are not touched.
-- Check after applying (read-only):
--   select jobname, schedule, command, username, active from cron.job where jobname = 'scd_intake_contacts_purge';
--   select status, return_message, start_time from cron.job_run_details
--     where jobid = (select jobid from cron.job where jobname = 'scd_intake_contacts_purge') order by start_time desc limit 5;
--
-- Rollback (only on Francesco's explicit order; contacts are then never deleted automatically):
--   select cron.unschedule(jobid) from cron.job where jobname = 'scd_intake_contacts_purge';
--   (drop extension pg_cron; only if no other job exists: select count(*) from cron.job;)

begin;

do $$
begin
  if to_regprocedure('public.scd_request_contacts_purge()') is null then
    raise exception 'r140: public.scd_request_contacts_purge() missing (apply r139 first)';
  end if;
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise exception 'r140: pg_cron not available on this server';
  end if;
end;
$$;

create extension if not exists pg_cron with schema pg_catalog;

do $$
declare
  v_job record;
begin
  for v_job in select jobid from cron.job where jobname = 'scd_intake_contacts_purge' loop
    perform cron.unschedule(v_job.jobid);
  end loop;
  perform cron.schedule('scd_intake_contacts_purge', '17 1 * * *', 'select public.scd_request_contacts_purge();');
  if not has_function_privilege(current_user, 'public.scd_request_contacts_purge()', 'execute') then
    raise exception 'r140: % cannot execute public.scd_request_contacts_purge()', current_user;
  end if;
  if (select count(*) from cron.job where jobname = 'scd_intake_contacts_purge') <> 1 then
    raise exception 'r140: job scd_intake_contacts_purge not scheduled exactly once';
  end if;
end;
$$;

commit;
