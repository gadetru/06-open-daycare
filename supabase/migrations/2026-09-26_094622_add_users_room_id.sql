-- SPEC 13: la columna `users.room_id` no existe ni en la DB ni en el schema de
-- referencia, y sin ella el staff no tiene sala: el modal de publicación no
-- puede armar las pills con los niños correctos ni resolver el destino
-- "Toda la sala" (que escribe `posts.room_id`).
--
-- La columna queda nullable (y no not null) a propósito: los padres no tienen
-- sala y hay staff que todavía no tiene una asignada. Si no tiene sala, el
-- modal muestra un aviso y solo queda "Anuncio general" (ver SPEC 13, riesgos).
--
-- No se toca ninguna policy: agregar una columna no altera el RLS de `users`.
-- El RLS de `rooms` (lectura para miembros del daycare) sigue aplicando.

alter table public.users
  add column room_id uuid references public.rooms(id) on delete set null;

-- El staff de ejemplo pasa a la sala "Soles" de su propia guardería.
update public.users u
set room_id = r.id,
    updated_at = now()
from public.rooms r
where r.name = 'Soles'
  and r.daycare_id = u.daycare_id
  and u.role = 'staff'::public.user_role
  and u.room_id is null;
