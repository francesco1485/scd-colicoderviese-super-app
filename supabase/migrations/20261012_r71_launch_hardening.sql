-- r71: launch hardening (audit 2026-10-12).
--   * scd_request_access: a second request for an e-mail that already has a PENDING request no longer overwrites it
--     (nobody can change someone else's pending name, birth date or phone by knowing the e-mail); same answer either way;
--   * anon keeps no table privileges at all (defence in depth: every policy already targets authenticated only).
-- Additive / tightening only.

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
  return 'RECEIVED';
end;
$$;

do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke all on table public.%I from anon', r.tablename);
  end loop;
  for r in select viewname from pg_views where schemaname = 'public' loop
    execute format('revoke all on table public.%I from anon', r.viewname);
  end loop;
end $$;
