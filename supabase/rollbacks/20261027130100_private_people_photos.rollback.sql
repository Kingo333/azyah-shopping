-- Rollback for 20261027130100_private_people_photos.sql: folders public again,
-- "anyone can view" rules restored exactly as they were on 2026-10-27.

update storage.buckets set public = true
where id in ('ai-tryon-uploads', 'ai-tryon-results', 'ai-tryon-videos', 'tnb-video-inputs', 'search-images', 'wardrobe');

create policy "Anyone can view ai-tryon-results" on storage.objects for select to public using (bucket_id = 'ai-tryon-results'::text);
create policy "Anyone can view ai-tryon-uploads" on storage.objects for select to public using (bucket_id = 'ai-tryon-uploads'::text);
create policy "Anyone can view ai-tryon-videos" on storage.objects for select to public using (bucket_id = 'ai-tryon-videos'::text);
create policy "Anyone can view video inputs" on storage.objects for select to public using (bucket_id = 'tnb-video-inputs'::text);
create policy "Public read for search-images" on storage.objects for select to public using (bucket_id = 'search-images'::text);
