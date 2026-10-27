-- Make the people-photo folders private (owner-only).
-- Design: docs/superpowers/specs/2026-10-27-private-photos-design.md (step 3).
-- Needs 20261027120000_storage_close_open_writes.sql first (owner read rules),
-- and the app + try-on functions that use temporary links.
-- Probes: supabase/tests/private_people_photos_probes.sql.

update storage.buckets set public = false
where id in ('ai-tryon-uploads', 'ai-tryon-results', 'ai-tryon-videos', 'tnb-video-inputs', 'search-images', 'wardrobe');

drop policy if exists "Anyone can view ai-tryon-results" on storage.objects;
drop policy if exists "Anyone can view ai-tryon-uploads" on storage.objects;
drop policy if exists "Anyone can view ai-tryon-videos" on storage.objects;
drop policy if exists "Anyone can view video inputs" on storage.objects;
drop policy if exists "Public read for search-images" on storage.objects;
