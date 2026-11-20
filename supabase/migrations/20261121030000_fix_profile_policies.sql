-- Repair profile and avatar policies safely when a database setup was rerun.

drop policy if exists "Profiles are readable by their owner" on public.profiles;
create policy "Profiles are readable by their owner"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Profiles can be created by their owner" on public.profiles;
create policy "Profiles can be created by their owner"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Profiles can be updated by their owner" on public.profiles;
create policy "Profiles can be updated by their owner"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users can view their own avatar objects" on storage.objects;
create policy "Users can view their own avatar objects"
  on storage.objects for select to authenticated
  using (bucket_id = 'private-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can upload their own avatar objects" on storage.objects;
create policy "Users can upload their own avatar objects"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'private-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can update their own avatar objects" on storage.objects;
create policy "Users can update their own avatar objects"
  on storage.objects for update to authenticated
  using (bucket_id = 'private-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'private-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can delete their own avatar objects" on storage.objects;
create policy "Users can delete their own avatar objects"
  on storage.objects for delete to authenticated
  using (bucket_id = 'private-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
