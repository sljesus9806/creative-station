// Contenido inicial y ajustes por defecto (compartido por el servidor y la versión estática).

const DEFAULT_SETTINGS = {
  business_name: 'Creative Station',
  tagline: 'Papelería creativa',
  whatsapp: '6691669855',
  instagram: 'creativestationmzt',
  city: 'Mazatlán, Sinaloa',
  announcement: 'Agenda de NOVIEMBRE abierta ✨ Envíos a todo México',
  hero_title: 'Papelería creativa para celebrar *a tu manera*',
  hero_text: 'Toppers, stickers, sobre platos, vasos y detalles personalizados para cumpleaños, XV años, bodas y graduaciones. Diseñamos cada pieza con tu nombre, tu foto y tu estilo.',
  shipping_text: 'Hacemos envíos a todo México y entregas en Mazatlán.',
  promo_active: '1',
  promo_kicker: 'Temporada de graduaciones',
  promo_title: 'Paquetes de graduación',
  promo_text: 'Agenda tu paquete de graduación del 24 de octubre al 15 de diciembre y recibe un 10% de descuento.',
  promo_cta: 'Quiero mi paquete',
  promo_link: '/cotizar?evento=Graduación',
  occasions: 'Cumpleaños, XV años, Bodas, Despedida de soltera, Graduación, Baby & primer añito, Bautizo y comunión',
  steps:
`Elige o imagina
Escoge productos del catálogo o cuéntanos tu idea: temática, colores, nombre y fecha.

Te cotizamos
Te respondemos por WhatsApp con precio, tiempos y una propuesta de diseño.

Apruebas tu diseño
Confirmas tu pedido y revisamos contigo cada detalle antes de imprimir.

Lo hacemos realidad
Producimos tus piezas con mucho cariño y las enviamos a todo México o las recoges en Mazatlán.`,
  faq:
`¿Hacen envíos?
Sí, enviamos a todo México. También puedes recoger tu pedido en Mazatlán. El costo del envío se calcula según tu ciudad.

¿Con cuánto tiempo debo hacer mi pedido?
Te recomendamos apartar tu fecha con anticipación porque la agenda se llena rápido. Al cotizar te confirmamos los tiempos exactos de tu pedido.

¿Puedo pedir un diseño que no está en el catálogo?
¡Claro! Todo es personalizable. Usa el formulario de cotización o escríbenos por WhatsApp con tus ideas y fotos de referencia.

¿Cómo envío la foto para mis stickers o toppers?
Después de enviar tu pedido o cotización, mándanos la foto por WhatsApp en la mejor calidad posible.

¿Cómo se paga?
Te compartimos los datos y las formas de pago por WhatsApp al confirmar tu pedido.`,
};

// [nombre, descripción, imagen en /img/seed]
const SEED_CATEGORIES = [
  ['Toppers y centros de mesa', 'Piezas troqueladas con capas y efecto 3D para decorar tu mesa y tu pastel.', 'camila-17'],
  ['Stickers personalizados', 'Hojas de stickers y stickers recortados con tu nombre, tu foto y tus frases favoritas.', 'stickers-foto'],
  ['Sobre platos y mesa', 'Tarjetas para plato, detalles de servilleta y todo para una mesa de revista.', 'sobre-plato-andrea'],
  ['Invitaciones y tarjetas', 'Tarjetas "It\'s my birthday", invitaciones y tarjetas de agradecimiento.', 'diego-nineteen'],
  ['Gorritos y accesorios', 'Gorritos de fiesta y accesorios con fotos y diseño a juego.', 'gorrito-personalizado'],
  ['Vasos personalizados', 'Vasos con nombre, vasos LED y recuerdos para tus invitados.', 'vaso-led-xv'],
  ['Graduación', 'Paquetes y detalles para celebrar tu logro.', 'grad-night-medicina'],
  ['Bodas y despedidas', 'Papelería para bodas, despedidas de soltera y Bride Era.', 'boda-ovalos'],
];

const SEED_PRODUCTS = [
  ({ name: 'Topper coquette con moño', cat: 'Toppers y centros de mesa', img: ['camila-17'], featured: 1, badge: 'Favorito',
    short: 'Troquelado con borde ondulado, moño y piezas 3D.',
    desc: 'Topper con varias capas, borde ondulado y piezas sueltas con efecto 3D (moño, flores, cóctel, cítricos). Ideal para centros de mesa o para decorar el pastel.\n\nPersonalizamos nombre, edad, temática y colores.',
    fields: ['Nombre', 'Edad', 'Temática', 'Colores'], occ: ['Cumpleaños', 'XV años'] }),
  ({ name: 'Centro de mesa con foto', cat: 'Toppers y centros de mesa', img: ['diana-31'], featured: 1,
    short: 'Con moños, cerezas, copas y la foto de quien cumple años.',
    desc: 'Centro de mesa troquelado estilo coquette con elementos 3D y la foto de quien cumple años. Puedes elegir los elementos decorativos y la paleta de colores.',
    fields: ['Nombre', 'Edad', 'Temática', 'Colores', 'Foto (te la pedimos por WhatsApp)'], occ: ['Cumpleaños'] }),
  ({ name: 'Kit topper + hoja de stickers', cat: 'Toppers y centros de mesa', img: ['danna-19'], featured: 1, badge: 'Nuevo',
    short: 'Topper ovalado floral y hoja de stickers a juego.',
    desc: 'Kit con topper ovalado con flores, moño y mariposa, más una hoja de stickers personalizada con nombre, edad, frases y foto.',
    fields: ['Nombre', 'Edad', 'Frase o texto', 'Colores', 'Foto (te la pedimos por WhatsApp)'], occ: ['Cumpleaños', 'XV años'] }),
  ({ name: 'Stickers con tu foto', cat: 'Stickers personalizados', img: ['stickers-foto'], featured: 1,
    short: 'Tus fotos recortadas como stickers, con gorrito de fiesta.',
    desc: 'Convertimos tus fotos favoritas en stickers recortados con detalles de fiesta. Perfectos para bolsitas, recuerdos y sorpresas.',
    fields: ['Nombre', 'Foto (te la pedimos por WhatsApp)'], occ: ['Cumpleaños', 'XV años', 'Despedida de soltera'] }),
  ({ name: 'Hoja de stickers personalizada', cat: 'Stickers personalizados', img: ['stickers-mia-18'],
    short: 'Nombre, edad, frases y fotos en una sola hoja.',
    desc: 'Hoja de stickers diseñada para tu evento: nombre, edad, frases, fotos y elementos de tu temática.',
    fields: ['Nombre', 'Edad', 'Frase o texto', 'Temática', 'Foto (te la pedimos por WhatsApp)'], occ: ['Cumpleaños', 'XV años'] }),
  ({ name: 'Stickers temáticos troquelados', cat: 'Stickers personalizados', img: ['latina-forever'],
    short: 'Lettering y elementos troquelados con tu frase.',
    desc: 'Stickers troquelados con lettering y elementos ilustrados según tu temática.',
    fields: ['Frase o texto', 'Temática', 'Colores'], occ: ['Cumpleaños'] }),
  ({ name: 'Tarjeta "It\'s my birthday"', cat: 'Invitaciones y tarjetas', img: ['diego-nineteen'], featured: 1,
    short: 'Tarjeta en arco con nombre, edad y piezas 3D.',
    desc: 'Tarjeta en forma de arco con nombre, edad escrita y detalles 3D (copa, esfera disco, moño). Disponible en cualquier paleta de colores.',
    fields: ['Nombre', 'Edad', 'Colores'], occ: ['Cumpleaños'] }),
  ({ name: 'Tarjetas primer añito', cat: 'Invitaciones y tarjetas', img: ['ivanna-fun-to-be-one'], featured: 1,
    short: 'Tarjetas troqueladas con la foto del bebé.',
    desc: 'Tarjetas troqueladas con la foto del bebé, nombre y temática de colores. Ideales como invitación o detalle de mesa.',
    fields: ['Nombre', 'Edad', 'Temática', 'Foto (te la pedimos por WhatsApp)'], occ: ['Baby & primer añito', 'Cumpleaños'] }),
  ({ name: 'Gorrito de fiesta con fotos', cat: 'Gorritos y accesorios', img: ['gorrito-personalizado'],
    short: 'Gorrito con las fotos de quien cumple años.',
    desc: 'Gorrito de fiesta impreso con fotos y diseño a juego con tu temática.',
    fields: ['Temática', 'Colores', 'Foto (te la pedimos por WhatsApp)'], occ: ['Cumpleaños'] }),
  ({ name: 'Sobre plato personalizado', cat: 'Sobre platos y mesa', img: ['sobre-plato-perla'], featured: 1,
    short: 'Pieza para plato con nombre y detalles de tu temática.',
    desc: 'Sobre plato con nombre, signo o detalle especial y elementos de tu temática. Le da un toque elegante a cada lugar de la mesa.',
    fields: ['Nombre', 'Temática', 'Colores'], occ: ['Cumpleaños', 'Bodas', 'XV años'] }),
  ({ name: 'Set de mesa coquette', cat: 'Sobre platos y mesa', img: ['sobre-plato-andrea'],
    short: 'Tarjeta, moño de servilleta y detalles a juego.',
    desc: 'Set para cada lugar de la mesa: tarjeta personalizada, moño para servilleta y piezas decorativas a juego.',
    fields: ['Nombre', 'Temática', 'Colores'], occ: ['Cumpleaños', 'Despedida de soltera'] }),
  ({ name: 'Tarjetas de lugar para boda', cat: 'Bodas y despedidas', img: ['boda-ovalos'], mode: 'cotizacion',
    short: 'Óvalos ilustrados con borde ornamental.',
    desc: 'Tarjetas ovaladas con ilustración, nombres y borde ornamental. Cotizamos según número de invitados y diseño.',
    fields: ['Nombre', 'Fecha del evento', 'Colores'], occ: ['Bodas'] }),
  ({ name: 'Paquete Grad Night', cat: 'Graduación', img: ['grad-night-medicina'], mode: 'cotizacion', badge: '10% off',
    short: 'Invitación, tarjeta de agradecimiento y detalles.',
    desc: 'Paquete de graduación con invitación, tarjeta de agradecimiento y detalles personalizados con tu carrera y generación.',
    fields: ['Nombre', 'Frase o texto', 'Fecha del evento', 'Colores'], occ: ['Graduación'] }),
  ({ name: 'Vaso personalizado', cat: 'Vasos personalizados', img: ['vaso-andrea'],
    short: 'Vaso reutilizable con nombre y diseño.',
    desc: 'Vaso reutilizable con tu nombre, profesión o frase. Ideal para recuerdos, graduaciones y regalos.',
    fields: ['Nombre', 'Frase o texto', 'Colores'], occ: ['Graduación', 'Cumpleaños'] }),
  ({ name: 'Vaso LED para XV años', cat: 'Vasos personalizados', img: ['vaso-led-xv'], featured: 1,
    short: 'Vaso que se ilumina, con nombre y fecha.',
    desc: 'Vaso con luz LED personalizado con nombre, inicial y fecha del evento. Un recuerdo que brilla en la pista.',
    fields: ['Nombre', 'Fecha del evento', 'Colores'], occ: ['XV años', 'Bodas'] }),
];


module.exports = { DEFAULT_SETTINGS, SEED_CATEGORIES, SEED_PRODUCTS };
