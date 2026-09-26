# SPEC 13 — Publicaciones del staff contra Supabase (feed real)

> **Status:** aprobado
> **Depends on:** SPEC 01 (feed del home que se reemplaza), SPEC 06 (`CreatePostModal` que se conecta), SPEC 07 (`daycares`), SPEC 08 (`users` + RLS + RPC `is_same_daycare_staff`), SPEC 10 (`rooms`/`children` + policies de staff)
> **Date:** 2026-09-25
> **Objective:** Conectar el feed y el modal de nueva publicación a Supabase: el staff publica entradas reales en `posts`/`post_children` y `/` las lee ordenadas por fecha en vez de mostrar un seed en memoria.

---

## Por qué este spec

`/` es el último módulo del proyecto que no toca la base de datos. `app/page.tsx` tiene 3 posts hardcodeados en `seedPosts` y `CreatePostModal` llama a un callback en memoria, así que cualquier publicación se pierde al recargar. Este spec cierra ese hueco.

Además define el modelo `posts` que van a reusar las fotos (SPEC 14), las reacciones y el feed del padre, así que conviene hacerlo bien una sola vez.

Aporta también `users.room_id`: hoy **no existe forma de saber a qué sala pertenece un staff** (`users` no tiene esa columna y el schema de referencia tampoco). Sin ese dato el modal no puede ofrecer los niños correctos.

---

## Scope

**In:**

- **Migración `add_users_room_id`** (réplica 1:1 en `supabase/migrations/<ts>_add_users_room_id.sql`): `alter table public.users add column room_id uuid references public.rooms(id) on delete set null` + update del staff a la sala "Soles". No se toca ninguna policy existente.
- **Migración `create_posts_post_children`** (réplica 1:1 en `supabase/migrations/<ts>_create_posts_post_children.sql`), según `@db-schema` §7 y §8:
  - Enum `public.post_type` con **7** valores: `meal`, `nap`, `activity`, `achievement`, `mood`, `photo`, `announcement`.
  - Tabla `public.posts` (según `@db-schema` §7): `author_id`, `room_id` nullable, `type`, `title` nullable, `body`, `published_at`, `created_at`, `updated_at`.
  - Tabla `public.post_children` (según `@db-schema` §8): PK compuesta `(post_id, child_id)`, ambos `on delete cascade`.
  - RLS activada en ambas; policies **separadas por comando** (precedente `2026-09-23_134345`, evita `multiple_permissive_policies`).
  - Índices: `posts (published_at desc)`, `posts (author_id)`, `posts (room_id)`, `post_children (child_id)`.
  - `GRANT SELECT, INSERT` a `authenticated`. **Sin `UPDATE` ni `DELETE`**: este spec no implementa edición.
  - Seeds: 4 posts de ejemplo del staff, **uno con `published_at` de ayer** para ejercitar el agrupador por día.
- **Server action `createPost`** (`app/actions/posts.ts`, `"use server"`): valida tipo/destino/descripción, inserta `posts` y luego `post_children` con el cliente autenticado por cookies (RLS staff), devuelve `{ ok: true }` o `{ ok: false, error }`.
- **`app/page.tsx` pasa a server component:** `getClaims()` → `users` (daycare, sala, nombre real) → `rooms`, `children` de la sala, `posts` + `post_children` + autor, orden `published_at desc`. Delega la UI en un `FeedClient` nuevo. Desaparece `seedPosts`.
- **`app/lib/posts-utils.ts`:** `PostTypeValue`, `PostRow`, `postRowToCard`, `groupPostsByDay`, y `buildRecipient` con firma nueva. Helper de etiqueta de día en `app/lib/dates.ts`.
- **`CreatePostModal` real:** los niños llegan por props (deja de importar el seed de `app/data/kids.ts`), **3 pills excluyentes** (Toda la sala / Anuncio general / niños concretos), submit contra la server action con estado `submitting` y `error`. El bloque FOTOS decorativo **se elimina**.
- **`PostCard`:** `id` en `PostCardProps` (arregla la colisión de key `${type}-${time}`), autor = `full_name` real, hora desde `published_at`, y **se borran los enlaces a `/detalle-publicacion` y `/crear-publicacion`** (404).
- **`FeedHeader` con datos reales:** nombre del daycare, nombre real del staff, nombre de la sala, cantidad real de niños y fecha de hoy.
- **Limpieza:** se borra el componente `Counter` (demo sin uso) y el export `kids` de `app/data/kids.ts` si queda huérfano (los tipos y las etiquetas de alergias se conservan).
- **Estado vacío** del feed cuando no hay publicaciones.

**Out of scope (for future specs):**

- **Fotos**: `post_photos`, bucket, signed URLs, `<input type="file">` → **SPEC 14**. En este spec el bloque FOTOS decorativo se elimina, no se implementa.
- `reactions` y `comments` (`@db-schema` §9 y §10) y likes interactivos: hoy siguen siendo `<span>` estáticos.
- Editar o borrar publicaciones (y por lo tanto el enlace "Editar" del `PostCard`).
- RLS de lectura para padres y el feed del padre (`/familia-feed`).
- Paginación del feed.
- Crear las rutas `/crear-publicacion`, `/detalle-publicacion`, `/avisos` y `/mi-cuenta`: en este spec **solo se borran los enlaces** que apuntan a ellas.

---

## Data model

```sql
create type public.post_type as enum (
  'meal', 'nap', 'activity', 'achievement', 'mood', 'photo', 'announcement'
);

create table public.posts (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references public.users(id) on delete cascade,
  room_id      uuid references public.rooms(id) on delete set null,
  type         public.post_type not null,
  title        text,
  body         text not null,
  published_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.post_children (
  post_id  uuid not null references public.posts(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  primary key (post_id, child_id)
);

create index posts_published_at_idx on public.posts (published_at desc);
create index posts_author_id_idx     on public.posts (author_id);
create index posts_room_id_idx       on public.posts (room_id);
create index post_children_child_id_idx on public.post_children (child_id);
```

### Cómo se aísla un post por guardería

`posts` **no tiene `daycare_id`** (así lo define `@db-schema` §7) y un "Anuncio general" tiene `room_id IS NULL`, o sea que por `room_id` no hay guardería que comparar. La regla que se aplica es:

> **Un post pertenece a la guardería de su autor.**

Se reutiliza la RPC que ya existe y ya está auditada (`2026-09-24_194100`), que responde "¿es este usuario staff de esta guardería?":

```sql
-- posts: el autor del post es staff de la guardería del que está mirando
create policy "posts_staff_same_daycare_select"
  on public.posts
  for select
  to authenticated
  using (
    public.is_same_daycare_staff(
      posts.author_id,
      (select u.daycare_id from public.users u where u.id = (select auth.uid()))
    )
  );

-- posts: solo el staff publica, y solo en su propia guardería o como anuncio general
create policy "posts_staff_insert"
  on public.posts
  for insert
  to authenticated
  with check (
    posts.author_id = (select auth.uid())
    and exists (
      select 1 from public.users u
      where u.id = (select auth.uid())
        and u.role = 'staff'::public.user_role
    )
    and (
      posts.room_id is null
      or exists (
        select 1 from public.rooms r
        where r.id = posts.room_id
          and r.daycare_id = (select u.daycare_id from public.users u where u.id = (select auth.uid()))
      )
    )
  );

-- post_children: el post es mío y el niño es de mi guardería
create policy "post_children_staff_same_daycare_select"
  on public.post_children
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.posts p
      where p.id = post_children.post_id
        and public.is_same_daycare_staff(
              p.author_id,
              (select u.daycare_id from public.users u where u.id = (select auth.uid()))
            )
    )
  );

create policy "post_children_staff_insert"
  on public.post_children
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.posts p
      join public.children c on c.id = post_children.child_id
      join public.rooms r on r.id = c.room_id
      where p.id = post_children.post_id
        and p.author_id = (select auth.uid())
        and r.daycare_id = (select u.daycare_id from public.users u where u.id = (select auth.uid()))
    )
  );

grant select, insert on public.posts to authenticated;
grant select, insert on public.post_children to authenticated;
```

No hay recursión de policies: las de `post_children` consultan `posts`, las de `posts` consultan `users`, y las de `users` resuelven el chequeo de staff dentro de la función `SECURITY DEFINER` `is_same_daycare_staff`, que saltea RLS.

### Los tres destinos del modal

| Pill en el modal | `posts.room_id` | `post_children` | Qué ve el padre (futuro) |
| --- | --- | --- | --- |
| **Toda la sala** | `users.room_id` del staff | ninguna fila | los posts de su sala |
| **Anuncio general** | `NULL` | ninguna fila | los anuncios de la guardería |
| **1..n niños** | `NULL` | una fila por niño | los posts de sus hijos |

`title` se crea (lo pide `@db-schema` §7) pero **queda siempre `NULL`**: el modal no pide título y no se agrega ese campo.

### Lado TypeScript

```ts
// app/lib/posts-utils.ts
export const POST_TYPE_VALUES = [
  "meal", "nap", "activity", "achievement", "mood", "photo", "announcement",
] as const;

export type PostTypeValue = (typeof POST_TYPE_VALUES)[number];

// fila de la DB con lo que resuelve el server component (joins)
export type PostRow = {
  id: string;
  author_id: string;
  room_id: string | null;
  type: PostTypeValue;
  title: string | null;
  body: string;
  published_at: string;      // ISO
  author_name: string;       // users.full_name
  room_name: string | null;  // rooms.name
  child_names: string[];     // children.full_name
};

export function postRowToCard(row: PostRow): PostCardProps;
export function buildRecipient(childFirstNames: string[], roomName: string | null): string;
export function groupPostsByDay(rows: PostRow[]): PostDayGroup[];

export type PostDayGroup = {
  dayKey: string;   // "2026-09-25"
  label: string;    // "Publicado hoy" | "Publicado ayer" | "Publicado el 12 de junio"
  posts: PostCardProps[];
};
```

Mapeo de tipo DB → chip de UI: `meal→COMIDA`, `nap→SIESTA`, `activity→ACTIVIDAD`, `achievement→LOGRO`, `mood→ÁNIMO`, `photo→FOTO`, `announcement→ANUNCIO`. Es el mapeo inverso del de `@db-schema` línea 23.

`buildRecipient` cambia de firma: hoy recibe `string[]` y devuelve `"toda la sala"` para el array vacío. Pasa a recibir `(childFirstNames, roomName)` y devuelve:

- 0 niños + `roomName` → `"toda la sala"`
- 0 niños + sin `roomName` → `"toda la guardería"`
- 1 niño → `"familia de Mateo"`
- 2..n niños → `"familias de Mateo, Sofía y Benjamín"`

```ts
// app/components/shared/PostCard.tsx — props actualizadas
export type PostCardProps = {
  id: string;
  type: PostType;
  childName: string;   // título de la card (ver getCardTitle abajo)
  time: string;        // "HH:MM" derivado de published_at
  author: string;      // users.full_name real
  text: string;
  recipient: string;
  likes: number;       // siguen siendo 0 estáticos
  comments: number;    // siguen siendo 0 estáticos
  image?: { src: string; alt: string };  // lo usa SPEC 14
};
```

El título de la card (`childName`) tiene **tres** variantes, en el mismo orden que `buildRecipient`:

- 1..n niños → primer nombre del primer niño
- 0 niños + `room_name` → `"Toda la sala"`
- 0 niños + sin `room_name` → `"Anuncio general"`

El campo `image` se mantiene aunque en este spec ningún post lo tenga: es el punto de enganche de SPEC 14.

---

## Implementation plan

1. **Migración `add_users_room_id`:** agregar la columna y setear "Soles" al staff. Verificar con `supabase_execute_sql` que la fila quedó completa y que `/kids` sigue funcionando.
2. **Migración `create_posts_post_children`:** enum, tablas, índices, RLS, policies, grants y seeds. Verificar con `supabase_list_tables`, una query de conteo y `supabase_get_advisors` (security + performance). Los GRANTs se confirman leyendo `information_schema.role_table_grants`: una tabla creada por SQL puede quedar fuera del Data API.
3. **`app/lib/posts-utils.ts`:** `POST_TYPE_VALUES`, `PostTypeValue`, `PostRow`, `postRowToCard`, `buildRecipient` con la firma nueva y `groupPostsByDay`; en `app/lib/dates.ts` el helper `formatDayDividerLabel(publishedAt)`. Puro, sin dependencias. `npx tsc --noEmit` para confirmar que solo se rompió lo esperado.
4. **Server action `createPost`** (`app/actions/posts.ts`): valida y persiste `posts` + `post_children` con `createClient(cookieStore)`. Devuelve `{ ok: true }` o `{ ok: false, error }` en español. Verificación manual: llamada desde un test en la UI o `supabase_execute_sql` confirmando que la fila aparece.
5. **`app/components/shared/PostCard.tsx`:** agregar `id` a las props, usar `post.id` como key en el feed y borrar los dos enlaces que apuntan a rutas 404. El resto del layout no se toca.
6. **`app/components/home/CreatePostModal.tsx`:** niños por props, 3 pills excluyentes, props `isPublishing` y `publishError` (patrón `AddKidModal`), submit contra `createPost`, y eliminación del bloque FOTOS decorativo.
7. **`app/components/home/FeedClient.tsx`** (nuevo): recibe los datos del server, muestra los grupos por día, abre el modal, maneja `submitting`/`error`/`sent` y llama `router.refresh()` en el éxito.
8. **`app/page.tsx` → server component:** `getClaims()`, lookup de `users`/`rooms`/`children`/`posts` con nested selects, y render de `FeedClient`. Se borran `seedPosts`, el estado `posts` y `<Counter />`.
9. **`app/components/home/FeedHeader.tsx`:** pasa a recibir nombre del daycare, nombre del staff, nombre de la sala, cantidad de niños y fecha por props.
10. **Limpieza:** borrar `app/components/home/Counter.tsx` y el export `kids` de `app/data/kids.ts` si nada lo importa (los tipos `Kid`, `KidBadge`, `LinkedParent` y las etiquetas de alergias se conservan). `npm run lint` avisa de imports muertos.
11. **Estado vacío:** cuando no hay posts, el feed muestra un mensaje en lugar del divider "PUBLICADO HOY".
12. **Calidad y evidencia** (ver criterios de aceptación).

Cada paso deja el sistema funcional.

---

## Acceptance criteria

- [ ] `users.room_id` existe y el staff tiene la sala "Soles" (`select room_id from public.users where role = 'staff'`); `/kids` sigue funcionando sin cambios.
- [ ] `public.posts` y `public.post_children` existen en el esquema `public` con el enum `post_type` de 7 valores, la PK compuesta `(post_id, child_id)` y los 4 índices; `information_schema.role_table_grants` muestra `SELECT` e `INSERT` para `authenticated`.
- [ ] RLS está activa en `posts` y `post_children`; `supabase_get_advisors` no reporta issues nuevos de security ni de performance.
- [ ] Hay 4 posts de ejemplo del staff; al menos uno con `published_at` de ayer. El feed los muestra con el nombre real del autor (`full_name`), la hora real de `published_at` y el `recipient` correcto.
- [ ] El feed agrupa por día real: los posts de hoy quedan bajo "Publicado hoy" y el de ayer bajo "Publicado ayer".
- [ ] Con el feed vacío (ningún post para la guardería) se muestra un estado vacío y no aparece el divider "PUBLICADO HOY".
- [ ] El modal ofrece pills **solo con los niños de la sala del staff** (8 en Soles), leídos de la DB, no del seed.
- [ ] Las 3 pills son excluyentes: elegir "Toda la sala" limpia los niños, elegir un niño limpia las otras dos pills, y "Anuncio general" limpia todo lo demás.
- [ ] Publicar con tipo + descripción + "Toda la sala" crea el post con `room_id` = sala del staff, `author_id` = el usuario logueado, `room_id` correcto y **sin** filas en `post_children`; el post aparece en el feed y sobrevive al F5.
- [ ] Publicar con 2 niños concretos crea el post con `room_id IS NULL` y exactamente 2 filas en `post_children` con los `child_id` correctos; el `recipient` dice `"familias de X y Y"`.
- [ ] Publicar con "Anuncio general" crea el post con `room_id IS NULL` y sin `post_children`; el `recipient` dice `"toda la guardería"`.
- [ ] Sin tipo → error "Elegí un tipo"; descripción vacía o solo espacios → "Escribí una descripción"; sin destino → "Elegí al menos un destinatario". En los tres casos no se crea ninguna fila.
- [ ] Durante el submit el botón queda deshabilitado con el texto "Publicando…"; un error de la server action se muestra inline arriba del form y **el modal no se cierra**.
- [ ] El `PostCard` **no** tiene enlaces a `/crear-publicacion` ni a `/detalle-publicacion`; el componente `Counter` ya no está en el repo; `FeedHeader` muestra el nombre real del staff, el nombre real de la guardería y la cantidad real de niños (8 en Soles), no "Buenas, Caro" ni "12 niños".
- [ ] Un staff **no puede** publicar en `room_id` de otra guardería: el insert directo con un `room_id` ajeno es rechazado por RLS (probado con `supabase_execute_sql` simulando el rol, o KPI desde el panel de Supabase).
- [ ] Un padre no lee `posts`: con el cliente de un padre, `select * from posts` devuelve 0 filas.
- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` pasan.
- [ ] Screenshots en `.playwright-mcp/` (1280, 768, 375) del feed con posts reales, del divisor por día, del modal con las 3 pills y del estado de error.

---

## Decisions

- **Yes:** el feed **lee y escribe** en la DB. La alternativa ("solo escribir, feed seeded") dejaba el módulo incoherente: el post se guardaba y no se veía.
- **Yes:** `app/page.tsx` pasa a **server component** y delega en un `FeedClient`. Es el patrón de `/kids` y `/kids/[id]`, y es lo que permite que los datos lleguen sin hardcodear.
- **Yes:** el **insert va en una server action** (como `createParentInvitation`), no desde el browser. Motivo: en SPEC 14 esa misma acción tiene que recibir el archivo; si el insert viviera en el cliente, SPEC 14 rompería el diseño.
- **Yes:** el aislamiento de un post se deriva del **`author_id`**, no del `room_id`. `room_id` es nullable y un anuncio general no tiene sala, así que por ahí no se puede saber la guardería. Se reutiliza la RPC `is_same_daycare_staff` que ya existe y ya está auditada en vez de crear una nueva.
- **Yes:** `users.room_id` nuevo, nullable. No existe en `@db-schema` §2 ni en la DB; sin él el staff no tiene sala y el modal no puede armar las pills. Queda nullable (y no `NOT NULL`) para no bloquear a los padres y a los staff que aún no tengan sala asignada; si no tiene sala, el modal muestra un aviso y solo queda "Anuncio general".
- **Yes:** `post_type` lleva **7 valores** y agrega `mood`. La UI ya tenía ÁNIMO desde SPEC 06 con sus tokens de color; el schema de referencia no lo tiene. Se prefiere la UI (que es la que el staff ve) y se actualiza `@db-schema` al final.
- **Yes:** el feed muestra **toda la guardería** (las 3 salas), no solo la sala del staff. El staff coordina con las otras maestras; el scope de etiquetado sí es su sala.
- **Yes:** **3 pills** de destino, no 2. Con 2 no había forma de crear el "Anuncio general" (`room_id NULL` sin niños) que ya estaba decidido.
- **Yes:** los posts de ejemplo son **seeds dentro de la migración**. Un feed con cero entradas se ve roto y no ejercita el agrupador por día.
- **Yes:** la firma de `buildRecipient` cambia para admitir los tres destinos. Se mantiene el nombre porque la lógica de "familia de X / familias de X, Y y Z" no cambia.
- **Yes:** el título de la card (`childName`) tiene tres variantes y no dos: sin niños pero con `room_id` muestra `"Toda la sala"`, no `"Anuncio general"`. Sin esto, 3 de las 4 cards del seed se titulaban "Anuncio general" aunque fueran de COMIDA o SIESTA. Queda asentado acá porque `PostCardProps.childName` estaba especificado con un solo fallback.
- **Yes:** los likes y comentarios **siguen estáticos en 0** y no se tocan `reactions`/`comments`. No hay UI para eso y son dos tablas más de RLS.
- **Yes:** se borran los enlaces a `/crear-publicacion` y `/detalle-publicacion` en lugar de crear esas rutas. Un enlace a un 404 en una card real es peor que ningún enlace.
- **Yes:** el agrupador por día real en lugar del divider fijo "PUBLICADO HOY". Con posts reales el texto fijo deja de ser cierto al día siguiente.
- **No:** paginación del feed. Se decidió a conscious que no entre en este spec; con volumen real va a hacer falta cursor por `published_at` (queda anotado en la sección de riesgos).
- **No:** `daycare_id` en `posts` (habría resuelto el aislamiento sin el rodeo del `author_id`, pero agrega una columna que `@db-schema` no tiene y que queda desnormalizada).
- **No:** fotos, reacciones, comentarios, edición, borrado, rutas nuevas, feed del padre, RLS de lectura para padres, `title` en el modal, `daily_summaries`.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Sin paginación: la guardería con más posts hace una query que crece sin límite | Se acepta en este spec. Mitigación futura: cursor por `published_at` + `limit`. El índice `posts (published_at desc)` ya está creado para soportarlo |
| `post_children` inserta sobre `posts`, y `posts` consulta `users`: si el orden de las policies se rompe aparece `infinite recursion detected` | El grafo no es cíclico (`post_children → posts → users → RPC SECURITY DEFINER`); es el mismo criterio con el que se arregló `users` en `2026-09-24_194100`. Si aun así apareciera, se aísla el chequeo en una función `SECURITY DEFINER` |
| El MCP `supabase_execute_sql` corre como owner y **bypassa RLS**: un `select * from posts` con el MCP no prueba el aislamiento | Los criterios de RLS se validan con el cliente real (navegador, `authenticated`) o con `SET LOCAL role` dentro de `BEGIN … ROLLBACK`. Un check que no se puede probar así se marca `SKIP` |
| Tabla creada por SQL sin `GRANT` no queda expuesta al Data API | GRANT explícito a `authenticated` y verificación con `information_schema.role_table_grants` en el paso 2 |
| `router.refresh()` re-ejecuta el server component: si la lectura del feed es lenta se nota un parpadeo | El insert ya está confirmado cuando se refresca; se evalúa `revalidatePath` si molesta |
| El staff sin `room_id` se queda sin niños para etiquetar | Aviso explícito en el modal y solo "Anuncio general" disponible. La columna es nullable justamente para no bloquear el login |

---

## What is **not** in this spec

- **Fotos**: `post_photos`, el bucket, las signed URLs, el `<input type="file">` y el bloqueo por `photo_consent` → **SPEC 14**. El bloque FOTOS decorativo se elimina acá y no se reemplaza.
- `reactions`, `comments` y los likes interactivos.
- Editar o borrar publicaciones.
- El feed del padre y el RLS de lectura para el rol `parent`.
- Paginación del feed.
- Crear las rutas `/crear-publicacion`, `/detalle-publicacion`, `/avisos` y `/mi-cuenta` (solo se borran los enlaces).
- Redimensionar o comprimir imágenes en el cliente.
- Un campo de título en el modal.

Cada una de esas, si llega, va en su propio spec.
