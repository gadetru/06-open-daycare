# SPEC 10 — Lista /kids y alta de niños contra Supabase

> **Status:** aprobado
> **Depends on:** SPEC 04 (modal agregar niño), SPEC 08 (`public.users` + RLS)
> **Date:** 2026-09-23
> **Objective:** La vista `/kids` lista salas y niños desde Supabase y el modal "Agregar niño" persiste en `public.children` asignado a su sala.

---

## Scope

**In:**

- Migración `rooms` + `children` (según `@db-schema` §§3–4) con RLS: staff full sobre su daycare, resto solo lectura.
- Seed: 3 salas (Soles, Estrellas, Arcoíris) + los 8 niños actuales en Soles con `status active`, `enrolled_at`, `photo_consent true`.
- `/kids` lee `rooms` + `children` reales (server component + client hijo para buscador/modal).
- `AddKidModal` funcional contra DB: nombre, fecha nac., sala (dropdown desde DB), alergias texto libre → `allergy_tags`, notas → `medical_notes`, fecha ingreso editable, checkbox consentimiento fotos.
- Niño sin padre: alta válida sin vínculo (cero filas asociadas).
- Estados: loading, vacío por sala, error de guardado sin cerrar modal.
- Archivo de migración local 1:1 en `supabase/migrations/`.

**Out of scope (for future specs):**

- Vincular padres / `invitations` / `parent_children` (el modal SPEC 05 queda en memoria como hoy).
- Perfil `/kids/[id]` contra DB (sigue leyendo `app/data/kids.ts`).
- Editar, archivar (`status archived`) o borrar niños.
- Normalizar alergias a tabla propia.

---

## Data model

```sql
-- rooms
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  daycare_id uuid not null references public.daycares(id),
  name text not null,
  created_at timestamptz not null default now(),
  unique (daycare_id, name)
);
-- children (recorte @db-schema §4)
create table public.children (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id),
  full_name text not null,
  birth_date date not null,
  enrolled_at date not null default current_date,
  medical_notes text,
  allergy_tags text[] not null default '{}',
  photo_consent boolean not null default true,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

```ts
// fila leída para la UI
type ChildRow = { id: string; room_id: string; room_name: string;
  full_name: string; birth_date: string; enrolled_at: string;
  medical_notes: string | null; allergy_tags: string[]; photo_consent: boolean };
```

Mapeo alta: `nombre→full_name`, `dd/mm/aaaa→birth_date`, `sala→room_id`, `alergias texto→allergy_tags` (split por coma, minúsculas, `peanut/lactose/gluten`, vacío=`{}`), `notas→medical_notes`, `ingreso→enrolled_at`, `checkbox→photo_consent`, `status='active'`.

---

## Implementation plan

1. Migración `create_rooms_children`: tablas, índices (`children(room_id)`, `rooms(daycare_id)`), RLS + policies staff-full/lectura, seed 3 salas + 8 niños en Soles. Verificar con `list_tables` + `execute_sql`.
2. `app/kids/page.tsx` a server component: `createClient(cookieStore)`, fetch `rooms` + `children` del daycare del usuario, agrupa por sala.
3. Nuevo `KidsClient.tsx`: buscador client-side, grid por sala con conteos, botón que abre modal.
4. Extender `AddKidModal`: props `rooms:{id,name}[]`; campos fecha ingreso (default hoy, máscara `dd/mm/aaaa`) + checkbox consentimiento (default true); validaciones SPEC 04 + `enrolled_at` no futura ni anterior a `birth_date`.
5. `onSave` inserta en `children` vía browser client; éxito → revalida lista y aparece bajo su sala; error → mensaje inline sin cerrar.
6. Retirar `kidsState` en memoria de `/kids` (el seed `app/data/kids.ts` queda solo para `/kids/[id]`).
7. Calidad + evidencia (ver criterios).

Cada paso deja el sistema funcional.

---

## Acceptance criteria

- [ ] `/kids` muestra headers `SALA SOLES · 8 niños`, `ESTRELLAS · 0`, `ARCOÍRIS · 0` (o conteos reales) desde DB, sin datos hardcodeados.
- [ ] Buscador filtra por nombre en cliente ("mateo" → 1 card).
- [ ] Alta válida con sala Estrellas persiste en `children` (`room_id` correcto) y la card aparece bajo ESTRELLAS tras guardar.
- [ ] Alta sin padres es válida (cero filas asociadas, sin error).
- [ ] Nombre vacío → "El nombre es obligatorio"; fecha inválida/futura/<2000 → error inline; no cierra ni inserta.
- [ ] `enrolled_at` futura o anterior a nacimiento → error; default hoy; `photo_consent` default true persistido.
- [ ] Alergias "maní, gluten" → `allergy_tags {peanut,gluten}`; vacío → `{}`.
- [ ] Error de red/RLS muestra "No se pudo guardar, reintentá", modal abierto, sin duplicar fila.
- [ ] `/kids/[id]` sin cambios (sigue mock SPEC 02/05).
- [ ] `lint`, `tsc --noEmit`, `build` pasan; `advisors` sin issues nuevos.
- [ ] Screenshots `.playwright-mcp/` en 1280/768/375 (lista + modal + alta).

---

## Decisions

- **Yes:** solo `rooms`+`children` + seed; invitations/vínculos a otro spec (pedido explícito tras la contradicción inicial).
- **Yes:** seed 3 salas + 8 niños en Soles (conserva visual actual, demuestra agrupación).
- **Yes:** server component + client hijo (patrón `@supabase/ssr` con cookies; decisión de fetch server-side).
- **Yes:** UI completa en alta (ingreso editable + consentimiento) con reglas estrictas (no futuro, no anterior a nacimiento).
- **Yes:** staff full / resto lectura (simple para demo; parents futuros en otro spec).
- **No:** tocar `/kids/[id]`, editar/archivar, normalizar alergias, trigger de `updated_at`.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| `rooms`/`children` no expuestas al Data API (GRANT) | Verificar fetch tras migrar; agregar GRANT a `authenticated` si 403 |
| RLS bloquea insert del staff demo | Policy `staff` por `daycare_id` del usuario; probar insert como `gabriel@google.com` |
| Seed duplica salas al re-ejecutar | `UNIQUE(daycare_id,name)` + `ON CONFLICT DO NOTHING` |

---

## What is **not** in this spec

- Vincular padres, `invitations`, `parent_children`, cambio PENDIENTE→ACTIVA.
- Perfil `/kids/[id]` contra DB.
- Editar/archivar/borrar niños.

Cada una de esas, si llega, va en su propio spec.
