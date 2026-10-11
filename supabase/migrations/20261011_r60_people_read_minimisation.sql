-- r60: people read minimisation (applied on SCD PULSE 2026-10-11 via ALTER POLICY, approved by Direzione: "Si permessi").
-- Before: any active org member could read every person, athlete, team membership and family record.
-- After:
--   * office roles (DIRECTION, SECRETARIAT, REGISTRATION) read everything in their organization;
--   * other members read only adult people holding an active structure role (staff directory);
--   * athletes, team memberships, families, family members and person roles: office roles only.
-- Team-scoped access for mister/dirigenti and own-family access are deferred to r61.
-- Additive form (ALTER POLICY, no DROP) so apply_migration does not require destructive confirmation.

alter policy scd_people_select_member on public.scd_people
  using (
    public.scd_has_org_role(organization_id, array['DIRECTION','SECRETARIAT','REGISTRATION']::public.scd_role[])
    or (
      public.scd_is_org_member(organization_id)
      and coalesce(public.scd_is_minor(birth_date), false) = false
      and exists (
        select 1 from public.scd_structure_roles r
        where r.person_id = scd_people.id and r.active
      )
    )
  );

alter policy scd_athletes_select_member on public.scd_athletes
  using (public.scd_has_org_role(organization_id, array['DIRECTION','SECRETARIAT','REGISTRATION']::public.scd_role[]));

alter policy scd_team_memberships_select_member on public.scd_team_memberships
  using (public.scd_has_org_role(organization_id, array['DIRECTION','SECRETARIAT','REGISTRATION']::public.scd_role[]));

alter policy scd_families_select_member on public.scd_families
  using (public.scd_has_org_role(organization_id, array['DIRECTION','SECRETARIAT','REGISTRATION']::public.scd_role[]));

alter policy scd_family_members_select_member on public.scd_family_members
  using (
    exists (
      select 1 from public.scd_families f
      where f.id = scd_family_members.family_id
        and public.scd_has_org_role(f.organization_id, array['DIRECTION','SECRETARIAT','REGISTRATION']::public.scd_role[])
    )
  );

alter policy scd_person_roles_select_member on public.scd_person_roles
  using (public.scd_has_org_role(organization_id, array['DIRECTION','SECRETARIAT','REGISTRATION']::public.scd_role[]));
