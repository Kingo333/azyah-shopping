-- Rollback for 20261027125651_storage_close_open_writes.sql: restores the
-- storage rules exactly as they were on 2026-10-27 (checked by fingerprint).

drop policy if exists ai_tryon_uploads_owner_insert on storage.objects;
drop policy if exists product_outfits_owner_insert on storage.objects;
drop policy if exists product_outfits_owner_update on storage.objects;
drop policy if exists product_outfits_owner_delete on storage.objects;
drop policy if exists ai_tryon_uploads_owner_read on storage.objects;
drop policy if exists ai_tryon_results_owner_read on storage.objects;
drop policy if exists ai_tryon_videos_owner_read on storage.objects;
drop policy if exists tnb_video_inputs_owner_read on storage.objects;
drop policy if exists search_images_owner_read on storage.objects;
drop policy if exists saved_outfits_owner_read on storage.objects;

create policy "Allow insert to ai-tryon-results" on storage.objects for insert to public
  with check (bucket_id = 'ai-tryon-results'::text);
create policy "Allow update to ai-tryon-results" on storage.objects for update to public
  using (bucket_id = 'ai-tryon-results'::text);
create policy "Allow insert to ai-tryon-videos" on storage.objects for insert to public
  with check (bucket_id = 'ai-tryon-videos'::text);
create policy "Allow update to ai-tryon-videos" on storage.objects for update to public
  using (bucket_id = 'ai-tryon-videos'::text);
create policy "Service role can upload video inputs" on storage.objects for insert to public
  with check (bucket_id = 'tnb-video-inputs'::text);
create policy "Service role can delete video inputs" on storage.objects for delete to public
  using (bucket_id = 'tnb-video-inputs'::text);
create policy "Service can upload optimized images" on storage.objects for insert to public
  with check (bucket_id = 'optimized-images'::text);
create policy "Service can update optimized images" on storage.objects for update to public
  using (bucket_id = 'optimized-images'::text);
create policy "Authenticated users can upload to ai-tryon-uploads" on storage.objects for insert to public
  with check ((bucket_id = 'ai-tryon-uploads'::text) and (auth.role() = 'authenticated'::text));
create policy "Brand owners can upload product outfits" on storage.objects for insert to public
  with check ((bucket_id = 'product-outfits'::text) and (auth.uid() is not null));
create policy "Brand owners can update product outfits" on storage.objects for update to public
  using ((bucket_id = 'product-outfits'::text) and (auth.uid() is not null));
create policy "Brand owners can delete product outfits" on storage.objects for delete to public
  using ((bucket_id = 'product-outfits'::text) and (auth.uid() is not null));
