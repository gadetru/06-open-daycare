# SPEC 06 — Modal crear publicación (responsive)

> **Status:** aprobado
> **Depends on:** SPEC 01 (feed del home que modifica; mismo patrón de modal que SPEC 04/05)
> **Date:** 2026-09-21
> **Objective:** Implementar un modal "Nueva publicación" que se abre desde el box "Compartí un momento…" y el botón "Nueva publicación" del Sidebar en la vista home, réplica de `references/pantallas/crear-publicacion.dc.html`, con validación de descripción/destino/tipo y alta del post en memoria al inicio del feed, sin crear la ruta `/crear-publicacion`.

---

## Scope

**In:**

- En home, el box `FeedInput` ("Compartí un momento…") y el botón "Nueva publicación" del `Sidebar` pasan de `Link` a `<button>` que abren el modal; no se navega a ninguna ruta.
- Réplica 1:1 de la card del template (máx. 580px, fondo `#FBF4EC`, borde `#ECE0D0`, radio 24, sombra): header `Cancelar` / `Nueva publicación` / `Publicar`.
- Sección PARA con pills de los 8 niños reales del seed (`app/data/kids.ts`): multi-selección; "Toda la sala" es exclusivo (al elegirlo limpia los niños; al elegir un niño lo deselecciona).
- Sección TIPO con los 7 tipos del template (Comida, Siesta, Actividad, Logro, Ánimo, Foto, Anuncio): selección única, sin default; cada tipo sin seleccionar muestra su chip claro, seleccionado se rellena con su color de tinta y texto blanco.
- Sección DESCRIPCIÓN textarea (placeholder "Contá cómo le fue hoy…"); sección FOTOS 100% estática (cuadro placeholder + botón "Agregar" del template, sin acción).
- Validación al pulsar "Publicar": descripción obligatoria (trim no vacío), al menos un destinatario (niño o sala), tipo obligatorio; errores inline bajo cada sección, se limpian al corregir; con errores no cierra ni publica.
- Publicar válido: agrega el post al estado del feed **al principio** (orden cronológico decreciente ya presente: 14:20 > 09:40 > 07:50), cierra el modal. `author: "vos"`, `likes: 0`, `comments: 0`, `time` = hora actual HH:MM, sin imagen.
- Cierre sin publicar: `Cancelar` (header), tecla `Esc` y clic en backdrop; scroll-lock del body; reabrir resetea el form.
- `PostCard` amplía `PostType` a los 7 tipos con sus colores; el layout del post no cambia.
- Responsive full (desktop ≥1024, tablet, móvil <1024) con el patrón SPEC 02/04.

**Out of scope (for future specs):**

- Ruta `/crear-publicacion` (no se crea; el link "Editar" de cada post y el botón del Sidebar en páginas que no son home siguen apuntando a 404, como hoy).
- Botón del Sidebar en `/kids`, `/kids/[id]`, `/login`, `/activar-cuenta`: no abre el modal; mantiene el `Link` actual.
- Subida real de fotos (el bloque FOTOS es decorativo); render de foto en el post nuevo.
- Persistencia: los posts nuevos viven solo en memoria de la sesión (se pierden al recargar). Decisión explícita del usuario: base preparada para una futura interacción con base de datos real.
- Editar/borrar posts, likes/comentarios, `/detalle-publicacion`, feed de familia.

---

## Data model

No cambia `app/data/kids.ts` ni `LinkedParent`. El tipo de post vive en `app/components/shared/PostCard.tsx`:

```ts
// app/components/shared/PostCard.tsx — se expande
export type PostType =
  | "COMIDA"
  | "SIESTA"
  | "ACTIVIDAD"
  | "LOGRO"
  | "ÁNIMO"
  | "FOTO"
  | "ANUNCIO";
```

Colores por tipo (transcritos del template, reutilizando tokens existentes donde coinciden):

| Tipo    | bg (chip claro) | ink (seleccionado) | Tokens |
| ------- | --------------- | ------------------ | ------ |
| COMIDA  | `#F7E7A6`       | `#9A7B1E`          | `pending-bg`/`pending-ink` |
| SIESTA  | `#E7DCF6`       | `#7B5FC0`          | nuevos `--color-type-siesta-*` |
| ACTIVIDAD | `#C7E7F1`     | `#2E89A6`          | `info-bg`/`info` |
| LOGRO   | `#CFE8D8`       | `#3E9B6C`          | `success-bg`/`success` |
| ÁNIMO   | `#F9D2DE`       | `#C56486`          | nuevos `--color-type-mood-*` |
| FOTO    | `#FBD8CC`       | `#D9684A`          | nuevos `--color-type-photo-*` |
| ANUNCIO | `#CCD8F4`       | `#4E72C8`          | `announce-bg`/`announce` |

```ts
// app/lib/posts-utils.ts — helpers puros, sin dependencias
buildRecipient(firstNames: string[]): string
// [] no aplica (validación previa); 1 → "familia de Mateo";
// ≥2 → "familias de Mateo, Sofía y Benjamín"; sala → "toda la sala".
```

Post publicado = `PostCardProps` (mismo shape que el seed). Los 3 posts hardcodeados de `app/page.tsx` pasan a un estado local `posts` (patrón `kidsState` de SPEC 04). El modal se nutre de `kids` (8 niños del seed) para las pills de PARA.

---

## Implementation plan

1. `app/globals.css`: agregar tokens `--color-type-siesta-{bg,ink}`, `--color-type-mood-{bg,ink}`, `--color-type-photo-{bg,ink}` (Comida reusa `pending`).
2. `app/components/shared/PostCard.tsx`: expandir `PostType` a 7 y agregar las entradas faltantes a `badgeStyles` (si no se agregan todas, TS rompe → se hace en el mismo paso).
3. Crear `app/lib/posts-utils.ts` con `buildRecipient` (nombres → strings "familia de…"/"toda la sala").
4. Crear `app/components/home/CreatePostModal.tsx` (`"use client"`): props `isOpen`, `onClose`, `onPublish(post)`. Estados destinatarios `{roomWide, kidIds}` / tipo / descripción / errores; multi-select PARA con sala exclusiva; tipo single-select; validación al Publicar; limpieza de errores; cierre `Cancelar`/`Esc`/backdrop; scroll-lock; reset al reabrir; layout 1:1 con el template.
5. `app/components/home/FeedInput.tsx`: de `Link` a `<button>` con prop `onClick`.
6. `app/components/shared/Sidebar.tsx`: prop opcional `onNewPost?` — si viene, el botón "Nueva publicación" es `<button>` que la llama; si no, mantiene el `Link` actual (páginas que no son home intactas).
7. `app/page.tsx`: `posts` en estado (seed local), `isCreateOpen`; wire del box y del Sidebar; render del modal; `onPublish` construye el post (childName = primer niño o "Anuncio general", recipient vía `buildRecipient`, time actual, author "vos", likes 0, comments 0) y lo prepende + cierra. Verificar `npx tsc --noEmit`.
8. Responsive: card centrada sin overflow horizontal en 768/375; pills usables.
9. Calidad y evidencia (ver criterios).

Cada paso deja el sistema funcional.

---

## Acceptance criteria

- [x] `npm run dev` arranca sin errores y `/` responde 200.
- [x] Desktop ≥1024: al pulsar "Compartí un momento…" o "Nueva publicación" (Sidebar) se abre el modal replicando `crear-publicacion.dc.html` 1:1 (card 580px, header Cancelar/Nueva publicación/Publicar, pills de PARA con los 8 niños + "Toda la sala", 7 chips de TIPO, textarea con placeholder, bloque FOTOS estático); la URL no cambia (no existe la ruta).
- [x] PARA multi-selección: clics alternados seleccionan/deseleccionan niños; elegir "Toda la sala" limpia los niños y viceversa; los pills reflejan el estado seleccionado (relleno oscuro).
- [x] TIPO: selección única; "Publicar" sin tipo → error "Elegí un tipo" y no publica; al elegir se limpia.
- [x] Descripción vacía o solo espacios → error "Escribí una descripción" y no publica; al tipear se limpia.
- [x] Sin destino → error "Elegí al menos un destinatario"; al elegir un niño o "Toda la sala" se limpia.
- [x] Publicar válido (tipo + descripción + destinatario) cierra el modal y el nuevo post aparece **al inicio** de "PUBLICADO HOY": badge con el color del tipo, "Para: familia de…", author "vos", likes 0, comments 0; los 3 posts del seed no se alteran.
- [x] Post a un solo niño → "Para: familia de Mateo"; a varios → "familias de Mateo, Sofía y Benjamín"; con "Toda la sala" → childName "Anuncio general" y "Para: toda la sala".
- [x] `Cancelar`, `Esc` y clic en backdrop cierran sin publicar; reabrir muestra el form vacío (reset).
- [x] Móvil/tablet 768/375: modal centrado sin overflow horizontal; chips de PARA/TIPO usables.
- [x] En `/kids` el botón del Sidebar sigue siendo Link a `/crear-publicacion` (comportamiento actual, sin cambios).
- [x] `npm run lint`, `npx tsc --noEmit` y `npm run build` pasan.
- [x] Screenshots de referencia en `.playwright-mcp/` (1280, 1024, 768, 375) con el modal abierto sobre `/`, comparados 1:1 contra la card de `references/pantallas/crear-publicacion.dc.html` en el mismo viewport.

---

## Decisions

- **Yes:** Modal en lugar de ruta `/crear-publicacion` para crear post (el box del feed y el botón del Sidebar en home pasan de `Link` a `<button>`). Precedente: SPEC 04/05.
- **Yes:** Botón del Sidebar solo abre el modal en home; en las demás páginas conserva el `Link` actual (404, out of scope). Elección del usuario: estado local en `app/page.tsx` (patrón SPEC 04/05) para dejar la base de una futura interacción con base de datos real.
- **Yes:** `PostType` se expande a los 7 tipos del template con sus colores transcritos; Comida reutiliza tokens `pending`, ACTIVIDAD/LOGRO/ANUNCIO los existentes; SIESTA/ÁNIMO/FOTO reciben tokens nuevos. Literal "ÁNIMO" con tilde (texto visible en español).
- **Yes:** Post nuevo se **prepende** al feed (el seed ya es cronológico descendente); `time` = hora actual, `author "vos"`, `likes 0`, `comments 0`.
- **Yes:** PARA multi-selección con "Toda la sala" exclusivo (destino = ≥1 niño o la sala); recipient derivado: "familia de X" / "familias de X, Y y Z" / "toda la sala"; `PostCard` sin cambios (se muestra el primer niño, consistente con feed.dc.html).
- **Yes:** Pills de PARA se generan de los 8 niños del seed (no hardcode de 3 como el template).
- **Yes:** Validación descripción + destino + tipo con errores inline y limpieza al corregir (patrón SPEC 04/05).
- **Yes:** FOTOS únicamente decorativas (subida real → spec futuro, precedente `foto.dc.html`).
- **Yes:** Cierre por `Cancelar` + `Esc` + backdrop, scroll-lock y reset al reabrir (patrón SPEC 04).
- **No:** ruta `/crear-publicacion`, persistencia en disco/DB, upload/nuevo render de fotos, edición o borrado de posts, likes/comentarios, `/detalle-publicacion`.

---

## What is **not** in this spec

- Ruta `/crear-publicacion` y el flujo página-a-página del template.
- Modal del Sidebar fuera de home (`/kids`, login, etc.).
- Subida real de fotos y render de imagen en posts nuevos.
- Persistencia en disco/localStorage/DB (memoria de sesión; preparado para DB a futuro).
- Editar/borrar posts, likes/comentarios, detalle de publicación, feed de familia.

Cada una de esas, si llega, va en su propio spec.