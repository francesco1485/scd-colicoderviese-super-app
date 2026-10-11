-- r63_1: staff directory helper + final people read policy (see r63).

create or replace function public.scd_has_active_structure_role(p_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (select 1 from public.scd_structure_roles r where r.person_id = p_person_id and r.active);
$$;
revoke all on function public.scd_has_active_structure_role(uuid) from public, anon;
grant execute on function public.scd_has_active_structure_role(uuid) to authenticated;

alter policy scd_people_select_member on public.scd_people
  using (
    public.scd_has_org_role(organization_id, array['DIRECTION','SECRETARIAT','REGISTRATION']::public.scd_role[])
    or id in (select f.person_id from public.scd_my_family(organization_id) f)
    or (
      public.scd_has_org_role(organization_id, array['MISTER','MANAGER','STAFF','TOURNAMENTS']::public.scd_role[])
      and coalesce(public.scd_is_minor(birth_date), false) = false
      and public.scd_has_active_structure_role(id)
    )
  );
