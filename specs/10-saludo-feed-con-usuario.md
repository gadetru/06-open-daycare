# SPEC 10 — Saludo del feed con nombre de usuario

> **Status:** Borrador
> **Depends on:** SPEC 09 (sesión real y `public.users` con `full_name`)
> **Date:** 2026-09-22
> **Objective:** Reemplazar el saludo hardcodeado del home (`Buenas, Caro` en `app/components/home/FeedHeader.tsx:8`) por el nombre del usuario logueado (`full_name` de `public.users`, fallback email).

---

## Scope (propuesto)

**In:**

- `FeedHeader` lee la sesión + fila propia en `public.users` y saluda con `full_name` (fallback email).
- Mantener layout/visual 1:1 salvo el nombre.

**Out (propuesto):**

- Resto de la integración UI↔DB del feed (posts, conteos).
- Roles por UI.

---

## Origen

- Pedido del usuario el 2026-09-22 durante la implementación de SPEC 09: "al acceder al /, el saludo sigue hardcodeado; quiero que aparezca ya el nombre de usuario".
- Declarado fuera de scope de SPEC 09 (su alcance de usuario es solo el Sidebar). No implementar en la rama `spec-09-auth-y-proteccion-de-rutas`.
