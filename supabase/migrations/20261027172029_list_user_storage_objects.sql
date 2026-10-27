-- Account deletion: list the stored files of a user that can be removed, so
-- the delete-account function can remove them through the storage API (the
-- database can't delete storage files directly).
-- Design: docs/superpowers/specs/2026-10-27-private-photos-design.md (step 5).
-- Probes: supabase/tests/user_storage_cleanup_probes.sql.
--
-- A file is the user's when their id is one of its folders (covers
-- "<user>/...", "<event>/<user>/...", "tryon/users/<user>/...") or they
-- uploaded it.
--
-- delete-account calls this AFTER delete_user_completely, so the user's own
-- rows (closet, outfits, posts, brand and its products, store, events) are
-- already gone. Any file still used by a row that remains is kept:
--   * starter closet items: every new user's copies point at the same files
--     (copy_default_wardrobe_items), so other people's closets keep them;
--   * a store's products survive the store (products.retailer_id is set null);
--   * brand outfit images, event items, other people's outfits and posts.

create or replace function public.list_user_storage_objects(target_user_id uuid)
returns table(bucket_id text, name text)
language sql
stable
security definer
set search_path = public, storage
as $$
  with in_use(u) as (
    select image_url from public.wardrobe_items
    union all select image_bg_removed_url from public.wardrobe_items
    union all select thumb_path from public.wardrobe_items
    union all select image_url from public.default_wardrobe_items
    union all select image_bg_removed_url from public.default_wardrobe_items
    union all select image_url from public.products
    union all select media_urls::text from public.products
    union all select ar_mesh_url from public.products
    union all select image_url from public.event_brand_products
    union all select ar_model_url from public.event_brand_products
    union all select ar_overlay_url from public.event_brand_products
    union all select logo_url from public.event_brands
    union all select banner_image_url from public.retail_events
    union all select outfit_image_url from public.product_outfit_assets
    union all select render_path from public.fits
    union all select image_preview from public.fits
    union all select image_url from public.post_images
    union all select logo_url from public.brands
    union all select cover_image_url from public.brands
    union all select size_chart_url from public.brands
    union all select logo_url from public.retailers
    union all select cover_image_url from public.retailers
    union all select size_chart_url from public.retailers
    union all select avatar_url from public.users
  )
  select o.bucket_id, o.name
  from storage.objects o
  where target_user_id is not null
    and (target_user_id::text = any(storage.foldername(o.name))
         or o.owner = target_user_id
         or o.owner_id = target_user_id::text)
    and not exists (
      select 1 from in_use r
      where r.u is not null and position(o.bucket_id || '/' || o.name in r.u) > 0)
$$;

revoke all on function public.list_user_storage_objects(uuid) from public, anon, authenticated;
grant execute on function public.list_user_storage_objects(uuid) to service_role;
