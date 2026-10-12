-- r85: one link for everyone (Direzione 2026-10-12: "voglio dare a tutti lo stesso link e chiedere di iscriversi, tutti
-- vedranno la stessa cosa, solo il calendario e le attività, poi io dalla direzione autorizzerò cosa possono fare").
--   * scd_request_access: a valid request (14+ years, consent) also creates the login when the e-mail has none; the
--     existing trigger on auth.users (scd_handle_new_user) gives it an active USER_BASE membership, no person link,
--     no area. The person enters right away from "Accedi" (magic link) and sees calendar and activities only;
--   * the request stays PENDING: it is the Direzione / Segreteria queue to enable more (role, child link, areas) or
--     to suspend. An existing login is never changed here (a suspended account stays suspended);
--   * defence in depth: documents and external references are no longer readable by a USER_BASE-only membership
--     (restrictive policies, additive).
-- Same answer in every case (no e-mail enumeration). Additive / tightening only.

create or replace function public.scd_request_access(
  p_first_name text, p_last_name text, p_birth_date date, p_email text, p_phone text, p_consent boolean
)
returns text
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_org uuid;
  v_user uuid;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_phone text := regexp_replace(trim(coalesce(p_phone, '')), '[^0-9+ ]', '', 'g');
  v_first text := regexp_replace(trim(coalesce(p_first_name, '')), '\s+', ' ', 'g');
  v_last text := regexp_replace(trim(coalesce(p_last_name, '')), '\s+', ' ', 'g');
begin
  if coalesce(p_consent, false) = false then return 'CONSENT'; end if;
  if char_length(v_first) not between 2 and 80 or char_length(v_last) not between 2 and 80
     or v_email !~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' or char_length(v_email) > 120
     or v_phone !~ '^\+?[0-9 ]{6,20}$'
     or p_birth_date is null or p_birth_date < date '1920-01-01' or p_birth_date > current_date then
    return 'INVALID';
  end if;
  if p_birth_date > current_date - interval '14 years' then return 'MINOR_UNDER_14'; end if;
  if (select count(*) from public.scd_access_requests where created_at > now() - interval '1 hour') >= 120 then return 'BUSY'; end if;

  select id into v_org from public.scd_organizations order by created_at limit 1;
  insert into public.scd_access_requests (organization_id, first_name, last_name, birth_date, email, phone, is_minor, consent_privacy_at)
  values (v_org, v_first, v_last, p_birth_date, v_email, v_phone, p_birth_date > current_date - interval '18 years', now())
  on conflict (organization_id, lower(email)) where status = 'PENDING'
  do nothing;

  -- Base login: only when the e-mail has none. Confirmed e-mail = whoever opens the magic link owns the mailbox.
  select id into v_user from auth.users where lower(email) = v_email;
  if v_user is null then
    v_user := gen_random_uuid();
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
    values (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_email, '', now(),
            '{"provider":"email","providers":["email"]}', jsonb_build_object('first_name', v_first, 'last_name', v_last), now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
    values (gen_random_uuid(), v_user, v_user::text, jsonb_build_object('sub', v_user::text, 'email', v_email, 'email_verified', true), 'email', now(), now());
  end if;
  return 'RECEIVED';
end;
$$;

-- True when the caller's only active membership in the organisation is USER_BASE (calendar and activities only).
create or replace function public.scd_is_base_only(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.scd_memberships m
    where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.active and m.role = 'USER_BASE'
  );
$$;
revoke all on function public.scd_is_base_only(uuid) from public, anon;
grant execute on function public.scd_is_base_only(uuid) to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'scd_documents' and policyname = 'scd_documents_not_base') then
    create policy "scd_documents_not_base" on public.scd_documents as restrictive
      for select to authenticated using (not public.scd_is_base_only(organization_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'scd_external_refs' and policyname = 'scd_external_refs_not_base') then
    create policy "scd_external_refs_not_base" on public.scd_external_refs as restrictive
      for select to authenticated using (not public.scd_is_base_only(organization_id));
  end if;
end $$;

comment on function public.scd_request_access(text, text, date, text, text, boolean) is
  'Public self-registration (r85): stores the request for Direzione and creates a USER_BASE login when the e-mail has none.';
