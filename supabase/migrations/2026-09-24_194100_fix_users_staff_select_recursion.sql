-- Fix: la policy `users_staff_same_daycare_select` se referenciaba a sí misma
-- (exists ... from public.users self) generando `infinite recursion detected in
-- policy for relation "users"` y rompiendo hasta `users_select_own` (500 en el
-- fetch del propio perfil tras login).
-- Se aísla el chequeo en una función SECURITY DEFINER (propietario=postgres,
-- saltea RLS) para que la subconsulta sobre `users` no vuelva a evaluar policies.

create or replace function public.is_same_daycare_staff(target_user_id uuid, target_daycare_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.users u
    where u.id = target_user_id
      and u.role = 'staff'::public.user_role
      and u.daycare_id = target_daycare_id
  );
$$;

drop policy if exists "users_staff_same_daycare_select" on public.users;

create policy "users_staff_same_daycare_select"
  on public.users
  for select
  to authenticated
  using (public.is_same_daycare_staff((select auth.uid()), daycare_id));

-- La policy la evalúa el rol authenticated, pero NO debe poder invocarse la
-- función como RPC pública (advisory 0028/0029): se revoca de public/anon y se
-- otorga explícitamente a authenticated/servicio.
revoke all on function public.is_same_daycare_staff(uuid, uuid) from public;
revoke all on function public.is_same_daycare_staff(uuid, uuid) from anon;
grant execute on function public.is_same_daycare_staff(uuid, uuid) to authenticated;
grant execute on function public.is_same_daycare_staff(uuid, uuid) to service_role;