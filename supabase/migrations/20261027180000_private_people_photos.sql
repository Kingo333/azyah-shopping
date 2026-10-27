-- STATUS: NOT APPLIED YET. Apply only with the owner's yes, in the release order in
-- docs/superpowers/plans/2026-10-27-private-photos.md (after the phone test / iPhone build).

-- Make the people-photo folders the app shows private (owner-only).
-- Design: docs/superpowers/specs/2026-10-27-private-photos-design.md (step 3).
-- Needs 20261027125651_storage_close_open_writes.sql first (owner read rules),
-- the app + try-on functions that use temporary links (live 2026-10-27), and
-- an iPhone build with that app code (installed builds bundle their code).
-- The server-only folders were locked earlier in 20261027171126.
-- Probes: supabase/tests/private_people_photos_probes.sql.

update storage.buckets set public = false
where id in ('ai-tryon-uploads', 'ai-tryon-results', 'ai-tryon-videos');

drop policy if exists "Anyone can view ai-tryon-results" on storage.objects;
drop policy if exists "Anyone can view ai-tryon-uploads" on storage.objects;
drop policy if exists "Anyone can view ai-tryon-videos" on storage.objects;
