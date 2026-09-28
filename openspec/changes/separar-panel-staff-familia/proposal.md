# Proposal

## Why

Hoy la app es un solo panel pensado para staff (`/`, `/kids`, `/kids/[id]`) y el middleware solo verifica autenticación, no rol. Un padre que inicia sesión cae en la UI de staff: el feed le queda vacío (RLS de `posts` solo permite staff) pero `/kids` le mostraría todos los niños del daycare (la policy `children_select_same_daycare` no distingue roles). Hay que separar un panel familia con acceso recortado a sus propios hijos y cerrar esa fuga.

## What Changes

- Nuevo grupo de rutas `(familia)/familia/` con layout y navegación propios, solo lectura: feed del hijo/a + anuncios generales, sin publicar, sin `/kids`.
- Rutas staff `(staff)` (`/`, `/kids`, `/kids/[id]`) pasan a exigir rol `staff`; el padre que las visite es redirigido a `/familia` y el staff que visite `/familia` es redirigido a `/`.
- Login redirige según rol (`staff` → `/`, `parent` → `/familia`).
- Nuevas policies RLS SELECT para `parent`: ve en `posts` solo los etiquetados a su hijo vía `post_children` + sus `parent_children`, más anuncios generales (`type = 'announcement'` AND `room_id IS NULL` del mismo daycare); espejo en `post_children`, `post_photos` y `storage.objects` para que las fotos firmen.
- Endurecimiento **BREAKING** (cierra fuga): `children SELECT` deja de ser "mismo daycare ve todo" y pasa a staff-todo / padre-solo-vinculados. Lectura mínima del nombre del autor para padres (feed muestra "publicado por").
- Feed familia reutiliza `PostCard` + `groupPostsByDay`; header y estado vacío propios; sin `FeedInput` ni `CreatePostModal`.
- Familia sin hijos vinculados ve estado vacío con mensaje (sin redirect).
- Avisos / Mi cuenta siguen fuera de alcance (rutas muertas, no se tocan).

## Capabilities

### New Capabilities

- `family-panel`: panel familia en `/familia` — rutas, guards por rol, feed recortado read-only, datos reducidos del hijo, estado vacío sin vínculo.
- `role-based-access`: control de acceso por rol — policies RLS para padres, endurecimiento de `children SELECT`, redirects en `proxy.ts`/layouts y destino de login por rol.

### Modified Capabilities

(none — no hay specs previas en `openspec/specs/`; el panel staff conserva su comportamiento actual bajo guards de rol.)

## Impact

- App: `app/(staff)/`, `app/(familia)/familia/`, `proxy.ts` + `utils/supabase/middleware.ts`, `app/login/page.tsx`, layouts y Sidebar/nav por rol.
- DB (migración append-only + archivo local 1:1 en `supabase/migrations/`): policies en `posts`, `post_children`, `post_photos`, `storage.objects`, `children`, `users` (lectura autor); grants a `authenticated` por comando; verificación con `supabase_get_advisors`.
- Sin cambios en creación de posts, invitaciones, activación ni storage de subida.
