<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## MCPs

- Playwright: Screenshots y cualquier cosa relacionada a Playwright tienen que estar en la carpeta `.playwright-mcp/`. Configurado en `opencode.json` (solo MCP local declarado).
- Context7: Usaremos este MCP para traer la documentación actualizada del framework (Next.js, Tailwind, etc.).
- Supabase: MCP conectado al proyecto Supabase. Permite ejecutar SQL (`supabase_execute_sql`), migraciones, listar tablas, queries a logs, generar tipos de TS, revisar advisory (RLS/seguridad/rendimiento) y buscar docs (`supabase_search_docs`). Antes de cualquier cambio de schema inspecciona las tablas existentes y RLS.

# Supabase y Skills

## Supabase

- El proyecto tiene MCP de Supabase activo (herramientas `supabase_*`). No asumas la config: revisa tablas/RLS reales antes de migrar.
- El schema de referencia vive en `../07-DB-Schema` (reference `docs`): define el modelo completo (también `posts`, etc.); se implementa por etapas según specs. Antes de migrar a una tabla nueva, compará contra ese documento.
- **Regla general**: activa RLS en toda tabla de `public`, no expongas secretos en el cliente, y verifica los cambios con `supabase_get_advisors` (security/performance) después de cada DDL.
- **Siempre crear el archivo de migración local**: toda manipulación de la base de datos (crear/alterar/drop de tablas, columnas, tipos, policies, funciones, triggers, seeds/data) se aplica por MCP (`supabase_apply_migration`) y **además** se versiona el SQL idéntico (réplica 1:1) en `supabase/migrations/<version>_<nombre>.sql` (formato `<YYYY-MM-DD_HHMMSS>_<snake_case>.sql`, ejemplo `2026-09-22_105250_create_users_table.sql`), historial para git sin depender de la CLI local. Sin excepción: si hay DDL/data change hacia la DB remota, hay archivo local asociado.
- Para auth/sesiones usa el patrón `@supabase/ssr` con cookies; nunca confíes en `user_metadata` para decisiones de autorización.
- **Clientes Supabase ya instalados** (`@supabase/supabase-js` + `@supabase/ssr` en `package.json`): toda interacción con la base de datos desde la app se hace con estos paquetes vía supabase-js (`supabase.from('tabla').select()...`), nunca SQL directo desde el cliente. Helpers en `utils/supabase/`:
  - `server.ts` → `createClient(cookieStore)` para Server Components, Server Actions y Route Handlers (usa `@supabase/ssr` con cookies).
  - `client.ts` → `createClient()` para Client Components (browser).
  - `middleware.ts` → `updateSession(request)` que refresca la sesión con `supabase.auth.getClaims()`; se engancha desde el root `proxy.ts` (**Next.js 16 renombró `middleware.ts` → `proxy.ts`**, un root `middleware.ts` se ignora) y corre en todas las rutas via matcher.
  - Env vars en `.env` (el archivo de entorno del proyecto es `.env`, no `.env.local`; `.env.template` las documenta): `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (**publishable key**, no usar anon/service_role en el cliente), y server-only `RESEND_API_KEY` + `RESEND_FROM_EMAIL` (emails de invitación), `SUPABASE_SERVICE_ROLE_KEY` (solo server actions, nunca en client components) y `SUPABASE_DB_PASSWORD`. Verificar URL/keys con las herramientas MCP `supabase_get_project_url` / `supabase_get_publishable_keys`.
  - Para proteger páginas/datos usar `auth.getClaims()`; no confiar en `getSession()` para autorización (lee la cookie sin revalidar).
- Estado actual de la DB remota (specs 07–12; réplica 1:1 en `supabase/migrations/`):
  - `public.daycares` (4 seeds) y `public.rooms` (3 salas por daycare: Soles / Estrellas / Arcoíris).
  - `public.users` (enum `user_role` `staff|parent|admin`, `user_status` `pending|active`; policies `users_select_own` + `users_staff_same_daycare_select` vía RPC `is_same_daycare_staff`, que evita la recursión). Staff seed: `gabriel@google.com` / pass `1q2w3e4r5t`, email confirmado, `role staff`, atado a "Guardería Sala Soles".
  - `public.children` (`status` default `active`, `allergy_tags text[]`, `photo_consent`; policies por comando: `children_select_same_daycare` + `children_staff_insert/update/delete`).
  - `public.invitations` (spec 12; enums `relationship_type` `father|mother|guardian` e `invitation_status` `pending|accepted|expired|cancelled`; `code text unique`; policies `invitations_staff_insert/select` por daycare del niño).
  - `public.parent_children` (spec 12; `UNIQUE(parent_id, child_id)`; solo SELECT con `parent_children_select` staff/padre propio — el INSERT lo hace el service role al activar).
  - RPC `public.is_same_daycare_staff(uuid, uuid)` (SECURITY DEFINER, `search_path` fijo; EXECUTE solo `authenticated`/`service_role`). RLS activa en toda tabla de `public`; GRANT a `authenticated` por comando, nunca `FOR ALL`. Verificar cambios con `supabase_get_advisors`.
- La app ya lee/escribe la DB: login real, `/kids`, `/kids/[id]`, invitaciones con Resend y activación de cuenta. El único módulo que sigue hardcodeado es el **feed** (`/` y `CreatePostModal`) — candidato a spec futuro con tabla `posts`.

## Skills instaladas

Instaladas con `npx skills` y bloqueadas en `skills-lock.json` (fuentes: `supabase/agent-skills` y `klerith/fernando-skills`), replicadas en `.agents/skills/` (spec, spec-impl, supabase, supabase-postgres-best-practices) y `.claude/skills/`.

### Supabase (`.agents/skills/supabase/`)

Cargar esta skill para **cualquier tarea** que toque Supabase: Database, Auth, Edge Functions, Realtime, Storage, Vectors, Cron, Queues; integraciones `supabase-js` / `@supabase/ssr` en Next.js/React; problemas de auth (login, logout, sesiones, JWT, cookies, RLS); CLI o MCP; migraciones, esquemas declarativos, auditorías de seguridad, extensiones de Postgres (`pg_graphql`, `pg_cron`, `pg_vector`); y debugging (errores HTTP/Postgres, RLS, permission denied, timeouts, logs).

Principios clave (extraídos de la skill):

1. Supabase cambia seguido — verificar contra `https://supabase.com/changelog.md` (buscar tags `breaking-change`) y docs actuales antes de implementar.
2. Verificar el trabajo: después de un fix correr una query de prueba.
3. No buclerse en errores: si falla 2-3 veces, cambiar de enfoque y revisar logs.
4. Tablas creadas por SQL pueden NO estar expuestas al Data API: revisar settings y `GRANT` a `anon`/`authenticated` cuando aplique.
5. RLS en TODA tabla de esquemas expuestos (`public`). Crear policies acordes al modelo real de acceso, no un default genérico.
6. Security checklist offline: no usar `user_metadata` en decisiones de autorización, borrar usuario no invalida tokens (sign out/revoke primero), JWT claims no siempre fresh.

### Supabase Postgres Best Practices (`.agents/skills/supabase-postgres-best-practices/`)

Cargarla **antes** de escribir o cambiar cualquier cosa en Postgres: crear/alterar tablas y columnas (incluyendo tipos), diseño de schema, migraciones, RLS y sus tests, índices, triggers, funciones, jobs (`pg_cron`, `pgmq`), búsqueda vectorial (`pgvector`) y restores/imports dumps. También para diagnosticar queries lentas, CPU alto, timeouts, EXPLAIN plans, locks, bloat o filas visibles para el usuario/tenant equivocado. Aplica también para un cambio de una sola columna.

Cubre 8 categorías de rendimiento priorizadas por impacto (query performance, connection management, migraciones, etc.) con ejemplos incorrectos vs. correctos y análisis de query plans. Usar `supabase_get_advisors` tras cambios DDL.

# Comandos

- `npm run dev` — dev server en http://localhost:3000
- `npm run build` — build de producción
- `npm run start` — sirve el build
- `npm run lint` — ESLint (único check de calidad)
- **No hay** suite de tests ni script de typecheck. Para verificar tipos usa `npx tsc --noEmit` (tsconfig ya tiene `noEmit: true`).

# Arquitectura y toolchain

- Next.js 16 + App Router. **No hay `src/`**: el código vive en `app/` en la raíz. Rutas:
  - `app/page.tsx` (feed, `/`) → **client component** con datos en memoria (`seedPosts` + `CreatePostModal`). Único módulo sin conectar a la DB.
  - `app/kids/page.tsx` (`/kids`) → **server component** que fetchea `rooms` + `children` del daycare del staff con `createClient(cookieStore)` y delega la UI en `KidsClient` (client: buscador + alta). `app/kids/loading.tsx` es el fallback de carga.
  - `app/kids/[id]/page.tsx` (`/kids/[id]`) → **server component** que fetchea el niño + `invitations` (pending vigentes) + `parent_children`→`users`; usa `await params` (`params: Promise<{ id: string }>`). La UI vive en `KidProfileClient` (client) que arma `ParentRowData` con `buildParentRows` (`kids-utils.ts`).
  - `app/login/page.tsx` → client, login real con `supabase.auth.signInWithPassword` (spec 09) + `LoginSuccessBanner` (banner `?activated=1`).
  - `app/activar-cuenta/page.tsx` → client, `ActivationForm` lee `?code`/`?email` y llama a las server actions de activación (spec 12).
- **Server actions** (`"use server"`) en `app/actions/`: `auth.ts` (`logout`), `invitations.ts` (`createParentInvitation`: inserta en `invitations` con RLS staff, genera código único con retry y envía el email vía `resend`), `activations.ts` (`getActivationContext` + `activateParentAccount` con client admin `SUPABASE_SERVICE_ROLE_KEY` server-only: crea el `auth.user`, la fila en `users`, el vínculo `parent_children` y marca la invitación `accepted`).
- Deps: `@supabase/ssr`, `@supabase/supabase-js` y `resend`.
- Tailwind v4 (CSS-first): **no existe `tailwind.config.js`**. El tema y fuentes se configuran en `app/globals.css` vía `@import "tailwindcss"` y `@theme`. PostCSS usa `@tailwindcss/postcss`.
- Alias de path `@/*` → raíz del repo (ver `tsconfig.json`).
- Tipos y utilidades de dominio en `app/lib/`: `dates.ts`, `kids-utils.ts` (`ChildRow`, `childRowToKid`, `buildParentRows`, alergias), `posts-utils.ts` (feed). `app/data/kids.ts` conserva los tipos (`Kid`, `KidBadge`, `LinkedParent`) y el seed de 8 niños **solo** para `CreatePostModal` (feed); `app/data/rooms.ts` quedó sin uso (las salas vienen de la DB).
- Modales: `AddKidModal` (`/kids`) y `LinkParentModal` (`/kids/[id]`) ya **persisten en la DB** (spec 10 y 12; el segundo envía el email de invitación con Resend y muestra el código real en estado "sent"). Solo `CreatePostModal` (feed) sigue en memoria. Todos validan en español y reusan estados `submitting | sent | error`.
- `.env*` está en `.gitignore` silenciosamente (línea `*.tsbuildinfo`/`next-env.d.ts` también gitignoreados). No asumas que hay env config en el repo.
- `CLAUDE.md` solo referencia `@AGENTS.md`.

## Spec Driven Development -Skills
 
- /spec Utilizaremos esta skill para crear especificaciones.
- /spec-impl Usaremos esta skill para implementar las especificaciones.
- **Todo spec relacionado con base de datos / Supabase va en `specs/db/`** (tablas, columnas, RLS/policies, Auth, migraciones, seeds/data, Storage, etc. — p.ej. `specs/db/08-crear-tabla-usuarios.md`, `specs/db/09-auth-y-proteccion-de-rutas.md`), nunca en la raíz de `specs/`. Los specs puramente de frontend/UI (sin tocar Supabase ni la DB) siguen en `specs/`. La numeración es global y secuencial entre ambas carpetas.

## Agente spec-verifier

- `spec-verifier` es un subagente de opencode que verifica los **Acceptance criteria** de un spec contra el código real (Next.js 16) y screenshots reales vía Playwright MCP.
- Marca cada check como `[x]`/`[ ]` en `specs/*.md` y `specs/db/*.md` **sin reescribir el texto del criterio**; la evidencia (`archivo:línea`, screenshots) va en el reporte final, no en el spec.
- Corrige problemas menores de código para que los checks pasen **sin cambiar el scope** del spec.
- Corre `npm run lint`, `npx tsc --noEmit` y `npm run build` como validación de calidad.
- El status del spec solo pasa a `aprobado` con confirmación explícita del usuario.

### Comando de verify spec

`@spec-verifier @specs/XX-nombre-del-spec.md`

(o vía Task tool con subagent `spec-verifier`). Flujo del agente:

1. Levanta `npm run dev` si hace falta y verifica que responda 200.
2. Recorre cada Acceptance criteria con Playwright (desktop ≥1024px, tablet, mobile <1024px).
3. Compara el resultado visual contra la referencia del template (ej: `references/pantallas/*.html`).
4. Aplica fixes menores si es necesario y re-verifica.
5. Solo marca la casilla `[x]`/`[ ]` de cada check (sin reescribir el criterio) y reporta PASS/FAIL con evidencia en el resumen final.

## Reglas de código.

- Usar código limpio, nombres y variables etc en inglés. 
- crear funciones con código sencillo de entender para un junior, no hacer funciones con letras simples para referenciar variables o parametros.
- crear funciones cortas, legibles y faciles de entender.
 