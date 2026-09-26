-- Corrige el aislamiento de lectura del feed: un padre de la guardería podía
-- leer todos los posts del staff.
--
-- Causa: la policy "posts_staff_same_daycare_select" solo verificaba que el
-- AUTOR del post fuera staff de la guardería del actor, pero nunca verificaba que
-- el ACTOR fuera staff. Como los padres comparten daycare_id con el staff
-- (users.role = 'parent'), un padre autenticado de la misma guardería pasaba el
-- filtro y leía el feed completo.
--
-- El mismo hueco estaba en "post_children_staff_same_daycare_select", que permite
-- saber a qué niños menciona cada post.
--
-- Fix: agregar el chequeo "el actor es staff" a las dos policies de SELECT. Se usa
-- el mismo patrón que ya usa "posts_staff_insert", así que no hay recursión nueva
-- (la función is_same_daycare_staff es SECURITY DEFINER y saltea RLS).
--
-- Migración append-only: no edita la 2026-09-26_095049_create_posts_post_children.sql.

-- ---------------------------------------------------------------------------
-- posts: solo el staff de la guardería lee el feed
-- ---------------------------------------------------------------------------
drop policy if exists "posts_staff_same_daycare_select" on public.posts;

create policy "posts_staff_same_daycare_select"
  on public.posts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.users u
      where u.id = (select auth.uid())
        and u.role = 'staff'::public.user_role
    )
    and public.is_same_daycare_staff(
      posts.author_id,
      (select u.daycare_id from public.users u where u.id = (select auth.uid()))
    )
  );

-- ---------------------------------------------------------------------------
-- post_children: los destinatarios también son solo del staff
-- ---------------------------------------------------------------------------
drop policy if exists "post_children_staff_same_daycare_select" on public.post_children;

create policy "post_children_staff_same_daycare_select"
  on public.post_children
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.users u
      where u.id = (select auth.uid())
        and u.role = 'staff'::public.user_role
    )
    and exists (
      select 1
      from public.posts p
      where p.id = post_children.post_id
        and public.is_same_daycare_staff(
              p.author_id,
              (select u.daycare_id from public.users u where u.id = (select auth.uid()))
            )
    )
  );
