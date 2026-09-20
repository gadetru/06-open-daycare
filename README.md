# OpenDayCare

Aplicación web para guarderías, visual y responsive, construida con Next.js 16 + Tailwind v4 siguiendo los templates de `references/pantallas/` (spec-driven development). Hoy implementa: feed de publicaciones (logros, actividades y avisos), lista de niños y perfil de niño.

## Rutas

| Ruta | Descripción | Spec |
| --- | --- | --- |
| `/` | Feed con publicaciones (logros, actividades y avisos) | 01 |
| `/kids` | Lista de niños con buscador client-side | 02 |
| `/kids/[id]` | Perfil del niño (alergias, info, padres vinculados) | 02 |

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
├── page.tsx                        # Feed homepage (root "/") → spec 01
├── globals.css                     # Tailwind + paleta cálida via @theme
├── kids/
│   ├── page.tsx                    # Lista de niños + buscador client-side → spec 02
│   └── [id]/page.tsx               # Perfil del niño → spec 02
├── data/
│   └── kids.ts                     # Datos hardcodeados tipados (tipo Kid, 8 niños)
└── components/
    ├── shared/                     # Sidebar, PostCard, PhotoPlaceholder
    ├── home/                       # FeedHeader, FeedInput
    └── kids/                       # KidCard
specs/                              # Especificaciones (01 feed, 02 kids) — spec-driven development
references/pantallas/               # Templates HTML de referencia visual
```

## Flujo de trabajo (Spec Driven Development)

1. Crear la especificación con `/spec`.
2. Implementarla con `/spec-impl`.
3. Verificar los acceptance criteria con `@spec-verifier @specs/XX-nombre-del-spec.md` (o vía Task tool con la subagent `spec-verifier`).

Más detalles en `AGENTS.md`.

## Deploy en Vercel

La forma más fácil es usar la [Plataforma Vercel](https://vercel.com/new). Podés ver la [documentación de deploy de Next.js](https://nextjs.org/docs/app/building-your-application/deploying) para más detalles.