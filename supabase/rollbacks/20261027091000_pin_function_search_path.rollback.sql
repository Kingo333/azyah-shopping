-- ROLLBACK for 20261027091000_pin_function_search_path.sql
-- Removes the pinned search_path again (back to the caller's setting).

begin;

alter function public.generate_item_share_slug() reset search_path;
alter function public.generate_outfit_share_slug() reset search_path;
alter function public.get_creator_public_outfits_by_slug(uuid, text) reset search_path;
alter function public.get_my_outfits_with_promo_status() reset search_path;
alter function public.get_public_item_by_slug(text) reset search_path;
alter function public.get_public_outfit_by_slug(text) reset search_path;
alter function public.get_public_outfit_creator_by_slug(text) reset search_path;
alter function public.handle_original_item_changes() reset search_path;
alter function public.policy_exists(regclass, text) reset search_path;
alter function public.slugify(text) reset search_path;
alter function public.update_affiliate_promos_updated_at() reset search_path;
alter function public.update_comment_count() reset search_path;
alter function public.update_vote_counts() reset search_path;
alter function public.wga_set_updated_at() reset search_path;

commit;
