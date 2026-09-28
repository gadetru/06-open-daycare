-- Separar panel staff/familia: RLS de lectura para padres + endurecimiento children.
--
-- Contexto: hoy `posts`/`post_children`/`post_photos`/`storage.objects` solo los
-- lee el staff, y `children SELECT` es "mismo daycare ve todo", así que un padre
-- autenticado ve todos los niños de la guardería. Esta migración es BREAKING a
-- propósito: cierra esa fuga y abre lectura recortada para padres.
--
-- Regla padre (misma en las 4 superficies):
--   - etiquetados a sus hijos (post_children + parent_children), UNIÓN si tiene
--     varios hijos, ordenados por published_at en el loader (no en RLS), más
--   - anuncios generales (type='announcement' AND room_id IS NULL) del staff de
--     su daycare. Los posts "toda la sala" (room_id NOT NULL sin etiqueta) NO se
--     ven: decisión de producto documentada en el spec.
--
-- Migración append-only: no edita policies staff existentes, solo AGREGA las de
-- padre, salvo `children_select_same_daycare` que se parte en staff/padre.

-- ---------------------------------------------------------------------------
-- 1) Predicados SECURITY DEFINER (bypasan RLS como is_same_daycare_staff).
-- search_path fijo + EXECUTE solo authenticated/service_role. No se reutiliza
-- is_same_daycare_staff porque exige rol staff en el AUTOR y daría falso para
-- padres como lectores.
-- ---------------------------------------------------------------------------

create or replace function public.is_own_child(parent_id uuid, child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.parent_children link
    where link.parent_id = parent_id
      and link.child_id = child_id
  );
$$;

create or replace function public.can_parent_read_post(check_post_id uuid, check_parent_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users parent_user
    where parent_user.id = check_parent_id
      and parent_user.role = 'parent'::public.user_role
  )
  and (
    exists (
      select 1
      from public.post_children tagged
      join public.parent_children link on link.child_id = tagged.child_id
      where tagged.post_id = check_post_id
        and link.parent_id = check_parent_id
    )
    or exists (
      select 1
      from public.posts announcement
      join public.users parent_user on parent_user.id = check_parent_id
      join public.users author_user on author_user.id = announcement.author_id
      where announcement.id = check_post_id
        and announcement.type = 'announcement'::public.post_type
        and announcement.room_id is null
        and author_user.role = 'staff'::public.user_role
        and author_user.daycare_id = parent_user.daycare_id
    )
  );
$$;

create or replace function public.can_parent_read_photo_path(check_path text, check_parent_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.post_photos photo
    where photo.storage_path = check_path
      and public.can_parent_read_post(photo.post_id, check_parent_id)
  );
$$;

create or replace function public.can_parent_read_staff_name(staff_id uuid, parent_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users parent_user
    join public.users staff_user on staff_user.daycare_id = parent_user.daycare_id
    where parent_user.id = parent_id
      and parent_user.role = 'parent'::public.user_role
      and staff_user.id = staff_id
      and staff_user.role = 'staff'::public.user_role
  );
$$;

-- Las funciones en public son ejecutables por PUBLIC por defecto: se revocan y
-- se otorgan solo a authenticated/service_role (patrón de is_same_daycare_staff).
revoke all on function public.is_own_child(uuid, uuid) from public;
revoke all on function public.is_own_child(uuid, uuid) from anon;
grant execute on function public.is_own_child(uuid, uuid) to authenticated;
grant execute on function public.is_own_child(uuid, uuid) to service_role;

revoke all on function public.can_parent_read_post(uuid, uuid) from public;
revoke all on function public.can_parent_read_post(uuid, uuid) from anon;
grant execute on function public.can_parent_read_post(uuid, uuid) to authenticated;
grant execute on function public.can_parent_read_post(uuid, uuid) to service_role;

revoke all on function public.can_parent_read_photo_path(text, uuid) from public;
revoke all on function public.can_parent_read_photo_path(text, uuid) from anon;
grant execute on function public.can_parent_read_photo_path(text, uuid) to authenticated;
grant execute on function public.can_parent_read_photo_path(text, uuid) to service_role;

revoke all on function public.can_parent_read_staff_name(uuid, uuid) from public;
revoke all on function public.can_parent_read_staff_name(uuid, uuid) from anon;
grant execute on function public.can_parent_read_staff_name(uuid, uuid) to authenticated;
grant execute on function public.can_parent_read_staff_name(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 2) posts: el padre lee etiquetados + anuncios generales (staff intacto).
-- ---------------------------------------------------------------------------
drop policy if exists "posts_parent_own_children_select" on public.posts;

create policy "posts_parent_own_children_select"
  on public.posts
  for select
  to authenticated
  using (
    public.can_parent_read_post(posts.id, (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- 3) post_children: solo links del propio hijo en posts visibles.
-- ---------------------------------------------------------------------------
drop policy if exists "post_children_parent_own_select" on public.post_children;

create policy "post_children_parent_own_select"
  on public.post_children
  for select
  to authenticated
  using (
    public.is_own_child((select auth.uid()), post_children.child_id)
    and public.can_parent_read_post(post_children.post_id, (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- 4) post_photos (tabla): espejo de posts para que la firma funcione.
-- ---------------------------------------------------------------------------
drop policy if exists "post_photos_parent_own_select" on public.post_photos;

create policy "post_photos_parent_own_select"
  on public.post_photos
  for select
  to authenticated
  using (
    public.can_parent_read_post(post_photos.post_id, (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- 5) storage.objects: el padre firma solo fotos de posts visibles.
-- ---------------------------------------------------------------------------
drop policy if exists "post_photos_parent_read" on storage.objects;

create policy "post_photos_parent_read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'post-photos'
    and public.can_parent_read_photo_path(name, (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- 6) children SELECT por rol (cierra la fuga: antes mismo daycare veía todo).
-- Staff conserva el predicado actual + chequeo de rol; padre solo vinculados.
-- INSERT/UPDATE/DELETE staff no se tocan.
-- ---------------------------------------------------------------------------
drop policy if exists "children_select_same_daycare" on public.children;

drop policy if exists "children_staff_same_daycare_select" on public.children;
create policy "children_staff_same_daycare_select"
  on public.children
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.rooms room
      join public.users staff_user on staff_user.daycare_id = room.daycare_id
      where room.id = children.room_id
        and staff_user.id = (select auth.uid())
        and staff_user.role = 'staff'::public.user_role
    )
  );

drop policy if exists "children_parent_own_select" on public.children;
create policy "children_parent_own_select"
  on public.children
  for select
  to authenticated
  using (
    public.is_own_child((select auth.uid()), children.id)
  );

-- ---------------------------------------------------------------------------
-- 7) users: el padre lee nombre/avatar del staff de su daycare para el "publicado por".
-- La restricción real es a nivel de FILAS (solo staff mismo daycare); el server
-- component selecciona solo full_name/avatar_url. users_select_own intacto.
-- ---------------------------------------------------------------------------
drop policy if exists "users_parent_read_staff_names" on public.users;

create policy "users_parent_read_staff_names"
  on public.users
  for select
  to authenticated
  using (
    public.can_parent_read_staff_name(users.id, (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- 8) Exposición al Data API: SELECT ya está otorgado a authenticated en estas
-- tablas; se deja explícito sin ampliar anon (anon sigue en 0 filas porque
-- ninguna policy es TO anon ni USING true).
-- ---------------------------------------------------------------------------
grant select on public.posts to authenticated;
grant select on public.post_children to authenticated;
grant select on public.post_photos to authenticated;
grant select on public.children to authenticated;
grant select on public.users to authenticated;
