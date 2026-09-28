# Tasks

## 1. Migración RLS para padres

- [x] 1.1 Escribir `supabase/migrations/<timestamp>_parent_feed_policies.sql` con predicado SECURITY DEFINER (`search_path` fijo, EXECUTE solo `authenticated`/`service_role`) y policies SELECT padre en `posts`, `post_children`, `post_photos` y `storage.objects`, y verificar que el archivo existe y aplica en limpio con `supabase_apply_migration` en rama o con revisión del SQL
- [x] 1.2 Endurecer `children SELECT` por rol (staff conserva predicado actual, padre solo vinculados) en la misma migración con `GRANT SELECT` a `authenticated` sin ampliar `anon`, y verificar que un padre solo lee sus hijos y el staff sigue leyendo todo el daycare
- [x] 1.3 Agregar policy `users` para que padres lean `full_name`/`avatar_url` del staff de su daycare, y verificar que el join de autor del feed resuelve el nombre como padre
- [x] 1.4 Correr `supabase_get_advisors` (security y performance) tras el DDL y dejar el reporte sin hallazgos nuevos, verificando la salida de ambas llamadas

## 2. Guards por rol y login

- [x] 2.1 Crear helper de servidor `requireRole()` (`getClaims()` → `users.role`) y layouts `(staff)` y `(familia)` que redirigen al panel contrario según rol, y verificar con `npx tsc --noEmit` que compila y que cada layout redirige con sesión del rol opuesto
- [x] 2.2 Mover las rutas actuales a `app/(staff)/` sin cambiar URLs (`/`, `/kids`, `/kids/[id]`) y verificar con `npm run build` que las rutas generadas son idénticas y el feed staff se ve igual
- [x] 2.3 Extender `proxy.ts`/`utils/supabase/middleware.ts` con lectura de `users.role` y redirects (`parent` en `/` o `/kids*` → `/familia`; `staff` en `/familia` → `/`), y verificar navegando a cada ruta con cada rol que el redirect es correcto
- [x] 2.4 Cambiar `app/login/page.tsx` para redirigir a `/` (staff) o `/familia` (parent) tras login exitoso, y verificar iniciando sesión con un usuario staff y uno padre que cada uno aterriza en su panel

## 3. Feed familia

- [x] 3.1 Crear `app/(familia)/familia/page.tsx` (server component) con loader que une etiquetados de todos los hijos vinculados + anuncios generales (`type='announcement'` AND `room_id IS NULL` mismo daycare) y firma fotos con `createSignedUrl(path, 3600)`, y verificar como padre que el feed trae exactamente esos posts ordenados por día
- [x] 3.2 Crear `FamilyFeedHeader` (saludo + hijo/s + daycare, sin datos sensibles) y `FamiliaClient` reutilizando `PostCard` + `groupPostsByDay`, sin `FeedInput` ni `CreatePostModal`, y verificar visualmente que no hay UI de creación ni datos médicos/alergias/fechas
- [x] 3.3 Agregar estado vacío para padre sin vínculos y para feed sin posts, y verificar con un padre sin `parent_children` que ve el mensaje sin errores
- [x] 3.4 Agregar navegación familia (inicio, cerrar sesión) separada del Sidebar staff, y verificar que ningún link apunta a `/kids`, `/avisos` o `/mi-cuenta`

## 4. Verificación integral

- [x] 4.1 Correr `npm run lint`, `npx tsc --noEmit` y `npm run build`, y verificar que los tres pasan en limpio
- [x] 4.2 Verificar regresión staff con `spec-verifier` (feed, publicar con foto, `/kids`, invitaciones) y confirmar que todo sigue igual salvo los guards
- [x] 4.3 Auditar el delta con `db-security-auditor` (aislamiento padre por `parent_children`, sin `using(true)`/`FOR ALL`/`anon` sobre PII) y confirmar que no quedan hallazgos abiertos
