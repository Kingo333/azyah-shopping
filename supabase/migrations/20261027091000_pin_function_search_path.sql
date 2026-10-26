-- Pin search_path on the 14 functions the security advisor flags
-- (function_search_path_mutable, S14).
--
-- STATUS: PROPOSED. Not applied. Needs owner approval. Rename to the version
-- live records when applied.
-- Tests: supabase/tests/search_path_probes.sql (rollback mode on production):
--        public share lookups, slugify and the share-slug trigger give the
--        same results before and after.
-- Rollback: supabase/rollbacks/20261027091000_pin_function_search_path.rollback.sql
--
-- Each function keeps exactly the search_path it runs with today (the
-- database default "public, extensions"), so nothing it references changes.
-- Pinning it stops a caller's own search_path from changing what these
-- functions (10 of them SECURITY DEFINER) resolve to.

begin;

alter function public.generate_item_share_slug() set search_path = public, extensions;
alter function public.generate_outfit_share_slug() set search_path = public, extensions;
alter function public.get_creator_public_outfits_by_slug(uuid, text) set search_path = public, extensions;
alter function public.get_my_outfits_with_promo_status() set search_path = public, extensions;
alter function public.get_public_item_by_slug(text) set search_path = public, extensions;
alter function public.get_public_outfit_by_slug(text) set search_path = public, extensions;
alter function public.get_public_outfit_creator_by_slug(text) set search_path = public, extensions;
alter function public.handle_original_item_changes() set search_path = public, extensions;
alter function public.policy_exists(regclass, text) set search_path = public, extensions;
alter function public.slugify(text) set search_path = public, extensions;
alter function public.update_affiliate_promos_updated_at() set search_path = public, extensions;
alter function public.update_comment_count() set search_path = public, extensions;
alter function public.update_vote_counts() set search_path = public, extensions;
alter function public.wga_set_updated_at() set search_path = public, extensions;

commit;
