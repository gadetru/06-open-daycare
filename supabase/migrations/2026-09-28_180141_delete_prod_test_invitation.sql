-- Limpieza puntual en prod: borra la invitación de prueba creada el
-- 2026-09-28 desde la app de Vercel con la service key mezclada
-- (activación imposible, código MFVAN). Solo toca esa fila exacta;
-- no altera schema, policies ni el resto de datos del volcado.
delete from public.invitations
where code = 'MFVAN'
  and email = 'gadetru@gmail.com'
  and status = 'pending';
