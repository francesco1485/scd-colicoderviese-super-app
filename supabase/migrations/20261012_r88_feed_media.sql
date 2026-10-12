-- r88: Foto e video dal telefono per i post del feed. Public bucket `scd-media`, path <org>/feed/<year>/<uuid>.<ext>.
-- Who can upload: whoever can write a post (office, staff, linked athletes and families), never base-only accounts.
-- The app server strips the metadata of JPEG files (GPS position, camera, date) before the upload: a photo of a
-- child must never carry where it was taken. Images only, 8 MB. Additive only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('scd-media', 'scd-media', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create or replace function public.scd_storage_feed_allowed(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_org uuid;
begin
  if split_part(p_name, '/', 2) <> 'feed' then return false; end if;
  begin
    v_org := split_part(p_name, '/', 1)::uuid;
  exception when others then
    return false;
  end;
  return auth.uid() is not null and exists (
    select 1 from public.scd_memberships m
    where m.organization_id = v_org and m.user_id = auth.uid() and m.active and m.role <> 'USER_BASE');
end;
$$;
revoke all on function public.scd_storage_feed_allowed(text) from public, anon;
grant execute on function public.scd_storage_feed_allowed(text) to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'scd_media_feed_insert') then
    create policy scd_media_feed_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'scd-media' and public.scd_storage_feed_allowed(name));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'scd_media_feed_select') then
    create policy scd_media_feed_select on storage.objects for select to anon, authenticated
      using (bucket_id = 'scd-media');
  end if;
end $$;
