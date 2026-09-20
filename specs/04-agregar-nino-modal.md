# SPEC 04 — Modal agregar niño con validación (responsive)

> **Status:** aprobado
> **Depends on:** SPEC 02
> **Date:** 2026-09-20
> **Objective:** Implementar un modal "Agregar niño" que se abre desde el botón del mismo nombre en `/kids`, réplica de `references/pantallas/agregar-nino.dc.html`, con validación de campos, salas hardcodeadas y alta en el mock en memoria.

---

## Scope

**In:**

- Modal overlay sobre `/kids` al pulsar "Agregar niño" (el botón pasa de `Link` a `<button>` y no se navega a ninguna ruta).
- Réplica 1:1 de la card del template (máx. 520px, fondo `#FBF4EC`, borde `#ECE0D0`, radio 24, header con `Cancelar` / `Agregar niño` / `Guardar`).
- Campos: NOMBRE COMPLETO, FECHA DE NACIMIENTO (`dd/mm/aaaa` con auto-formato), SALA (selector custom con chevron), ALERGIAS (ETIQUETAS) opcional, NOTAS MÉDICAS opcional (textarea).
- Validación: nombre obligatorio (trim no vacío); fecha real de calendario (mes 1–12, día válido por mes incl. bisiestos, año entre `2000` y `hoy − 2 años`, sin futuro); sala siempre válida (default `Soles`); alergias y notas opcionales.
- Errores: borde rojo + mensaje inline bajo cada campo inválido; se limpian al corregir; `Guardar` con errores no cierra ni agrega.
- Cierre sin guardar: `Cancelar` (header), tecla `Esc` y clic en backdrop. Reabrir el modal resetea el form.
- Guardar válido: agrega el `Kid` al estado en memoria de `/kids`, cierra el modal y la lista se actualiza.
- Lista `/kids` con headers dinámicos por sala (agrupa `filteredKids` por `room` en el orden de `rooms`; solo se muestran salas con resultados) y conteo por sala.
- Datos derivados del nuevo niño: `id` slug del nombre, `initial`, avatar por ciclo de las 5 paletas existentes, `age` calculado, `birthDate` "5 may 2023", `enrolledDate` mes/año actual, `parents: []`, `allergyBadge` si alergias completas (label en mayúsculas, colores MANÍ `#FBD8CC`/`#D9684A`).
- Responsive full (desktop ≥1024, tablet, móvil <1024) con el patrón de SPEC 02.

**Out of scope (for future specs):**

- Ruta `/agregar-nino` (no se crea; el botón "Editar" del perfil sigue apuntando a 404).
- Persistencia: el mock vive solo en memoria de la sesión (se pierde al recargar).
- Alta real, edición, backend, auth o base de datos.
- Salas `Nubecitas` y demás (se fija 3 presets).

---

## Data model

```ts
// app/data/rooms.ts
export const rooms = ["Soles", "Estrellas", "Arcoíris"] as const;
export type RoomName = (typeof rooms)[number];
```

```ts
// app/lib/dates.ts — helpers puros, sin dependencias
daysInMonth(year, month)      // valida bisiestos
isRealDate(day, month, year)  // día real de calendario
formatShortDate(day, month, year) // "5 may 2023" (ene..dic)
getAgeInYears(birthDate)      // años cumplidos
getCurrentMonthYear()         // "sep 2026"
getMaxBirthDate()             // hoy − 2 años (límite superior fecha nac.)
```

```ts
// app/lib/kids-utils.ts
slugify(name)                 // "Martina López" → "martina-lopez"
getInitial(name)              // primera letra mayúscula
getAvatarFor(index)           // ciclo sky→pink→green→yellow→purple
buildNewKid(fields, index)    // → Kid completo (birthDate/enrolledDate/age/parents/allergyBadge/note)
```

No se modifica el tipo `Kid` ni `app/data/kids.ts` (los 8 niños siguen siendo la semilla). El nuevo niño se agrega a un estado local `kidsState` inicializado con `kids`.

---

## Implementation plan

1. `app/globals.css`: añadir tokens `--color-error-border: #d9583c` y `--color-error-text: #c5413a` (los colores de campo existentes ya cubren el resto).
2. Crear `app/data/rooms.ts`.
3. Crear `app/lib/dates.ts` con los helpers puros y tests de estructura inline (sin framework).
4. Crear `app/lib/kids-utils.ts`.
5. Crear `app/components/kids/AddKidModal.tsx` (`"use client"`): props `isOpen`, `onClose`, `onSave(kid)`; estado del form + errores; máscara de fecha (solo dígitos, inserta `/`); selector de sala custom con chevron y dropdown; validación al pulsar Guardar; limpieza de errores al editar; cierre por `Cancelar`/`Esc`/backdrop; scroll-lock del body; layout 1:1 con el template.
6. Actualizar `app/kids/page.tsx`: `kidsState`, botón `Agregar niño` como `<button>` que abre el modal, agrupación por sala con headers dinámicos, render del modal con `onSave` -> append + close. Sin cambios en buscador, Sidebar ni hamburguesa.
7. Responsive + sin overflow horizontal en 768/375.
8. Calidad y evidencia (ver criterios).

Cada paso deja el sistema funcional; el 1–2 y 3–4 son independientes.

---

## Acceptance criteria

- [ ] `npm run dev` arranca sin errores y `/kids` responde 200.
- [ ] Desktop ≥1024: al pulsar "Agregar niño" se abre el modal replicando `agregar-nino.dc.html` 1:1 (card 520px, header Cancelar/Agregar niño/Guardar, campos con bordes `#EADFD0` y placeholders `#B6A99B`); la URL no cambia (no existe la ruta).
- [ ] Nombre vacío o solo espacios → error inline "El nombre es obligatorio" (borde rojo) y no agrega; al tipear se limpia.
- [ ] Fechas inválidas muestran error: formato incorrecto, mes 13, día 65, `31/02/2021`, año `1999` (menor a 2000) y año futuro/recién nacido (ej. `2025`); válidas como `05/05/2023` y bisiestos `29/02/2024` pasan y `29/02/2023` falla.
- [ ] El input de fecha solo acepta dígitos e inserta `/` automáticamente (`dd/mm/aaaa`).
- [ ] `Guardar` con errores no cierra el modal ni agrega nada; los errores se muestran inline bajo cada campo.
- [ ] Guardar válido: cierra el modal, la card del nuevo niño aparece en `/kids` bajo su sala (header dinámico con su conteo) y la lista existente no se altera.
- [ ] Datos derivados correctos para `05/05/2023`: `birthDate: "5 may 2023"`, `age: 3`, `enrolledDate` = mes/año actual, `id` slug del nombre, `initial` primera letra, color siguiendo el ciclo de paletas.
- [ ] Con alergias completas: badge MANÍ (texto en mayúsculas, colores `#FBD8CC`/`#D9684A`); sin alergias y `parents []`: badge VINCULAR en la card.
- [ ] `Cancelar`, `Esc` y clic en backdrop cierran sin guardar; reabrir muestra el form vacío (reset).
- [ ] Móvil/tablet 768/375: modal centrado y sin overflow horizontal; el dropdown de sala es usable.
- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` pasan.
- [ ] Screenshots de referencia en `.playwright-mcp/` (1280, 1024, 768, 375) comparados 1:1 contra `references/pantallas/agregar-nino.dc.html` en el mismo viewport.

---

## Decisions

- **Yes:** Modal en lugar de página `agregar-nino` (no se crea la ruta). Pedido explícito; reemplaza el `Link` del botón por `<button>`.
- **Yes:** Salas fijas `["Soles", "Estrellas", "Arcoíris"]` en `app/data/rooms.ts`.
- **Yes:** Rango de fecha de nacimiento `2000 → hoy − 2 años` (niño ≥ 2 años, sin futuro).
- **Yes:** Lista `/kids` con agrupación y headers dinámicos por sala (hoy todas las tarjetas son Soles; el cambio solo se nota cuando hay niños en otras salas).
- **Yes:** Validación al pulsar Guardar con limpieza de errores al corregir; auto-formato de fecha.
- **Yes:** Datos derivados automáticos (slug, inicial, ciclo de paletas) sin elección manual por el usuario.
- **Yes:** Alergias como texto libre → un único `allergyBadge` con colores por defecto.
- **Yes:** Cierre por `Cancelar` + `Esc` + backdrop, y reset del form al reabrir (siempre que el guardado haya agotado el kid actual).
- **No:** ruta `/agregar-nino` (botón Editar del perfil sigue a 404), persistencia, backend, edición real, sala `Nubecitas`.
- **No:** persistencia entre sesiones (mock en memoria; el relanzamiento pierde los nuevos niños). A futuro se aplicará la misma lógica contra base de datos.

---

## What is **not** in this spec

- Ruta `/agregar-nino` y el flujo de edición desde el perfil (`Editar` → 404, como hoy).
- Persistencia en disco/localStorage/DB.
- Login, roles, vincular padres, resumen del día.
- Salas adicionales (`Nubecitas`) y selector multi-sala con migración de datos.

Cada una de esas, si llega, va en su propio spec.