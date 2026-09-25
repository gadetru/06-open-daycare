-- SPEC 12 QA: hardening de la RPC public.is_same_daycare_staff (advisory
-- security 0028/0029). Replica 1:1 del estado aplicado en la DB remota tras
-- create_invitations_parent_children: SECURITY DEFINER + search_path fijo a
-- 'public' + LANGUAGE sql STABLE. No cambia policies existentes.

create or replace function public.is_same_daycare_staff(target_user_id uuid, target_daycare_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.users u
    where u.id = target_user_id
      and u.role = 'staff'::public.user_role
      and u.daycare_id = target_daycare_id
  );
$function$;