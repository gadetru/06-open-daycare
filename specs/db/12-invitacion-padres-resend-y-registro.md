# SPEC 12 — Invitación de padres con Resend y registro de cuenta

> **Status:** aprobado
> **Depends on:** SPEC 05 (modal vincular padre), SPEC 08 (`public.users` + RLS), SPEC 09 (auth real + rutas públicas/protegidas), SPEC 10 (`rooms`/`children` + policies staff), SPEC 11 (perfil `/kids/[id]` contra DB)
> **Date:** 2026-09-24
> **Objective:** Hacer funcional el vínculo de un padre a un niño: el modal crea una invitación real (`invitations`), envía el código por email vía Resend y el padre activa su cuenta en `/activar-cuenta` con ese código, creando su `auth.user` (rol `parent`), su fila en `public.users` y el vínculo `parent_children`.

**Nota de entorno** (decisión del usuario): el archivo de variables es **`.env`** (no `.env.local`). Ambos están gitignoreados silenciosamente; `.env.template` documenta las claves.

---

## Scope

**In:**

- **Env y dependencia:** agregar a `.env` (y `.env.template`) `RESEND_API_KEY`, `RESEND_FROM_EMAIL` y `SUPABASE_SERVICE_ROLE_KEY` (server-only). Instalar el paquete npm `resend`.
- **Migración** `create_invitations_parent_children` (réplica 1:1 en `supabase/migrations/<ts>_create_invitations_parent_children.sql`):
  - Enums `public.relationship_type` (`father|mother|guardian`) e `public.invitation_status` (`pending|accepted|expired|cancelled`).
  - Tabla `public.invitations` (según `@db-schema` §6): `child_id`, `invited_by`, `full_name`, `email`, `relationship`, `code text unique`, `status` default `pending`, `expires_at`, `accepted_at`, `created_at`. Índices `child_id`, `email`.
  - Tabla `public.parent_children` (según `@db-schema` §5): `parent_id`, `child_id`, `relationship`, `created_at`, `UNIQUE(parent_id, child_id)`. Índices `parent_id`, `child_id`.
  - RLS activada en ambas; policies: staff del daycare insert/select sobre `invitations`; `parent_children` solo SELECT (staff del daycare y padre propio) — el INSERT lo hace el service role en la activación. GRANT a `authenticated`.
  - Nueva policy `users_staff_same_daycare_select` en `public.users` (staff puede leer `full_name` de los usuarios de su daycare para listar padres; no afecta `users_select_own`).
- **Lado staff:** server action `createParentInvitation` (`app/actions/invitations.ts`): valida nombre/email/relationship, genera código (5 chars, set sin ambiguos `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, retry ante colisión), inserta en `invitations` con el cliente autenticado por cookies (RLS staff), envía el email vía `resend` y retorna `{ code, expiresAt }`.
- **Email (HTML + texto plano):** branding OpenDayCare, "Te invitaron a seguir el día de {nombre} · Sala {sala}", código destacado, botón/link `BASE_URL/activar-cuenta?code=XXXX&email=...`, "El código vence en 7 días".
- **LinkParentModal real:** submit → server action; estados `submitting | sent | error`; al éxito muestra estado "sent" con el **código real generado** + "Vence en 7 días" y CTA deshabilitado "Invitación enviada"; error de red → "No se pudo enviar la invitación" inline sin cerrar; cierre por X/backdrop/Esc y reset al reabrir (patrón SPEC 04/05).
- **Perfil `/kids/[id]` real:** el server component fetchea `invitations` (status `pending`, `expires_at > now()`) y los padres aceptados (`parent_children` join `users` con `status active`) del niño; `KidProfileClient` reemplaza el estado en memoria: invitaciones → pill **PENDIENTE** (`role "Mamá · invitación enviada"`), vínculos → pill **ACTIVA** (`role "Mamá · activa"`). Mapeo `mother→Mamá`, `father→Papá`, `guardian→Tutor/a`.
- **`/activar-cuenta` funcional:** pasa a client component que lee `?code=` y `?email=` del link (prefill), código prefill editable, **email readonly**, contraseña (mín. 6), checkbox de autorización obligatorio para activar (no persiste), qué muestra el niño invitado dinámico ("{nombre} · Sala {sala}" desde la invitación). Valida y llama a la server action de activación.
- **Server action `activateParentAccount`** (`app/actions/activations.ts`): client admin con `SUPABASE_SERVICE_ROLE_KEY` (solo servidor) que: valida la invitación (`code` + `email` normalizados + `status pending` + no vencida) → `admin.auth.createUser({ email, password, email_confirm: true, user_metadata: { role: 'parent', full_name } })` → insert en `public.users` (`role parent`, `status active`, `daycare_id` del niño vía sala, `full_name` de la invitación) → insert en `parent_children` → `UPDATE invitations` a `status accepted` + `accepted_at`. Éxito → `redirect("/login?activated=1")`.
- **`/login` banner de éxito:** muestra "Tu cuenta fue activada. Ingresá con tu email y contraseña." cuando la URL trae `?activated=1`; desaparece al tipear o navegar.

**Out of scope (for future specs):**

- El feed del padre (`/familia-feed`) y el filtrado de posts por `parent_children`.
- Auto-login post-activación, reset de contraseña, reenvío/cancelación de invitaciones, cleanup de `expired` en DB.
- Tracking de entregas/webhooks de Resend.
- Rol `parent` en el guard del `proxy.ts` (se mantiene solo sesión activa; RLS protege los datos).

---

## Data model

```sql
create type public.relationship_type as enum ('father', 'mother', 'guardian');
create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'cancelled');

create table public.invitations (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references public.children(id) on delete cascade,
  invited_by  uuid not null references public.users(id),
  full_name   text not null,
  email       text not null,
  relationship public.relationship_type not null,
  code        text not null unique,
  status      public.invitation_status not null default 'pending',
  expires_at  timestamptz not null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);
create index invitations_child_id_idx on public.invitations (child_id);
create index invitations_email_idx on public.invitations (email);

create table public.parent_children (
  id uuid primary key default gen_random_uuid(),
  parent_id    uuid not null references public.users(id) on delete cascade,
  child_id     uuid not null references public.children(id) on delete cascade,
  relationship public.relationship_type not null,
  created_at   timestamptz not null default now(),
  unique (parent_id, child_id)
);
create index parent_children_parent_id_idx on public.parent_children (parent_id);
create index parent_children_child_id_idx on public.parent_children (child_id);
```

```ts
// fila para la UI del perfil (derivada de invitations / parent_children)
type ParentRowData = {
  name: string;
  email: string;                 // de la invitación; "" en parent_children (users no guarda email)
  role: string;                  // "Mamá · invitación enviada" | "Mamá · activa"
  status: "ACTIVA" | "PENDIENTE";
};
```

Mapeo: `relationship_type` ↔ UI: `mother→Mamá`, `father→Papá`, `guardian→Tutor/a`. Etiqueta por estado: pending → `"{parentesco} · invitación enviada"` (precedente Diego Fernández, spec 05); accepted → `"{parentesco} · activa"` (precedente Lucía Fernández).

---

## Implementation plan

> Cada paso valida patrones con Context7 si hace falta y deja el sistema funcional.

1. **Entorno:** agregar `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `SUPABASE_SERVICE_ROLE_KEY` a `.env` y `.env.template`; `npm install resend`. El service role va server-only (no en client components).
2. **Migración** `create_invitations_parent_children`: enums, tablas, índices, RLS (policies `invitations` staff insert/select por daycare del niño; `parent_children` select staff/padre; `users_staff_same_daycare_select`). Policies separadas por comando (precedente SPEC 10 fix: no `FOR ALL`). GRANT a `authenticated`. Verificar `supabase_list_tables` + `supabase_get_advisors`. Archivo local 1:1 en `supabase/migrations/`.
3. **Server action `createParentInvitation`** (`app/actions/invitations.ts`, `"use server"`): con `createClient(cookieStore)` inserta la invitación (RLS staff), genera código único con retry, envía email con `resend` (HTML string plano, sin deps extras), retorna `{ code, expiresAt }`. Verificación: fila creada en `invitations` y email recibido (sandbox) al probar como staff.
4. **LinkParentModal real:** reemplaza el `onSaveParent` en memoria por la llamada a la server action; nuevos estados `submitting | sent | error`; modo "sent" con código real y "Vence en 7 días"; sin bloque de código antes de enviar; errores inline existentes sin cambios.
5. **Perfil `/kids/[id]` real:** en `page.tsx` (server) agregar fetch de `invitations` (pending + vigentes) y de `parent_children`→`users` (active); pasar ambos al client. `KidProfileClient` construye `ParentRowData` y quita el estado local en memoria (`parents`), ahora derivado de props. La fila nueva aparece al recargar.
6. **`/activar-cuenta` funcional:** client component que lee `?code`/`?email` (useSearchParams dentro de Suspense o window.location), email readonly, contraseña con error <6 chars, checkbox requerido, niño invitado dinámico, errores inline en español que se limpian al tipear. Sin Sidebar (ruta pública).
7. **Server action `activateParentAccount`** (`app/actions/activations.ts`): flujo completo con admin client (service role). Manejo de errores: código inválido/vencido → "El código es inválido o venció"; email ya registrado → "Ya existe una cuenta con ese email". Si falla el insert de `users`/`parent_children` tras `createUser`, `admin.deleteUser` best-effort.
8. **`/login` banner:** leer `?activated=1` y mostrar el banner de éxito.
9. **Calidad + evidencia:** `npm run lint`, `npx tsc --noEmit`, `npm run build`, `supabase_get_advisors` (security/performance), screenshots en `.playwright-mcp/`.

---

## Acceptance criteria

- [ ] Env: `.env` tiene `RESEND_API_KEY`, `RESEND_FROM_EMAIL` y `SUPABASE_SERVICE_ROLE_KEY` (grep: no usadas en ningún client component); `resend` está en `package.json`.
- [ ] `invitations` + `parent_children` existen en `public` con los enums y UNIQUE(`code`) / UNIQUE(`parent_id`,`child_id`); advisors sin issues nuevos.
- [ ] Modal: submit válido como `gabriel@google.com` crea la fila en `invitations` (status `pending`, `expires_at` ≈ +7d, `relationship` correcto: Mamá→`mother`, Papá→`father`, Tutor/a→`guardian`), se dispara el email de Resend con código + link `?code=&email=`, y el modal pasa a estado "sent" mostrando el **código real** y "Vence en 7 días" con el CTA deshabilitado "Invitación enviada".
- [ ] Modal: nombre/email inválidos muestran los errores inline existentes (SPEC 05) y no crean fila; fallo de red/Resend muestra "No se pudo enviar la invitación" sin cerrar.
- [ ] Perfil: al recargar `/kids/[id]`, la invitación aparece en PADRES VINCULADOS con pill **PENDIENTE** y `role "Mamá · invitación enviada"` (leída de DB, no en memoria). Una invitación de un niño de otro daycare no es visible (RLS).
- [ ] `/activar-cuenta?code=7K4P9&email=lucia@x.com` prefill código y email; el email es readonly; sin query params muestra el form con invitado "Niño · Sala Soles" desde la invitación o error claro si el código falta/es inválido.
- [ ] Contraseña <6 chars → error inline "La contraseña debe tener al menos 6 caracteres"; checkbox sin marcar → no activa.
- [ ] Código válido + email + contraseña: crea el `auth.user` (email confirmado, login funciona), la fila en `public.users` (`role parent`, `status active`, `daycare_id` del niño), la fila en `parent_children` con el `relationship` correcto, y la invitación pasa a `status accepted` con `accepted_at`.
- [ ] Código inexistente o vencido → "El código es inválido o venció"; email con cuenta previa → "Ya existe una cuenta con ese email"; en ambos casos no hay filas nuevas.
- [ ] Tras activar: redirect a `/login?activated=1` y banner "Tu cuenta fue activada. Ingresá con tu email y contraseña."; el login con las credenciales del padre funciona y perfil muestra la fila con pill **ACTIVA** (`role "Mamá · activa"`) sin duplicados.
- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` pasan.
- [ ] Screenshots `.playwright-mcp/` en 1280/768/375 (modal form + estado sent, perfil con PENDIENTE, `/activar-cuenta` prefill + error, `/login` con banner, perfil con ACTIVA).

---

## Decisions

- **Yes:** flujo completo de punta a punta (invitación staff + registro del padre) en un solo spec. Elección del usuario.
- **Yes:** envío del email desde el servidor de Next.js con el paquete npm `resend` y `RESEND_API_KEY` en `.env` (el archivo de entorno del proyecto es `.env`, no `.env.local`). Elección del usuario.
- **Yes:** email con link `/activar-cuenta?code=&email=` que prefill los campos; email readonly en activación (evita errores de tipeo).
- **Yes:** código generado server-side (5 chars sin ambiguos, retry ante UNIQUE), mostrado en el modal en estado "sent" y enviado por email; vence en 7 días (paridad con el template).
- **Yes:** creación del padre con client admin (`SUPABASE_SERVICE_ROLE_KEY`, server-only) en una Server Action: `createUser` + insert `users` + `parent_children` + invitación `accepted`. Preferido a `signUp` + trigger/RPC por ser un solo lugar, sin email de confirmación duplicado de Supabase y con verificación del código, email y contraseña en el mismo paso.
- **Yes:** `parent_children` sin policies de escritura (su único creador es el flujo de activación vía service role); SELECT para staff del daycare y padre propio.
- **Yes:** nueva policy `users_staff_same_daycare_select` para poder listar nombres de padres aceptados en el perfil (join `parent_children`→`users`); no reemplaza `users_select_own`.
- **Yes:** checkbox de autorización en `/activar-cuenta` obligatorio para activar pero **no** se persiste (`photo_consent` es responsabilidad del staff en el alta, spec 10/11).
- **Yes:** sin auto-login; aterrizaje en `/login?activated=1` con banner. Evita mostrar el feed de staff a un padre.
- **No:** `/familia-feed` y feed del padre, reenvío/cancelación/expiración automática, tracking de entregas de Resend, guard por rol, signup abierto sin invitación.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Sin API key / dominio verificado de Resend (sandbox solo envía al email del owner) | `.env` con `RESEND_API_KEY` + `RESEND_FROM_EMAIL`; probar contra una dirección verificada; error de envío visible en el modal |
| `admin.createUser` no es transaccional con los inserts posteriores → `auth.user` huérfano si falla | En el catch de `activateParentAccount`, `admin.deleteUser` best-effort; mensaje genérico sin leaks |
| `SUPABASE_SERVICE_ROLE_KEY` se filtra al cliente | Solo en server actions; nunca importado desde `utils/supabase/client`; grep en QA |
| Colisión del código en `UNIQUE(code)` | Retry loop (máx. 3) en `createParentInvitation` |
| Policies específicas se cruzan (multiple permissive) | Policies separadas por comando (INSERT/SELECT), precedente fix SPEC 10; verificar con advisors |

---

## What is **not** in this spec

- Feed del padre (`/familia-feed`) y filtrado de posts por `parent_children`.
- Auto-login, reset de contraseña, reenviar/cancelar invitaciones, limpieza de `expired`.
- Tracking de entregas/webhooks de Resend.
- Guard por rol en `proxy.ts` y UI condicional por rol.
- Registro de usuarios sin invitación.

Cada una de esas, si llega, va en su propio spec.