-- SPEC 13: publicaciones del staff contra Supabase. Cierra el último módulo
-- que no tocaba la base de datos (el feed de `/`).
--
-- Según `@db-schema` §7 y §8, con dos diferencias ya decididas en el spec:
--   - `post_type` tiene 7 valores: se agrega `mood` porque la UI de SPEC 06 ya
--     lo tenía y el schema de referencia no.
--   - `posts` NO tiene `daycare_id` (ver abajo: el aislamiento sale del autor).

-- 1) Enum
create type public.post_type as enum (
  'meal', 'nap', 'activity', 'achievement', 'mood', 'photo', 'announcement'
);

-- 2) Tablas
create table public.posts (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references public.users(id) on delete cascade,
  room_id      uuid references public.rooms(id) on delete set null,
  type         public.post_type not null,
  title        text,
  body         text not null,
  published_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.post_children (
  post_id  uuid not null references public.posts(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  primary key (post_id, child_id)
);

-- 3) Índices
-- published_at primero: es el orden del feed y el soporte del cursor futuro
-- (sin paginación en este spec, ver riesgos).
create index posts_published_at_idx on public.posts (published_at desc);
create index posts_author_id_idx on public.posts (author_id);
create index posts_room_id_idx on public.posts (room_id);
create index post_children_child_id_idx on public.post_children (child_id);

-- 4) RLS
alter table public.posts enable row level security;
alter table public.post_children enable row level security;

-- Un post pertenece a la guardería de su AUTOR (no de su sala): un anuncio
-- general tiene room_id NULL, así que por room_id no hay guardería que
-- comparar. Se reutiliza la RPC SECURITY DEFINER que ya existe.
create policy "posts_staff_same_daycare_select"
  on public.posts
  for select
  to authenticated
  using (
    public.is_same_daycare_staff(
      posts.author_id,
      (select u.daycare_id from public.users u where u.id = (select auth.uid()))
    )
  );

-- Solo el staff publica, y solo en su propia guardería o como anuncio general.
create policy "posts_staff_insert"
  on public.posts
  for insert
  to authenticated
  with check (
    posts.author_id = (select auth.uid())
    and exists (
      select 1 from public.users u
      where u.id = (select auth.uid())
        and u.role = 'staff'::public.user_role
    )
    and (
      posts.room_id is null
      or exists (
        select 1 from public.rooms r
        where r.id = posts.room_id
          and r.daycare_id = (select u.daycare_id from public.users u where u.id = (select auth.uid()))
      )
    )
  );

create policy "post_children_staff_same_daycare_select"
  on public.post_children
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.posts p
      where p.id = post_children.post_id
        and public.is_same_daycare_staff(
              p.author_id,
              (select u.daycare_id from public.users u where u.id = (select auth.uid()))
            )
    )
  );

create policy "post_children_staff_insert"
  on public.post_children
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.posts p
      join public.children c on c.id = post_children.child_id
      join public.rooms r on r.id = c.room_id
      where p.id = post_children.post_id
        and p.author_id = (select auth.uid())
        and r.daycare_id = (select u.daycare_id from public.users u where u.id = (select auth.uid()))
    )
  );

-- 5) Exposición al Data API
-- El schema public de Supabase viene con ALL para anon/authenticated en las
-- tablas nuevas, así que el `grant` solo no alcanza: se revoca primero para
-- dejar exactamente SELECT + INSERT (este spec no implementa edición ni
-- borrado) y sacar a anon, que nunca lee publicaciones.
revoke all on public.posts from anon;
revoke all on public.posts from authenticated;
grant select, insert on public.posts to authenticated;

revoke all on public.post_children from anon;
revoke all on public.post_children from authenticated;
grant select, insert on public.post_children to authenticated;

-- 6) Seed: 4 posts del staff de ejemplo (idempotente por body + autor).
-- Tres de hoy (uno para toda la sala y un anuncio general) y uno de ayer, para
-- ejercitar el agrupador por día del feed.
insert into public.posts (author_id, room_id, type, body, published_at)
select u.id, r.id, 'meal'::public.post_type,
       'Merienda de la tarde: jugos naturales, tostadas con queso y fruta.',
       now()
from public.users u
join public.rooms r on r.daycare_id = u.daycare_id and r.name = 'Soles'
where u.role = 'staff'::public.user_role
  and not exists (
    select 1 from public.posts p
    where p.author_id = u.id and p.body = 'Merienda de la tarde: jugos naturales, tostadas con queso y fruta.'
  );

insert into public.posts (author_id, room_id, type, body, published_at)
select u.id, r.id, 'nap'::public.post_type,
       'Siesta de la mañana: todos descansaron unos 45 minutos.',
       now() - interval '5 minutes'
from public.users u
join public.rooms r on r.daycare_id = u.daycare_id and r.name = 'Soles'
where u.role = 'staff'::public.user_role
  and not exists (
    select 1 from public.posts p
    where p.author_id = u.id and p.body = 'Siesta de la mañana: todos descansaron unos 45 minutos.'
  );

-- Anuncio general: room_id NULL, lo ve toda la guardería.
insert into public.posts (author_id, room_id, type, body, published_at)
select u.id, null, 'announcement'::public.post_type,
       'Recordatorio: mañana es el día de las familias. Traigan una foto para el álbum.',
       now() - interval '10 minutes'
from public.users u
where u.role = 'staff'::public.user_role
  and not exists (
    select 1 from public.posts p
    where p.author_id = u.id and p.body = 'Recordatorio: mañana es el día de las familias. Traigan una foto para el álbum.'
  );

insert into public.posts (author_id, room_id, type, body, published_at)
select u.id, r.id, 'activity'::public.post_type,
       'Armamos letras con cartulina de colores y pintamos con temperas.',
       now() - interval '1 day'
from public.users u
join public.rooms r on r.daycare_id = u.daycare_id and r.name = 'Soles'
where u.role = 'staff'::public.user_role
  and not exists (
    select 1 from public.posts p
    where p.author_id = u.id and p.body = 'Armamos letras con cartulina de colores y pintamos con temperas.'
  );
