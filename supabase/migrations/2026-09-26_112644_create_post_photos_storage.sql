-- SPEC 14: fotos de publicaciones con bucket privado y signed URLs.
--
-- Doble desviación de `@db-schema` §9 (documentada en el spec):
--   - La columna se llama `storage_path`, no `url`: se persiste la ruta del
--     objeto dentro del bucket, nunca la signed URL (que expira).
--   - `position` y `width`/`height` se crean pero quedan sin uso (1 foto por
--     post: `position` siempre 0, medidas siempre NULL) para no romper el
--     schema de referencia ni migrar después cuando llegue el carrusel.

-- 1) Tabla
create table public.post_photos (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.posts(id) on delete cascade,
  storage_path text not null,
  width        int,
  height       int,
  position     int not null default 0,
  created_at   timestamptz not null default now()
);

-- 2) Índices
create index post_photos_post_id_idx on public.post_photos (post_id);
create unique index post_photos_post_position_key on public.post_photos (post_id, position);

-- 3) RLS
alter table public.post_photos enable row level security;

-- Solo el staff de la guardería del autor lee la foto (el feed la consulta).
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

-- Solo el autor del post inserta su foto (la server action usa el cliente con
-- cookies, así que `auth.uid()` es el autor).
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

-- 4) Exposición al Data API: exactamente SELECT + INSERT para authenticated,
-- sin anon (igual que `posts`/`post_children` en SPEC 13).
revoke all on public.post_photos from anon;
revoke all on public.post_photos from authenticated;
grant select, insert on public.post_photos to authenticated;

-- 5) Bucket privado (defense in depth: límite y mimes también en el bucket,
-- además de la validación en la server action).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-photos',
  'post-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
);

-- 6) Policies de `storage.objects` para ese bucket.
-- La primera carpeta del path es el `author_id`, así las policies no parsean
-- nombres de archivo en SQL.

-- Solo el propio autor puede subir a su carpeta.
create policy "post_photos_staff_upload"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Solo el staff de la guardería del autor puede leer (y por lo tanto firmar).
-- Sin `update` ni `delete`: nadie edita ni borra archivos por la API.
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
