# SPEC 05 — Modal vincular padre (responsive)

> **Status:** implementado
> **Depends on:** SPEC 02 (perfil de niño y tipo `LinkedParent`)
> **Date:** 2026-09-21
> **Objective:** Implementar un modal "Vincular padre" en `/kids/[id]` que se abre desde el botón hoy llamado "Vincular otro padre", réplica de `references/pantallas/vincular-padre.dc.html`, con validación de nombre y email, alta en memoria del padre con status `PENDIENTE` y sin crear la ruta `/vincular-padre`.

---

## Scope

**In:**

- En `/kids/[id]`, el enlace "Vincular otro padre" (`app/kids/[id]/page.tsx:148-158`) pasa de `Link` a `<button>` y abre el modal; no se navega a ninguna ruta.
- Réplica 1:1 de la card del template (máx. 480px, fondo `#FBF4EC`, borde `#ECE0D0`, radio 24): header "Vincular padre / a {nombre}" con X de cierre, callout info `#E3ECFB` con icono y texto "…Solo verá el feed de {primer nombre}", campos NOMBRE DEL PADRE/MADRE y EMAIL, PARENTESCO (Mamá/Papá/Tutor/a), bloque "CÓDIGO DE INVITACIÓN" `#FBF1D6`/dashed `#E6D08A` con `7K4P9` y "Vence en 7 días", CTA "Enviar invitación" (gradiente `#F4977E→#EE8164`, sombra, avioncito).
- Parentesco preseleccionado: Mamá (cómo viene en el template); los 3 botones son selectores tipo pill.
- Validación al pulsar "Enviar invitación": nombre obligatorio (trim no vacío) y email obligatorio con formato válido; errores inline bajo cada campo, se limpian al corregir; con errores no cierra ni agrega.
- Guardar válido: agrega un `LinkedParent` al final de la lista PADRES VINCULADOS con `role: "{parentesco} · invitación enviada"` y `status: "PENDIENTE"` (pill PENDIENTE existente), cierra el modal y la lista se actualiza.
- Cierre sin guardar: X del header, tecla `Esc` y clic en backdrop; scroll-lock del body; reabrir resetea el form.
- `app/data/kids.ts`: `email: string` se agrega a `LinkedParent` y se pueblan emails de los 11 padres existentes.
- Responsive full (desktop ≥1024, tablet, móvil <1024) con el patrón SPEC 02/04.

**Out of scope (for future specs):**

- Ruta `/vincular-padre` (no se crea; el flujo del template página-a-página queda descartado).
- Envío real de correo, activación del código o cambio de `PENDIENTE` → `ACTIVA` (spec futuro de auth/backend).
- Generación real del código de invitación o fecha de vencimiento.
- Persistencia: el nuevo padre vive solo en memoria de la sesión (se pierde al recargar).
- Editar o remover padres, `familia-feed`, cambios en `ParentRow`/`StatusPill`.

---

## Data model

```ts
// app/data/kids.ts — se modifica
export type LinkedParent = {
  name: string;
  email: string;   // nuevo
  role: string;
  status: "ACTIVA" | "PENDIENTE";
};
```

- Emails de seed de los padres existentes: Lucía Fernández → `lucia.fernandez@gmail.com` (consistente con `activar-cuenta` de SPEC 03); resto → placeholders `{nombre}.{apellido}@example.com`.
- Padre nuevo al guardar: `role: "{Mamá|Papá|Tutor/a} · invitación enviada"` (ej. "Papá · invitación enviada", precedente en el seed de Diego Fernández), `status: "PENDIENTE"`.
- No se agregan rutas, stores ni libs; el helper puro `isValidEmail` vive en el propio componente del modal (un solo validador, sin dependencias).

---

## Implementation plan

1. `app/data/kids.ts`: agregar `email` a `LinkedParent` y poblar los 11 padres existentes; verificar `npx tsc --noEmit`.
2. Crear `app/components/kids/LinkParentModal.tsx` (`"use client"`): props `isOpen`, `kidName`, `kidFirstName`, `onClose`, `onSaveParent(parent)`. Estados nombre/email/parentesco/errores; default Mamá; validación al enviar; limpieza de errores; scroll-lock; cierre X/Esc/backdrop; reset al reabrir; layout 1:1 con el template.
3. `app/kids/[id]/page.tsx`: estado local `parents` (inicializado con `kid.parents`), "Vincular otro padre" como `<button>` que abre el modal, render de `LinkParentModal`; `onSaveParent` construye el `LinkedParent` y hace append + close. Sin cambios en Sidebar, hamburguesa ni demás secciones.
4. Responsive: card centrada y sin overflow horizontal en 768/375; pills de parentesco y CTA usables.
5. Calidad y evidencia (ver criterios).

Cada paso deja el sistema funcional.

---

## Acceptance criteria

- [x] `npm run dev` arranca sin errores y `/kids/mateo` responde 200.
- [x] Desktop ≥1024: al pulsar "Vincular otro padre" se abre el modal replicando `vincular-padre.dc.html` 1:1 (card 480px, header "Vincular padre / a Mateo Fernández" con X, callout citando "el feed de Mateo", inputs con bordes `#EADFD0` y placeholders, PARENTESCO con Mamá preseleccionada, código `7K4P9` con "Vence en 7 días", CTA "Enviar invitación"); la URL no cambia (no existe la ruta).
- [x] Nombre vacío o solo espacios → error inline "El nombre es obligatorio" y no agrega; al tipear se limpia.
- [x] Email vacío → error "Ingresá el email"; formato inválido (ej. `abc`, `a@b`) → "Ingresá un email válido"; errores limpios al corregir.
- [x] "Enviar invitación" con errores no cierra el modal ni agrega nada; los errores se muestran inline bajo cada campo.
- [x] Guardar válido: cierra el modal, la nueva fila aparece al final de PADRES VINCULADOS con avatar por ciclo, `role` según parentesco ("· invitación enviada") y pill PENDIENTE; los padres existentes no se alteran.
- [x] Parentesco: los 3 botones (Mamá/Papá/Tutor/a) seleccionan y el role guardado es consistente.
- [x] X del header, `Esc` y clic en backdrop cierran sin guardar; reabrir muestra el form vacío (nombre/email vacíos, Mamá preseleccionada).
- [x] Móvil/tablet 768/375: modal centrado sin overflow horizontal; pills y CTA usables.
- [x] Emails de seed correctos (`lucia.fernandez@gmail.com` para Lucía) y `npx tsc --noEmit` sin errores con el nuevo campo obligatorio.
- [x] `npm run lint`, `npx tsc --noEmit` y `npm run build` pasan.
- [x] Screenshots de referencia en `.playwright-mcp/` (1280, 1024, 768, 375) con el modal abierto sobre `/kids/mateo`, comparados 1:1 contra la card de `references/pantallas/vincular-padre.dc.html` en el mismo viewport.

---

## Decisions

- **Yes:** Modal en lugar de ruta `/vincular-padre` (el botón pasa de `Link` a `<button>`). Pedido explícito; mismo precedente que el botón "Agregar niño" de SPEC 04.
- **Yes:** Persistencia en memoria en `[id]/page.tsx` (estado local; se pierde al recargar), coherente con `kidsState` de SPEC 04.
- **Yes:** Agregar `email: string` a `LinkedParent` (obligatorio) y poblar los padres existentes del seed; `lucia.fernandez@gmail.com` reutiliza el email de `activar-cuenta.dc.html` de SPEC 03.
- **Yes:** Validación nombre + email (obligatorios, formato email) con errores inline estilo `AddKidModal` y limpieza al corregir.
- **Yes:** Código de invitación estático `7K4P9` y "Vence en 7 días" (réplica 1:1 y consistente con `activar-cuenta`); la generación real queda para el spec de auth.
- **Yes:** Parentesco preseleccionado Mamá, tal cual el template; `role` derivado `"{parentesco} · invitación enviada"` (precedente: Diego Fernández en el seed).
- **Yes:** Cierre por X + `Esc` + backdrop y reset al reabrir (patrón SPEC 04), scroll-lock del body.
- **No:** ruta `/vincular-padre`, envío real de correos, activación del código (`PENDIENTE` → `ACTIVA`), generación real del código, persistencia entre sesiones, edición/remoción de padres, cambios en `familia-feed` o en `ParentRow`/`StatusPill`.

---

## What is **not** in this spec

- Ruta `/vincular-padre` y el flujo página-a-página del template.
- Envío real de la invitación, activación del código y transición a `ACTIVA`.
- Generación real del código de invitación / vencimiento.
- Persistencia en disco/localStorage/DB.
- Editar o remover padres vinculados, y el feed de familia.

Cada una de esas, si llega, va en su propio spec.