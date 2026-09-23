# SPEC 09 — Login real contra Supabase y protección de rutas

> **Status:** Implementado
> **Depends on:** SPEC 03 (página `/login` estática que se convierte), SPEC 08 (`public.users`, staff `gabriel@google.com`/`1q2w3e4r5t`, RLS `users_select_own`)
> **Date:** 2026-09-22
> **Objective:** Convertir `/login` en un formulario real de email+password contra Supabase Auth, proteger `/`, `/kids` y `/kids/[id]` redirigiendo a `/login` vía `proxy.ts`, redirigir a `/` a quien ya tenga sesión y mostrar el usuario + "Cerrar sesión" en el Sidebar.

---

## Scope

**In:**

- `/login` pasa de server component estático a client component `"use client"`: form real de email (prefill `caro@opendaycare.com` **editable**) y password, submit con `signInWithPassword` vía `createClient()` de `utils/supabase/client.ts`, estado loading (botón deshabilitado), error inline en español "Email o contraseña incorrectos" que se limpia al tipear. Éxito → `router.push("/")` + `router.refresh()`. El resto del layout queda 1:1 con SPEC 03 (gradiente, `SunIcon`, "¿Olvidaste tu contraseña?" inerte, link "Activá tu cuenta").
- Protección de rutas en `utils/supabase/middleware.ts` (`updateSession`): protegidas `/` y `/kids` (prefix, cubre `/kids/[id]`); públicas `/login` y `/activar-cuenta`. Decisión de auth con `auth.getClaims()` (no `getSession()`). No-autenticado en ruta protegida → `NextResponse.redirect("/login")`. Autenticado en `/login` → `NextResponse.redirect("/")`.
- `proxy.ts` se mantiene (matcher actual, refresh de sesión ya existente).
- Sidebar (`app/components/shared/Sidebar.tsx`): muestra el usuario logueado (nombre `full_name` desde `public.users`, fallback email) y botón "Cerrar sesión" que hace `signOut` en server action, redirige a `/login` y refresca.
- Verificación E2E con Playwright (screenshots en `.playwright-mcp/`).

**Out of scope (for future specs):**

- Activación real de cuenta (`/activar-cuenta` se mantiene estática, sin fetch).
- Ruta `/familia-feed` (404 hoy).
- Roles (staff/parent) en el guard: solo valida sesión activa; RLS ya protege los datos.
- Tipos TS generados de la DB (`database.types.ts`) e integración UI↔DB del resto de la app.
- Reset / "¿Olvidaste tu contraseña?" (se mantiene inerte) y signup/registro.
- Server guards por página / route group de layout autenticado (la protección es "optimistic" vía proxy).

---

## Data model

No introduce tablas nuevas. Reutiliza `public.users` (SPEC 08): el Sidebar lee la propia fila (`full_name`, `avatar_url`) con un `select ... eq('id', user.id)`, permitido por la policy existente `users_select_own` (`auth.uid() = id`). Sin cambios de schema ni migraciones.

---

## Implementation plan

1. **Context7 — validación de patrones.** Verificar con `/supabase/ssr` y `/websites/nextjs`: `proxy.ts` heredero de `middleware.ts` en Next 16, protected-routes en middleware con redirect, `getClaims()` vs `getSession()`, y `signOut` desde server action (cookies httpOnly). Registrar en Decisions.
2. **Protección en `utils/supabase/middleware.ts`.** Agregar a `updateSession`: listas `PROTECTED_ROUTES = ["/", "/kids"]` y `PUBLIC_ROUTES = ["/login", "/activar-cuenta"]`; tras `getClaims()`, si hay sesión → ruta pública `/login` ⇒ redirect `/`; si no hay sesión → ruta protegida ⇒ redirect `/login`. Deja el sistema funcional: visitar `/` sin sesión redirige.
3. **`app/login/page.tsx` a client component.** Form con estado `email | password | isSubmitting | error`; submit → `createClient().auth.signInWithPassword({ email, password })`; éxito → `router.push("/")` + `router.refresh()`; error → mensaje inline en español, se limpia al tipear. Mantener el layout visual 1:1 con SPEC 03. Verificación: login demo funciona y redirige a `/`.
4. **Server action de logout.** Crear `app/actions/auth.ts` (`"use server"`): `logout()` con `createClient(cookieStore)` de `utils/supabase/server.ts` y `await supabase.auth.signOut()`.
5. **Sidebar: usuario + cerrar sesión.** En `Sidebar.tsx` (client), al montar: `createClient()` browser → `getUser()` y fila propia en `public.users` (`full_name`, `avatar_url`). Mostrar nombre/avatar (fallback email) y botón "Cerrar sesión" que invoca `logout()` (transition) y hace `router.push("/login")` + `router.refresh()`. Sin sesión: ocultar el bloque.
6. **Calidad.** `npm run lint`, `npx tsc --noEmit`, `npm run build`.
7. **Evidencia Playwright** en `.playwright-mcp/` (desktop y mobile): flujo completo login/error/logout/protección (ver criterios).

Cada paso deja el sistema funcional.

---

## Acceptance criteria

- [x] Sin sesión, visitar `/`, `/kids` o `/kids/[id]` redirige a `/login` (sin render de contenido, redirect vía proxy).
- [x] Autenticado, visitar `/login` redirige a `/`.
- [x] `/login` muestra el form con email prefill `caro@opendaycare.com` editable, password enmascarada y CTA "Iniciar sesión"; con `gabriel@google.com` / `1q2w3e4r5t` se crea la sesión, redirige a `/` y el feed carga; recargar mantiene la sesión y `/` sigue accesible.
- [x] Credenciales inválidas muestran error inline en español ("Email o contraseña incorrectos"), no redirigen, permiten reintentar y el error se limpia al escribir.
- [x] El Sidebar muestra "Gabriel" (o el email como fallback) y el botón "Cerrar sesión"; al pulsarlo vuelve a `/login` y las rutas protegidas vuelven a bloquear.
- [x] `/activar-cuenta` persiste pública y sin cambios de comportamiento (estática).
- [x] `utils/supabase/middleware.ts` decide con `getClaims()` (grep: sin uso de `getSession()` para la decisión).
- [x] `npm run lint`, `npx tsc --noEmit` y `npm run build` pasan.
- [x] Screenshots de referencia en `.playwright-mcp/` (login con error, login ok, post-login con Sidebar mostrando el usuario, rutas protegidas tras logout).

---

## Decisions

- **Yes:** Redirección post-login a `/` (el feed). Decisión del usuario.
- **Yes:** Distribución de rutas (protegidas `/`, `/kids`, `/kids/[id]`; públicas `/login`, `/activar-cuenta`; autenticados fuera de `/login`). Confirma el patrón estándar de Next.js 16 + Supabase.
- **Yes:** Solo sesión activa, sin chequeo de rol. RLS ya limita los datos; permisos por rol van en un spec de UI futuro (precedente SPEC 08).
- **Yes:** Protección "optimistic" en el proxy con `getClaims()` (refresh + validación), no `getSession()` (lee la cookie sin revalidar). Regla del proyecto.
- **Yes:** Logout vía server action con `createClient(cookieStore)` de `utils/supabase/server.ts` para limpiar cookies httpOnly; el browser client por sí solo no puede borrarlas.
- **Yes:** Sidebar consume `public.users` (propia fila) por browser client; RLS `users_select_own` ya lo permite. Sin `database.types.ts` (queda para el spec de migración UI↔DB).
- **Yes:** Prefill `caro@opendaycare.com` editable en el login. El usuario prefirió conservar la réplica visual de SPEC 03 sobre el login "listo para demo" con `gabriel@google.com`.
- **No:** activación real de cuenta, roles en el guard, signup, reset de contraseña, tipos TS generados, route group de layout protegido, `/familia-feed`.
- **Context7 2026-09-22:** `/supabase/ssr` (protected routes en middleware con redirect; `getClaims()` para decisiones de auth; `signOut` debe ejecutarse en contexto con cookies de servidor) y `/websites/nextjs` (`middleware.ts` renombrado a `proxy.ts` en Next 16; ejemplo oficial de redirect condicional en `proxy`).

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| `signOut` desde browser client no borra cookies httpOnly | Logout en server action (`utils/supabase/server.ts`), que setea/limpia cookies vía `cookieStore`. |
| Redirect post-login pierde la URL de origen | Aceptado: todos los destinos post-login van a `/`; `?next=` no se implementa (fuera de scope). |
| Prefill `caro@opendaycare.com` induce a error si no se edita | Es un campo editable de tipo email con placeholder claro; el error inline guía al usuario. |

---

## What is **not** in this spec

- Activación real de cuenta y `/familia-feed`.
- Chequeos de rol (staff/parent) y permisos de UI por tenant.
- Tipos TS generados de Supabase e integración UI↔DB del resto de la app.
- Signup, reset de contraseña y destinos `?next=` de redirección.

Cada una de esas, si llega, va en su propio spec.