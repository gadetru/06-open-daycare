# OpenDayCare

Aplicación web para guarderías, visual y responsive, construida con Next.js 16 + Tailwind v4 siguiendo los templates de `references/pantallas/` (spec-driven development). Implementa los specs 01-06: feed de publicaciones (logros, actividades y avisos, con modal de creación), lista de niños, perfil de niño, login, activación de cuenta y modales de alta (niño y vinculación de padres). Todo el estado es en memoria (client-side), sin backend.

## Rutas

| Ruta | Descripción | Spec |
| --- | --- | --- |
| `/` | Feed con publicaciones (logros, actividades y avisos) + modal de crear publicación | 01, 06 |
| `/kids` | Lista de niños agrupada por sala, con buscador client-side + modal de agregar niño | 02, 04 |
| `/kids/[id]` | Perfil del niño (alergias, info, padres vinculados) + modal de vincular padre | 02, 05 |
| `/login` | Login (estático, sin autenticación real) | 03 |
| `/activar-cuenta` | Activación de cuenta (estático) | 03 |

> La columna Spec refleja los specs de `specs/` (01-04 implementado, 05-06 aprobado).

## Stack

- [Next.js](https://nextjs.org) 16 + App Router (sin `src/`, el código vive en `app/`)
- [Tailwind CSS](https://tailwindcss.com) v4 (CSS-first, `@theme` en `app/globals.css`)
- Tipografías [Fredoka](https://fonts.google.com/specimen/Fredoka) (headings) + [Nunito](https://fonts.google.com/specimen/Nunito) (body) vía `next/font/google`
- TypeScript

## Getting Started

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) para ver el resultado.

## Comandos

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Dev server en http://localhost:3000 |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build |
| `npm run lint` | ESLint (único check de calidad) |
| `npx tsc --noEmit` | Verificación de tipos |

> No hay suite de tests. `tsconfig.json` ya tiene `noEmit: true`.

## Estructura

```
app/
├── layout.tsx                      # Fonts (Fredoka/Nunito), lang="es", metadata
├── page.tsx                        # Feed homepage (root "/") → specs 01, 06
├── globals.css                     # Tailwind + paleta cálida via @theme
├── kids/
│   ├── page.tsx                    # Lista de niños + buscador + modal agregar → specs 02, 04
│   └── [id]/page.tsx               # Perfil del niño + modal vincular padre → specs 02, 05
├── login/
│   └── page.tsx                    # Login estático → spec 03
├── activar-cuenta/
│   └── page.tsx                    # Activación de cuenta estática → spec 03
├── data/
│   ├── kids.ts                     # Datos hardcodeados tipados (tipo Kid y LinkedParent, 8 niños)
│   └── rooms.ts                    # Salas (Soles, Estrellas, Arcoíris)
├── lib/
│   ├── dates.ts                    # Validación/formateo de fechas y edades
│   ├── kids-utils.ts               # buildNewKid, slugify, getInitial, avatares
│   └── posts-utils.ts              # buildRecipient (destinatarios de publicaciones)
└── components/
    ├── shared/                     # Sidebar, PostCard, PhotoPlaceholder, SunIcon
    ├── home/                       # FeedHeader, FeedInput, CreatePostModal
    └── kids/                       # KidCard, AddKidModal, LinkParentModal
specs/                              # Especificaciones (01-06) — spec-driven development
references/pantallas/               # Templates HTML de referencia visual
```

## Flujo de trabajo (Spec Driven Development)

1. Crear la especificación con `/spec`.
2. Implementarla con `/spec-impl`.
3. Verificar los acceptance criteria con `@spec-verifier @specs/XX-nombre-del-spec.md` (o vía Task tool con la subagent `spec-verifier`).

Más detalles en `AGENTS.md`.

## Deploy en Vercel

La forma más fácil es usar la [Plataforma Vercel](https://vercel.com/new). Podés ver la [documentación de deploy de Next.js](https://nextjs.org/docs/app/building-your-application/deploying) para más detalles.