# SPEC 14 — Fotos de publicaciones con bucket privado y signed URLs

> **Status:** aprobado
> **Depends on:** SPEC 13 (`posts`/`post_children` + feed real + server action `createPost`), SPEC 10 (`children.photo_consent`), SPEC 11 (`AddKidModal` que ya gestiona el consentimiento)
> **Date:** 2026-09-25
> **Objective:** Permitir que el staff adjunte **una** imagen por publicación subiéndola a un bucket privado de Supabase Storage y verla en el feed mediante una signed URL, bloqueando el envío cuando la familia del niño no dio consentimiento.

---

## Por qué este spec

Es la parte sensible del producto: son fotos de menores. Con el bucket público, cualquiera que adivine la URL tiene la foto para siempre; con un bucket privado la URL se firma y vence. Ese costo se paga en un lugar (las policies de `storage.objects` y el `createSignedUrl` del server component) y no en toda la app.

De paso cierra la deuda que SPEC 06 dejó explícita: el bloque FOTOS del modal es decorativo y los posts nuevos nunca llevan imagen.

---

## Scope

**In:**

- **Migración `create_post_photos_storage`** (réplica 1:1 en `supabase/migrations/<ts>_create_post_photos_storage.sql`):
  - Tabla `public.post_photos` (según `@db-schema` §8b): `post_id`, `storage_path`, `width`/`height` nullable, `position` default `0`, `created_at`. RLS activada, policies de select e insert, `GRANT SELECT, INSERT` a `authenticated`.
  - Índices: `post_photos (post_id)` y `unique (post_id, position)`.
  - Bucket **privado** `post-photos` (`public = false`).
  - Policies de `storage.objects` para ese bucket: insert bajo el prefijo del propio usuario y select para el staff de la misma guardería.
- **`createPost` acepta un archivo:** la firma pasa de `createPost(fields)` a `createPost(fields, photo: File | null)`.
- **Validación de la imagen:** máximo **1** archivo, **≤ 5 MB**, y solo `image/jpeg`, `image/png` o `image/webp`.
- **Bloqueo por consentimiento:** si algún niño etiquetado tiene `photo_consent = false`, la publicación se rechaza con un error en español que nombra a ese niño. La validación se hace **en el servidor**, leyendo la DB, no en el modal.
- **Subida desde la server action** al bucket, con el cliente autenticado por cookies (sin service role). Convención de path: `<author_id>/<post_id>.<ext>`.
- **Feed:** el server component firma cada foto con `createSignedUrl(path, 3600)` y pasa la URL a `PostCard`.
- **Modal:** `<input type="file">` real con `accept="image/jpeg,image/png,image/webp"`, preview local y botón para quitar. Reemplaza el bloque decorativo que SPEC 13 eliminó.
- **Verificación de la imagen:** se sube un archivo real desde el modal con Playwright y se toma screenshot; no hay seed de foto.

**Out of scope (for future specs):**

- **Más de una foto por publicación.** `post_photos` ya tiene `position` y el único UNIQUE es `(post_id, position)`, así que agregar el carrusel después es solo UI.
- Redimensionar o comprimir la imagen en el cliente antes de subirla.
- Reordenar, cambiar o quitar la foto de una publicación ya publicada.
- `next/image` con `remotePatterns` para el host de Storage: se sigue usando el `<img>` de `PhotoPlaceholder`.
- Galeria de fotos de un niño, avatar de usuario en Storage, o cualquier otro uso del bucket.
- `width`/`height` reales (quedan `NULL`; no se miden en el cliente).

---

## Data model

```sql
create table public.post_photos (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.posts(id) on delete cascade,
  storage_path text not null,
  width        int,
  height       int,
  position     int not null default 0,
  created_at   timestamptz not null default now()
);

create index post_photos_post_id_idx on public.post_photos (post_id);
create unique index post_photos_post_position_key on public.post_photos (post_id, position);
```

### Doble desviación de `@db-schema` (y por qué)

1. **La columna se llama `storage_path`, no `url`.** `@db-schema` §8b dice `url` ("URL del archivo subido"). Se cambia el nombre a propósito: lo que se persiste es **la ruta del objeto dentro del bucket**, nunca la signed URL. Una signed URL expira; si se guardara en la DB, la foto quedaría rota para siempre en cuanto venciera. La firma se pide en cada render del feed.
2. **`position` y `width`/`height` se crean pero quedan sin uso.** La decisión es máximo 1 foto, así que `position` siempre vale `0` y las medidas siempre `NULL`. Existen igual para no romper el schema de referencia ni tener que migrar después cuando aparezca el carrusel.

### Bucket privado y policies de `storage.objects`

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-photos',
  'post-photos',
  false,
  5242880,                                        -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']  -- defense in depth, además de la validación en la action
);
```

La primera carpeta del path es el `author_id`. Con esa convención las policies quedan cortas y no hace falta parsear el nombre del archivo en SQL:

```sql
-- Solo el propio autor puede subir a su carpeta
create policy "post_photos_staff_upload"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Solo el staff de la guardería del autor puede leer (y por lo tanto firmar)
create policy "post_photos_staff_read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'post-photos'
    and public.is_same_daycare_staff(
          ((storage.foldername(name))[1])::uuid,
          (select u.daycare_id from public.users u where u.id = (select auth.uid()))
        )
  );
```

Se reutiliza `is_same_daycare_staff` (`2026-09-24_194100`): la primera carpeta es un `uuid` de usuario y la función responde si ese usuario es staff de la guardería de quien está mirando. Sin `update` ni `delete`: nadie edita ni borra archivos por la API.

`post_photos` tiene sus propias policies sobre la tabla, que es la que el feed consulta:

```sql
create policy "post_photos_staff_same_daycare_select"
  on public.post_photos
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.posts p
      where p.id = post_photos.post_id
        and public.is_same_daycare_staff(
              p.author_id,
              (select u.daycare_id from public.users u where u.id = (select auth.uid()))
            )
    )
  );

create policy "post_photos_staff_insert"
  on public.post_photos
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.posts p
      where p.id = post_photos.post_id
        and p.author_id = (select auth.uid())
    )
  );

grant select, insert on public.post_photos to authenticated;
```

### Lado TypeScript

```ts
// app/lib/posts-utils.ts
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;                    // 5 MB
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type PostRow = {
  // ...todo lo de SPEC 13
  photo_path: string | null;   // post_photos.storage_path
  photo_signed_url: string | null;  // firmado en el server component
};

export type NewPostFields = {
  type: PostTypeValue;
  body: string;
  roomId: string | null;      // null = anuncio general
  childIds: string[];
};
```

`postRowToCard` copia `photo_signed_url` a `PostCardProps.image` como `{ src, alt }`, con `alt` = `"Foto de {childName}"` (o `"Foto del anuncio"`).

---

## Implementation plan

1. **Migración `create_post_photos_storage`:** tabla, índices, bucket, RLS, policies de `post_photos` y de `storage.objects`, grants. Verificar con `supabase_list_tables`, una query de `storage.buckets`, `information_schema.role_table_grants` y `supabase_get_advisors` (security + performance).
2. **`app/actions/posts.ts`:** `createPost(fields, photo)`. En orden: validar `photo` (cantidad, tamaño, mime), insertar `posts`, **verificar `photo_consent` de los niños etiquetados** y abortar si alguno es `false`, subir el archivo a `<author_id>/<post_id>.<ext>`, insertar `post_children` y `post_photos`. Si el insert de `post_photos` falla, se intenta borrar el archivo subido (best-effort) para no dejar huérfano en el bucket.
3. **`app/lib/posts-utils.ts`:** `MAX_PHOTO_BYTES`, `ALLOWED_PHOTO_TYPES`, el helper `validatePhoto(file)` con los mensajes en español, y el mapeo de la foto en `postRowToCard`.
4. **`app/components/home/CreatePostModal.tsx`:** estado del archivo (`File | null`), `<input type="file">` con `accept`, preview con `URL.createObjectURL` (y `revokeObjectURL` al cambiar o cerrar), botón "Quitar", y el bloque con la caja de la foto que reemplaza al decorativo de SPEC 06. Errores de tamaño y de tipo se muestran inline y no suben nada.
5. **`app/components/home/FeedClient.tsx`:** pasa el `File` a la action, muestra el error que vuelve del servidor (incluido el de consentimiento) sin cerrar el modal.
6. **Server component de `/`:** agrega `post_photos (storage_path)` al select y firma cada path con `createSignedUrl(path, 3600)`. Si no hay foto, `photo_path` queda `null` y la card se ve igual que hoy.
7. **Verificación end-to-end:** con Playwright, publicar un post con una imagen real y confirmar que la card la muestra; después probar el camino de consentimiento (§ Acceptance criteria).
8. **Calidad y evidencia** (ver criterios de aceptación).

Cada paso deja el sistema funcional.

---

## Acceptance criteria

- [x] `public.post_photos` existe con `storage_path not null`, el índice `(post_id)` y el unique `(post_id, position)`; RLS activa; `SELECT` e `INSERT` para `authenticated`; `supabase_get_advisors` sin issues nuevos.
- [x] El bucket `post-photos` existe con `public = false` y `file_size_limit` de 5 MB.
- [x] Con el cliente real de un staff, `select name, owner from storage.objects where bucket_id = 'post-photos'` devuelve **0 filas** si el bucket está vacío: el `owner` nunca es `anon` y no hay objetos públicos.
- [x] El modal muestra un `<input type="file" accept="image/jpeg,image/png,image/webp">` con preview y botón para quitar; al reabrir el modal el input está vacío (reset).
- [x] Publicar **sin** foto funciona igual que en SPEC 13 y crea el post sin filas en `post_photos`.
- [x] Publicar **con** una foto JPEG válida crea: el post, 1 fila en `post_photos` con `storage_path` = `<author_id>/<post_id>.jpg`, y **1 objeto en el bucket** con ese mismo path.
- [x] La foto se ve en el feed de `/` y **sobrevive al F5** (la signed URL se regenera en cada render).
- [x] Una imagen de 6 MB se rechaza inline con un error de tamaño en español, **no** sube nada al bucket y no crea filas.
- [x] Un archivo que no sea `image/jpeg`, `image/png` o `image/webp` (por ejemplo un `.pdf` renombrado a `.jpg`) se rechaza inline con un error de tipo en español, no sube nada y no crea filas.
- [x] Con un niño etiquetado en `photo_consent = false`, publicar con foto se rechaza con un error en español que **nombra al niño**, no sube nada al bucket y no crea el post. (Los 11 niños están hoy en `true`, así que la prueba requiere poner uno en `false` con un `update`, verificar y revertirlo.)
- [x] Publicar con foto y **sin** consentimiento de un niño también se rechaza: el consentimiento se exige siempre que haya foto, sin importar el tipo de publicación.
- [x] Un padre no lee `post_photos` (0 filas) ni los objetos del bucket.
- [x] Un staff no puede subir a la carpeta de otro: un insert en `storage.objects` con una primera carpeta que no es su `auth.uid()` es rechazado por RLS.
- [x] Si la signed URL venció (o la imagen no existe), la card cae al fallback punteado de `PhotoPlaceholder` con el `alt`, sin romper la vista.
- [x] `npm run lint`, `npx tsc --noEmit` y `npm run build` pasan.
- [x] Screenshots en `.playwright-mcp/` (1280, 768, 375) del modal con preview, del feed con la foto cargada, y del error de consentimiento.

---

## Decisions

- **Yes:** bucket **privado con signed URLs**, no público. Son fotos de menores: una URL pública y adivinable expone la foto de forma permanente. El costo (firmar en cada render, manejar expiración) queda concentrado en el server component.
- **Yes:** la **firma se pide en el server component**, con TTL de 3600 s. El browser nunca ve credenciales de Storage: solo recibe una URL que ya expira. El fallback de `PhotoPlaceholder` cubre el caso de que expire con la pestaña abierta.
- **Yes:** la **subida la hace la server action** con el cliente autenticado por cookies. No hace falta `SUPABASE_SERVICE_ROLE_KEY`: el mismo RLS de `storage.objects` autoriza la subida, y así el service role queda sin tocar en este módulo.
- **Yes:** el consentimiento se valida **en el servidor, leyendo la DB**. Si se validara en el modal, un `curl` a la server action saltaría el bloqueo. Se valida antes de subir el archivo, así que no queda nada en el bucket cuando se rechaza.
- **Yes:** se valida `photo_consent` **solo si hay foto**. El consentimiento es sobre fotos; bloquear publicaciones de texto sin foto sería un comportamiento que el staff no espera.
- **Yes:** **máximo 1 foto**, aunque `post_photos` sea una tabla de múltiples. `PostCard` solo sabe renderizar una imagen y el carrusel es un spec aparte.
- **Yes:** 5 MB y tres mime types, validados **en la action** y **repetidos en el bucket** (`file_size_limit` y `allowed_mime_types`). La validación del bucket es la que se aplica aunque alguien suba el archivo por otra vía.
- **Yes:** el path es `<author_id>/<post_id>.<ext>`. La primera carpeta es el autor, y eso permite una policy de una línea en vez de parsear nombres en SQL. Además deja las fotos ordenadas por autor en el bucket.
- **Yes:** `storage_path` en vez de `url`, aunque `@db-schema` diga `url`. Guardar una signed URL en la DB la rompe para siempre al vencer; la ruta es el dato estable.
- **Yes:** se sigue usando el `<img>` de `PhotoPlaceholder` en vez de `next/image`. `next.config.ts` solo tiene `remotePatterns` para `raw.githubusercontent.com`, así que `next/image` obligaría a agregar el host de Storage al config sin ganar nada (las imágenes ya vienen con un ancho de banda acotado y un TTL de 1 h).
- **Yes:** sin seed de foto. Una migración no puede subir binarios y un `storage_path` que apunta a un archivo inexistente solo produce un fallback roto. Se verifica subiendo una imagen real desde el modal con Playwright.
- **Yes:** los 11 niños tienen hoy `photo_consent = true`, así que el camino del bloqueo se prueba con un `update` temporal. Queda documentado como fixture de prueba, no como seed.
- **Yes (fix E2E, migración `fix_post_photos_staff_read`):** las policies de lectura de `storage.objects` y de `post_photos` exigen además que **el lector sea `staff`**. `is_same_daycare_staff(autor, daycare_lector)` solo mira el rol del autor, así que un padre de la misma guardería pasaba el predicado y leía el bucket por la API directa (verificado: 1 fila antes del fix, 0 después; staff intacto).
- **No:** `next/image`, resize en el cliente, varias fotos, reordenar o cambiar la foto después, medir `width`/`height`, galería de fotos, avatar en Storage.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| El cast `((storage.foldername(name))[1])::uuid` en la policy de select lanza error si la carpeta no es un UUID | La policy de insert obliga a que la primera carpeta sea el `auth.uid()`, o sea un UUID, así que solo nuestro código puede crear esos objetos. Aun así, la verificación del aislamiento se hace con el cliente real, no con el MCP (que corre como owner y bypassa RLS) |
| La signed URL vence (1 h) y la foto se ve a medio cargar en una pestaña abierta | `PhotoPlaceholder` ya tiene `onError` con fallback punteado y el `alt`; el usuario reescribe la página y la URL se regenera |
| Subir el archivo y después fallar el insert de `post_photos` deja un objeto huérfano en el bucket | La action intenta `remove()` del archivo en el `catch` (best-effort) y devuelve un error genérico sin filtrar paths |
| Las fotos ocupan el storage sin límite de cantidad | `file_size_limit` de 5 MB y 1 foto por post acotan el POST. No hay cuotas por guardería: es deuda consciente |
| `storage.objects` no tiene `FORCE ROW LEVEL SECURITY` y el MCP corre como owner: un `select` por MCP no prueba nada | Los criterios de aislamiento se validan con el cliente `authenticated` del navegador o con `SET LOCAL role` dentro de `BEGIN … ROLLBACK`; si no se puede probar, el check se marca `SKIP` |
| El path lo arma la propia action y no se toma del cliente, así que nadie puede escribir fuera de su carpeta | La action construye `<author_id>/<post_id>.<ext>` a partir del `post_id` que ella acaba de crear y del mime detectado; el input del cliente solo aporta los bytes |

---

## What is **not** in this spec

- Más de una foto por publicación y el carrusel en la card.
- Redimensionar o comprimir la imagen en el cliente.
- Editar, quitar o reordenar la foto de una publicación ya publicada.
- `next/image` con `remotePatterns` para el host de Storage.
- Medir y guardar `width`/`height`, y usar `position` con más de una foto.
- Avatar de usuario en Storage, galería de fotos de un niño o cualquier otro uso del bucket.
- Cuotas de storage por guardería, o limpieza automática de imágenes huérfanas.
- Notificaciones al padre cuando se publica una foto.

Cada una de esas, si llega, va en su propio spec.
