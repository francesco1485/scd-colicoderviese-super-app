-- r62_1: staff withdraw a call-up (PENDING: not applied yet).
-- Split from r62 because the SQL tool asks for explicit confirmation on any statement containing DELETE.
-- Apply from the Supabase SQL editor after Direzione confirmation. Only team staff (scd_my_team_ids) can withdraw.

create or replace function public.scd_staff_remove_callup(p_organization_id uuid, p_callup_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_match uuid;
begin
  select c.match_id into v_match from public.scd_match_callups c
  where c.id = p_callup_id and c.organization_id = p_organization_id;
  if v_match is null or public.scd_match_team_id(v_match) not in (select public.scd_my_team_ids(p_organization_id)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  delete from public.scd_match_callups where id = p_callup_id;
  return true;
end;
$$;

revoke all on function public.scd_staff_remove_callup(uuid, uuid) from public, anon;
grant execute on function public.scd_staff_remove_callup(uuid, uuid) to authenticated;
