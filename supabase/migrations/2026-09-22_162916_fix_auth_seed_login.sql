-- SPEC 09: convertir el seed de staff (SPEC 08) en login-eligible contra Supabase Auth.
-- El seed original (2026-09-22_105250_create_users_table.sql) insertaba auth.users
-- con bcrypt cost 06 y SIN fila en auth.identities, lo que rompe
-- supabase.auth.signInWithPassword (500 Database error querying schema).
-- Este fix es idempotente: solo agrega lo que falta.

-- 1) Identidad de email (Supabase Auth exige auth.identities para el login)
insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select
  gen_random_uuid(),
  u.id,
  u.email,
  'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  now(),
  now(),
  now()
from auth.users u
where u.email = 'gabriel@google.com'
  and not exists (
    select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email'
  );

-- 2) Password con bcrypt cost 10 (cost bajo → 500 en el login) y email confirmado
update auth.users
set encrypted_password = crypt('1q2w3e4r5t', gen_salt('bf', 10)),
    email_confirmed_at = coalesce(email_confirmed_at, now())
where email = 'gabriel@google.com';