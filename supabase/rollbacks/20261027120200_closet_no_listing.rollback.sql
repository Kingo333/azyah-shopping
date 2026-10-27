-- Rollback for 20261027120200_closet_no_listing.sql.

create policy "Public can view wardrobe items" on storage.objects for select to public using (bucket_id = 'wardrobe-items'::text);
create policy "Public can view outfit images" on storage.objects for select to public using (bucket_id = 'saved-outfits'::text);
