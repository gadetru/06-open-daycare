<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## MCPs

- Playwright: Screenshots y cualquier cosa relacionada a Playwright tienen que estar en la carpeta `.playwright-mcp/`. Configurado en `opencode.json` (solo MCP local declarado).
- Context7: Usaremos este MCP para traer la documentación actualizada del framework (Next.js, Tailwind, etc.).

# Comandos

- `npm run dev` — dev server en http://localhost:3000
- `npm run build` — build de producción
- `npm run start` — sirve el build
- `npm run lint` — ESLint (único check de calidad)
- **No hay** suite de tests ni script de typecheck. Para verificar tipos usa `npx tsc --noEmit` (tsconfig ya tiene `noEmit: true`).

# Arquitectura y toolchain

- Next.js 16 + App Router. **No hay `src/`**: el código vive en `app/` en la raíz. Entrypoints: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `app/kids/page.tsx` y `app/kids/[id]/page.tsx` (rutas de negocio como client components que reusan `Sidebar` y manejo de hamburguesa/overlay; en `[id]` se usa `use(params)` para `params: Promise<{ id: string }>`).
- Tailwind v4 (CSS-first): **no existe `tailwind.config.js`**. El tema y fuentes se configuran en `app/globals.css` vía `@import "tailwindcss"` y `@theme`. PostCSS usa `@tailwindcss/postcss`.
- Alias de path `@/*` → raíz del repo (ver `tsconfig.json`).
- Datos hardcodeados tipados en `app/data/` (ej. `kids.ts` con el tipo `Kid` y 8 niños); no hay backend ni fetch real.
- `.env*` está en `.gitignore` silenciosamente (línea `*.tsbuildinfo`/`next-env.d.ts` también gitignoreados). No asumas que hay env config en el repo.
- `CLAUDE.md` solo referencia `@AGENTS.md`.

## Spec Driven Development -Skills
 
- /spec Utilizaremos esta skill para crear especificaciones.
- /spec-impl Usaremos esta skill para implementar las especificaciones.

## Agente spec-verifier

- `spec-verifier` es un subagente de opencode que verifica los **Acceptance criteria** de un spec contra el código real (Next.js 16) y screenshots reales vía Playwright MCP.
- Verifica cada check y lo marca como `[x]` en `specs/*.md` solo cuando pasa, con evidencia `archivo:línea` y rutas de screenshots.
- Corrige problemas menores de código para que los checks pasen **sin cambiar el scope** del spec.
- Corre `npm run lint`, `npx tsc --noEmit` y `npm run build` como validación de calidad.
- El status del spec solo pasa a `aprobado` con confirmación explícita del usuario.

### Comando de verify spec

`@spec-verifier @specs/XX-nombre-del-spec.md`

(o vía Task tool con subagent `spec-verifier`). Flujo del agente:

1. Levanta `npm run dev` si hace falta y verifica que responda 200.
2. Recorre cada Acceptance criteria con Playwright (desktop ≥1024px, tablet, mobile <1024px).
3. Compara el resultado visual contra la referencia del template (ej: `references/pantallas/*.html`).
4. Aplica fixes menores si es necesario y re-verifica.
5. Marca los checks `[x]` en el spec con evidencia, y reporta PASS/FAIL por criterio.

## Reglas de código.

- Usar código limpio, nombres y variables etc en inglés. 
- crear funciones con código sencillo de entender para un junior, no hacer funciones con letras simples para referenciar variables o parametros.
- crear funciones cortas, legibles y faciles de entender.
 