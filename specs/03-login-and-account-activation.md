# SPEC 03 — Páginas de login y activación de cuenta (responsive)

> **Status:** aprobado
> **Depends on:** SPEC 02
> **Date:** 2026-09-20
> **Objective:** Implementar las páginas estáticas `/login` y `/activar-cuenta` replicando `references/pantallas/login.dc.html` y `activar-cuenta.dc.html`, sin el selector "INGRESO COMO", standalone sin Sidebar, con datos pre-cargados idénticos al template, sin backend, reutilizando un `SunIcon` compartido y con verificación de imágenes 1:1 vía Playwright y de framework vía Context7.

---

## Scope

**In:**

- Ruta `/login`: réplica de `login.dc.html` **sin** el bloque "INGRESO COMO" (Personal / Familia). Rol fijado a Personal.
- Ruta `/activar-cuenta`: réplica de `activar-cuenta.dc.html` completa.
- Componente compartido `app/components/shared/SunIcon.tsx`: único SVG del sol (extraído de `Sidebar.tsx:115-132`), props `size` y `className`, `stroke="#fff"`. Se reutiliza en `Sidebar`, `/login` (26px) y `/activar-cuenta` (30px).
- Fondo propio de auth `#FBF4EC` (token nuevo), distinto del fondo global del feed (`#F6ECDF`).
- Ambas páginas **sin Sidebar** (pantallas standalone full-height).
- Prefils exactos del template: login email `caro@opendaycare.com`; activar cuenta código `7K4P9`, email `lucia.fernandez@gmail.com`, contraseña con valor visible `contraseña`.
- CTA login "Iniciar sesión" → `/familia-feed` (página futura, 404 hoy — precedente SPEC 02). Link "Activá tu cuenta" → `/activar-cuenta`.
- CTA "Activar mi cuenta" → `/familia-feed` (404 hoy). Link "¿Ya tenés cuenta? Iniciar sesión" → `/login`.
- "¿Olvidaste tu contraseña?" como texto inerte (span), tal cual el template.
- Responsive full (baseline SPEC 02): login grid 2 columnas en `≥lg`, columnas apiladas en `<lg`; activar-cuenta card centrada; sin overflow horizontal.
- Verificación visual vía Playwright (1280/1024/768/375) con screenshots en `.playwright-mcp/`, cada render comparado 1:1 contra su template HTML abierto en el mismo viewport.
- Validación de patrones de Next.js 16 / Tailwind v4 con Context7 antes de escribir cada paso, con registro en Decisions.

**Out of scope (for future specs):**

- Backend, autenticación real, sesión o base de datos.
- Validación de formularios, registro real de usuarios o activación real de código.
- Selector de rol "INGRESO COMO" y cualquier rol `familia`.
- Página `/familia-feed` (por ahora responde 404; va en su propio spec).
- Refactor mayor del Sidebar: únicamente se adopta `SunIcon` compartido; no se cambian layout, navegación ni colores.

---

## Data model

Esta spec no introduce estructuras de datos nuevas. Las páginas son estáticas; los valores mostrados son literales del template (`login.dc.html:78,86` y `activar-cuenta.dc.html:39,41-43`), sin estado ni fetch.

---

## Implementation plan

> Cada paso valida el patrón a usar con Context7 (`query-docs`) antes de escribir código, y deja el sistema funcional.

1. **Context7 — patrones base.** Validar con `/vercel/next.js`: server components sin `"use client"`, uso de `next/link` para CTAs y de `@theme` tal como ya aplica el repo (consistente con SPEC 01/02). Registrar resultado en Decisions.
2. **Tokens en `app/globals.css`.** Añadir `--color-auth-bg: #fbf4ec`, `--color-field-border: #eadfd0`, `--color-placeholder: #b6a99b`. El resto de colores reutiliza tokens existentes (`--color-ink`, `--color-ink-muted`, `--color-accent`, `--color-accent-1/2`, `--color-coral-deep`, `--color-avatar-sky-bg/ink`) o valores arbitrarios (gradientes multi-stop, `#F2A78E`, `#FBF1D6`, `#5FB97E`, `#8A7234`).
3. **Crear `app/components/shared/SunIcon.tsx`.** Extraer el SVG del sol de `Sidebar.tsx:115-132` a un componente con `size` (default `21`) y `className`; `stroke="#fff"`. Refactorizar `Sidebar` para importarlo desde ahí (se elimina la función `SunIcon` local). Verificación: screenshot antes/después sin cambio visual.
4. **Crear `app/login/page.tsx`** (server component, sin `"use client"`): grid `grid-cols-1 lg:grid-cols-[1.05fr_1fr]`, panel izquierdo gradiente `155deg #F6A98E → #F2937A → #EC7E62` con los 2 círculos decorativos, brand (caja 46px radio 14 con `SunIcon size={26}` + "OpenDayCare" Fredoka 21px), h1 "El día de cada niño, / compartido con su familia." (Fredoka 42px), párrafo y pie "🌿 Guardería Sala Soles". Columna derecha centrada máx. 392px: labels EMAIL/CONTRASEÑA, email `caro@opendaycare.com`, password placeholder `••••••••`, "¿Olvidaste tu contraseña?" inerte, CTA gradiente `#F4977E→#EE8164` + sombra `0 10px 22px -8px rgba(238,129,100,.7)` como `Link href="/familia-feed"`, pie con `Link` "Activá tu cuenta" → `/activar-cuenta`.
5. **Crear `app/activar-cuenta/page.tsx`** (server component): wrapper centrado `bg-auth-bg`, card máx. 440px con tile logo 58px gradiente `#F8C3A8→#F2937A` + sombra y `SunIcon size={30}`, h1 "Bienvenida a OpenDayCare", invitado "Mateo · Sala Soles" (avatar 44px `M` `#A9D9E8/#1F7A93`), inputs código `7K4P9` (Fredoka 18px, `letter-spacing 3px`), email `lucia.fernandez@gmail.com`, contraseña value `contraseña` (borde `#F2A78E`), checkbox de autorización (fondo `#FBF1D6`, check `#5FB97E`), CTA "Activar mi cuenta" → `Link href="/familia-feed"`, pie `Link` "Iniciar sesión" → `/login`.
6. **Responsive y overflow.** En `<lg` el login apila columnas (panel gradiente arriba pleno ancho, formulario abajo); decoración con `overflow-hidden`. Verificar `document.scrollWidth === clientWidth` en 768/375. Sin Sidebar en ninguna de las dos rutas.
7. **Context7 — verificación final de APIs usadas.** Validar que no se usan APIs obsoletas (server components, `Link`, `@theme`) y registrar en Decisions.
8. **Calidad y evidencia visual.** `npm run lint`, `npx tsc --noEmit`, `npm run build`, y screenshots Playwright 1:1 en `.playwright-mcp/` (ver criterios).

---

## Acceptance criteria

- [ ] `npm run dev` arranca sin errores; `/login` y `/activar-cuenta` responden 200.
- [ ] `app/components/shared/SunIcon.tsx` es la única fuente del SVG del sol: `Sidebar.tsx`, `/login` y `/activar-cuenta` lo importan (grep: sin `function SunIcon` ni SVG sol duplicado fuera de ese archivo); desktop ≥1024px no cambia visualmente vs previo.
- [ ] Desktop ≥1024px: `/login` replica `login.dc.html` 1:1 **sin** el bloque "INGRESO COMO": fondo `#FBF4EC`, grid 1.05fr/1fr, panel gradiente (circles, brand con sol, h1 dos líneas, párrafo max 430px, pie "🌿 Guardería Sala Soles"), columna derecha centrada máx. 392px, email prefill `caro@opendaycare.com`, placeholder `••••••••` en contraseña, "¿Olvidaste tu contraseña?" presente e inerte, CTA gradiente con sombra con `href="/familia-feed"`, link "Activá tu cuenta" → `/activar-cuenta`. Sin Sidebar (`aside` no presente).
- [ ] Desktop ≥1024px: `/activar-cuenta` replica `activar-cuenta.dc.html` 1:1: card centrada máx. 440px, tile logo 58px gradiente con sombra y sol, h1, invitado "Mateo · Sala Soles" (avatar `M` `#A9D9E8`/`#1F7A93`), inputs prefill (código `7K4P9`, email `lucia.fernandez@gmail.com`, contraseña value `contraseña` con borde `#F2A78E`), checkbox autorización `#FBF1D6` con check `#5FB97E`, CTA "Activar mi cuenta" con `href="/familia-feed"`, link "Iniciar sesión" → `/login`. Sin Sidebar.
- [ ] Las capturas de `/login` y `/activar-cuenta` se comparan 1:1 con `references/pantallas/login.dc.html` / `activar-cuenta.dc.html` abiertos en el mismo viewport (misma columna, mismo layout).
- [ ] No se crea `app/familia-feed/`: navegar desde los CTAs a `/familia-feed` devuelve 404 (href correcto verificado, página futura).
- [ ] Móvil/tablet `<1024px`: en `/login` las columnas se apilan (panel arriba, formulario abajo), sin overflow horizontal (`scrollWidth === clientWidth` en 768 y 375), sin Sidebar ni hamburguesa; `/activar-cuenta` se ve centrado correctamente en 768 y 375.
- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` pasan.
- [ ] Screenshots de referencia en `.playwright-mcp/` para `/login` y `/activar-cuenta` en 1280, 1024, 768 y 375 (nombres tipo `login-desktop-1280.png`, `activar-cuenta-mobile-375.png`).

---

## Decisions

- **Yes:** Extraer el sol a `app/components/shared/SunIcon.tsx` y reutilizarlo en Sidebar, `/login` y `/activar-cuenta`. **Reemplaza** la decisión previa de "logo duplicado": single source del SVG, consistencia y mantenibilidad.
- **Yes:** Eliminar el selector "INGRESO COMO" y fijar rol staff. Pedido explícito del usuario.
- **Yes:** CTA login "Iniciar sesión" → `/familia-feed` (página futura, 404 hoy). Reemplaza la decisión previa de `/` (precedente de links a rutas futuras de SPEC 02).
- **Yes:** CTA "Activar mi cuenta" → `/familia-feed` (igual a `activar-cuenta.dc.html:52` y consistente con el login).
- **Yes:** Prefill exacto del template (código, emails y contraseña visible `contraseña`). Réplica fiel; la implementación real queda para un spec futuro.
- **Yes:** Páginas standalone sin Sidebar, con fondo propio `#FBF4EC` vía token `--color-auth-bg`.
- **Yes:** Páginas server components (sin interactividad, sin estado).
- **Yes:** Validación Context7 por paso (server components, `Link`, `@theme`, APIs vigentes) con registro en Decisions, siguiendo el patrón de SPEC 01/02.
- **Yes:** Verificación de imágenes con Playwright 1:1 contra el template HTML en el mismo viewport.
- **Yes:** Mobile: apilar columnas del login.
- **No:** backend, auth, sesión ni persistencia.
- **No:** validación de formularios ni registro/activación real (queda para un spec futuro).
- **No:** refactor mayor del Sidebar (solo adopta `SunIcon`).
- **Context7 2026-09-20 (paso 1):** `/vercel/next.js/v16.2.9` validado: server components sin `"use client"` es el comportamiento por defecto del App Router (las páginas `app/login/page.tsx` y `app/activar-cuenta/page.tsx` serán server components estáticos); `next/link` (`Link`) es el patrón para navegación (CTAs "Iniciar sesión", "Activá tu cuenta", etc.); `@theme` en `app/globals.css` ya aplicado en el repo (SPEC 01/02), patrón Tailwind v4 correcto. Sin discrepancias.

---

## What is **not** in this spec

- Selector de rol "INGRESO COMO" y cualquier rol `familia`.
- Backend, autenticación real, sesión ni base de datos.
- Validación de formularios ni activación real de código de invitación.
- La página `/familia-feed` (hoy 404; va en su propio spec).
- Cambios funcionales o visuales en el Sidebar más allá de importar `SunIcon`.

Cada una de esas, si llega, va en su propio spec.