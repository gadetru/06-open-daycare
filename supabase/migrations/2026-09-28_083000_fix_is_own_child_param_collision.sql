-- Fix: `is_own_child(parent_id, child_id)` siempre devolvía true cuando existía
-- alguna fila en `parent_children`.
--
-- Causa: en funciones `language sql` los nombres de parámetros compiten con los
-- nombres de columnas. `where link.parent_id = parent_id` resolvía el lado
-- derecho como `link.parent_id` (la columna), quedando `x = x` (siempre true).
-- El precedente `is_same_daycare_staff` ya evita esto con `target_*`.
--
-- Fix append-only: se recrean con prefijo `check_*` sin colisión. El resto de
-- policies/funciones no cambian (ya usan `check_*`).

-- DROP CASCADE porque las policies de la migración anterior dependen de la
-- firma vieja; se recrean abajo con el mismo predicado.
drop function if exists public.is_own_child(uuid, uuid) cascade;

create function public.is_own_child(check_parent_id uuid, check_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.parent_children link
    where link.parent_id = check_parent_id
      and link.child_id = check_child_id
  );
$$;

drop function if exists public.can_parent_read_staff_name(uuid, uuid) cascade;

create function public.can_parent_read_staff_name(check_staff_id uuid, check_parent_id uuid)
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
    where parent_user.id = check_parent_id
      and parent_user.role = 'parent'::public.user_role
      and staff_user.id = check_staff_id
      and staff_user.role = 'staff'::public.user_role
  );
$$;

revoke all on function public.is_own_child(uuid, uuid) from public;
revoke all on function public.is_own_child(uuid, uuid) from anon;
grant execute on function public.is_own_child(uuid, uuid) to authenticated;
grant execute on function public.is_own_child(uuid, uuid) to service_role;

revoke all on function public.can_parent_read_staff_name(uuid, uuid) from public;
revoke all on function public.can_parent_read_staff_name(uuid, uuid) from anon;
grant execute on function public.can_parent_read_staff_name(uuid, uuid) to authenticated;
grant execute on function public.can_parent_read_staff_name(uuid, uuid) to service_role;

-- Recrear las policies que el CASCADE dropeó (mismo predicado que 080000).
drop policy if exists "post_children_parent_own_select" on public.post_children;
create policy "post_children_parent_own_select"
  on public.post_children
  for select
  to authenticated
  using (
    public.is_own_child((select auth.uid()), post_children.child_id)
    and public.can_parent_read_post(post_children.post_id, (select auth.uid()))
  );

drop policy if exists "children_parent_own_select" on public.children;
create policy "children_parent_own_select"
  on public.children
  for select
  to authenticated
  using (
    public.is_own_child((select auth.uid()), children.id)
  );

drop policy if exists "users_parent_read_staff_names" on public.users;
create policy "users_parent_read_staff_names"
  on public.users
  for select
  to authenticated
  using (
    public.can_parent_read_staff_name(users.id, (select auth.uid()))
  );

grant select on public.post_children to authenticated;
grant select on public.children to authenticated;
grant select on public.users to authenticated;
