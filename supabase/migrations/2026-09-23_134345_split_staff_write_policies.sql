-- SPEC 10 fix: evita multiple_permissive_policies en SELECT separando el FOR ALL del staff en INSERT/UPDATE/DELETE

drop policy "rooms_staff_write" on public.rooms;
drop policy "children_staff_write" on public.children;

-- rooms: staff del mismo daycare
create policy "rooms_staff_insert"
  on public.rooms
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.users u
      where u.id = (select auth.uid())
        and u.role = 'staff'::public.user_role
        and u.daycare_id = rooms.daycare_id
    )
  );

create policy "rooms_staff_update"
  on public.rooms
  for update
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = (select auth.uid())
        and u.role = 'staff'::public.user_role
        and u.daycare_id = rooms.daycare_id
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = (select auth.uid())
        and u.role = 'staff'::public.user_role
        and u.daycare_id = rooms.daycare_id
    )
  );

create policy "rooms_staff_delete"
  on public.rooms
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = (select auth.uid())
        and u.role = 'staff'::public.user_role
        and u.daycare_id = rooms.daycare_id
    )
  );

-- children: staff del daycare de la sala
create policy "children_staff_insert"
  on public.children
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.rooms r
      join public.users u on u.daycare_id = r.daycare_id
      where r.id = children.room_id
        and u.id = (select auth.uid())
        and u.role = 'staff'::public.user_role
    )
  );

create policy "children_staff_update"
  on public.children
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.rooms r
      join public.users u on u.daycare_id = r.daycare_id
      where r.id = children.room_id
        and u.id = (select auth.uid())
        and u.role = 'staff'::public.user_role
    )
  )
  with check (
    exists (
      select 1
      from public.rooms r
      join public.users u on u.daycare_id = r.daycare_id
      where r.id = children.room_id
        and u.id = (select auth.uid())
        and u.role = 'staff'::public.user_role
    )
  );

create policy "children_staff_delete"
  on public.children
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.rooms r
      join public.users u on u.daycare_id = r.daycare_id
      where r.id = children.room_id
        and u.id = (select auth.uid())
        and u.role = 'staff'::public.user_role
    )
  );
