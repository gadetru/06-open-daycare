# SPEC 01 — Feed homepage (responsive)

> **Status:** aprobado
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

- [ ] `npm run dev` starts without errors.
- [ ] Desktop (≥1024px): Sidebar sticky left, 248px wide, all nav items + user profile.
- [ ] Mobile (<1024px): Sidebar hidden; hamburger opens it as overlay; nav tap or backdrop closes it.
- [ ] Fredoka and Nunito load correctly.
- [ ] Background #F6ECDF, cards #FFFDF9, borders #ECE0D0 at all breakpoints.
- [ ] "Nueva publicación" gradient (#F4977E → #EE8164) with box-shadow.
- [ ] Badges: green LOGRO, blue ACTIVIDAD, indigo ANUNCIO.
- [ ] Photo placeholder dashed border with icon + caption.
- [ ] No horizontal overflow on mobile.
- [ ] Desktop matches `feed.dc.html` on 1280px+ viewport.

---

## Decisions

- **Yes:** Componentes separados por dominio en `app/components/`: `shared/` (Sidebar, PostCard, PhotoPlaceholder) y `home/` (FeedHeader, FeedInput). Facilita reuso y escala con más páginas.
- **Yes:** PostCard en `shared/`. Se reutilizará en detalle de publicación y perfiles de niño en specs futuros.
- **Yes:** Tailwind v4 CSS-first.
- **Yes:** `next/font/google` para Fredoka y Nunito.
- **Yes:** Responsive desde el primer spec.
- **No:** librería de íconos. SVGs inline, 1:1 al template.
- **No:** Datos dinámicos, autenticación, ni base de datos.

---

## What is **not** in this spec

- Authentication or login.
- Database or data fetching.
- Post creation, likes, or comments functionality.
- Pages: Niños, Avisos, Mi cuenta.
- Any interactivity beyond hover states and mobile sidebar toggle.

Each one of those, if it lands, goes in its own spec.