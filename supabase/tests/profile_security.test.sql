-- pgTAP test template. Run with `supabase test db` after linking/starting a project.
begin;
select plan(5);

select has_table('public', 'profiles', 'profiles table exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS is enabled on profiles'
);
select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Profiles are readable by their owner'),
  'owner-only select policy exists'
);
select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Profiles can be updated by their owner'),
  'owner-only update policy exists'
);
select ok(
  exists (select 1 from storage.buckets where id = 'private-avatars' and public = false),
  'avatar bucket is private'
);

select * from finish();
rollback;
