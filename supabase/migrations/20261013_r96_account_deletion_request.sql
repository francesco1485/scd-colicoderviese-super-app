-- r96: Account deletion requests (Google Play account-deletion policy, Apple 5.1.1(v)) — 2026-10-13.
-- No new table: a request becomes an item of the existing work queue scd_proposals (r79, /gestionale/coda),
-- machine M2 (Tesserati e famiglia), area 'segreteria', kind 'RICHIESTA', source 'MANUAL'.
-- The app NEVER deletes anything from the client: the Secretariat verifies the person, deletes the account,
-- follows, posts, game data and avatar, keeps what the law requires (FIGC registration records, accounting
-- documents, consent history) and records the decision in the queue (accept / needs_info / reject, all logged).
--
-- Two entry points, one function:
--   * signed in (auth.uid() not null): the request is tied to the user id; the e-mail comes from auth.users;
--   * public web page /elimina-account (anon): name + e-mail typed by the person; a global hourly limit and a
--     per-e-mail de-duplication protect the queue. The anon answer is always RECEIVED for an open duplicate, so the
--     page never reveals whether an e-mail already has a request.
-- Privacy: stored are only name, e-mail (to identify the account), channel and an optional short note
-- (max 300 characters). No documents, no health data, no fiscal codes.

create or replace function public.scd_account_deletion_request(
  p_name text default null, p_email text default null, p_note text default null
)
returns text
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_email text;
  v_name text := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_note text := nullif(left(regexp_replace(trim(coalesce(p_note, '')), '\s+', ' ', 'g'), 300), '');
  v_channel text;
  v_label text;
  v_id uuid;
begin
  select id into v_org from public.scd_organizations order by created_at limit 1;
  if v_org is null then return 'ERROR'; end if;

  if v_uid is not null then
    select lower(email) into v_email from auth.users where id = v_uid;
    v_channel := 'app';
    if exists (select 1 from public.scd_proposals q
               where q.organization_id = v_org and q.suggested->>'action' = 'account_deletion'
                 and q.target_ref = v_uid::text
                 and q.status in ('NEW','IN_PROGRESS','NEEDS_INFO','SNOOZED')) then
      return 'ALREADY';
    end if;
  else
    v_email := lower(trim(coalesce(p_email, '')));
    v_channel := 'web';
    if char_length(v_name) not between 2 and 120
       or v_email !~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' or char_length(v_email) > 160 then
      return 'INVALID';
    end if;
    if (select count(*) from public.scd_proposals q
        where q.suggested->>'action' = 'account_deletion' and q.suggested->>'channel' = 'web'
          and q.created_at > now() - interval '1 hour') >= 30 then
      return 'BUSY';
    end if;
    if exists (select 1 from public.scd_proposals q
               where q.organization_id = v_org and q.suggested->>'action' = 'account_deletion'
                 and lower(q.suggested->>'email') = v_email
                 and q.status in ('NEW','IN_PROGRESS','NEEDS_INFO','SNOOZED')) then
      return 'RECEIVED';
    end if;
  end if;

  v_label := left(concat_ws(' · ', nullif(v_name, ''), nullif(v_email, '')), 200);
  insert into public.scd_proposals (organization_id, machine, area, kind, title, reason, sensitivity, source_kind,
    source_ref, source_at, target_ref, target_label, suggested, due_at)
  values (v_org, 'M2', 'segreteria', 'RICHIESTA',
    case when v_channel = 'app' then 'Eliminazione account (richiesta dall''app)'
         else 'Eliminazione account (richiesta dal sito)' end,
    v_note, 'INTERNO', 'MANUAL',
    'account-deletion:' || v_channel || ':' || coalesce(v_uid::text, md5(v_email)) || ':'
      || to_char(clock_timestamp() at time zone 'UTC', 'YYYYMMDD"T"HH24MISSMS'),
    now(),
    v_uid::text,
    nullif(v_label, ''),
    jsonb_build_object('action', 'account_deletion', 'channel', v_channel, 'email', v_email),
    now() + interval '7 days')
  returning id into v_id;
  insert into public.scd_proposal_events (proposal_id, actor, action, note)
  values (v_id, v_uid, 'CREATED', 'Richiesta di eliminazione account (' || v_channel || ')');
  return 'RECEIVED';
end;
$$;

revoke all on function public.scd_account_deletion_request(text, text, text) from public;
grant execute on function public.scd_account_deletion_request(text, text, text) to anon, authenticated;
