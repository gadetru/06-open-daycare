-- SPEC 13 (paso 1, cierre): el advisor de performance marcó
-- `unindexed_foreign_keys` porque la FK nueva `users_room_id_fkey` no tiene un
-- índice que la cubra. Postgres no crea índices para las FK automáticamente.
--
-- Con 3 filas de usuarios no cambia nada, pero el índice deja lista la consulta
-- "staff de la sala X" para cuando haya volumen real.

create index users_room_id_idx on public.users (room_id);
