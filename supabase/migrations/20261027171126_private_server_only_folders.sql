-- Make the people-photo folders that no app version reads private now
-- (only the server reads them, with the service key):
--   tnb-video-inputs  person photos prepared for the video provider
--   search-images     old photo-search uploads (unused since Aug 2025)
--   wardrobe          old closet cut-outs (no row points at it)
-- The folders the app shows (ai-tryon-uploads/results/videos) follow in
-- 20261027180000 after the owner's phone test and an iPhone build.
-- Owner read rules for tnb-video-inputs and search-images exist since
-- 20261027125651; wardrobe already had owner-only rules.
-- Probes: supabase/tests/server_only_folders_probes.sql.

update storage.buckets set public = false
where id in ('tnb-video-inputs', 'search-images', 'wardrobe');

drop policy if exists "Anyone can view video inputs" on storage.objects;
drop policy if exists "Public read for search-images" on storage.objects;
