-- SPEC 14 (fix de verificación E2E): la policy de lectura de
-- `storage.objects` delegaba en `is_same_daycare_staff(autor, daycare_lector)`,
-- que solo mira el rol del AUTOR. Un padre de la misma guardería cumplía el
-- predicado y podía leer (y firmar) cualquier foto del bucket por la API
-- directa, aunque la app nunca le expone paths. El criterio exige 0 filas para
-- un padre, así que se agrega la conjunción "el lector es staff".
-- Por la misma razón se endurece la policy de `post_photos` (tabla): hoy el
-- padre ve 0 filas solo gracias a la RLS de `posts` en capas; si un spec futuro
-- le diera lectura de posts (feed del padre), la foto filtraría sin este
-- chequeo. Comportamiento actual inalterado: staff igual, padre 0 en ambos.

drop policy if exists "post_photos_staff_read" on storage.objects;

create policy "post_photos_staff_read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'post-photos'
    and exists (
      select 1
      from public.users reader
      where reader.id = (select auth.uid())
        and reader.role = 'staff'::public.user_role
    )
    and public.is_same_daycare_staff(
          ((storage.foldername(name))[1])::uuid,
          (select u.daycare_id from public.users u where u.id = (select auth.uid()))
        )
  );

drop policy if exists "post_photos_staff_same_daycare_select" on public.post_photos;

create policy "post_photos_staff_same_daycare_select"
  on public.post_photos
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.users reader
      where reader.id = (select auth.uid())
        and reader.role = 'staff'::public.user_role
    )
    and exists (
      select 1
      from public.posts p
      where p.id = post_photos.post_id
        and public.is_same_daycare_staff(
              p.author_id,
              (select u.daycare_id from public.users u where u.id = (select auth.uid()))
            )
    )
  );
