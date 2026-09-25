# OpenDayCare

Aplicación web responsive para guarderías, construida con Next.js 16, React 19, TypeScript y Tailwind CSS v4.

La aplicación usa Supabase para autenticación y datos, con Row Level Security (RLS) activo en las tablas públicas. El flujo de staff puede invitar a un padre, enviarle un email con Resend y registrar/activar la cuenta del padre. El feed visual todavía funciona con datos locales en memoria.

## Estado actual

La implementación actual incluye:

- Login real con Supabase Auth.
- Protección de sesión mediante `proxy.ts`.
- Listado de salas y niños desde Supabase.
- Alta de niños mediante la API de Supabase.
- Perfil de niño con datos de la base.
- Invitaciones de padres persistidas en `public.invitations`.
- Envío de invitaciones desde una Server Action con Resend.
- Activación de cuentas de padres desde `/activar-cuenta`.
- Creación del `auth.user`, de la fila en `public.users` y del vínculo en `public.parent_children`.
- RLS y políticas por guardería para las tablas públicas.

La instancia Supabase conectada fue verificada con estas tablas públicas:

- `daycares`
- `users`
- `rooms`
- `children`
- `invitations`
- `parent_children`

Todas tienen RLS habilitado. La base actual también contiene datos seed de guardería, salas, niños y un usuario staff de demostración.

## Requisitos

- Node.js `>=20.9.0` para Next.js 16. El entorno actual fue probado con Node.js `v24.21.0`.
- npm 10 o superior. El entorno actual usa npm `11.16.0`.
- Un proyecto de Supabase con el schema aplicado.
- Una cuenta y una API key de Resend para probar el envío de invitaciones.
- Git, si se va a clonar el repositorio.

No hace falta levantar un Supabase local para ejecutar la aplicación: el código se conecta al proyecto Supabase configurado mediante `.env`.

## Levantar el proyecto

### 1. Instalar dependencias

Desde la raíz del repositorio:

```bash
npm ci
```

`npm ci` usa `package-lock.json` y es la opción recomendada para una instalación reproducible. Si se van a modificar dependencias y se necesita actualizar el lockfile, usar `npm install`.

### 2. Crear el archivo de entorno

El proyecto utiliza `.env` y no `.env.local`.

En PowerShell:

```powershell
Copy-Item .env.template .env
```

En Linux o macOS:

```bash
cp .env.template .env
```

Después, completar los valores de `.env`. No copiar claves reales al repositorio: `.env` está ignorado por Git y `.env.template` solo contiene valores de ejemplo.

### 3. Configurar Supabase

En el Dashboard de Supabase, obtener:

- La URL del proyecto desde **Project Settings → API**.
- La publishable key desde **Project Settings → API Keys**.

En la configuración actual se usan el cliente SSR de Supabase y una publishable key para el navegador y los servidores de la aplicación. La service role key es únicamente para operaciones administrativas del servidor y nunca debe exponerse como una variable `NEXT_PUBLIC_*`.

El flujo staff de demostración se crea mediante las migraciones:

- Email: `gabriel@google.com`
- Contraseña: `1q2w3e4r5t`

Estas credenciales son únicamente para desarrollo. Hay que reemplazarlas o eliminar el seed antes de compartir o publicar el proyecto.

### 4. Configurar Resend

Para enviar invitaciones, completar:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

En desarrollo, Resend puede funcionar con el remitente de sandbox. Para entregas reales hay que verificar el dominio de Resend y usar un remitente permitido. Si se omite `RESEND_FROM_EMAIL`, el código utiliza un remitente de fallback de onboarding; no es recomendable para producción.

Sin una API key válida, el login y el listado de niños pueden funcionar, pero el envío de invitaciones mostrará un error.

### 5. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

Para probar desde otro dispositivo de la misma red, se puede iniciar Next.js escuchando en la red local:

```bash
npm run dev -- --hostname 0.0.0.0
```

La configuración de `next.config.ts` permite orígenes de desarrollo `192.168.*.*`.

## Variables de entorno

| Variable | Ámbito | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente | URL del proyecto Supabase. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Cliente | Publishable key para Supabase Auth y Data API. |
| `RESEND_API_KEY` | Solo servidor | API key del cliente de Resend. |
| `RESEND_FROM_EMAIL` | Solo servidor | Remitente de los emails de invitación. |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor | Cliente administrativo usado durante la activación de padres. |
| `SUPABASE_DB_PASSWORD` | Herramientas | Password de PostgreSQL para CLI o administración; no la usa el runtime de Next.js. |

Reglas importantes:

- No usar `SUPABASE_SERVICE_ROLE_KEY` en Client Components, middleware del navegador, HTML público ni logs.
- No nombrar ninguna clave server-only con el prefijo `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sí está disponible para el navegador, pero no reemplaza la service role key.
- Las variables de entorno se cargan al iniciar Next.js. Después de cambiarlas, reiniciar el servidor de desarrollo si es necesario.

## Cómo se conecta la aplicación con Supabase

La aplicación usa siempre los clientes oficiales `@supabase/ssr` y `@supabase/supabase-js`.

### Cliente de navegador

`utils/supabase/client.ts` crea un `createBrowserClient` con:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Se utiliza, entre otras cosas, para:

- `signInWithPassword` en el login.
- Consultar el perfil del usuario en el sidebar.
- Insertar niños desde `KidsClient`.
- Operaciones de interfaz que necesitan la sesión del navegador.

### Cliente de servidor

`utils/supabase/server.ts` crea un `createServerClient` usando las cookies de la request. Se utiliza en Server Components y Server Actions para:

- Leer la sesión del usuario.
- Consultar `daycares`, `rooms`, `children`, `users`, `invitations` y `parent_children`.
- Aplicar las políticas RLS usando la identidad del usuario autenticado.
- Mantener la sesión y sus cookies sincronizadas.

Las páginas de niños no reciben un service role: consultan con la sesión del usuario y dependen de RLS para no exponer datos de otra guardería.

### Proxy y sesión

`proxy.ts` es el punto de entrada de la protección de rutas en Next.js 16. Delega en `utils/supabase/middleware.ts`, que:

1. Crea un cliente SSR con las cookies de la request.
2. Actualiza/refresca la sesión con `supabase.auth.getClaims()`.
3. Redirige a `/login` si una ruta protegida no tiene sesión.
4. Redirige a `/` si un usuario autenticado visita `/login`.

Rutas públicas:

- `/login`
- `/activar-cuenta`

Rutas protegidas por sesión:

- `/`
- `/kids`
- `/kids/[id]`

La protección actual verifica que exista una sesión, pero no verifica el rol. Un usuario `parent` puede entrar visualmente a las pantallas de staff; el aislamiento de datos depende de RLS. El guard por rol todavía no está implementado.

### Server Actions

Las Server Actions se encuentran en `app/actions/`:

- `auth.ts`: cierra la sesión con el cliente de cookies.
- `invitations.ts`: valida la invitation, comprueba la sesión staff, inserta la invitación y llama a Resend.
- `activations.ts`: valida el código, crea el usuario con el cliente administrativo, inserta `users` y `parent_children`, acepta la invitación y redirige al login.

`app/actions/activations.ts` es el único lugar donde se usa `SUPABASE_SERVICE_ROLE_KEY`. El cliente administrativo se crea con `createClient` de `@supabase/supabase-js` y no se expone al navegador.

## Rutas y funcionalidad actual

| Ruta | Estado | Descripción |
| --- | --- | --- |
| `/` | Implementada parcialmente | Feed visual con publicaciones seed y modal de creación en memoria. |
| `/kids` | Implementada | Lista de salas y niños desde Supabase, buscador y alta. |
| `/kids/[id]` | Implementada | Perfil, edición, invitaciones y padres aceptados desde Supabase. |
| `/login` | Implementada | Login real con Supabase Auth. |
| `/activar-cuenta` | Implementada | Activación de una cuenta de padre mediante código de invitación. |
| `/avisos` | Pendiente | Enlace visible en el sidebar, sin página implementada. |
| `/mi-cuenta` | Pendiente | Enlace visible en el sidebar, sin página implementada. |
| `/crear-publicacion` | Pendiente | Enlaces visibles, sin página implementada. |
| `/detalle-publicacion` | Pendiente | Enlace de comentarios visible, sin página implementada. |
| `/resumen-dia` | Pendiente | Enlace visible en el perfil de un niño, sin página implementada. |

## Migraciones y base de datos

Las migraciones versionadas están en:

```text
supabase/migrations/
```

La aplicación espera encontrar en Supabase:

- Las tablas `daycares`, `users`, `rooms`, `children`, `invitations` y `parent_children`.
- Los enums `user_role`, `user_status`, `relationship_type` e `invitation_status`.
- Las políticas RLS y sus `GRANT` para los roles correspondientes.
- La función `public.is_same_daycare_staff(uuid, uuid)` para resolver la política de usuarios sin recursión.

### Estado de la instancia actual

La instancia remota conectada ya tiene aplicado el schema y los seeds necesarios para que funcionen las rutas actuales. No es necesario volver a ejecutar las migraciones sobre esa instancia.

Los archivos locales son la réplica SQL del schema aplicado. No se ejecutan automáticamente al hacer `npm run dev`.

Además, el historial remoto contiene migraciones históricas de prueba que no tienen un archivo local equivalente. Por eso, `supabase/migrations/` debe tratarse como una réplica de trabajo y no como un historial CLI idéntico al remoto.

### Crear una base nueva

Actualmente no existe `supabase/config.toml`, un stack local de Supabase ni un script npm de bootstrap. Para una base vacía:

1. Crear el proyecto desde Supabase.
2. Ejecutar los archivos de `supabase/migrations/` en orden cronológico mediante el flujo autorizado del proyecto (Supabase MCP, Dashboard SQL Editor o una herramienta administrativa).
3. Revisar cada resultado: varias migraciones no son idempotentes y crean tablas, tipos o policies directamente.
4. Confirmar que el schema `public` está expuesto en la Data API.
5. Confirmar que RLS está habilitado en todas las tablas públicas y que los roles tienen los permisos esperados.
6. Crear/configurar el usuario de Auth staff y verificar que el seed de `public.users` exista.
7. Completar `.env` con la URL y la publishable key del proyecto nuevo.
8. Probar login y lectura de `/kids` antes de usar la aplicación completa.

No se debe copiar ciegamente una migración sobre una base que ya tenga el schema aplicado: pueden aparecer errores por tablas, tipos, policies o seeds ya existentes.

### Seguridad de datos

- RLS está activa en las tablas públicas.
- Las lecturas de niños y salas se limitan a la guardería del usuario.
- Las invitaciones solo pueden ser insertadas/consultadas por staff del mismo daycare.
- `parent_children` permite lectura al padre propietario o al staff del mismo daycare.
- El alta de vínculos durante la activación se realiza con service role, sin policy de escritura para clientes normales.
- La aplicación usa políticas de base de datos; ocultar botones en la interfaz no reemplaza RLS.

## Estado de Supabase y pendientes conocidos

La comprobación realizada para este README encontró RLS activo en las tablas públicas y los advisors de Supabase funcionando, pero con advertencias que deben revisarse antes de producción:

- La función `public.rls_auto_enable()` aparece ejecutable por `anon` y `authenticated` en los advisories de seguridad.
- La función `public.is_same_daycare_staff(...)` sigue siendo ejecutable por `authenticated`; es intencional para las policies, pero debe mantenerse revisada.
- La protección contra contraseñas filtradas de Supabase Auth está desactivada.
- Hay un aviso de rendimiento sobre la policy de `daycares`.
- Hay índices de invitaciones marcados como no utilizados y un aviso de policies permisivas múltiples en `users`.

Referencias de los advisories:

- [Supabase Database Linter 0028](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Supabase Database Linter 0029](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Protección de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

Estos puntos no se modificaron como parte de la actualización del README; requieren una decisión y una migración propias.

## Comandos disponibles

| Comando | Descripción |
| --- | --- |
| `npm ci` | Instala exactamente las dependencias del lockfile. |
| `npm install` | Instala o actualiza dependencias y puede modificar el lockfile. |
| `npm run dev` | Inicia el servidor de desarrollo en `http://localhost:3000`. |
| `npm run lint` | Ejecuta ESLint. |
| `npx tsc --noEmit` | Comprueba los tipos de TypeScript sin emitir archivos. |
| `npm run build` | Genera el build de producción. |
| `npm run start` | Sirve un build de producción ya generado. |

No existe un script de tests automatizados. Los scripts de `scripts/` son verificaciones ad hoc de algunos specs y pueden modificar datos remotos; no forman una suite de tests reproducible.

Para una comprobación local antes de entregar cambios:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Estructura principal

```text
app/
├── layout.tsx
├── page.tsx                       # Feed local
├── globals.css
├── actions/
│   ├── auth.ts                    # Logout
│   ├── invitations.ts             # Crear invitación + Resend
│   └── activations.ts             # Activar padre con service role
├── kids/
│   ├── page.tsx                   # Server Component: salas y niños
│   ├── loading.tsx
│   ├── KidsClient.tsx             # UI y alta de niños
│   └── [id]/
│       ├── page.tsx               # Perfil, invitaciones y padres
│       └── KidProfileClient.tsx
├── login/
│   ├── page.tsx                   # Login real
│   └── LoginSuccessBanner.tsx
├── activar-cuenta/
│   ├── page.tsx                   # Wrapper con Suspense
│   └── ActivationForm.tsx         # Formulario con ?code y ?email
├── data/                          # Tipos y seeds del feed
├── lib/                           # Utilidades de dominio
└── components/                    # Componentes compartidos y de features
utils/supabase/
├── client.ts                      # Cliente browser con @supabase/ssr
├── server.ts                      # Cliente con cookies para servidor
└── middleware.ts                  # Refresh de sesión y guard de rutas
proxy.ts                           # Entry point de Next.js 16
supabase/migrations/               # SQL del schema aplicado
specs/                             # Specs frontend
specs/db/                          # Specs de Supabase/DB
references/pantallas/              # Referencias visuales HTML
```

## Flujo de trabajo

El proyecto sigue Spec Driven Development:

1. Crear una especificación frontend en `specs/` o una especificación de Supabase en `specs/db/`.
2. Implementarla con `/spec-impl`.
3. Verificar los acceptance criteria con `@spec-verifier`.

Las instrucciones operativas del repositorio están en `AGENTS.md`.

## Deploy en Vercel

1. Importar el repositorio en Vercel.
2. Configurar las variables de entorno del proyecto en el panel de Vercel.
3. Usar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` para la aplicación.
4. Configurar `SUPABASE_SERVICE_ROLE_KEY` y las variables de Resend solamente como variables server-side.
5. No cargar `.env` al repositorio.
6. Ejecutar `npm run build` como build command.
7. Verificar el dominio y el remitente de Resend antes de activar el envío real de invitaciones.

`SUPABASE_DB_PASSWORD` no es necesaria para el runtime de Vercel; solo se necesita para administrar o conectar una base con herramientas de soporte.
