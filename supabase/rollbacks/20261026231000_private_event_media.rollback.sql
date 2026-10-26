-- ROLLBACK for 20261026231000_private_event_media.sql
-- Restores the previous (public) buckets and storage policies exactly as they
-- were on 2026-10-26 (copied from pg_policies). Run by hand only if needed.

begin;

update storage.buckets set public = true
where id in ('event-user-photos', 'event-tryon-results', 'event-tryon-renders', 'event-photos');

drop policy if exists event_user_photos_owner_read on storage.objects;
drop policy if exists event_user_photos_owner_insert on storage.objects;
drop policy if exists event_user_photos_owner_update on storage.objects;
drop policy if exists event_user_photos_owner_delete on storage.objects;
drop policy if exists event_tryon_results_owner_read on storage.objects;
drop policy if exists event_tryon_results_owner_delete on storage.objects;

create policy "Service role full access to event photos" on storage.objects for all to public
  using ((bucket_id = 'event-user-photos'::text) AND (auth.role() = 'service_role'::text));
create policy "Users can read their own event photos" on storage.objects for select to public
  using ((bucket_id = 'event-user-photos'::text) AND (((auth.uid())::text = (storage.foldername(name))[2]) OR (auth.role() = 'service_role'::text)));
create policy "Users can upload their own event photos" on storage.objects for insert to public
  with check ((bucket_id = 'event-user-photos'::text) AND (auth.role() = 'authenticated'::text));

create policy "Users can read own results" on storage.objects for select to public
  using ((bucket_id = 'event-tryon-results'::text) AND ((storage.foldername(name))[1] IN (SELECT (event_tryon_jobs.event_id)::text AS event_id FROM event_tryon_jobs WHERE (event_tryon_jobs.user_id = auth.uid()))));
create policy "Users can delete own results" on storage.objects for delete to public
  using ((bucket_id = 'event-tryon-results'::text) AND ((storage.foldername(name))[1] IN (SELECT (event_tryon_jobs.event_id)::text AS event_id FROM event_tryon_jobs WHERE (event_tryon_jobs.user_id = auth.uid()))));
create policy "Service role can write results" on storage.objects for insert to public
  with check ((bucket_id = 'event-tryon-results'::text) AND (auth.role() = 'service_role'::text));
create policy "Service role can update results" on storage.objects for update to public
  using ((bucket_id = 'event-tryon-results'::text) AND (auth.role() = 'service_role'::text));

create policy "Public can view renders" on storage.objects for select to public
  using (bucket_id = 'event-tryon-renders'::text);
create policy "Authenticated users can upload renders" on storage.objects for insert to public
  with check ((bucket_id = 'event-tryon-renders'::text) AND (auth.role() = 'authenticated'::text));
create policy "Anyone can view event photos" on storage.objects for select to public
  using (bucket_id = 'event-photos'::text);
create policy "Authenticated users can upload event photos" on storage.objects for insert to public
  with check ((bucket_id = 'event-photos'::text) AND (auth.role() = 'authenticated'::text));
create policy "Users can update their own event photos" on storage.objects for update to public
  using ((bucket_id = 'event-photos'::text) AND (auth.role() = 'authenticated'::text));
create policy "Users can delete their own event photos" on storage.objects for delete to public
  using ((bucket_id = 'event-photos'::text) AND (auth.role() = 'authenticated'::text));

commit;
