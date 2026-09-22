drop policy "users_select_own" on public.users;

create policy "users_select_own"
  on public.users
  for select
  to authenticated
  using ((select auth.uid()) = id);

create index users_daycare_id_idx on public.users (daycare_id);