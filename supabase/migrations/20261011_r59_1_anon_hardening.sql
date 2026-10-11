-- R59.1 · Defence in depth (APPLIED to ndevtxxijbcnskgysdit on 2026-10-11).
-- Anonymous visitors get no privilege on the people tables and cannot call the "mark left"
-- function. RLS and the in-function role check already denied them; this removes the default grants.
begin;
revoke all on public.scd_structure_roles, public.scd_person_events, public.scd_person_consents from anon;
revoke all on public.scd_v_people_active, public.scd_v_structure_active from anon;
revoke execute on function public.scd_person_mark_left(uuid, date, text, text, text, text) from public, anon;
grant execute on function public.scd_person_mark_left(uuid, date, text, text, text, text) to authenticated;
commit;
