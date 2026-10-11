-- r67_1: Web Push (VAPID) keys are born inside the platform and live only in Supabase Vault.
--   * the callup-push edge function generates the pair on first use and stores it with scd_push_vapid_init;
--   * the private key is readable only by the service role (scd_push_vapid_get);
--   * the app reads only the public key (scd_push_public_key);
--   * the key pair is never written to the repository, to Render or to chat.

create or replace function public.scd_push_vapid_get()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select ds.decrypted_secret::jsonb from vault.decrypted_secrets ds where ds.name = 'scd_vapid_keys' limit 1;
$$;

create or replace function public.scd_push_vapid_init(p_public text, p_private text, p_subject text)
returns text
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_existing jsonb := public.scd_push_vapid_get();
begin
  if v_existing is not null then
    return v_existing->>'publicKey';
  end if;
  if p_public !~ '^[A-Za-z0-9_-]{80,100}$' or p_private !~ '^[A-Za-z0-9_-]{40,50}$' or p_subject !~ '^mailto:' then
    raise exception 'invalid vapid keys' using errcode = '22023';
  end if;
  perform vault.create_secret(
    jsonb_build_object('publicKey', p_public, 'privateKey', p_private, 'subject', p_subject)::text,
    'scd_vapid_keys',
    'Web Push VAPID key pair for SCD call-up notifications (r67_1)');
  return p_public;
end;
$$;

create or replace function public.scd_push_public_key()
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.scd_push_vapid_get()->>'publicKey';
$$;

revoke all on function public.scd_push_vapid_get() from public, anon, authenticated;
revoke all on function public.scd_push_vapid_init(text, text, text) from public, anon, authenticated;
revoke all on function public.scd_push_public_key() from public, anon;
grant execute on function public.scd_push_vapid_get() to service_role;
grant execute on function public.scd_push_vapid_init(text, text, text) to service_role;
grant execute on function public.scd_push_public_key() to authenticated;
