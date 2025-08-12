-- Create a public bucket for visual search uploads
insert into storage.buckets (id, name, public)
values ('search-images', 'search-images', true)
on conflict (id) do nothing;

-- Policies for the 'search-images' bucket
-- Public read access
create policy if not exists "Public read for search-images"
  on storage.objects for select
  using (bucket_id = 'search-images');

-- Authenticated users can upload to a folder matching their uid
create policy if not exists "Users can upload their own search images"
  on storage.objects for insert
  with check (
    bucket_id = 'search-images'
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Authenticated users can update their own uploads
create policy if not exists "Users can update their own search images"
  on storage.objects for update
  using (
    bucket_id = 'search-images'
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Authenticated users can delete their own uploads
create policy if not exists "Users can delete their own search images"
  on storage.objects for delete
  using (
    bucket_id = 'search-images'
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[1]
  );