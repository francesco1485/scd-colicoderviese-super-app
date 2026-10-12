-- r76 (UD-076): new assignable positions. Assigning them stays with Direzione/Segreteria; 'tesoreria' is an office position (Direzione only).
-- Shared rule check. Raises 42501 when the caller may not act; returns the caller's own role.
create or replace function public.scd_access_admin_guard(
  p_organization_id uuid, p_target_user uuid, p_new_role public.scd_role, p_new_positions text[]
)
returns public.scd_role
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_actor public.scd_role;
  v_target public.scd_role;
  office_roles text[] := array['DIRECTION','SECRETARIAT','REGISTRATION','TOURNAMENTS'];
  office_pos text[] := array['direzione','presidente','direttore-generale','dirigenza','segreteria','tesoreria'];
  assignable text[] := array['direzione','presidente','direttore-generale','dirigenza','responsabile-attivita-base',
    'coordinatore-attivita-sportiva','dirigente-annata','mister','responsabile-trasporti','autista','responsabile-club-house',
    'addetto-biglietteria','responsabile-magazzino','responsabile-campi','segreteria','partner',
    'tesoreria','segreteria-presenza','segreteria-remoto','responsabile-tornei','responsabile-struttura','responsabile-struttura-colico',
    'responsabile-struttura-dervio','responsabile-lavanderia','collaboratore-lavanderia-pulizia','responsabile-infermeria','collaboratore-magazzino',
    'dirigente-collaboratore'];
  p text;
begin
  select role into v_actor from public.scd_memberships
  where organization_id = p_organization_id and user_id = (select auth.uid()) and active;
  if v_actor is null or v_actor not in ('DIRECTION','SECRETARIAT') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_target_user is not null and p_target_user = (select auth.uid()) then
    raise exception 'cannot edit own access' using errcode = '42501';
  end if;
  if p_target_user is not null then
    select role into v_target from public.scd_memberships where organization_id = p_organization_id and user_id = p_target_user;
    if v_actor <> 'DIRECTION' and v_target::text = any(office_roles) then
      raise exception 'office account: Direzione only' using errcode = '42501';
    end if;
  end if;
  if p_new_role is not null and v_actor <> 'DIRECTION' and p_new_role::text = any(office_roles) then
    raise exception 'office role: Direzione only' using errcode = '42501';
  end if;
  foreach p in array coalesce(p_new_positions, '{}') loop
    if not (p = any(assignable)) then raise exception 'unknown position %', p using errcode = '22023'; end if;
    if v_actor <> 'DIRECTION' and p = any(office_pos) then
      raise exception 'office position: Direzione only' using errcode = '42501';
    end if;
  end loop;
  return v_actor;
end;
$$;
