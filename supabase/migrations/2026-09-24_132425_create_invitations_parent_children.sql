-- SPEC 12: invitations + parent_children con RLS staff / padre propio, sin FOR ALL (fija SPEC 10)

-- 1) Enums
create type public.relationship_type as enum ('father', 'mother', 'guardian');
create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'cancelled');

-- 2) Tablas (según spec §Data model y @db-schema §6 / §5)
create table public.invitations (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references public.children(id) on delete cascade,
  invited_by  uuid not null references public.users(id),
  full_name   text not null,
  email       text not null,
  relationship public.relationship_type not null,
  code        text not null unique,
  status      public.invitation_status not null default 'pending',
  expires_at  timestamptz not null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

create index invitations_child_id_idx on public.invitations (child_id);
create index invitations_email_idx on public.invitations (email);

create table public.parent_children (
  id uuid primary key default gen_random_uuid(),
  parent_id    uuid not null references public.users(id) on delete cascade,
  child_id     uuid not null references public.children(id) on delete cascade,
  relationship public.relationship_type not null,
  created_at   timestamptz not null default now(),
  unique (parent_id, child_id)
);

create index parent_children_parent_id_idx on public.parent_children (parent_id);
create index parent_children_child_id_idx on public.parent_children (child_id);

-- 3) RLS
alter table public.invitations enable row level security;
alter table public.parent_children enable row level security;

-- 4) Policies separadas por comando (precedente SPEC 10 fix)

-- invitations: staff del daycare del niño hace INSERT y SELECT
create policy "invitations_staff_insert"
  on public.invitations
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.children c
      join public.rooms r on r.id = c.room_id
      join public.users u on u.daycare_id = r.daycare_id
      where c.id = invitations.child_id
        and u.id = (select auth.uid())
        and u.role = 'staff'::public.user_role
    )
  );

create policy "invitations_staff_select"
  on public.invitations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.children c
      join public.rooms r on r.id = c.room_id
      join public.users u on u.daycare_id = r.daycare_id
      where c.id = invitations.child_id
        and u.id = (select auth.uid())
        and u.role = 'staff'::public.user_role
    )
  );

-- parent_children: solo SELECT (staff del daycare del niño o el padre propio).
-- El INSERT lo hace el service role en la activación (sin policy de escritura).
create policy "parent_children_select"
  on public.parent_children
  for select
  to authenticated
  using (
    (select auth.uid()) = parent_id
    or exists (
      select 1
      from public.children c
      join public.rooms r on r.id = c.room_id
      join public.users u on u.daycare_id = r.daycare_id
      where c.id = parent_children.child_id
        and u.id = (select auth.uid())
        and u.role = 'staff'::public.user_role
    )
  );

-- users: staff puede leer full_name de los usuarios de su daycare (lista de padres aceptados)
create policy "users_staff_same_daycare_select"
  on public.users
  for select
  to authenticated
  using (
    exists (
      select 1 from public.users self
      where self.id = (select auth.uid())
        and self.role = 'staff'::public.user_role
        and self.daycare_id = users.daycare_id
    )
  );

-- 5) Exposición Data API (RLS sigue mandando). GRANT a authenticated; el service role
--    inserta en parent_children durante la activación.
grant select, insert on public.invitations to authenticated;
grant select on public.parent_children to authenticated;