# SPEC 11 — Perfil del niño contra Supabase con edición

> **Status:** implementado
> **Depends on:** SPEC 02, SPEC 04, SPEC 05, SPEC 10
> **Date:** 2026-09-23
> **Objective:** La vista `/kids/[id]` lee el niño desde Supabase por UUID y permite editarlo con los mismos campos del alta, conservando el botón de vincular padre en memoria hasta el spec de padres.

---

## Scope

**In:**

- `app/kids/[id]/page.tsx` pasa a server component: `createClient(cookieStore)` + `auth.getClaims()`, fetch de `public.children` por `id` (UUID) más `public.rooms` del `daycare` del usuario, solo `status = 'active'`.
- Nuevo `app/kids/[id]/KidProfileClient.tsx`: render 1:1 del layout actual (avatar, nombre + sala, botón Editar, alerta de alergias, tarjeta info, botón Resumen del día, tarjeta PADRES VINCULADOS) pero con datos reales vía `childRowToKid`.
- Edición con los mismos 7 campos del alta del spec 10: nombre, fecha nacimiento, sala (dropdown desde DB), alergias texto libre → `allergy_tags`, notas → `medical_notes`, fecha ingreso editable, checkbox consentimiento fotos.
- Reutilizar `AddKidModal` en modo edición (props `initialValues` + título "Editar niño") en vez de crear un modal nuevo; validaciones idénticas al spec 10.
- Guardar edición = `UPDATE public.children` vía browser client; éxito revalida el perfil, error muestra mensaje inline sin cerrar el modal.
- Botón "Vincular otro padre" se conserva tal cual hoy: abre `LinkParentModal` y agrega en memoria (sin DB).
- UUID inexistente, con `status archived` o de otro `daycare` → fallback "Niño no encontrado" existente.
- Estados: loading, error de carga ("No se pudo cargar el niño. Reintentá más tarde."), error de guardado sin cerrar.

**Out of scope (for future specs):**

- Tablas `invitations` y `parent_children` (se crean en el siguiente spec).
- Persistencia real del vínculo de padres, código de invitación real, envío de email, cambio PENDIENTE → ACTIVA.
- Archivar (`status archived`), borrar o crear niños desde el perfil.
- Resumen del día, normalizar alergias a tabla propia, trigger de `updated_at`.
- Limpieza o borrado de `app/data/kids.ts` (deja de usarse en `[id]` pero el archivo queda).

---

## Data model

Esta feature introduce no new tables. Reutiliza las tablas del spec 10 (`public.rooms`, `public.children` según `@db-schema` §§3–4).

```ts
// fila leída para el perfil
type ChildProfileRow = {
  id: string;
  room_id: string;
  room_name: string;
  full_name: string;
  birth_date: string;      // date → "12 mar 2022" en UI
  enrolled_at: string;     // date → "feb 2025" en UI
  medical_notes: string | null;
  allergy_tags: string[];  // inglés en DB, MANÍ/LACTOSA en UI
  photo_consent: boolean;
};
```

Mapeo edición (inverso del alta del spec 10): `full_name→nombre`, `birth_date→dd/mm/aaaa`, `room_id→sala`, `allergy_tags→texto` (join por coma, diccionario `peanut→maní, lactose→lactosa, gluten→gluten`), `medical_notes→notas`, `enrolled_at→ingreso`, `photo_consent→checkbox`, `status` no se toca.

RLS reutilizada (verificada por MCP el 2026-09-23, sin cambios): `children_select_same_daycare` (lectura), `children_staff_update` (staff solo sobre su `daycare`), `rooms_select_same_daycare`. Sin migración local en este spec.

---

## Implementation plan

1. `app/kids/[id]/page.tsx` a server component: `cookies()` + `createClient`, `getClaims()`, fetch `users.daycare_id`, luego `rooms` del daycare y `children` por `id` con `status active` y `room_id` en sus salas; inexistente → `KidProfileClient` con `child: null`.
2. Crear `app/kids/[id]/KidProfileClient.tsx`: recibe `child` + `rooms`, render actual con `childRowToKid`; estados `notice` (carga/error), modal editar y modal vincular en memoria.
3. Extender `AddKidModal` a modo edición: prop `initialValues: NewChildFields` + `submitLabel`; precarga form desde el niño (incluye conversión inversa de `allergy_tags`); validaciones SPEC 04/10 sin cambios.
4. Guardar edición: `UPDATE children` vía browser client con los 7 campos; éxito → cierra y revalida (`router.refresh()`); error → `saveError` inline sin cerrar ni duplicar.
5. Conservar `LinkParentModal` en memoria como hoy (append a estado local, `status PENDIENTE`); sin cambios visuales en `ParentRow`/`StatusPill`.
6. Calidad y evidencia (ver criterios).

Cada paso deja el sistema funcional.

---

## Acceptance criteria

- [x] `/kids/<uuid-real>` muestra nombre, sala, fechas, alergias y notas desde DB, sin datos hardcodeados.
- [x] `/kids/mateo` (slug viejo) y UUID inexistente muestran "Niño no encontrado".
- [x] Niño de otro `daycare` muestra "Niño no encontrado" (no fuga por RLS).
- [x] Botón Editar abre el modal precargado con los 7 valores actuales del niño.
- [x] Guardar nombre + sala + alergias válidos persiste en `children` y el perfil refleja el cambio tras recargar.
- [x] Nombre vacío → "El nombre es obligatorio"; fecha inválida/futura/<2000 → error inline; no cierra ni actualiza.
- [x] `enrolled_at` futura o anterior a nacimiento → error; `photo_consent` se persiste.
- [x] Alergias "maní, gluten" → `allergy_tags {peanut,gluten}`; vacío → `{}`.
- [x] Error de red/RLS muestra "No se pudo guardar, reintentá", modal abierto, sin duplicar.
- [x] Botón "Vincular otro padre" sigue abriendo el modal y agregando en memoria con pill PENDIENTE.
- [x] `npm run lint`, `npx tsc --noEmit` y `npm run build` pasan; `advisors` sin issues nuevos.
- [x] Screenshots `.playwright-mcp/` en 1280/768/375 (perfil + modal edición + guardado).

---

## Decisions

- **Yes:** solo UUID de Supabase; los slugs mock (`mateo`, `sofía`) mueren y dan "Niño no encontrado". Los mocks van desapareciendo según pedido explícito.
- **Yes:** edición con los mismos 7 campos del alta (opción 1a elegida por el usuario).
- **Yes:** reutilizar `AddKidModal` en modo edición en vez de un `EditKidModal` separado. Menos código duplicado, mismas validaciones.
- **Yes:** conservar el botón de vincular en memoria sin backend. El flujo real (`invitations` + `parent_children`) va al siguiente spec por decisión explícita.
- **Yes:** sin migración ni policies nuevas. Las policies `children_select_same_daycare` y `children_staff_update` ya cubren lectura y edición staff; verificado por MCP antes de escribir el spec.
- **Yes:** server component + hijo client, mismo patrón `@supabase/ssr` con cookies del spec 10.
- **No:** crear `invitations`/`parent_children`, código real, envío de email, aceptar invitación, archivar/borrar, resumen del día, normalizar alergias.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| `id` de la URL no es UUID válido y rompe el fetch | Validar formato antes del query; inválido → "Niño no encontrado" sin consultar |
| `UPDATE` bloqueado por RLS en el usuario demo | Probar como `gabriel@google.com` (staff); la policy `children_staff_update` ya existe |
| Precarga de alergias pierde tags desconocidos | Round-trip con el mismo diccionario del spec 10; tags fuera del diccionario se conservan en minúsculas |

---

## What is **not** in this spec

- Vincular padres real, `invitations`, `parent_children`, código de invitación, envío de email, cambio PENDIENTE → ACTIVA.
- Archivar, borrar o crear niños desde el perfil.
- Resumen del día, normalización de alergias, trigger de `updated_at`.
- Borrado de `app/data/kids.ts`.

Cada una de esas, si llega, va en su propio spec.
