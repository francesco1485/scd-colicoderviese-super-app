-- r63: read minimisation after opening access to all club people (2026-10-11).
-- Found while onboarding 355 logins: any member could read every structure role (staff e-mails and phones)
-- and every FIGC registration. Tightened under the r60 principle approved by Direzione ("Si permessi"):
--   * structure roles: office roles, or the caller's own roles;
--   * FIGC registrations: office roles, or people of the caller's own circle (scd_my_family);
--   * people: office roles; the caller's own circle; staff roles (MISTER/MANAGER/STAFF/TOURNAMENTS) also see the
--     adult staff directory. Families and athletes no longer see the staff directory.
-- Additive form (ALTER POLICY). The staff-directory test uses a SECURITY DEFINER helper (r63_1) so that the
-- tightened structure-roles policy does not hide the directory from staff.

alter policy scd_structure_roles_select_members on public.scd_structure_roles
  using (
    public.scd_has_org_role(organization_id, array['DIRECTION','SECRETARIAT','REGISTRATION']::public.scd_role[])
    or person_id in (select public.scd_my_person_ids(organization_id))
  );

alter policy scd_tesseramenti_select_member on public.scd_tesseramenti
  using (
    public.scd_has_org_role(organization_id, array['DIRECTION','SECRETARIAT','REGISTRATION']::public.scd_role[])
    or person_id in (select f.person_id from public.scd_my_family(organization_id) f)
  );
