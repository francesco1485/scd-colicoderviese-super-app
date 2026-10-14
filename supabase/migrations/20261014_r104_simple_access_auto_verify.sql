-- r104: simple access with automatic checks (Direzione 2026-10-14 16:40, UD-117). STAGED: written, NOT applied.
-- Apply only after the Direzione's explicit OK. Additive only; the live r85 function keeps working untouched.
--
-- Decision recorded:
--   * one way in: register once with password and phone (Supabase signUp, one confirmation e-mail), then always
--     e-mail + password (or Google / Apple / Facebook when enabled); forgotten password = e-mail code;
--   * everyone enters the open area at once (r85 USER_BASE);
--   * "Chi sei nel club?" is stored on the request (declared jsonb). Right after the e-mail is confirmed the database
--     checks the registry by itself:
--       - GENITORE: the confirmed e-mail is the e-mail of a guardian already in scd_people, and a declared child
--         (first + last name, birth year when given) is a FIGLIO of that same family -> FAMILY opens immediately,
--         identity link AUTO_VERIFIED / EMAIL_EXACT. Name-only matches never open anything (minors' protection);
--       - ATLETA (adults only): same e-mail and same birth date as a registry person -> ATHLETE opens immediately;
--         14-17 year olds wait for the family's consent in the office queue;
--       - MISTER / DIRIGENTE / STAFF: never automatic. A notification is queued for the Direttore Sportivo (from the
--         organigram), the request stays PENDING, the Presidente authorizes the sections (r100 grants page);
--       - everything not verified stays in the open area (same as a fan) and in the office queue.
--   * every registration and its outcome is queued for the daily summary to the club mailbox.
-- The outbox only QUEUES messages: nothing is e-mailed until the Direzione switches sending on (comm hub r95).

-- 1. Declaration and automatic outcome on the request.
alter table public.scd_access_requests add column if not exists declared jsonb;
alter table public.scd_access_requests add column if not exists auto_result text;
alter table public.scd_access_requests add column if not exists auto_checked_at timestamptz;

-- 2. Outbox: notifications to people with a role, and the daily summary to the club mailbox.
create table if not exists public.scd_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  kind text not null check (kind in ('ROLE_DECLARED','REGISTRATION','AUTO_VERIFIED','DIGEST_ITEM')),
  recipient_email text,
  recipient_label text,
  subject text not null check (length(subject) between 3 and 200),
  body text not null check (length(body) <= 4000),
  ref_request_id uuid references public.scd_access_requests(id),
  digest boolean not null default false,
  status text not null default 'QUEUED' check (status in ('QUEUED','SENT','SKIPPED','FAILED')),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists scd_notification_outbox_queue_idx on public.scd_notification_outbox(status, created_at);
alter table public.scd_notification_outbox enable row level security;
drop policy if exists scd_notification_outbox_office_read on public.scd_notification_outbox;
create policy scd_notification_outbox_office_read on public.scd_notification_outbox for select to authenticated
  using (public.scd_has_org_role(organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[]));
revoke insert, update, delete on public.scd_notification_outbox from anon, authenticated;

-- 3. Clean declaration (known kinds only, children only for parents, max 5, trimmed).
create or replace function public.scd_clean_declaration(p jsonb)
returns jsonb
language sql
immutable
set search_path to 'public'
as $$
  with k as (
    select coalesce(jsonb_agg(distinct x) filter (where x in ('TIFOSO','SOCIO','GENITORE','ATLETA','MISTER','DIRIGENTE','STAFF','VOLONTARIO','SPONSOR')), '[]'::jsonb) as kinds
    from jsonb_array_elements_text(case when jsonb_typeof(p -> 'kinds') = 'array' then p -> 'kinds' else '[]'::jsonb end) as x
  ), c as (
    select coalesce(jsonb_agg(jsonb_build_object(
             'firstName', left(btrim(e ->> 'firstName'), 80),
             'lastName', left(btrim(e ->> 'lastName'), 80),
             'birthYear', case when (e ->> 'birthYear') ~ '^\d{4}$' then e ->> 'birthYear' else '' end)), '[]'::jsonb) as children
    from (select e from jsonb_array_elements(case when jsonb_typeof(p -> 'children') = 'array' then p -> 'children' else '[]'::jsonb end) as e limit 5) s
    where coalesce(btrim(e ->> 'firstName'), '') <> '' and coalesce(btrim(e ->> 'lastName'), '') <> ''
  )
  select jsonb_build_object(
    'kinds', case when jsonb_array_length(k.kinds) = 0 then '["TIFOSO"]'::jsonb else k.kinds end,
    'children', case when k.kinds ? 'GENITORE' then c.children else '[]'::jsonb end,
    'note', left(btrim(coalesce(p ->> 'note', '')), 200),
    'tesserato', case when p ->> 'tesserato' in ('SI','NO') then p ->> 'tesserato' else 'NON_SO' end)
  from k, c;
$$;

-- 4. Automatic check of one confirmed e-mail. Internal: called by the trigger and by scd_request_access_v2.
create or replace function public.scd_auto_verify_email(p_email text)
returns text
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_user uuid;
  r public.scd_access_requests%rowtype;
  v_kinds jsonb;
  v_child jsonb;
  v_guardian uuid;
  v_family uuid;
  v_matched text[] := '{}';
  v_unmatched text[] := '{}';
  v_person uuid;
  v_cur public.scd_role;
  v_grant public.scd_role;
  v_result text := 'OPEN_AREA';
  v_note text;
  v_ds record;
  v_sent_ds boolean := false;
  rank text[] := array['USER_BASE','ATHLETE','FAMILY','STAFF','MANAGER','MISTER','REGISTRATION','TOURNAMENTS','SECRETARIAT','DIRECTION'];
begin
  select id into v_user from auth.users where lower(email) = v_email and email_confirmed_at is not null;
  if v_user is null then return 'NOT_CONFIRMED'; end if;
  select * into r from public.scd_access_requests
    where lower(email) = v_email and status = 'PENDING' and auto_checked_at is null
    order by created_at desc limit 1 for update;
  if r.id is null then return 'NO_REQUEST'; end if;
  v_kinds := coalesce(r.declared -> 'kinds', '["TIFOSO"]'::jsonb);

  -- Parent: confirmed e-mail of a registered guardian + declared child in the same family.
  if v_kinds ? 'GENITORE' then
    for v_child in select * from jsonb_array_elements(coalesce(r.declared -> 'children', '[]'::jsonb)) loop
      select g.person_id, g.family_id into v_guardian, v_family
      from public.scd_family_members g
      join public.scd_people gp on gp.id = g.person_id and gp.organization_id = r.organization_id and lower(btrim(gp.email)) = v_email
      join public.scd_family_members k on k.family_id = g.family_id and not k.is_guardian and k.relationship = 'FIGLIO'
      join public.scd_people kp on kp.id = k.person_id
      where (g.is_guardian or g.relationship in ('GENITORE','MADRE','PADRE','REFERENTE'))
        and lower(btrim(kp.first_name)) = lower(v_child ->> 'firstName')
        and lower(btrim(kp.last_name)) = lower(v_child ->> 'lastName')
        and (coalesce(v_child ->> 'birthYear', '') = '' or extract(year from kp.birth_date)::text = v_child ->> 'birthYear')
      limit 1;
      if v_guardian is not null then
        v_matched := v_matched || (initcap(v_child ->> 'firstName') || ' ' || left(upper(v_child ->> 'lastName'), 1) || '.');
        v_person := v_guardian;
      else
        v_unmatched := v_unmatched || (initcap(v_child ->> 'firstName') || ' ' || left(upper(v_child ->> 'lastName'), 1) || '.');
      end if;
      v_guardian := null;
    end loop;
    if array_length(v_matched, 1) > 0 then
      v_grant := 'FAMILY';
      v_result := 'FAMILY_VERIFIED';
    end if;
  end if;

  -- Adult athlete: same e-mail and same birth date as a registry person.
  if v_grant is null and v_kinds ? 'ATLETA' and r.birth_date <= current_date - interval '18 years' then
    select p.id into v_person from public.scd_people p
    where p.organization_id = r.organization_id and lower(btrim(p.email)) = v_email and p.birth_date = r.birth_date
    limit 1;
    if v_person is not null then
      v_grant := 'ATHLETE';
      v_result := 'ATHLETE_VERIFIED';
    end if;
  end if;

  if v_grant is not null then
    select role into v_cur from public.scd_memberships where organization_id = r.organization_id and user_id = v_user;
    if v_cur is null then
      insert into public.scd_memberships (organization_id, user_id, role, scope, active) values (r.organization_id, v_user, v_grant, '{}', true);
    elsif v_cur::text = 'USER_BASE' or array_position(rank, v_cur::text) < array_position(rank, v_grant::text) then
      -- Only upgrades from the open area; a suspended or higher membership is never touched.
      update public.scd_memberships set role = v_grant, updated_at = now()
        where organization_id = r.organization_id and user_id = v_user and active;
    end if;
    insert into public.scd_identity_links (organization_id, user_id, person_id, link_state, match_method, confidence, verified_at)
    values (r.organization_id, v_user, v_person, 'AUTO_VERIFIED', 'EMAIL_EXACT', 90, now())
    on conflict (organization_id, user_id, person_id) do nothing;
  end if;

  v_note := 'Verifica automatica: ' || case v_result
      when 'FAMILY_VERIFIED' then 'genitore riconosciuto (e-mail in anagrafica), figli: ' || array_to_string(v_matched, ', ')
      when 'ATHLETE_VERIFIED' then 'atleta maggiorenne riconosciuto (e-mail e data di nascita)'
      else 'nessun riscontro, resta nell''area aperta' end
    || case when array_length(v_unmatched, 1) > 0 then '; da verificare: ' || array_to_string(v_unmatched, ', ') else '' end;

  -- Officials: never automatic; the request stays in the queue.
  if v_kinds ?| array['MISTER','DIRIGENTE','STAFF'] then
    for v_ds in
      select sr.contact_email, sr.role_label from public.scd_structure_roles sr
      where sr.organization_id = r.organization_id and sr.active and coalesce(sr.contact_email, '') <> ''
        and sr.role_label ilike '%direttore sportivo%'
    loop
      insert into public.scd_notification_outbox (organization_id, kind, recipient_email, recipient_label, subject, body, ref_request_id)
      values (r.organization_id, 'ROLE_DECLARED', v_ds.contact_email, v_ds.role_label,
              'Nuova registrazione da verificare: ' || initcap(r.first_name) || ' ' || initcap(r.last_name),
              initcap(r.first_name) || ' ' || initcap(r.last_name) || ' si è registrato dichiarando: '
                || (select string_agg(x, ', ') from jsonb_array_elements_text(v_kinds) x)
                || coalesce('. Nota: ' || nullif(r.declared ->> 'note', ''), '')
                || '. Verifica nel gestionale (Segreteria › Persone) e proponi al Presidente le sezioni da abilitare.',
              r.id);
      v_sent_ds := true;
    end loop;
    if not v_sent_ds then
      insert into public.scd_notification_outbox (organization_id, kind, recipient_email, recipient_label, subject, body, ref_request_id)
      values (r.organization_id, 'ROLE_DECLARED', 'sportclubcolico@gmail.com', 'Direzione (Direttore Sportivo non indicato in organigramma)',
              'Nuova registrazione da verificare: ' || initcap(r.first_name) || ' ' || initcap(r.last_name),
              'Dichiarato: ' || (select string_agg(x, ', ') from jsonb_array_elements_text(v_kinds) x) || '. Verifica nel gestionale.', r.id);
    end if;
    v_note := v_note || '; incarico dichiarato: avvisato il Direttore Sportivo';
    update public.scd_access_requests set auto_result = v_result, auto_checked_at = now(), review_note = v_note,
      person_id = coalesce(person_id, v_person) where id = r.id;
  elsif v_grant is not null and array_length(v_unmatched, 1) is null then
    update public.scd_access_requests set status = 'APPROVED', granted_role = v_grant, person_id = v_person,
      auto_result = v_result, auto_checked_at = now(), review_note = v_note, reviewed_at = now() where id = r.id;
  else
    update public.scd_access_requests set auto_result = v_result, auto_checked_at = now(), review_note = v_note,
      person_id = coalesce(person_id, v_person) where id = r.id;
  end if;

  -- Daily summary line for the club mailbox (names of children shortened).
  insert into public.scd_notification_outbox (organization_id, kind, recipient_email, recipient_label, subject, body, ref_request_id, digest)
  values (r.organization_id, case when v_grant is null then 'REGISTRATION' else 'AUTO_VERIFIED' end, 'sportclubcolico@gmail.com', 'Riepilogo giornaliero',
          'Registrazione: ' || initcap(r.first_name) || ' ' || initcap(r.last_name), v_note, r.id, true);
  return v_result;
end;
$$;
revoke all on function public.scd_auto_verify_email(text) from public, anon, authenticated;

-- 5. Registration with declaration: the live r85 rules, then the declaration, then the check (if already confirmed).
create or replace function public.scd_request_access_v2(
  p_first_name text, p_last_name text, p_birth_date date, p_email text, p_phone text, p_consent boolean, p_declared jsonb
)
returns text
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_out text;
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  v_out := public.scd_request_access(p_first_name, p_last_name, p_birth_date, p_email, p_phone, p_consent);
  if v_out <> 'RECEIVED' then return v_out; end if;
  update public.scd_access_requests set declared = public.scd_clean_declaration(coalesce(p_declared, '{}'::jsonb))
    where lower(email) = v_email and status = 'PENDING' and declared is null;
  perform public.scd_auto_verify_email(v_email);
  return 'RECEIVED';
end;
$$;
revoke all on function public.scd_request_access_v2(text, text, date, text, text, boolean, jsonb) from public;
grant execute on function public.scd_request_access_v2(text, text, date, text, text, boolean, jsonb) to anon, authenticated;

-- 6. When an address is confirmed (first click on the registration link), run the check.
create or replace function public.scd_on_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    perform public.scd_auto_verify_email(new.email);
  end if;
  return new;
exception when others then
  -- Never block a sign-in because of the automatic check: the office queue still has the request.
  return new;
end;
$$;
drop trigger if exists scd_on_email_confirmed on auth.users;
create trigger scd_on_email_confirmed after update of email_confirmed_at on auth.users
  for each row execute function public.scd_on_email_confirmed();
