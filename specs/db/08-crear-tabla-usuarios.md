# SPEC 08 — Tabla users y sus enums en Supabase

> **Status:** implementado
> **Depends on:** SPEC 07 (`public.daycares` existe y tiene seed; el staff se ata a "Guardería Sala Soles" mediante subquery por nombre)
> **Date:** 2026-09-22
> **Objective:** Crear los enums `user_role` y `user_status`, la tabla `public.users` (FK a `daycares` y a `auth.users`) con RLS de lectura de la propia fila, y un usuario staff real (`gabriel@google.com`) para poder loguearse en la demo, replicando el patrón de migraciones del proyecto.

---

## Scope

**In:**

- Migración única vía `supabase_apply_migration` (MCP), nombre `create_users_table`.
- Archivo local versionado `supabase/migrations/<YYYY-MM-DD_HHMMSS>_create_users_table.sql` con el SQL idéntico al aplicado.
- Enums `user_role` (`staff`, `parent`, `admin`) y `user_status` (`pending`, `active`), según `07-DB-Schema/opendaycare-database-schema.md`.
- `CREATE TABLE public.users`: `id uuid PK` FK → `auth.users(id)` ON DELETE CASCADE, `daycare_id uuid NOT NULL` FK → `public.daycares(id)`, `role user_role`, `status user_status default 'active'`, `full_name text`, `avatar_url text nullable`, `notify_on_post boolean default true`, `daily_summary_enabled boolean default true`, `created_at`/`updated_at timestamptz`.
- RLS habilitado + policy única `users_select_own` (SELECT, `auth.uid() = id`).
- Seed de 1 usuario staff: fila real en `auth.users` (`gabriel@google.com`, pass `1q2w3e4r5t` en bcrypt, email confirmado) + fila en `public.users` con `role staff`, `status active`, `full_name 'Gabriel'`, `daycare_id` resuelto por nombre ("Guardería Sala Soles" del seed de SPEC 07).
- Verificación post-DDL: `supabase_list_tables`, `supabase_execute_sql`, `supabase_get_advisors` (security/performance).

**Out of scope (for future specs):**

- Trigger `AFTER INSERT` en `auth.users` para autogenerar filas de `public.users` en un signup normal (spec de auth).
- Policies de escritura (`INSERT`/`UPDATE`/`DELETE`) y lectura cross-user (staff viendo listas de padres, filtro por tenant): spec de auth.
- Seed de usuarios `admin`/`parent`: no hay filas en `auth.users` para ellos, y el id es FK.
- Los demás enums y tablas del docs.
- Tipos TS generados e integración frontend–DB.

---

## Data model

```sql
-- 1) Enums
create type public.user_role as enum ('staff', 'parent', 'admin');
create type public.user_status as enum ('pending', 'active');

-- 2) Tabla
create table public.users (
  id                    uuid primary key references auth.users(id) on delete cascade,
  daycare_id            uuid not null references public.daycares(id),
  role                  public.user_role not null,
  status                public.user_status not null default 'active',
  full_name             text not null,
  avatar_url            text,
  notify_on_post        boolean not null default true,
  daily_summary_enabled boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users_select_own"
  on public.users
  for select
  to authenticated
  using (auth.uid() = id);

-- 3) Staff real (auth) + fila de dominio (un solo INSERT atómico)
with staff_auth as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'gabriel@google.com',
    crypt('1q2w3e4r5t', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  )
  returning id
)
insert into public.users (id, daycare_id, role, status, full_name)
select id,
       (select id from public.daycares where name = 'Guardería Sala Soles'),
       'staff', 'active', 'Gabriel'
from staff_auth;
```

Convenciones: el `daycare_id` se resuelve por nombre (no se hardcodea el uuid del seed de SPEC 07). Los campos token de `auth.users` quedan NULL (son nullables y con índices UNIQUE que no colisionan con NULL). La pass se guarda solo como hash bcrypt (la credencial `1q2w3e4r5t` queda expuesta en el archivo de migración en git, decisión consciente para la demo).

---

## Implementation plan

1. Confirmar schema de `auth.users` real antes del insert (ya verificado: columnas necesarias nullables excepto `id`; `pgcrypto` disponible para `crypt`).
2. Aplicar migración `create_users_table` con `supabase_apply_migration` (quizá repartida en create de enums/tabla/policy y el seed). Replicar el SQL 1:1 en `supabase/migrations/<YYYY-MM-DD_HHMMSS>_create_users_table.sql`. Deja enums + tabla + RLS + staff creados.
3. Verificar schema: `supabase_list_tables`/`information_schema.columns` muestran `users` con `rls_enabled: true`, enums en `pg_type`.
4. Verificar staff: `select id, email, email_confirmed_at from auth.users where email = 'gabriel@google.com'` devuelve 1 fila; `select ... from public.users` devuelve 1 fila con `role staff`, `daycare_id` de "Guardería Sala Soles" y `status active`.
5. Verificar policy: `pg_policies` muestra exactamente 1 policy `users_select_own` (SELECT, `authenticated`, `auth.uid() = id`); como `anon`, `select * from public.users` devuelve 0 filas.
6. Revisar `supabase_get_advisors` (security/performance) tras el DDL.
7. Confirmar la migración en `supabase_list_migrations`.

---

## Acceptance criteria

- [x] `supabase_list_migrations` incluye `create_users_table`.
- [x] `supabase_list_tables` muestra `public.users` con `rls_enabled: true`.
- [x] `user_role` y `user_status` existen en `pg_type` con sus valores (`staff`/`parent`/`admin` y `pending`/`active`).
- [x] `users` replica el docs: `id uuid` PK, FK `daycare_id → daycares` NOT NULL, FK `id → auth.users` ON DELETE CASCADE, `role user_role`, `status user_status default 'active'`, `full_name`, `avatar_url` nullable, `notify_on_post`/`daily_summary_enabled` boolean default `true`, `created_at`/`updated_at`.
- [x] `auth.users` tiene 1 fila `gabriel@google.com` con `email_confirmed_at` set (el login real se valida en un spec posterior de auth; aquí solo fila + hash).
- [x] `public.users` tiene 1 fila (staff) con `daycare_id` = "Guardería Sala Soles".
- [x] `pg_policies` muestra exactamente 1 policy `users_select_own` (SELECT, `authenticated`, `auth.uid() = id`); `select` como `anon` devuelve 0 filas.
- [x] `supabase_get_advisors` (security/performance) no reporta issues nuevos derivados de la migración (tras la optimización: FK indexada y policy con initplan).
- [x] `npm run lint`, `npx tsc --noEmit` y `npm run build` pasan (validación de regresión; sin cambios de código).
- [x] `git status` muestra solo el spec y `supabase/migrations/2026-09-22_105250_create_users_table.sql` + `2026-09-22_110751_users_table_optimizations.sql`, replicando 1:1 el SQL aplicado en cada migración.

---

## Decisions

- **Yes:** Solo los enums que usa `users` (`user_role`, `user_status`); el resto llega con su tabla.
- **Yes:** `daycare_id NOT NULL`: el modelo exige que todo usuario pertenezca a un daycare; evita huérfanos.
- **Yes:** Policy única `users_select_own` (`auth.uid() = id`): datos personales, lectura solo de la propia fila; listas cross-user al spec de auth (precedente SPEC 07).
- **Yes:** Staff real en `auth.users` (email confirmado, pass bcrypt) para que el login de la demo funcione y para satisfacer la FK `id → auth.users`. Coste asumido: este spec toca la tabla interna `auth.users` y la credencial queda visible en el archivo de migración de git.
- **Yes:** Seed de 1 solo usuario (staff). `admin`/`parent` requieren filas en `auth.users` y no aportan a la demo.
- **Yes:** `daycare_id` del seed por subquery de nombre (no hardcodear el uuid generado en SPEC 07).
- **No:** trigger de auth, policies de escritura/lectura cross-user, otros enums/tablas, tipos TS/integración frontend, `supabase db push`.

**Optimización post-implementación (acordada en revisión de advisors, 2026-09-22):** los advisors de performance detectaron 2 issues nuevos derivados de esta migración sobre `public.users`, y se resolvieron con una **segunda migración** `2026-09-22_110751_users_table_optimizations.sql` (aplicada vía MCP y replicada 1:1 en el repo):

1. **RLS initplan:** la policy cambió de `using (auth.uid() = id)` a `using ((select auth.uid()) = id)`. El `(select ...)` hace que Postgres evalúe `auth.uid()` una sola vez por query en lugar de por fila. El nombre, roles y predicado semántico de `users_select_own` se mantienen.
2. **Índice sobre la FK:** `create index users_daycare_id_idx on public.users (daycare_id)`, cubriendo `users_daycare_id_fkey`.

Tras la migración, `supabase_get_advisors`: `unindexed_foreign_keys` sobre `users` resuelto y `users_select_own` fuera de `auth_rls_initplan`. Lo que queda son hallazgos pre-existentes (policy `daycares_select_authenticated` de SPEC 07, `rls_auto_enable`, leaked password) y un INFO `unused_index` sobre `users_daycare_id_idx` — esperado al ser un índice recién creado sin tráfico todavía.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Insert directo en `auth.users` es una "receta" que puede romperse si Supabase cambia defaults internos | Verificar schema de `auth.users` antes del insert (hecho: columnas nullables) y probar la fila tras aplicar; el trigger queda como reemplazo futuro. |
| Pass `1q2w3e4r5t` expuesta en el repo (archivo de migración) | Decisión consciente para la demo; se documenta y la credencial se puede rotar/borrar con el spec de auth. |
| La tabla creada por SQL podría no quedar expuesta al Data API (GRANT a `anon`/`authenticated`) | Mismo patrón que SPEC 07 (sin GRANT explícito); si el advisor o un fetch futuro lo exige, se agrega GRANT en su spec. |
| Perder el usuario staff rompería el demo staff-only | Recrear el staff es re-ejecutar el seed del mismo archivo de migración (idempotente manual). |

---

## What is **not** in this spec

- Trigger `AFTER INSERT` en `auth.users` y cualquier flujo de signup/login (spec de auth).
- Policies de escritura y lectura cross-user (listas de padres, tenant).
- Seed de `admin`/`parent`, los demás enums y tablas del docs, tipos TS e integración frontend.
- Aplicar migraciones vía CLI local.

Cada una de esas, si llega, va en su propio spec.