-- r105 — Sign-in with phone + password (Direzione 14/10/2026, UD-120).
-- The person may type the phone given at registration instead of the e-mail. The server asks this function for the
-- e-mail of the account, passing the phone AND the password: the e-mail is returned only when exactly one account has
-- that phone and that password, so a phone number alone never reveals an address (no enumeration). The server then
-- signs in with e-mail + password through Supabase Auth as usual; nothing else changes.
-- Rollback: drop function public.scd_login_email(text, text); drop function public.scd_phone_digits(text);

create or replace function public.scd_phone_digits(p text)
returns text
language sql
immutable
set search_path to ''
as $$
  with s as (select regexp_replace(coalesce(p, ''), '[^0-9+]', '', 'g') as v),
       t as (select case when v like '+%' then substr(v, 2) else v end as v from s),
       u as (select case
                      when v like '0039%' then substr(v, 5)
                      when v like '39%' and length(v) >= 11 then substr(v, 3)
                      else v end as v
             from t)
  select case when v ~ '^[0-9]{6,13}$' then v else null end from u;
$$;

create or replace function public.scd_login_email(p_phone text, p_password text)
returns text
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_phone text := public.scd_phone_digits(p_phone);
  v_emails text[];
begin
  if v_phone is null or coalesce(p_password, '') = '' or length(p_password) > 200 then
    return null;
  end if;
  select array_agg(u.email)
    into v_emails
  from auth.users u
  where u.deleted_at is null
    and u.email is not null
    and u.encrypted_password is not null
    and u.encrypted_password <> ''
    and public.scd_phone_digits(u.raw_user_meta_data ->> 'phone') = v_phone
    and u.encrypted_password = extensions.crypt(p_password, u.encrypted_password);
  if v_emails is null or array_length(v_emails, 1) <> 1 then
    return null;
  end if;
  return lower(v_emails[1]);
end;
$$;

revoke all on function public.scd_login_email(text, text) from public;
grant execute on function public.scd_login_email(text, text) to anon, authenticated;
revoke all on function public.scd_phone_digits(text) from public;
grant execute on function public.scd_phone_digits(text) to anon, authenticated;
