-- =========================================================
--  Creative Station · contenido inicial (opcional)
--  Supabase → SQL Editor → New query → pega este archivo → Run.
--  Carga 8 categorías, 15 productos de ejemplo (sin precio) y los textos del sitio.
--  Se puede volver a correr: no duplica nada.
-- =========================================================

-- Textos y datos de contacto del sitio
insert into public.settings (key, value) values
  ('business_name', 'Creative Station'),
  ('tagline', 'Papelería creativa'),
  ('whatsapp', '6691669855'),
  ('instagram', 'creativestationmzt'),
  ('city', 'Mazatlán, Sinaloa'),
  ('announcement', 'Agenda de NOVIEMBRE abierta ✨ Envíos a todo México'),
  ('hero_title', 'Papelería creativa para celebrar *a tu manera*'),
  ('hero_text', 'Toppers, stickers, sobre platos, vasos y detalles personalizados para cumpleaños, XV años, bodas y graduaciones. Diseñamos cada pieza con tu nombre, tu foto y tu estilo.'),
  ('shipping_text', 'Hacemos envíos a todo México. En Mazatlán, entregas por DiDi o recolección en domicilio.'),
  ('promo_active', '1'),
  ('promo_kicker', 'Temporada de graduaciones'),
  ('promo_title', 'Paquetes de graduación'),
  ('promo_text', 'Agenda tu paquete de graduación del 24 de octubre al 15 de diciembre y recibe un 10% de descuento.'),
  ('promo_cta', 'Quiero mi paquete'),
  ('promo_link', '/cotizar?evento=Graduación'),
  ('occasions', 'Cumpleaños, XV años, Bodas, Despedida de soltera, Graduación, Baby & primer añito, Bautizo y comunión'),
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
on conflict (key) do nothing;

-- Categorías
insert into public.categories (name, slug, description, image, sort_order, active) values
  ('Toppers y centros de mesa', 'toppers-y-centros-de-mesa', 'Piezas troqueladas con capas y efecto 3D para decorar tu mesa y tu pastel.', 'img/seed/camila-17.webp', 0, true),
  ('Stickers personalizados', 'stickers-personalizados', 'Hojas de stickers y stickers recortados con tu nombre, tu foto y tus frases favoritas.', 'img/seed/stickers-foto.webp', 1, true),
  ('Sobre platos y mesa', 'sobre-platos-y-mesa', 'Tarjetas para plato, detalles de servilleta y todo para una mesa de revista.', 'img/seed/sobre-plato-andrea.webp', 2, true),
  ('Invitaciones y tarjetas', 'invitaciones-y-tarjetas', 'Tarjetas "It''s my birthday", invitaciones y tarjetas de agradecimiento.', 'img/seed/diego-nineteen.webp', 3, true),
  ('Gorritos y accesorios', 'gorritos-y-accesorios', 'Gorritos de fiesta y accesorios con fotos y diseño a juego.', 'img/seed/gorrito-personalizado.webp', 4, true),
  ('Vasos personalizados', 'vasos-personalizados', 'Vasos con nombre, vasos LED y recuerdos para tus invitados.', 'img/seed/vaso-led-xv.webp', 5, true),
  ('Graduación', 'graduacion', 'Paquetes y detalles para celebrar tu logro.', 'img/seed/grad-night-medicina.webp', 6, true),
  ('Bodas y despedidas', 'bodas-y-despedidas', 'Papelería para bodas, despedidas de soltera y Bride Era.', 'img/seed/boda-ovalos.webp', 7, true)
on conflict (slug) do nothing;

-- Productos
insert into public.products (name, slug, category_id, short_desc, description, price, price_from, unit, min_qty, mode, custom_fields, occasions, images, badge, featured, active, sort_order)
select v.name, v.slug, c.id, v.short_desc, v.description, null, true, v.unit, v.min_qty, v.mode, v.custom_fields, v.occasions, v.images, v.badge, v.featured, true, v.sort_order
from (values
  ('Topper coquette con moño', 'topper-coquette-con-mono', 'toppers-y-centros-de-mesa', 'Troquelado con borde ondulado, moño y piezas 3D.', 'Topper con varias capas, borde ondulado y piezas sueltas con efecto 3D (moño, flores, cóctel, cítricos). Ideal para centros de mesa o para decorar el pastel.

Personalizamos nombre, edad, temática y colores.', 'pieza', 1, 'pedido', array['Nombre', 'Edad', 'Temática', 'Colores']::text[], array['Cumpleaños', 'XV años']::text[], array['img/seed/camila-17.webp']::text[], 'Favorito', true, 0),
  ('Centro de mesa con foto', 'centro-de-mesa-con-foto', 'toppers-y-centros-de-mesa', 'Con moños, cerezas, copas y la foto de quien cumple años.', 'Centro de mesa troquelado estilo coquette con elementos 3D y la foto de quien cumple años. Puedes elegir los elementos decorativos y la paleta de colores.', 'pieza', 1, 'pedido', array['Nombre', 'Edad', 'Temática', 'Colores', 'Foto (te la pedimos por WhatsApp)']::text[], array['Cumpleaños']::text[], array['img/seed/diana-31.webp']::text[], '', true, 1),
  ('Kit topper + hoja de stickers', 'kit-topper-hoja-de-stickers', 'toppers-y-centros-de-mesa', 'Topper ovalado floral y hoja de stickers a juego.', 'Kit con topper ovalado con flores, moño y mariposa, más una hoja de stickers personalizada con nombre, edad, frases y foto.', 'pieza', 1, 'pedido', array['Nombre', 'Edad', 'Frase o texto', 'Colores', 'Foto (te la pedimos por WhatsApp)']::text[], array['Cumpleaños', 'XV años']::text[], array['img/seed/danna-19.webp']::text[], 'Nuevo', true, 2),
  ('Stickers con tu foto', 'stickers-con-tu-foto', 'stickers-personalizados', 'Tus fotos recortadas como stickers, con gorrito de fiesta.', 'Convertimos tus fotos favoritas en stickers recortados con detalles de fiesta. Perfectos para bolsitas, recuerdos y sorpresas.', 'pieza', 1, 'pedido', array['Nombre', 'Foto (te la pedimos por WhatsApp)']::text[], array['Cumpleaños', 'XV años', 'Despedida de soltera']::text[], array['img/seed/stickers-foto.webp']::text[], '', true, 3),
  ('Hoja de stickers personalizada', 'hoja-de-stickers-personalizada', 'stickers-personalizados', 'Nombre, edad, frases y fotos en una sola hoja.', 'Hoja de stickers diseñada para tu evento: nombre, edad, frases, fotos y elementos de tu temática.', 'pieza', 1, 'pedido', array['Nombre', 'Edad', 'Frase o texto', 'Temática', 'Foto (te la pedimos por WhatsApp)']::text[], array['Cumpleaños', 'XV años']::text[], array['img/seed/stickers-mia-18.webp']::text[], '', false, 4),
  ('Stickers temáticos troquelados', 'stickers-tematicos-troquelados', 'stickers-personalizados', 'Lettering y elementos troquelados con tu frase.', 'Stickers troquelados con lettering y elementos ilustrados según tu temática.', 'pieza', 1, 'pedido', array['Frase o texto', 'Temática', 'Colores']::text[], array['Cumpleaños']::text[], array['img/seed/latina-forever.webp']::text[], '', false, 5),
  ('Tarjeta "It''s my birthday"', 'tarjeta-it-s-my-birthday', 'invitaciones-y-tarjetas', 'Tarjeta en arco con nombre, edad y piezas 3D.', 'Tarjeta en forma de arco con nombre, edad escrita y detalles 3D (copa, esfera disco, moño). Disponible en cualquier paleta de colores.', 'pieza', 1, 'pedido', array['Nombre', 'Edad', 'Colores']::text[], array['Cumpleaños']::text[], array['img/seed/diego-nineteen.webp']::text[], '', true, 6),
  ('Tarjetas primer añito', 'tarjetas-primer-anito', 'invitaciones-y-tarjetas', 'Tarjetas troqueladas con la foto del bebé.', 'Tarjetas troqueladas con la foto del bebé, nombre y temática de colores. Ideales como invitación o detalle de mesa.', 'pieza', 1, 'pedido', array['Nombre', 'Edad', 'Temática', 'Foto (te la pedimos por WhatsApp)']::text[], array['Baby & primer añito', 'Cumpleaños']::text[], array['img/seed/ivanna-fun-to-be-one.webp']::text[], '', true, 7),
  ('Gorrito de fiesta con fotos', 'gorrito-de-fiesta-con-fotos', 'gorritos-y-accesorios', 'Gorrito con las fotos de quien cumple años.', 'Gorrito de fiesta impreso con fotos y diseño a juego con tu temática.', 'pieza', 1, 'pedido', array['Temática', 'Colores', 'Foto (te la pedimos por WhatsApp)']::text[], array['Cumpleaños']::text[], array['img/seed/gorrito-personalizado.webp']::text[], '', false, 8),
  ('Sobre plato personalizado', 'sobre-plato-personalizado', 'sobre-platos-y-mesa', 'Pieza para plato con nombre y detalles de tu temática.', 'Sobre plato con nombre, signo o detalle especial y elementos de tu temática. Le da un toque elegante a cada lugar de la mesa.', 'pieza', 1, 'pedido', array['Nombre', 'Temática', 'Colores']::text[], array['Cumpleaños', 'Bodas', 'XV años']::text[], array['img/seed/sobre-plato-perla.webp']::text[], '', true, 9),
  ('Set de mesa coquette', 'set-de-mesa-coquette', 'sobre-platos-y-mesa', 'Tarjeta, moño de servilleta y detalles a juego.', 'Set para cada lugar de la mesa: tarjeta personalizada, moño para servilleta y piezas decorativas a juego.', 'pieza', 1, 'pedido', array['Nombre', 'Temática', 'Colores']::text[], array['Cumpleaños', 'Despedida de soltera']::text[], array['img/seed/sobre-plato-andrea.webp']::text[], '', false, 10),
  ('Tarjetas de lugar para boda', 'tarjetas-de-lugar-para-boda', 'bodas-y-despedidas', 'Óvalos ilustrados con borde ornamental.', 'Tarjetas ovaladas con ilustración, nombres y borde ornamental. Cotizamos según número de invitados y diseño.', 'pieza', 1, 'cotizacion', array['Nombre', 'Fecha del evento', 'Colores']::text[], array['Bodas']::text[], array['img/seed/boda-ovalos.webp']::text[], '', false, 11),
  ('Paquete Grad Night', 'paquete-grad-night', 'graduacion', 'Invitación, tarjeta de agradecimiento y detalles.', 'Paquete de graduación con invitación, tarjeta de agradecimiento y detalles personalizados con tu carrera y generación.', 'pieza', 1, 'cotizacion', array['Nombre', 'Frase o texto', 'Fecha del evento', 'Colores']::text[], array['Graduación']::text[], array['img/seed/grad-night-medicina.webp']::text[], '10% off', false, 12),
  ('Vaso personalizado', 'vaso-personalizado', 'vasos-personalizados', 'Vaso reutilizable con nombre y diseño.', 'Vaso reutilizable con tu nombre, profesión o frase. Ideal para recuerdos, graduaciones y regalos.', 'pieza', 1, 'pedido', array['Nombre', 'Frase o texto', 'Colores']::text[], array['Graduación', 'Cumpleaños']::text[], array['img/seed/vaso-andrea.webp']::text[], '', false, 13),
  ('Vaso LED para XV años', 'vaso-led-para-xv-anos', 'vasos-personalizados', 'Vaso que se ilumina, con nombre y fecha.', 'Vaso con luz LED personalizado con nombre, inicial y fecha del evento. Un recuerdo que brilla en la pista.', 'pieza', 1, 'pedido', array['Nombre', 'Fecha del evento', 'Colores']::text[], array['XV años', 'Bodas']::text[], array['img/seed/vaso-led-xv.webp']::text[], '', true, 14)
) as v(name, slug, cat_slug, short_desc, description, unit, min_qty, mode, custom_fields, occasions, images, badge, featured, sort_order)
join public.categories c on c.slug = v.cat_slug
on conflict (slug) do nothing;
