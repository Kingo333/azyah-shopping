-- Close open storage writes and add owner-only read rules.
-- Design: docs/superpowers/specs/2026-10-27-private-photos-design.md (step 1).
-- Probes: supabase/tests/storage_write_probes.sql. Rollback: supabase/rollbacks/.
--
-- Server functions write to these folders with the service key, which skips
-- these rules, so removing the "anyone can write" rules changes nothing for them.

-- 1. Nobody but the server writes try-on results, videos, video inputs and the image cache.
drop policy if exists "Allow insert to ai-tryon-results" on storage.objects;
drop policy if exists "Allow update to ai-tryon-results" on storage.objects;
drop policy if exists "Allow insert to ai-tryon-videos" on storage.objects;
drop policy if exists "Allow update to ai-tryon-videos" on storage.objects;
drop policy if exists "Service role can upload video inputs" on storage.objects;
drop policy if exists "Service role can delete video inputs" on storage.objects;
drop policy if exists "Service can upload optimized images" on storage.objects;
drop policy if exists "Service can update optimized images" on storage.objects;

-- 2. AI Studio uploads only into your own folder.
drop policy if exists "Authenticated users can upload to ai-tryon-uploads" on storage.objects;
drop policy if exists ai_tryon_uploads_owner_insert on storage.objects;
create policy ai_tryon_uploads_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'ai-tryon-uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 3. Brand outfit images: only the brand or store that owns the product.
--    File names start with the product id ("<product id>-<timestamp>.<ext>").
drop policy if exists "Brand owners can upload product outfits" on storage.objects;
drop policy if exists "Brand owners can update product outfits" on storage.objects;
drop policy if exists "Brand owners can delete product outfits" on storage.objects;
drop policy if exists product_outfits_owner_insert on storage.objects;
drop policy if exists product_outfits_owner_update on storage.objects;
drop policy if exists product_outfits_owner_delete on storage.objects;
create policy product_outfits_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'product-outfits' and exists (
    select 1 from public.products p
    left join public.brands b on b.id = p.brand_id
    left join public.retailers r on r.id = p.retailer_id
    where p.id::text = left(objects.name, 36)
      and (b.owner_user_id = (select auth.uid()) or r.owner_user_id = (select auth.uid()))));
create policy product_outfits_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'product-outfits' and exists (
    select 1 from public.products p
    left join public.brands b on b.id = p.brand_id
    left join public.retailers r on r.id = p.retailer_id
    where p.id::text = left(objects.name, 36)
      and (b.owner_user_id = (select auth.uid()) or r.owner_user_id = (select auth.uid()))))
  with check (bucket_id = 'product-outfits' and exists (
    select 1 from public.products p
    left join public.brands b on b.id = p.brand_id
    left join public.retailers r on r.id = p.retailer_id
    where p.id::text = left(objects.name, 36)
      and (b.owner_user_id = (select auth.uid()) or r.owner_user_id = (select auth.uid()))));
create policy product_outfits_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'product-outfits' and exists (
    select 1 from public.products p
    left join public.brands b on b.id = p.brand_id
    left join public.retailers r on r.id = p.retailer_id
    where p.id::text = left(objects.name, 36)
      and (b.owner_user_id = (select auth.uid()) or r.owner_user_id = (select auth.uid()))));

-- 4. Owner-only read rules (needed for temporary links and "replace file" uploads).
--    While these folders are still public they change nothing.
drop policy if exists ai_tryon_uploads_owner_read on storage.objects;
drop policy if exists ai_tryon_results_owner_read on storage.objects;
drop policy if exists ai_tryon_videos_owner_read on storage.objects;
drop policy if exists tnb_video_inputs_owner_read on storage.objects;
drop policy if exists search_images_owner_read on storage.objects;
drop policy if exists saved_outfits_owner_read on storage.objects;
create policy ai_tryon_uploads_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'ai-tryon-uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy ai_tryon_results_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'ai-tryon-results' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy ai_tryon_videos_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'ai-tryon-videos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy tnb_video_inputs_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'tnb-video-inputs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy search_images_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'search-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy saved_outfits_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'saved-outfits' and (storage.foldername(name))[1] = (select auth.uid())::text);
