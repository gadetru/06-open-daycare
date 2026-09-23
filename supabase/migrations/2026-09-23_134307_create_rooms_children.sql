-- SPEC 10: rooms + children con RLS staff-full / resto lectura + seed Soles/Estrellas/Arcoíris + 8 niños en Soles

-- 1) Tablas (según spec §Data model)
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  daycare_id uuid not null references public.daycares(id),
  name text not null,
  created_at timestamptz not null default now(),
  unique (daycare_id, name)
);

create table public.children (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id),
  full_name text not null,
  birth_date date not null,
  enrolled_at date not null default current_date,
  medical_notes text,
  allergy_tags text[] not null default '{}',
  photo_consent boolean not null default true,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Índices FK
create index rooms_daycare_id_idx on public.rooms (daycare_id);
create index children_room_id_idx on public.children (room_id);

-- 3) RLS
alter table public.rooms enable row level security;
alter table public.children enable row level security;

-- Lectura: miembros del mismo daycare
create policy "rooms_select_same_daycare"
  on public.rooms
  for select
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = (select auth.uid())
        and u.daycare_id = rooms.daycare_id
    )
  );

create policy "children_select_same_daycare"
  on public.children
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.rooms r
      join public.users u on u.daycare_id = r.daycare_id
      where r.id = children.room_id
        and u.id = (select auth.uid())
    )
  );

-- Escritura total: staff del mismo daycare
create policy "rooms_staff_write"
  on public.rooms
  for all
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = (select auth.uid())
        and u.role = 'staff'::public.user_role
        and u.daycare_id = rooms.daycare_id
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = (select auth.uid())
        and u.role = 'staff'::public.user_role
        and u.daycare_id = rooms.daycare_id
    )
  );

create policy "children_staff_write"
  on public.children
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.rooms r
      join public.users u on u.daycare_id = r.daycare_id
      where r.id = children.room_id
        and u.id = (select auth.uid())
        and u.role = 'staff'::public.user_role
    )
  )
  with check (
    exists (
      select 1
      from public.rooms r
      join public.users u on u.daycare_id = r.daycare_id
      where r.id = children.room_id
        and u.id = (select auth.uid())
        and u.role = 'staff'::public.user_role
    )
  );

-- 4) Exposición Data API (RLS sigue mandando)
grant select, insert, update, delete on public.rooms to authenticated;
grant select, insert, update, delete on public.children to authenticated;

-- 5) Seed: 3 salas en "Guardería Sala Soles" (idempotente)
insert into public.rooms (daycare_id, name)
select d.id, room_name
from public.daycares d
cross join (values ('Soles'), ('Estrellas'), ('Arcoíris')) as v(room_name)
where d.name = 'Guardería Sala Soles'
on conflict (daycare_id, name) do nothing;

-- 6) Seed: 8 niños en Soles (idempotente por full_name)
insert into public.children (room_id, full_name, birth_date, enrolled_at, medical_notes, allergy_tags, photo_consent, status)
select r.id, 'Mateo Fernández', '2022-03-12', '2025-02-01', 'Alergia al maní. Evitar frutos secos. Lleva inhalador en la mochila.', '{peanut}', true, 'active'
from public.rooms r
where r.name = 'Soles'
  and r.daycare_id = (select id from public.daycares where name = 'Guardería Sala Soles')
  and not exists (select 1 from public.children where full_name = 'Mateo Fernández');

insert into public.children (room_id, full_name, birth_date, enrolled_at, medical_notes, allergy_tags, photo_consent, status)
select r.id, 'Sofía Méndez', '2023-07-19', '2025-03-01', 'Suave con los cambios de rutina. Le gusta la música y se calma con canciones.', '{}', true, 'active'
from public.rooms r
where r.name = 'Soles'
  and r.daycare_id = (select id from public.daycares where name = 'Guardería Sala Soles')
  and not exists (select 1 from public.children where full_name = 'Sofía Méndez');

insert into public.children (room_id, full_name, birth_date, enrolled_at, medical_notes, allergy_tags, photo_consent, status)
select r.id, 'Benjamín Ruiz', '2021-11-04', '2024-01-01', 'Alérgico a las nueces. Supervisar lonchera.', '{}', true, 'active'
from public.rooms r
where r.name = 'Soles'
  and r.daycare_id = (select id from public.daycares where name = 'Guardería Sala Soles')
  and not exists (select 1 from public.children where full_name = 'Benjamín Ruiz');

insert into public.children (room_id, full_name, birth_date, enrolled_at, medical_notes, allergy_tags, photo_consent, status)
select r.id, 'Valentina Soto', '2023-02-28', '2025-08-01', 'En período de adaptación. La retiran al mediodía por ahora.', '{}', true, 'active'
from public.rooms r
where r.name = 'Soles'
  and r.daycare_id = (select id from public.daycares where name = 'Guardería Sala Soles')
  and not exists (select 1 from public.children where full_name = 'Valentina Soto');

insert into public.children (room_id, full_name, birth_date, enrolled_at, medical_notes, allergy_tags, photo_consent, status)
select r.id, 'Tomás Díaz', '2022-06-15', '2025-02-01', 'Intolerancia a la lactosa. Leche sin TACC y fórmula especial.', '{lactose}', true, 'active'
from public.rooms r
where r.name = 'Soles'
  and r.daycare_id = (select id from public.daycares where name = 'Guardería Sala Soles')
  and not exists (select 1 from public.children where full_name = 'Tomás Díaz');

insert into public.children (room_id, full_name, birth_date, enrolled_at, medical_notes, allergy_tags, photo_consent, status)
select r.id, 'Emma Castro', '2023-08-30', '2025-04-01', 'Usa pañal de tela. Traer bolsita impermeable.', '{}', true, 'active'
from public.rooms r
where r.name = 'Soles'
  and r.daycare_id = (select id from public.daycares where name = 'Guardería Sala Soles')
  and not exists (select 1 from public.children where full_name = 'Emma Castro');

insert into public.children (room_id, full_name, birth_date, enrolled_at, medical_notes, allergy_tags, photo_consent, status)
select r.id, 'Lucas Romero', '2021-10-22', '2024-01-01', 'Muy curioso. Asegurarse de supervisarlo en el patio de atrás.', '{}', true, 'active'
from public.rooms r
where r.name = 'Soles'
  and r.daycare_id = (select id from public.daycares where name = 'Guardería Sala Soles')
  and not exists (select 1 from public.children where full_name = 'Lucas Romero');

insert into public.children (room_id, full_name, birth_date, enrolled_at, medical_notes, allergy_tags, photo_consent, status)
select r.id, 'Olivia Vega', '2023-05-05', '2025-03-01', 'Vegetariana: no dar carnes ni caldos con carne.', '{}', true, 'active'
from public.rooms r
where r.name = 'Soles'
  and r.daycare_id = (select id from public.daycares where name = 'Guardería Sala Soles')
  and not exists (select 1 from public.children where full_name = 'Olivia Vega');
