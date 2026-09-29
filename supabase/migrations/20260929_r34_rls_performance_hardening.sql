-- R34 — Supabase RLS/performance hardening
-- Non-destructive: indexes + policy optimization only.

create index if not exists scd_athletes_person_idx on public.scd_athletes(person_id);
create index if not exists scd_audit_events_actor_idx on public.scd_audit_events(actor_user_id);
create index if not exists scd_audit_events_org_idx on public.scd_audit_events(organization_id);
create index if not exists scd_categories_season_idx on public.scd_categories(season_id);
create index if not exists scd_documents_event_idx on public.scd_documents(event_id);
create index if not exists scd_documents_org_idx on public.scd_documents(organization_id);
create index if not exists scd_documents_person_idx on public.scd_documents(person_id);
create index if not exists scd_documents_team_idx on public.scd_documents(team_id);
create index if not exists scd_event_scopes_family_idx on public.scd_event_scopes(family_id);
create index if not exists scd_event_scopes_org_idx on public.scd_event_scopes(organization_id);
create index if not exists scd_event_scopes_person_idx on public.scd_event_scopes(person_id);
create index if not exists scd_event_scopes_team_idx on public.scd_event_scopes(team_id);
create index if not exists scd_events_season_idx on public.scd_events(season_id);
create index if not exists scd_families_org_idx on public.scd_families(organization_id);
create index if not exists scd_family_members_person_idx on public.scd_family_members(person_id);
create index if not exists scd_team_memberships_athlete_idx on public.scd_team_memberships(athlete_id);
create index if not exists scd_team_memberships_org_idx on public.scd_team_memberships(organization_id);
create index if not exists scd_teams_category_idx on public.scd_teams(category_id);
create index if not exists scd_teams_season_idx on public.scd_teams(season_id);

drop policy if exists "scd_profiles_select_self" on public.scd_profiles;
create policy "scd_profiles_select_self" on public.scd_profiles
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "scd_profiles_update_self" on public.scd_profiles;
create policy "scd_profiles_update_self" on public.scd_profiles
for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "scd_memberships_select_self" on public.scd_memberships;
create policy "scd_memberships_select_self" on public.scd_memberships
for select to authenticated using (user_id = (select auth.uid()));
