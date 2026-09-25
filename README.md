# OpenDayCare

Aplicación web para guarderías, visual y responsive, construida con Next.js 16 + Tailwind v4 siguiendo los templates de `references/pantallas/` (spec-driven development).

La app tiene **backend real**: autenticación con Supabase Auth, datos de salas/niños/padres en Supabase Postgres (RLS activa) y envío de invitaciones por email con Resend. Implementa los specs 01-12: feed, lista y perfil de niños, login real, activación de cuenta e invitación/vinculación de padres.

> **Estado:** specs 01–11 implementados y spec 12 aprobado (invitación de padres con Resend + registro). El único módulo que sigue hardcodeado es el **feed** (`/` y `CreatePostModal`), candidato a un spec futuro.

## Rutas

| Ruta | Descripción | Spec |
| --- | --- | --- |
| `/` | Feed con publicaciones (logros, actividades y avisos) + modal de crear publicación | 01, 06 |
| `/kids` | Lista de niños agrupada por sala (desde la DB), buscador client-side + modal de alta real | 02, 04, 10 |
| `/kids/[id]` | Perfil del niño (alergias, info, padres) con invitaciones/padres reales + modal de vincular padre | 02, 05, 11, 12 |
| `/login` | Login real con Supabase Auth + banner de cuenta activada | 03, 09 |
| `/activar-cuenta` | Activación de cuenta del padre invitado (código + email) | 03, 12 |

> Los specs 01–06 viven en `specs/` (frontend) y los 07–12 en `specs/db/` (Supabase/DB).

## Stack

- [Next.js](https://nextjs.org) 16 + App Router (sin `src/`, el código vive en `app/`)
- [Supabase](https://supabase.com) — Auth + Postgres con RLS (`@supabase/supabase-js` + `@supabase/ssr`)
- [Resend](https://resend.com) — emails de invitación (server actions)
- [Tailwind CSS](https://tailwindcss.com) v4 (CSS-first, `@theme` en `app/globals.css`)
- Tipografías [Fredoka](https://fonts.google.com/specimen/Fredoka) (headings) + [Nunito](https://fonts.google.com/specimen/Nunito) (body) vía `next/font/google`
- TypeScript

## Configuración (variables de entorno)

El proyecto lee `.env` (gitignoreado). Copiá `.env.template` a `.env` y completá:

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (cliente) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (cliente, nunca anon/service_role) |
| `RESEND_API_KEY` | API key de Resend (server-only) |
| `RESEND_FROM_EMAIL` | Remitente de los emails de invitación (server-only) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key, solo server actions (server-only) |
| `SUPABASE_DB_PASSWORD` | Password de la DB (uso local/CLI) |

> ⚠️ Las claves server-only nunca se usan en Client Components.

## Getting Started

```bash
npm install
# copiar .env.template → .env y completar las claves
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) para ver el resultado.

Login de prueba (staff): `gabriel@google.com` / `1q2w3e4r5t`.

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
├── page.tsx                        # Feed homepage (root "/") → specs 01, 06 (hardcodeado)
├── globals.css                     # Tailwind + paleta cálida via @theme
├── actions/                        # Server actions ("use server") → spec 12
│   ├── auth.ts                     # logout
│   ├── invitations.ts              # createParentInvitation (código + email con Resend)
│   └── activations.ts              # getActivationContext + activateParentAccount (service role)
├── kids/
│   ├── page.tsx                    # Server component: salas + niños desde la DB → specs 02, 04, 10
│   ├── loading.tsx                 # Fallback de carga
│   ├── KidsClient.tsx              # UI client del listado (buscador + alta)
│   └── [id]/
│       ├── page.tsx                # Server component: perfil del niño + padres → specs 02, 05, 11, 12
│       └── KidProfileClient.tsx    # UI client del perfil (invitaciones + vínculos)
├── login/
│   ├── page.tsx                    # Login real con Supabase Auth → spec 09
│   └── LoginSuccessBanner.tsx      # Banner de "cuenta activada" (?activated=1)
├── activar-cuenta/
│   ├── page.tsx                    # Activación (server page con Suspense) → spec 12
│   └── ActivationForm.tsx          # Client form con prefill ?code=?email=
├── data/
│   ├── kids.ts                     # Tipos (Kid, LinkedParent) + seed solo del feed
│   └── rooms.ts                    # Sin uso (las salas vienen de la DB)
├── lib/
│   ├── dates.ts                    # Validación/formateo de fechas y edades
│   ├── kids-utils.ts               # childRowToKid, buildParentRows, alergias
│   └── posts-utils.ts              # buildRecipient (feed)
└── components/
    ├── shared/                     # Sidebar, PostCard, PhotoPlaceholder, SunIcon
    ├── home/                       # FeedHeader, FeedInput, CreatePostModal
    └── kids/                       # KidCard, AddKidModal, LinkParentModal
utils/supabase/                     # Clientes @supabase/ssr
├── server.ts                       # createClient(cookieStore) — Server Components/actions
├── client.ts                       # createClient() — Client Components
└── middleware.ts                   # updateSession(request) con getClaims()
proxy.ts                            # Sesión (Next.js 16 renombró middleware.ts → proxy.ts)
supabase/migrations/                # Réplica 1:1 del schema remoto (daycares → parent_children)
specs/                              # Especificaciones frontend (01-06)
specs/db/                           # Especificaciones Supabase/DB (07-12)
references/pantallas/               # Templates HTML de referencia visual
```

## Flujo de trabajo (Spec Driven Development)

1. Crear la especificación con `/spec` (las de DB/Supabase van en `specs/db/`).
2. Implementarla con `/spec-impl`.
3. Verificar los acceptance criteria con `@spec-verifier @specs/XX-nombre-del-spec.md` (o vía Task tool con la subagent `spec-verifier`).

Más detalles en `AGENTS.md`.

## Deploy en Vercel

La forma más fácil es usar la [Plataforma Vercel](https://vercel.com/new). Podés ver la [documentación de deploy de Next.js](https://nextjs.org/docs/app/building-your-application/deploying) para más detalles.