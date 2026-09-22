# SPEC 07 — Tabla daycares en Supabase (primera migración)

> **Status:** implementado
> **Depends on:** Ninguna (primer spec de base de datos; el frontend aún no consume la DB)
> **Date:** 2026-09-22
> **Objective:** Crear la primera tabla del esquema (`daycares`) en Supabase aplicando el patrón de migraciones del proyecto (MCP `apply_migration`), réplica del diccionario de `@docs`, con RLS habilitado desde el arranque (policy `SELECT` para `authenticated`) y 4 daycares de seed, dejando la base lista para los specs de datos futuros.

---

## Scope

**In:**

- Migración única vía `supabase_apply_migration` (MCP), nombre `create_daycares_table`.
- Archivo local versionado `supabase/migrations/2026-09-22_065407_create_daycares_table.sql` con el SQL idéntico al aplicado (historial en git).
- `DROP TABLE` de la tabla residual `public.tabla_prueba` (artefacto de pruebas, 0 filas).
- `CREATE TABLE public.daycares` según `07-DB-Schema/opendaycare-database-schema.md`: `id uuid PK default gen_random_uuid()`, `name text not null`, `created_at timestamptz not null default now()`.
- `ALTER TABLE public.daycares ENABLE ROW LEVEL SECURITY` y policy `SELECT` para el rol `authenticated` (`auth.uid() IS NOT NULL`).
- Seed de 4 daycares: `Guardería Sala Soles` + 3 inventadas (`Guardería Arcoíris Feliz`, `Pequeños Pasos`, `Rayito de Sol`).
- Verificación post-DDL: `supabase_list_tables`, `supabase_execute_sql` y `supabase_get_advisors` (security/performance).

**Out of scope (for future specs):**

- El resto de las tablas del docs (`users`, `rooms`, `children`, `parent_children`, `invitations`, `posts`, `post_children`, `post_photos`, `reactions`, `comments`, `daily_summaries`, `devices`) y los ENUMs.
- Policies de RLS para el resto de las tablas, escritura (`INSERT`/`UPDATE`/`DELETE`) en `daycares` y trigger `AFTER INSERT` en `auth.users` (spec de auth; `users` aún no existe).
- Generación de tipos TS y cualquier integración del frontend con la DB (SPEC 01–06 son UI en memoria).
- Seed de rooms/children/users.
- Cambios en `app/` o configuración del frontend: esta migración solo agrega el archivo de migración local, sin tocar código.

---

## Data model

Réplica 1:1 del diccionario `@docs` (solo `created_at`, sin `updated_at` para esta tabla):

```sql
create table public.daycares (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

alter table public.daycares enable row level security;

create policy "daycares_select_authenticated"
  on public.daycares
  for select
  to authenticated
  using (auth.uid() is not null);

insert into public.daycares (name) values
  ('Guardería Sala Soles'),
  ('Guardería Arcoíris Feliz'),
  ('Pequeños Pasos'),
  ('Rayito de Sol');
```

- PK `id uuid` con `gen_random_uuid()` (función disponible por defecto en Supabase, extensión `pgcrypto`).
- Sin enums ni índices adicionales para esta tabla.
- RLS habilitado desde el arranque con la policy `SELECT` para `authenticated`; el resto de comandos (INSERT/UPDATE/DELETE) queda denegado por defecto hasta el spec de auth.
- El `INSERT` del seed corre dentro de la migración (rol con privilegios, no afectado por RLS).

---

## Implementation plan

1. Aplicar la migración `create_daycares_table` con `supabase_apply_migration`: `drop table if exists public.tabla_prueba`, `create table public.daycares`, `enable row level security` + policy `daycares_select_authenticated`, `insert` de los 4 seeds. La misma migración se replica en el archivo local `supabase/migrations/2026-09-22_065407_create_daycares_table.sql` (versionado en git). Deja la tabla creada, RLS activo y el seed cargado.
2. Verificar schema: `supabase_list_tables` muestra `public.daycares` con `rls_enabled: true` y ya no muestra `public.tabla_prueba`; corroborar las 3 columnas contra `information_schema.columns`.
3. Verificar seed: `select id, name from public.daycares` devuelve 4 filas con los nombres del seed.
4. Verificar policy: `select * from pg_policies where schemaname = 'public' and tablename = 'daycares'` devuelve exactamente 1 policy `daycares_select_authenticated`, `cmd = 'SELECT'`, roles `{authenticated}`, `qual = (auth.uid() IS NOT NULL)`; `relrowsecurity = true` en `pg_class`. Como usuario `anon` el SELECT debe devolver 0 filas.
5. Revisar `supabase_get_advisors` (security y performance) tras el DDL; si aparece un advisory relacionado con la migración, aplicarlo o anotarlo.
6. Confirmar que la migración quedó registrada en `supabase_list_migrations`.

Cada paso deja la base en estado consistente. El único cambio en el repo es el archivo de migración local (y el propio spec).

---

## Acceptance criteria

- [x] `supabase_list_migrations` incluye `create_daycares_table`.
- [x] `supabase_list_tables` muestra `public.daycares` con `rls_enabled: true` y ya no muestra `public.tabla_prueba`.
- [x] `daycares` tiene `id uuid` PK con `default gen_random_uuid()`, `name text not null`, `created_at timestamptz not null default now()` (verificado contra `information_schema.columns`).
- [x] `select count(*), name from public.daycares` devuelve 4 filas: `Guardería Sala Soles`, `Guardería Arcoíris Feliz`, `Pequeños Pasos` y `Rayito de Sol`.
- [x] `daycares` tiene `relrowsecurity = true` y exactamente una policy `daycares_select_authenticated` de tipo `SELECT` para el rol `authenticated` con `qual = (auth.uid() IS NOT NULL)` (verificada en `pg_policies`).
- [x] `supabase_get_advisors` en security y performance no reporta issues nuevos derivados de esta migración.
- [x] `npm run lint`, `npx tsc --noEmit` y `npm run build` pasan (sin cambios de código; validación de regresión).
- [x] `git status` muestra únicamente el spec y el archivo `supabase/migrations/2026-09-22_065407_create_daycares_table.sql`, cuyo SQL replica 1:1 el de la migración aplicada (sin cambios en `app/` ni configuración).

---

## Decisions

- **Yes:** Solo la tabla `daycares` en esta migración (el resto del docs entra cuando cada feature lo necesite). Elección explícita del usuario.
- **Yes:** RLS habilitado desde el arranque con policy `SELECT` para `authenticated` (`auth.uid() IS NOT NULL`). Pedido del usuario; el resto de comandos y el filtro por tenant (`daycare_id`) quedan para el spec de auth, cuando exista `users`.
- **Yes:** Seed de 4 daycares (`Guardería Sala Soles` del docs + 3 inventadas: `Guardería Arcoíris Feliz`, `Pequeños Pasos`, `Rayito de Sol`), para tener datos al conectar el frontend.
- **Yes:** Réplica 1:1 del diccionario: solo `created_at`, sin `updated_at` en esta tabla (si una tabla futura lo requiera, se agrega en su spec).
- **Yes:** Drop de `public.tabla_prueba` como limpieza (artefacto de pruebas sin uso).
- **Yes:** Patrón de migraciones = MCP `apply_migration` contra el remoto + archivo local `supabase/migrations/2026-09-22_065407_create_daycares_table.sql` versionado en git (réplica 1:1 del SQL aplicado), para mantener historial sin depender de la CLI local.
- **No:** tipos TS generados e integración frontend–DB, policies para el resto de las tablas, escritura en `daycares` y trigger de auth, tablas y ENUMs restantes, seeds de rooms/children/users, migraciones aplicadas vía CLI local (`supabase db push`).

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| La policy `SELECT` para `authenticated` expone los nombres de daycares a cualquier usuario logueado | Es data de catálogo (raíz); el filtrado por tenant y las policies de escritura llegan en el spec de auth. |
| RLS sin escritura: insertar daycares desde la app fallaría hoy | El seed corre dentro de la migración (rol con privilegios); la escritura por usuarios llega con el spec de auth. |
| La migración agrupa drop + create + policy + seed: fallo parcial | Cada `CREATE` del MCP es atómico; se verifica el estado tras aplicar y se revierte manualmente si hiciera falta. |
| `gen_random_uuid()` depende de `pgcrypto` | Extensión disponible por defecto en Supabase; se confirma con `supabase_list_extensions` antes de aplicar. |

---

## What is **not** in this spec

- Las otras 12 tablas del docs y los ENUMs.
- Policies de RLS para el resto de las tablas, escritura (`INSERT`/`UPDATE`/`DELETE`) en `daycares`, tabla `users`, trigger de `auth.users`, auth/sesiones.
- Tipos TS, fetch real del frontend, seed de rooms/children/users.
- Aplicar migraciones vía CLI local (`supabase db push`): el archivo `supabase/migrations/...` se versiona como réplica/historial, pero la aplicación se hace siempre por MCP contra el remoto.

Cada una de esas, si llega, va en su propio spec.