# SPEC 02 — Páginas de niños y perfil del niño (responsive)

> **Status:** aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-09-18
> **Objective:** Implementar las páginas `/kids` (lista de niños) y `/kids/[id]` (perfil del niño) siguiendo `references/pantallas/ninos.dc.html` y `perfil-nino.dc.html`, con Tailwind, datos hardcodeados, verificación visual exacta vía Playwright y verificación de codigo actual de next con context7.

---

## Scope

**In:**

- Ruta `/kids`: encabezado "GESTIÓN / Niños", botón "Agregar niño", buscador funcional "Buscar niño…" que filtra por nombre en el cliente, divisor "SALA SOLES · 8 niños", grid de 8 tarjetas.
- Componente `KidCard`: avatar con inicial y color por niño, nombre, línea "X años · N padres vinculados", badge de alergia (MANÍ/LACTOSA), badge VINCULAR o chevron según datos.
- Ruta `/kids/[id]`: perfil dinámico por id — volver a Niños, avatar grande, nombre + sala, botón "Editar", alerta de alergias y notas, tarjeta info (fecha de nacimiento / sala / ingreso), botón "Resumen del día", tarjeta "PADRES VINCULADOS" con pill ACTIVA/PENDIENTE y "Vincular otro padre".
- Fallback "Niño no encontrado" para ids desconocidos.
- Datos hardcodeados en `app/data/kids.ts` con tipo `Kid` (8 niños).
- Sidebar: renombrar href `/ninos` → `/kids` y activar "Niños" también en `/kids/[id]` (match por prefijo).
- Responsive full como SPEC 01 (desktop ≥1024px, tablet y móvil <1024px, sidebar con hamburguesa/overlay).
- Botones a rutas futuras como links (Agregar niño → `/agregar-nino`, Editar → `/agregar-nino`, Resumen del día → `/resumen-dia`, Vincular otro padre → `/vincular-padre`).

**Out of scope (for future specs):**

- Páginas `agregar-nino`, `vincular-padre`, `resumen-dia`.
- Autenticación, sesión, base de datos o fetch real.
- Alta/edición real de niños o vínculos.

---

## Data model

```ts
// app/data/kids.ts
export type KidBadge = { label: string; bg: string; ink: string };

export type LinkedParent = {
  name: string;
  role: string;          // "Mamá · activa" | "Papá · invitación enviada"
  status: "ACTIVA" | "PENDIENTE";
};

export type Kid = {
  id: string;            // slug, ej. "mateo"
  name: string;
  initial: string;       // "M"
  avatarBg: string;      // "#A9D9E8"
  avatarInk: string;     // "#1F7A93"
  age: number;
  room: string;          // "Soles"
  allergyBadge?: KidBadge; // MANÍ o LACTOSA
  note: string;          // alerta de alergias y notas
  birthDate: string;     // "12 mar 2022"
  enrolledDate: string;  // "feb 2025"
  parents: LinkedParent[]; // vacío = "sin padres vinculados"
};

export const kids: Kid[]; // 8 niños, 1:1 con el template
```

Reglas de render del card: si `allergyBadge` existe → se muestra; si no hay y `parents.length === 0` → badge VINCULAR (`#F9D2DE`/`#C56486`); si no → chevron `#CBB89F`.

---

## Implementation plan

1. Añadir tokens de color faltantes en `app/globals.css`: pares de avatar (sky `#A9D9E8`/`#1F7A93`, pink `#F4B8CC`/`#C44A7A`, green `#B9DEC4`/`#3E8B62`, yellow `#F4DC8E`/`#9A7B1E`, purple `#C9B6E8`/`#7B5FC0`), alerta alergias (`#FBDAD6`, `#F4A8A0`, `#C5413A`, `#B25249`), pill PENDIENTE (`#F7E7A6`/`#9A7B1E`), badges MANÍ/VINCULAR.
2. Crear `app/data/kids.ts` con el tipo `Kid` y los 8 niños. Los campos extra del perfil (note/birthDate/enrolledDate/parents) se completan con datos plausibles coherentes con cada niño (Mateo: los exactos del template).
3. Actualizar `app/components/shared/Sidebar.tsx`: href `"/ninos"` → `"/kids"` y activo si `pathname === href || pathname.startsWith(href + "/")`.
4. Crear `app/components/kids/KidCard.tsx` (uso de `Link`).
5. Crear `app/kids/page.tsx` ("use client"): Sidebar + hamburguesa, header, botón Agregar niño, buscador con estado local que filtra `kids` por nombre (case-insensitive), divisor, grid `grid-cols-1 sm:grid-cols-2 gap-[14px]`, max-width 880px.
6. Crear `app/kids/[id]/page.tsx` ("use client"): lee `params.id`, `kids.find`, render del perfil según template; si no existe → aviso "Niño no encontrado" + link volver. Columna derecha de 300px apila debajo en móvil.
7. Verificación de calidad y visual (ver criterios).

---

## Acceptance criteria

- [ ] `npm run dev` arranca sin errores; `/kids` y `/kids/:id` responden 200.
- [ ] Desktop ≥1024px: `ninos.dc.html` se replica 1:1 — aside 248px sticky, "Niños" activo, header GESTIÓN/Niños, botón "Agregar niño" con gradiente `#F4977E → #EE8164` y sombra, buscador, divisor "SALA SOLES · 8 niños", grid 2 columnas con los 8 niños, badges MANÍ/LACTOSA/VINCULAR y chevrons según template, sin overflow horizontal.
- [ ] El buscador filtra por nombre en el cliente (ej. "mateo" deja 1 card; vacío restaura 8).
- [ ] `/kids/mateo` en desktop ≥1024px replica `perfil-nino.dc.html` 1:1: link "Volver a Niños", avatar 84px, "Mateo Fernández / 3 años · Sala Soles", botón "Editar", alerta de alergias, tarjeta info (12 mar 2022 / Soles / feb 2025), botón "Resumen del día", "PADRES VINCULADOS" con Lucía ACTIVA + Diego PENDIENTE + "Vincular otro padre".
- [ ] `/kids/:id` muestra los datos del niño correspondiente (nombre, inicial, color, edad, notas) — verificado en al menos 3 niños; `/kids/inexistente` muestra "Niño no encontrado".
- [ ] Móvil <1024px: grid 1 columna, sidebar hamburguesa/overlay funciona (reuso de SPEC 01), en el perfil la columna derecha queda debajo, sin overflow horizontal. Verificado en 375px y 768px.
- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` pasan.
- [ ] Screenshots de referencia en `.playwright-mcp/` (desktop 1280/1024, tablet 768, mobile 375) para `/kids` y `/kids/mateo`.

---

## Decisions

- **Yes:** Rutas `/kids` y `/kids/[id]` (pedido explícito). Implica renombrar el href `"/ninos"` del Sidebar de SPEC 01 a `"/kids"`.
- **Yes:** Perfil dinámico por id con `kids.find` y fallback "Niño no encontrado", en lugar de perfil fijo.
- **Yes:** Buscador funcional (filtro client-side por nombre) — decisión del usuario, rompe levemente la filosofía "solo maqueta" de SPEC 01.
- **Yes:** Botones a rutas futuras renderizados como links que hoy dan 404, siguiendo el precedente "Nueva publicación" de SPEC 01.
- **Yes:** Datos hardcodeados tipados en `app/data/kids.ts`; los campos extra del perfil de los 7 niños no presentes en el template se inventan de forma plausible.
- **Yes:** Responsive completo reutilizando el patrón de SPEC 01.
- **No:** páginas Agregar niño, Vincular padre, Resumen del día (van en specs futuros).
- **No:** backend, auth ni persistencia.

---

## What is **not** in this spec

- Páginas `agregar-nino`, `vincular-padre`, `resumen-dia`.
- Alta/edición real de niños o vínculos.
- Autenticación o base de datos.

Cada una de esas, si llega, va en su propio spec.