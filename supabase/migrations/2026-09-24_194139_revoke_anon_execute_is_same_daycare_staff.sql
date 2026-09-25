-- SPEC 12 QA: la RPC public.is_same_daycare_staff no debe invocarse como RPC
-- pública por anon (advisory security). Únicos ejecutores legítimos:
-- authenticated (evaluación de policies) y service_role (activación de cuenta).
-- Replica 1:1 del estado aplicado en la DB remota.

revoke execute on function public.is_same_daycare_staff(uuid, uuid) from anon;