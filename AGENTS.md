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
- El schema de referencia (no implementado aún) vive en `../07-DB-Schema` (reference `docs`).
- **Regla general**: activa RLS en toda tabla de `public`, no expongas secretos en el cliente, y verifica los cambios con `supabase_get_advisors` (security/performance) después de cada DDL.
- Para auth/sesiones usa el patrón `@supabase/ssr` con cookies; nunca confíes en `user_metadata` para decisiones de autorización.

## Skills instaladas

### Supabase (`.claude/skills/supabase/`)

Cargar esta skill para **cualquier tarea** que toque Supabase: Database, Auth, Edge Functions, Realtime, Storage, Vectors, Cron, Queues; integraciones `supabase-js` / `@supabase/ssr` en Next.js/React; problemas de auth (login, logout, sesiones, JWT, cookies, RLS); CLI o MCP; migraciones, esquemas declarativos, auditorías de seguridad, extensiones de Postgres (`pg_graphql`, `pg_cron`, `pg_vector`); y debugging (errores HTTP/Postgres, RLS, permission denied, timeouts, logs).

Principios clave (extraídos de la skill):

1. Supabase cambia seguido — verificar contra `https://supabase.com/changelog.md` (buscar tags `breaking-change`) y docs actuales antes de implementar.
2. Verificar el trabajo: después de un fix correr una query de prueba.
3. No buclerse en errores: si falla 2-3 veces, cambiar de enfoque y revisar logs.
4. Tablas creadas por SQL pueden NO estar expuestas al Data API: revisar settings y `GRANT` a `anon`/`authenticated` cuando aplique.
5. RLS en TODA tabla de esquemas expuestos (`public`). Crear policies acordes al modelo real de acceso, no un default genérico.
6. Security checklist offline: no usar `user_metadata` en decisiones de autorización, borrar usuario no invalida tokens (sign out/revoke primero), JWT claims no siempre fresh.

### Supabase Postgres Best Practices (`.claude/skills/supabase-postgres-best-practices/`)

Cargarla **antes** de escribir o cambiar cualquier cosa en Postgres: crear/alterar tablas y columnas (incluyendo tipos), diseño de schema, migraciones, RLS y sus tests, índices, triggers, funciones, jobs (`pg_cron`, `pgmq`), búsqueda vectorial (`pgvector`) y restores/imports dumps. También para diagnosticar queries lentas, CPU alto, timeouts, EXPLAIN plans, locks, bloat o filas visibles para el usuario/tenant equivocado. Aplica también para un cambio de una sola columna.

Cubre 8 categorías de rendimiento priorizadas por impacto (query performance, connection management, migraciones, etc.) con ejemplos incorrectos vs. correctos y análisis de query plans. Usar `supabase_get_advisors` tras cambios DDL.

# Comandos

- `npm run dev` — dev server en http://localhost:3000
- `npm run build` — build de producción
- `npm run start` — sirve el build
- `npm run lint` — ESLint (único check de calidad)
- **No hay** suite de tests ni script de typecheck. Para verificar tipos usa `npx tsc --noEmit` (tsconfig ya tiene `noEmit: true`).

# Arquitectura y toolchain

- Next.js 16 + App Router. **No hay `src/`**: el código vive en `app/` en la raíz. Las rutas de negocio son client components (`"use client"`) que reusan `Sidebar` y manejo de hamburguesa/overlay; en `app/kids/[id]/page.tsx` se usa `use(params)` para `params: Promise<{ id: string }>`. Rutas: `app/page.tsx` (feed), `app/kids/page.tsx`, `app/kids/[id]/page.tsx`, `app/login/page.tsx` (estático) y `app/activar-cuenta/page.tsx` (estático).
- Tailwind v4 (CSS-first): **no existe `tailwind.config.js`**. El tema y fuentes se configuran en `app/globals.css` vía `@import "tailwindcss"` y `@theme`. PostCSS usa `@tailwindcss/postcss`.
- Alias de path `@/*` → raíz del repo (ver `tsconfig.json`).
- Datos hardcodeados tipados en `app/data/`: `kids.ts` (tipos `Kid`, `LinkedParent`, `KidBadge`; 8 niños, padres con status `ACTIVA | PENDIENTE`) y `rooms.ts` (salas `Soles | Estrellas | Arcoíris`). Utilidades de dominio en `app/lib/` (`dates.ts`, `kids-utils.ts`, `posts-utils.ts`); no hay backend ni fetch real.
- Modales de alta en memoria (sin persistencia): `CreatePostModal` (feed), `AddKidModal` (`/kids`) y `LinkParentModal` (`/kids/[id]`). Validan en español y actualizan el estado local de la página.
- `.env*` está en `.gitignore` silenciosamente (línea `*.tsbuildinfo`/`next-env.d.ts` también gitignoreados). No asumas que hay env config en el repo.
- `CLAUDE.md` solo referencia `@AGENTS.md`.

## Spec Driven Development -Skills
 
- /spec Utilizaremos esta skill para crear especificaciones.
- /spec-impl Usaremos esta skill para implementar las especificaciones.

## Agente spec-verifier

- `spec-verifier` es un subagente de opencode que verifica los **Acceptance criteria** de un spec contra el código real (Next.js 16) y screenshots reales vía Playwright MCP.
- Marca cada check como `[x]`/`[ ]` en `specs/*.md` **sin reescribir el texto del criterio**; la evidencia (`archivo:línea`, screenshots) va en el reporte final, no en el spec.
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
 