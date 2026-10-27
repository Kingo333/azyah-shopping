-- Rollback for 20261027171126_private_server_only_folders.sql.

update storage.buckets set public = true
where id in ('tnb-video-inputs', 'search-images', 'wardrobe');

create policy "Anyone can view video inputs" on storage.objects for select to public using (bucket_id = 'tnb-video-inputs'::text);
create policy "Public read for search-images" on storage.objects for select to public using (bucket_id = 'search-images'::text);
