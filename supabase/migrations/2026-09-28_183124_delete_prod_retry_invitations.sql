-- Limpieza puntual en prod: borra los 4 intentos de invitación de prueba
-- del 2026-09-28 (1 con service key mezclada + 3 reintentos cuyo email
-- nunca salió por faltar RESEND_API_KEY en el deploy de Vercel).
-- Solo toca esas filas exactas por código; no altera schema ni el resto
-- de datos del volcado.
delete from public.invitations
where code in ('CXGQ6', '8AVHH', 'U9A2A', 'DQ52K')
  and status = 'pending';
