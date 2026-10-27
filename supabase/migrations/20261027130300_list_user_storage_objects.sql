-- STATUS: NOT APPLIED YET. Apply only with the owner's yes, in the release order in
-- docs/superpowers/plans/2026-10-27-private-photos.md (after the phone test / iPhone build).

-- Account deletion: list every stored file of a user, in any folder, so the
-- delete-account function can remove them through the storage API (the
-- database can't delete storage files directly).
-- Design: docs/superpowers/specs/2026-10-27-private-photos-design.md (step 5).
-- Probes: supabase/tests/user_storage_cleanup_probes.sql.
--
-- A file is the user's when their id is one of its folders (covers
-- "<user>/...", "<event>/<user>/...", "tryon/users/<user>/...") or they
-- uploaded it. Files used by default closet items are never listed.

create or replace function public.list_user_storage_objects(target_user_id uuid)
returns table(bucket_id text, name text)
language sql
stable
security definer
set search_path = public, storage
as $$
  select o.bucket_id, o.name
  from storage.objects o
  where target_user_id is not null
    and (target_user_id::text = any(storage.foldername(o.name))
         or o.owner = target_user_id
         or o.owner_id = target_user_id::text)
    and not exists (
      select 1 from public.default_wardrobe_items d
      where d.image_url like '%/' || o.bucket_id || '/' || o.name
         or d.image_bg_removed_url like '%/' || o.bucket_id || '/' || o.name)
$$;

revoke all on function public.list_user_storage_objects(uuid) from public, anon, authenticated;
grant execute on function public.list_user_storage_objects(uuid) to service_role;
