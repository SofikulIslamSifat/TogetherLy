-- pgTAP tests for the Phase 3 space and invitation boundary.
-- Requires the project's standard Supabase pgTAP test setup and auth test helpers.
begin;
select plan(7);

select tests.create_supabase_user('space_owner', 'space-owner@test.local');
select tests.create_supabase_user('space_guest', 'space-guest@test.local');
select tests.create_supabase_user('space_outsider', 'space-outsider@test.local');

select tests.authenticate_as('space_owner');
select lives_ok(
  $$select public.create_space('Test Space')$$,
  'An authenticated user can create a space'
);
select is(
  (select count(*)::integer from public.space_members where user_id = auth.uid()),
  1,
  'Creator is automatically the first member'
);

-- Capture the owner-created invitation without exposing its stored hash.
create temporary table test_invite(token text) on commit drop;
insert into test_invite(token)
select public.create_space_invitation((select space_id from public.space_members where user_id = auth.uid()));

select tests.authenticate_as('space_guest');
select lives_ok(
  $$select public.accept_space_invitation((select token from test_invite))$$,
  'A valid invite can be accepted by a different account'
);
select is(
  (select count(*)::integer from public.space_members),
  2,
  'The space contains exactly two members after acceptance'
);
select throws_ok(
  $$select public.accept_space_invitation((select token from test_invite))$$,
  'P0001',
  'Invitation is invalid or has expired',
  'The same invitation cannot be accepted twice'
);

select tests.authenticate_as('space_outsider');
select is(
  (select count(*)::integer from public.spaces),
  0,
  'An unrelated account cannot read the private space'
);
select throws_ok(
  $$select public.accept_space_invitation('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')$$,
  'P0001',
  'Invitation is invalid or has expired',
  'An unknown invitation token is rejected'
);

select * from finish();
rollback;
