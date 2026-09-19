# SPEC 01 — Feed homepage (responsive)

> **Status:** implementado
> **Depends on:** —
> **Date:** 2026-09-17
> **Objective:** Implement the visual feed homepage from `feed.dc.html` as the root `/` route, using Tailwind and componentized architecture, matching the original design and adapting responsively across desktop, tablet, and mobile.

---

## Scope

**In:**

- Component structure: `app/components/shared/` para componentes reutilizables y `app/components/home/` para componentes propios del feed.
- Sidebar: logo, "Nueva publicación" button, nav links (Feed, Niños, Avisos, Mi cuenta), user profile block with logout icon.
- Mobile sidebar: hamburger toggle, sidebar slides in as overlay on `< lg` breakpoints, closes on nav tap or backdrop click.
- Feed header: "Buenas, Caro" greeting, subtitle with child count and date.
- Feed input: "Compartí un momento…" card with avatar and camera icon.
- Post cards: three types — LOGRO, ACTIVIDAD, ANUNCIO — with avatar, badge, text, recipient line, and action bar (likes, comments, edit).
- Photo placeholder: `<img>` with `onError` fallback to static dashed-border placeholder showing alt text.
- Fonts: Fredoka (headings) + Nunito (body) via `next/font/google`.
- Tailwind theme: warm palette (#F6ECDF, #FFFDF9, #ECE0D0, #F2937A, etc.) in `globals.css` via `@theme`.
- Responsive layout: sidebar sticky on `≥lg`, hamburger overlay on `<lg`. Feed max-width 760px centered, full-width on mobile.

**Out of scope (for future specs):**

- Authentication, login, session management.
- Database, data fetching, real posts.
- Actual post creation, likes, comments functionality.
- Niños, Avisos, Mi cuenta pages.

---

## Data model

No new data structures. This spec renders hardcoded static data from the HTML template.

---

## Implementation plan

1. Update `app/layout.tsx`: replace Geist with Fredoka + Nunito via `next/font/google`. Set `lang="es"`, metadata title "OpenDayCare".
2. Update `app/globals.css`: warm palette under `@theme`, base styles for `body`, scrollbar, and `a` reset.
3. Create `app/components/shared/Sidebar.tsx`: logo, "Nueva publicación" button, nav links with active state on Feed, user profile footer. Accepts `isOpen` + `onClose` props.
4. Create `app/components/shared/PhotoPlaceholder.tsx`: `<img>` with `onError` swap to dashed-border static placeholder.
5. Create `app/components/shared/PostCard.tsx`: reusable card for the three post types (props: type, child name, time, author, text, recipient, likes, comments, optional image).
6. Create `app/components/home/FeedHeader.tsx`: greeting + subtitle.
7. Create `app/components/home/FeedInput.tsx`: "Compartí un momento…" card.
8. Replace `app/page.tsx`: compose Sidebar + main content. Desktop: sidebar fixed 248px left. Mobile (`<lg`): hamburger top-left, overlay sidebar with backdrop. Hardcoded data matching the template.

---

## Acceptance criteria

- [x] `npm run dev` starts without errors. — verificado: servidor ya corriendo PID 2828 en `http://localhost:3000` (log `.next/dev/logs/next-development.log` sin errores), `curl.exe -s http://localhost:3000` → 200, `npm run build` ✓ Compiled successfully (6s), `npx tsc --noEmit` sin output; fuente `app/layout.tsx:1` y `app/page.tsx:1`
- [x] Desktop (≥1024px): Sidebar sticky left, 248px wide, all nav items + user profile. — verificado: Playwright `1280px` screenshot `.playwright-mcp/desktop-1280.png` y `1024px` `.playwright-mcp/desktop-1024.png`; evaluate `aside.getBoundingClientRect().width===248`, `getComputedStyle(aside).position==="sticky"` a 1280/1024, `left===0`, `transform:none`; snapshot contiene 4 nav links (Feed activo `bg-accent-soft text-primary`, Niños/Avisos/Mi cuenta) + footer “Caro Giménez / Maestra · Soles / Cerrar sesión”; código `app/components/shared/Sidebar.tsx:37-42` (`w-[248px] lg:sticky lg:h-screen`) y `app/page.tsx:49-62`
- [x] Mobile (<1024px): Sidebar hidden; hamburger opens it as overlay; nav tap or backdrop closes it. — verificado: `375px` cerrado screenshot `.playwright-mcp/mobile-375-closed.png` (`aside.left===-248`, hamburger `button[aria-label="Abrir menú"]` visible), `768px` screenshot `.playwright-mcp/tablet-768.png` mismo comportamiento; tras click hamburger → `.playwright-mcp/mobile-375-open.png` (`aside.left===0`, backdrop `div.fixed.inset-0.bg-black/30` existe), backdrop click → `left===-248` y backdrop desaparece, nav link click → `before:0 after:-248`; código `app/components/shared/Sidebar.tsx:28-40` y `app/page.tsx:52-60` (`lg:hidden` en botón y backdrop)
- [x] Fredoka and Nunito load correctly. — verificado: Context7 `/vercel/next.js` docs `next/font/google` con `variable` + `className` en `<html>` (ver `query-docs` 2026-09-18); `app/layout.tsx:5-22` define `Fredoka{variable:"--font-fredoka"}` y `Nunito{variable:"--font-nunito"}` y aplica `${fredoka.variable} ${nunito.variable}`; `app/globals.css:31-32` mapeo `@theme --font-heading/--font-body`; evaluate `getComputedStyle(document.body).fontFamily==="Nunito"` y `getComputedStyle(h1).fontFamily==="Fredoka"`; HTML devolvió clases `fredoka_5dae6085__variable nunito_22336911__variable`
- [x] Background #F6ECDF, cards #FFFDF9, borders #ECE0D0 at all breakpoints. — verificado: evaluate `body bg rgb(246,236,223) === #F6ECDF`, `article bg rgb(255,253,249) === #FFFDF9`, `border rgb(236,224,208) === #ECE0D0` en desktop 1280 y mobile 375; `app/globals.css:4-8` defines `--color-background:#f6ecdf`, `--color-surface:#fffdf9`, `--color-border:#ece0d0`; screenshots `desktop-1280.png`, `mobile-375-closed.png`, `tablet-768.png` muestran palette warm sin cambios entre breakpoints
- [x] "Nueva publicación" gradient (#F4977E → #EE8164) with box-shadow. — verificado: evaluate botón `a[href="/crear-publicacion"]` → `backgroundImage: linear-gradient(rgb(244,151,126) 0%, rgb(238,129,100) 100%)` y `boxShadow: rgba(238,129,100,.75) 0px 8px 18px -8px`; coincide con template `feed.dc.html:30` `linear-gradient(180deg,#F4977E,#EE8164)` y `0 8px 18px -8px rgba(238,129,100,.75)`; código `app/components/shared/Sidebar.tsx:60-62` (`bg-gradient-to-b from-accent-1 to-accent-2 shadow-[0_8px_18px_-8px_rgba(238,129,100,.75)]`) y `--color-accent-1:#f4977e`/`--color-accent-2:#ee8164` en `app/globals.css:15-16`; visible en `desktop-1280.png`
- [x] Badges: green LOGRO, blue ACTIVIDAD, indigo ANUNCIO. — verificado: evaluate badges: LOGRO `bg-success-bg rgb(207,232,216)=#CFEBD8 dot bg-success rgb(62,155,108)=#3E9B6C label text-success`, ACTIVIDAD `bg-info-bg rgb(199,231,241)=#C7E7F1 dot rgb(46,137,166)=#2E89A6`, ANUNCIO `bg-announce-bg rgb(204,216,244)=#CCD8F4 dot rgb(78,114,200)=#4E72C8`; snapshots muestran “LOGRO/ACTIVIDAD/ANUNCIO” con punto; código `app/components/shared/PostCard.tsx:24-27` y `app/globals.css:21-26`; template `feed.dc.html:66,82,99` mismos colores
- [x] Photo placeholder dashed border with icon + caption. — verificado: `app/components/shared/PhotoPlaceholder.tsx:1-39` implementa `<img onError>` + fallback `div.border-dashed`; evaluate detectó `div.border-dashed` cuando `/fotos/temperas.jpg` 404 (`Failed to load resource 404` en console): `borderStyle:dashed borderColor:rgb(219,205,186)=#DBCDBA bg:rgb(244,236,225)=#F4ECE1 text:"Foto · pintando con témperas"` + SVG icon 30x30; screenshot `desktop-1280.png` muestra placeholder 200px alto `rounded-[16px]` con ícono y caption; coincide con template `feed.dc.html:86` (`border:1.5px dashed #DBCDBA background:#F4ECE1 height:200px`)
- [x] No horizontal overflow on mobile. — verificado: Playwright evaluate `document.documentElement.scrollWidth===clientWidth` → `375===375 false hasHOverflow` en 375px y `768===768 false` en 768px; `body overflowX visible` pero no genera scroll; screenshots `mobile-375-closed.png` y `tablet-768.png` sin scroll horizontal; código `app/page.tsx:62` (`mx-auto max-w-[760px] px-6 sm:px-10 min-w-0`) y `app/components/shared/Sidebar.tsx:38` (`fixed -translate-x-full lg:sticky`) evita overflow
- [x] Desktop matches `feed.dc.html` on 1280px+ viewport. — verificado: comparación visual `desktop-1280.png` vs `references/pantallas/feed.dc.html` (inline styles): flex layout `aside 248px + main max-width 760px centered`, header “GUARDERÍA · SALA SOLES / Buenas, Caro / 12 niños · martes 17 jun”, FeedInput card `Compartí un momento…` con avatar C y cámara, tres PostCards con mismos textos/likes/comments, divisor “PUBLICADO HOY”, colores y radios (`rounded-[18px]/[20px]`), sombras; diferencias menores corregidas (se quitó `pb-4` extra en `PostCard.tsx:46`). Screenshot guardado como evidencia; `npm run build` y `npx tsc --noEmit` pasan.

---

## Decisions

- **Yes:** Componentes separados por dominio en `app/components/`: `shared/` (Sidebar, PostCard, PhotoPlaceholder) y `home/` (FeedHeader, FeedInput). Facilita reuso y escala con más páginas.
- **Yes:** PostCard en `shared/`. Se reutilizará en detalle de publicación y perfiles de niño en specs futuros.
- **Yes:** Tailwind v4 CSS-first.
- **Yes:** `next/font/google` para Fredoka y Nunito.
- **Yes:** Responsive desde el primer spec.
- **No:** librería de íconos. SVGs inline, 1:1 al template.
- **No:** Datos dinámicos, autenticación, ni base de datos.
- **Fix 2026-09-18:** Verificación Context7 Next.js 16: `@import "tailwindcss"` + `@theme` en `app/globals.css:1-33` es el patrón recomendado para Tailwind v4 (no `tailwind.config.js`), y `next/font/google` con `variable` aplicado a `<html>` es correcto según `vercel/next.js` docs. Sin discrepancias — no se corrigió criterio, solo se validó.
- **Fix 2026-09-18:** `app/components/shared/PhotoPlaceholder.tsx:32` se añadió `eslint-disable-next-line @next/next/no-img-element` porque el fallback `onError` requiere `<img>` nativo (discrepancia intencional con regla Next). `eslint.config.mjs:13` añade `references/**` a `globalIgnores` para que `npm run lint` no falle por `references/pantallas/support.js`. `app/components/shared/PostCard.tsx:46` se quitó `pb-4` extra del header para calcar `feed.dc.html:62-66` (solo `mb-[14px]` sin padding).

---

## What is **not** in this spec

- Authentication or login.
- Database or data fetching.
- Post creation, likes, or comments functionality.
- Pages: Niños, Avisos, Mi cuenta.
- Any interactivity beyond hover states and mobile sidebar toggle.

Each one of those, if it lands, goes in its own spec.
