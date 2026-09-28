# Migración dev → prod (2026-09-28)

Volcado de la BD de desarrollo a un proyecto Supabase nuevo (greenfield),
con limpieza de datos de prueba. Proyecto prod: `opdendaycare-prod`
(ref `qnvprcxpzsgeehotxfbe`, región EU Central).

## Decisiones

- **Vía Supabase CLI + conexión directa**, no `pg_dump` ciego (habría
  arrastrado usuarios E2E y sus vínculos).
- **Opción A para Auth**: Gabriel se recreó en prod desde el Dashboard
  (Add user, email confirmado). Su `auth.uid` nuevo es distinto al de dev,
  así que todo lo que colgaba del ID viejo se re-apuntó al nuevo.
- **Solo migra Gabriel**. Eliminados: 3 usuarios parent E2E
  (Lucía, María, gabi), sus 3 filas de `parent_children` y las 2
  `invitations` aceptadas de prueba.
- **Fotos sí**: las 4 viven bajo la carpeta del autor (Gabriel), no había
  nada que depurar.
- Se **preservaron los UUIDs** de `daycares/rooms/children/posts` para no
  romper los `storage_path` (`<author_id>/<post_id>.<ext>`).

## Por qué no `supabase db push`

1. El CLI v2.118 exige ficheros `<timestamp>_nombre.sql` sin guiones y los
   nuestros usan `YYYY-MM-DD_HHMMSS` (convención del proyecto): los salta
   todos sin aplicar nada. No se renombraron para no romper la convención.
2. El host directo `db.<ref>.supabase.co` no resolvía por DNS desde esta red;
   se usó el pooler en modo sesión
   (`aws-0-eu-central-1.pooler.supabase.com:5432`,
   usuario `postgres.<ref>`) con el driver `pg` instalado en un dir temporal
   (fuera del repo).

## Qué se aplicó a prod (en orden)

1. **Schema**: las 19 migraciones de `supabase/migrations/`, **menos los
   bloques de seed histórico** (daycares, staff auth+users, rooms/children,
   posts). Esos seeds habrían creado filas con UUIDs nuevos y duplicado los
   datos del volcado. Se cortaron por marcadores de comentario; los ficheros
   en git quedaron intactos. Excepción: `fix_auth_seed_login` se aplicó
   entera (asegura la identidad email y deja el password conocido de dev).
2. **Historial**: versiones registradas en
   `supabase_migrations.schema_migrations` para futuros flujos CLI.
3. **Datos** (`seed_prod_filtered.sql`, generado en temporal, fuera de git
   por contener datos de menores): 4 daycares, 3 rooms, 1 user (Gabriel con
   el UID nuevo), 12 children, 9 posts, 2 post_children, 4 post_photos.
   `invitations` y `parent_children` quedan en 0.
4. **Storage**: 4 objetos subidos al bucket privado `post-photos` con el
   prefijo del UID nuevo. Verificado: 0 fotos sin objeto.

## Verificación

- Conteos prod: daycares 4, rooms 3, users 1, children 12, posts 9 (los 9 de
  Gabriel), post_children 2, post_photos 4, invitations 0, parent_children 0.
- RLS activa en las 9 tablas de `public`; ninguna tabla sin policy.
- `supabase db advisors` en prod: 6 WARN de rendimiento, **idénticos a dev**
  (`auth_rls_initplan` en daycares + `multiple_permissive_policies` en 5
  tablas). 0 errores, 0 hallazgos nuevos de seguridad por la migración.

## Pendiente / a tener en cuenta

- [ ] **Rotar credenciales de prod** usadas en la migración: borrar la secret
  key temporal en API Keys y, si se quiere, resetear el DB password.
- [ ] Activar en el Dashboard de prod **Auth → Leaked password protection**
  (en dev está desactivado; es config, no migra con SQL).
- [ ] Para apuntar la app a prod: actualizar `.env` con URL, publishable key
  y service_role de prod (nunca commitearlas).
- [ ] Los avisos `SECURITY DEFINER ejecutable por authenticated/anon` existen
  igual en dev y prod: es el diseño actual (las policies dependen de esas
  funciones), no algo introducido por la migración. Si se endurece, hacerlo
  vía spec + migración en ambas instancias.
- Artefactos de trabajo (no versionados, con datos de menores y fotos):
  `<Temp>\opencode\prod-migration\` — borrar al cerrar si ya no hacen falta.
