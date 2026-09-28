# Design

## Context

Ver `proposal.md` (Why). Estado actual: un solo árbol de rutas (`/`, `/kids`, `/kids/[id]`, `/login`, `/activar-cuenta`) donde cada `page.tsx` resuelve `users` por su cuenta; `proxy.ts` + `utils/supabase/middleware.ts` solo verifican autenticación (`getClaims`) sin leer `role`; RLS de `posts`/`post_children`/`post_photos`/`storage.objects` exige `role = 'staff'`; `children SELECT` es por daycare sin distinción de rol (fuga para padres). `PostCard`, `groupPostsByDay` y `postRowToCard` son agnósticos al rol y se reutilizan. `/avisos` y `/mi-cuenta` no existen como rutas. Migraciones: append-only, archivo local 1:1 en `supabase/migrations/<YYYY-MM-DD_HHMMSS>_<snake>.sql` + `supabase_apply_migration`. RPC `is_same_daycare_staff` exige staff: no sirve para padres, hace falta predicado propio.

## Goals / Non-Goals

**Goals:**
- Aislar staff y familia a nivel de rutas, guards de servidor y RLS (defensa en profundidad: ni la UI ni la DB filtran).
- Feed familia como unión de etiquetados + anuncios, con fotos firmadas que funcionen bajo RLS de padre.
- Login con destino por rol sin parpadeos de UI equivocada.

**Non-Goals:**
- Avisos / Mi cuenta, likes/comentarios, multi-idioma, paginación del feed, edición/borrado de posts, cambios en invitación/activación, cambios en subida a storage (solo lectura padre).

## Decisions

1. **Grupos de rutas `(staff)` y `(familia)`; URLs `/` y `/familia`.**
   Los route groups no cambian URLs: `(staff)/page.tsx` sigue sirviendo `/`. Alternativa (prefijos `/staff/*`) rompería bookmarks y el login actual; alternativa (misma ruta con UI condicional) mezcla PII de menores en un `if` olvidable. Grupos = layouts/nav separados, URLs estables.

2. **Helper `requireRole()` en servidor + guards en layouts; `proxy.ts` con redirect por rol.**
   Cada layout de grupo (`(staff)/layout.tsx`, `(familia)/layout.tsx`) verifica `getClaims()` → `users.role` y redirige (fuente de verdad, corre aunque el middleware se salte). `proxy.ts` suma 1 query a `users(role)` para redirects limpios en navegación edge. Alternativa (solo middleware) deja hueco si falla el refresh de sesión; alternativa (solo layouts) muestra un frame de la página equivocada antes del redirect. Costo aceptado: 1 query extra por navegación en middleware.

3. **RLS de padre basada en `parent_children`, no en daycare.**
   `posts SELECT` padre = existe `post_children`→`parent_children(parent_id = auth.uid())` OR (`type='announcement'` AND `room_id IS NULL` AND daycare del autor = mi daycare). Espejo en `post_children`, `post_photos` y `storage.objects`. Predicado nuevo (p. ej. `is_own_child()` / `can_read_post()`) SECURITY DEFINER con `search_path` fijo, EXECUTE solo `authenticated`/`service_role`, en vez de reutilizar `is_same_daycare_staff` (exige staff y daría falso para padres).

4. **Endurecer `children SELECT` partiéndola por rol en la misma migración.**
   Staff conserva predicado actual; padre solo filas con `parent_children(parent_id = yo)`. Hacerlo en la misma migración que las policies padre evita ventana donde el panel familia existe pero la fuga sigue abierta.

5. **Autor visible vía policy mínima en `users`.**
   Nueva policy `users_parent_read_staff_names`: padre lee `full_name`/`avatar_url` — a nivel policy no se filtra por columnas, así que la restricción real es "solo filas de staff de mi daycare"; el server component selecciona solo esas dos columnas. Alternativa (resolver nombre con service role) suma un cliente admin a otro server component; se prefiere RLS declarativa.

6. **Feed familia = mismo pipeline, distinto loader.**
   `loadFamilyPostRows` filtra por hijos vinculados (union de `child_id` de `parent_children`) + anuncios; reutiliza `groupPostsByDay`, `PostCard`, `createSignedUrl(..., 3600)`. Header propio (`FamilyFeedHeader`: saludo + nombre/s del hijo + daycare, sin conteos de sala) y empty-state propio para sin-vínculo y sin-posts. Sin `FeedInput`/`CreatePostModal` ni `createPost` reachable.

7. **Login con destino por rol del lado cliente tras `signInWithPassword`.**
   Tras login exitoso, 1 query a `users(role)` y `router.push` a `/` o `/familia`. Alternativa (redirect server-side) exigiría mover el login a server action; se mantiene el formulario client actual con el menor cambio.

## Risks / Trade-offs

- [Risk] Posts "toda la sala" invisibles para familias → pueden parecer que "faltan" novedades. Mitigación: documentarlo en el spec y en la guía de publicación; futuro: audiencia sala visible para familias de esa sala (fuera de alcance).
- [Risk] `users` legible a padres (filas staff del daycare) expone `id`s internos. Mitigación: solo filas staff mismo daycare, sin PII (nombre/avatar ya son visibles en el feed por diseño).
- [Risk] Latencia +1 query en middleware. Mitigación: query mínima (`role`), aceptada por redirects limpios; layouts re-verifican de todos modos.
- [Risk] Foto grupal muestra a otros niños (decisión de producto aceptada). Mitigación: registrado en spec; `photo_consent` sigue bloqueando publicación en origen.
- [Risk] RLS bypass vía MCP owner al verificar. Mitigación: validar aislamiento simulando actor (`SET LOCAL role` + jwt claims) o RLS Tester de Studio, más auditoría `db-security-auditor` del delta.
- [Risk] Migración append-only: si una policy nueva rompe el feed staff, rollback = nueva migración que la revierte. Mitigación: probar como staff y como padre antes de mergear.

## Migration Plan

1. Aplicar migración RLS (archivo local + `supabase_apply_migration`, réplica 1:1) con las 4 policies padre + endurecimiento `children` + policy autor; `GRANT SELECT` (sin INSERT/UPDATE/DELETE nuevos) a `authenticated`; `supabase_get_advisors` (security/performance).
2. Mover rutas a `(staff)/`, crear `(familia)/familia/`, layouts con guards, `proxy.ts` con rol, login por rol — deploy único (frontend + DB van juntos; el feed staff no cambia de forma visible).
3. Rollback: revertir deploy frontend; para DB, migración de reversión que dropee las policies nuevas (nunca editar la aplicada).
4. Verificación: `npm run lint`, `npx tsc --noEmit`, `npm run build`; login como staff (ve todo igual) y como padre (solo etiquetados + anuncios, `/kids` → `/familia`); `spec-verifier` sobre los Acceptance criteria; `db-security-auditor` sobre el delta.

## Open Questions

- Ninguna que cambie specs, enfoque o tareas. Detalle menor diferible: TTL de 3600s para signed URLs en familia (se reutiliza el actual salvo que se observe lo contrario).
