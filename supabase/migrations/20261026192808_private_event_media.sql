-- Private event media.
--
-- STATUS: APPLIED to live 2026-10-26 with owner approval (version 20261026192808),
-- after the updated thenewblack-event-tryon (v51) was deployed. Post-apply
-- probes 14/14; old public photo links return 400.
-- Review: docs/redesign/PARTNER_AND_EVENTS_REVIEW.md (E4, S7 for events).
-- Tests:  supabase/tests/event_media_probes.sql (rollback mode on production).
-- Rollback: supabase/rollbacks/20261026192808_private_event_media.rollback.sql
--
-- What it does:
--   - Makes event-user-photos (shopper photos), event-tryon-results (old event
--     results), and the unused event-tryon-renders and event-photos buckets
--     private, so public links stop working.
--   - Shopper photos: a shopper can only read, upload, replace and delete files
--     in their own folder (<event_id>/<user_id>/...). Replacing was broken
--     before (no UPDATE rule, which an upsert needs).
--   - Event results: only the shopper whose try-on produced the file can read
--     or delete it (today anyone with a try-on at the same event can).
--   - Drops the old rules based on auth.role() (deprecated). The server
--     (service role) bypasses these rules, so it is unaffected.
-- New event try-on results are stored with photo try-on results
-- (ai-tryon-results); that bucket is not changed here.

begin;

update storage.buckets set public = false
where id in ('event-user-photos', 'event-tryon-results', 'event-tryon-renders', 'event-photos');

-- Shopper photos (event-user-photos)
drop policy if exists "Service role full access to event photos" on storage.objects;
drop policy if exists "Users can read their own event photos" on storage.objects;
drop policy if exists "Users can upload their own event photos" on storage.objects;

create policy event_user_photos_owner_read on storage.objects
  for select to authenticated
  using (bucket_id = 'event-user-photos' and (storage.foldername(name))[2] = (select auth.uid())::text);
create policy event_user_photos_owner_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'event-user-photos' and (storage.foldername(name))[2] = (select auth.uid())::text);
create policy event_user_photos_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'event-user-photos' and (storage.foldername(name))[2] = (select auth.uid())::text)
  with check (bucket_id = 'event-user-photos' and (storage.foldername(name))[2] = (select auth.uid())::text);
create policy event_user_photos_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'event-user-photos' and (storage.foldername(name))[2] = (select auth.uid())::text);

-- Event try-on results (event-tryon-results)
drop policy if exists "Users can read own results" on storage.objects;
drop policy if exists "Users can delete own results" on storage.objects;
drop policy if exists "Service role can write results" on storage.objects;
drop policy if exists "Service role can update results" on storage.objects;

create policy event_tryon_results_owner_read on storage.objects
  for select to authenticated
  using (bucket_id = 'event-tryon-results' and exists (
    select 1 from public.event_tryon_jobs j
    where j.output_path = storage.objects.name and j.user_id = (select auth.uid())));
create policy event_tryon_results_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'event-tryon-results' and exists (
    select 1 from public.event_tryon_jobs j
    where j.output_path = storage.objects.name and j.user_id = (select auth.uid())));

-- Unused legacy buckets: no public reads, no anonymous-to-anyone writes
drop policy if exists "Public can view renders" on storage.objects;
drop policy if exists "Authenticated users can upload renders" on storage.objects;
drop policy if exists "Anyone can view event photos" on storage.objects;
drop policy if exists "Authenticated users can upload event photos" on storage.objects;
drop policy if exists "Users can update their own event photos" on storage.objects;
drop policy if exists "Users can delete their own event photos" on storage.objects;

commit;
