-- =========================================================
--  Creative Station · actualización de textos (noviembre 2026)
--  - Pasos: se agrega "Apartas tu fecha" (50% de anticipo) y el depósito antes de aprobar el diseño.
--  - Entregas en Mazatlán: por DiDi o recolección en domicilio.
--  Supabase → SQL Editor → New query → pega este archivo → Run.
--  (También puedes editar estos textos en el panel → Ajustes.)
-- =========================================================
insert into public.settings (key, value) values
  ('steps', 'Elige o imagina
Escoge productos del catálogo o cuéntanos tu idea: temática, colores, nombre y fecha.

Te cotizamos
Te respondemos por WhatsApp con precio, tiempos y una propuesta de diseño.

Apartas tu fecha
Se aparta la fecha con el 50% de anticipo por depósito o transferencia a la cuenta proporcionada.

Apruebas tu diseño
Ya realizado el depósito, confirmas tu pedido y revisamos contigo cada detalle antes de imprimir.

Lo hacemos realidad
Producimos tus piezas con mucho cariño. Enviamos a todo México y en Mazatlán entregamos por DiDi o recolección en domicilio.'),
  ('shipping_text', 'Hacemos envíos a todo México. En Mazatlán, entregas por DiDi o recolección en domicilio.'),
  ('faq', '¿Hacen envíos?
Sí, enviamos a todo México por paquetería; el costo se calcula según tu ciudad. En Mazatlán las entregas son por DiDi o con recolección en domicilio.

¿Con cuánto tiempo debo hacer mi pedido?
Te recomendamos apartar tu fecha con anticipación porque la agenda se llena rápido. Al cotizar te confirmamos los tiempos exactos de tu pedido.

¿Puedo pedir un diseño que no está en el catálogo?
¡Claro! Todo es personalizable. Usa el formulario de cotización o escríbenos por WhatsApp con tus ideas y fotos de referencia.

¿Cómo envío la foto para mis stickers o toppers?
Después de enviar tu pedido o cotización, mándanos la foto por WhatsApp en la mejor calidad posible.

¿Cómo se paga?
Tu fecha se aparta con el 50% de anticipo por depósito o transferencia a la cuenta que te proporcionamos por WhatsApp.')
on conflict (key) do update set value = excluded.value;
