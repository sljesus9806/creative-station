// Base de datos SQLite (módulo nativo de Node, sin dependencias externas).
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { slugify } = require('./util');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'creative-station.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  image TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  short_desc TEXT DEFAULT '',
  description TEXT DEFAULT '',
  price REAL,
  price_from INTEGER DEFAULT 1,
  unit TEXT DEFAULT 'pieza',
  min_qty INTEGER DEFAULT 1,
  mode TEXT DEFAULT 'pedido',          -- 'pedido' (se agrega al pedido) | 'cotizacion' (solo cotización)
  custom_fields TEXT DEFAULT '[]',     -- JSON: ["Nombre","Edad",...]
  occasions TEXT DEFAULT '[]',         -- JSON: ["Cumpleaños","XV años",...]
  images TEXT DEFAULT '[]',            -- JSON: ["/uploads/...", ...]
  badge TEXT DEFAULT '',
  featured INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT DEFAULT '',
  city TEXT DEFAULT '',
  event_type TEXT DEFAULT '',
  event_date TEXT DEFAULT '',
  quantity TEXT DEFAULT '',
  interests TEXT DEFAULT '[]',
  product_slug TEXT DEFAULT '',
  theme TEXT DEFAULT '',
  budget TEXT DEFAULT '',
  delivery TEXT DEFAULT '',
  details TEXT DEFAULT '',
  images TEXT DEFAULT '[]',
  status TEXT DEFAULT 'nueva',
  admin_notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT DEFAULT '',
  event_date TEXT DEFAULT '',
  delivery TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  items TEXT DEFAULT '[]',
  total REAL,
  has_unpriced INTEGER DEFAULT 0,
  status TEXT DEFAULT 'nuevo',
  admin_notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_cat ON products(category_id);
`);

// ---------- Ajustes ----------
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

const getSettingStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
const setSettingStmt = db.prepare('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const s = { ...DEFAULT_SETTINGS };
  for (const r of rows) s[r.key] = r.value;
  return s;
}
function getSetting(key) {
  const r = getSettingStmt.get(key);
  return r ? r.value : DEFAULT_SETTINGS[key];
}
function setSetting(key, value) { setSettingStmt.run(key, String(value ?? '')); }

// ---------- Helpers de datos ----------
function uniqueSlug(table, base, excludeId = 0) {
  const s = slugify(base);
  let slug = s; let i = 2;
  const stmt = db.prepare(`SELECT id FROM ${table} WHERE slug = ? AND id != ?`);
  while (stmt.get(slug, excludeId)) slug = `${s}-${i++}`;
  return slug;
}

function hydrateProduct(p) {
  if (!p) return p;
  return {
    ...p,
    custom_fields: JSON.parse(p.custom_fields || '[]'),
    occasions: JSON.parse(p.occasions || '[]'),
    images: JSON.parse(p.images || '[]'),
  };
}

// ---------- Datos iniciales ----------
function seed() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM categories').get().n;
  if (count > 0) return;

  const cats = [
    ['Toppers y centros de mesa', 'Piezas troqueladas con capas y efecto 3D para decorar tu mesa y tu pastel.', 'camila-17'],
    ['Stickers personalizados', 'Hojas de stickers y stickers recortados con tu nombre, tu foto y tus frases favoritas.', 'stickers-foto'],
    ['Sobre platos y mesa', 'Tarjetas para plato, detalles de servilleta y todo para una mesa de revista.', 'sobre-plato-andrea'],
    ['Invitaciones y tarjetas', 'Tarjetas "It\'s my birthday", invitaciones y tarjetas de agradecimiento.', 'diego-nineteen'],
    ['Gorritos y accesorios', 'Gorritos de fiesta y accesorios con fotos y diseño a juego.', 'gorrito-personalizado'],
    ['Vasos personalizados', 'Vasos con nombre, vasos LED y recuerdos para tus invitados.', 'vaso-led-xv'],
    ['Graduación', 'Paquetes y detalles para celebrar tu logro.', 'grad-night-medicina'],
    ['Bodas y despedidas', 'Papelería para bodas, despedidas de soltera y Bride Era.', 'boda-ovalos'],
  ];
  const insCat = db.prepare('INSERT INTO categories(name, slug, description, image, sort_order) VALUES(?,?,?,?,?)');
  const catId = {};
  cats.forEach(([name, desc, img], i) => {
    const r = insCat.run(name, slugify(name), desc, `/img/seed/${img}.webp`, i);
    catId[name] = Number(r.lastInsertRowid);
  });

  const P = (o) => o;
  const products = [
    P({ name: 'Topper coquette con moño', cat: 'Toppers y centros de mesa', img: ['camila-17'], featured: 1, badge: 'Favorito',
      short: 'Troquelado con borde ondulado, moño y piezas 3D.',
      desc: 'Topper con varias capas, borde ondulado y piezas sueltas con efecto 3D (moño, flores, cóctel, cítricos). Ideal para centros de mesa o para decorar el pastel.\n\nPersonalizamos nombre, edad, temática y colores.',
      fields: ['Nombre', 'Edad', 'Temática', 'Colores'], occ: ['Cumpleaños', 'XV años'] }),
    P({ name: 'Centro de mesa con foto', cat: 'Toppers y centros de mesa', img: ['diana-31'], featured: 1,
      short: 'Con moños, cerezas, copas y la foto de quien cumple años.',
      desc: 'Centro de mesa troquelado estilo coquette con elementos 3D y la foto de quien cumple años. Puedes elegir los elementos decorativos y la paleta de colores.',
      fields: ['Nombre', 'Edad', 'Temática', 'Colores', 'Foto (te la pedimos por WhatsApp)'], occ: ['Cumpleaños'] }),
    P({ name: 'Kit topper + hoja de stickers', cat: 'Toppers y centros de mesa', img: ['danna-19'], featured: 1, badge: 'Nuevo',
      short: 'Topper ovalado floral y hoja de stickers a juego.',
      desc: 'Kit con topper ovalado con flores, moño y mariposa, más una hoja de stickers personalizada con nombre, edad, frases y foto.',
      fields: ['Nombre', 'Edad', 'Frase o texto', 'Colores', 'Foto (te la pedimos por WhatsApp)'], occ: ['Cumpleaños', 'XV años'] }),
    P({ name: 'Stickers con tu foto', cat: 'Stickers personalizados', img: ['stickers-foto'], featured: 1,
      short: 'Tus fotos recortadas como stickers, con gorrito de fiesta.',
      desc: 'Convertimos tus fotos favoritas en stickers recortados con detalles de fiesta. Perfectos para bolsitas, recuerdos y sorpresas.',
      fields: ['Nombre', 'Foto (te la pedimos por WhatsApp)'], occ: ['Cumpleaños', 'XV años', 'Despedida de soltera'] }),
    P({ name: 'Hoja de stickers personalizada', cat: 'Stickers personalizados', img: ['stickers-mia-18'],
      short: 'Nombre, edad, frases y fotos en una sola hoja.',
      desc: 'Hoja de stickers diseñada para tu evento: nombre, edad, frases, fotos y elementos de tu temática.',
      fields: ['Nombre', 'Edad', 'Frase o texto', 'Temática', 'Foto (te la pedimos por WhatsApp)'], occ: ['Cumpleaños', 'XV años'] }),
    P({ name: 'Stickers temáticos troquelados', cat: 'Stickers personalizados', img: ['latina-forever'],
      short: 'Lettering y elementos troquelados con tu frase.',
      desc: 'Stickers troquelados con lettering y elementos ilustrados según tu temática.',
      fields: ['Frase o texto', 'Temática', 'Colores'], occ: ['Cumpleaños'] }),
    P({ name: 'Tarjeta "It\'s my birthday"', cat: 'Invitaciones y tarjetas', img: ['diego-nineteen'], featured: 1,
      short: 'Tarjeta en arco con nombre, edad y piezas 3D.',
      desc: 'Tarjeta en forma de arco con nombre, edad escrita y detalles 3D (copa, esfera disco, moño). Disponible en cualquier paleta de colores.',
      fields: ['Nombre', 'Edad', 'Colores'], occ: ['Cumpleaños'] }),
    P({ name: 'Tarjetas primer añito', cat: 'Invitaciones y tarjetas', img: ['ivanna-fun-to-be-one'], featured: 1,
      short: 'Tarjetas troqueladas con la foto del bebé.',
      desc: 'Tarjetas troqueladas con la foto del bebé, nombre y temática de colores. Ideales como invitación o detalle de mesa.',
      fields: ['Nombre', 'Edad', 'Temática', 'Foto (te la pedimos por WhatsApp)'], occ: ['Baby & primer añito', 'Cumpleaños'] }),
    P({ name: 'Gorrito de fiesta con fotos', cat: 'Gorritos y accesorios', img: ['gorrito-personalizado'],
      short: 'Gorrito con las fotos de quien cumple años.',
      desc: 'Gorrito de fiesta impreso con fotos y diseño a juego con tu temática.',
      fields: ['Temática', 'Colores', 'Foto (te la pedimos por WhatsApp)'], occ: ['Cumpleaños'] }),
    P({ name: 'Sobre plato personalizado', cat: 'Sobre platos y mesa', img: ['sobre-plato-perla'], featured: 1,
      short: 'Pieza para plato con nombre y detalles de tu temática.',
      desc: 'Sobre plato con nombre, signo o detalle especial y elementos de tu temática. Le da un toque elegante a cada lugar de la mesa.',
      fields: ['Nombre', 'Temática', 'Colores'], occ: ['Cumpleaños', 'Bodas', 'XV años'] }),
    P({ name: 'Set de mesa coquette', cat: 'Sobre platos y mesa', img: ['sobre-plato-andrea'],
      short: 'Tarjeta, moño de servilleta y detalles a juego.',
      desc: 'Set para cada lugar de la mesa: tarjeta personalizada, moño para servilleta y piezas decorativas a juego.',
      fields: ['Nombre', 'Temática', 'Colores'], occ: ['Cumpleaños', 'Despedida de soltera'] }),
    P({ name: 'Tarjetas de lugar para boda', cat: 'Bodas y despedidas', img: ['boda-ovalos'], mode: 'cotizacion',
      short: 'Óvalos ilustrados con borde ornamental.',
      desc: 'Tarjetas ovaladas con ilustración, nombres y borde ornamental. Cotizamos según número de invitados y diseño.',
      fields: ['Nombre', 'Fecha del evento', 'Colores'], occ: ['Bodas'] }),
    P({ name: 'Paquete Grad Night', cat: 'Graduación', img: ['grad-night-medicina'], mode: 'cotizacion', badge: '10% off',
      short: 'Invitación, tarjeta de agradecimiento y detalles.',
      desc: 'Paquete de graduación con invitación, tarjeta de agradecimiento y detalles personalizados con tu carrera y generación.',
      fields: ['Nombre', 'Frase o texto', 'Fecha del evento', 'Colores'], occ: ['Graduación'] }),
    P({ name: 'Vaso personalizado', cat: 'Vasos personalizados', img: ['vaso-andrea'],
      short: 'Vaso reutilizable con nombre y diseño.',
      desc: 'Vaso reutilizable con tu nombre, profesión o frase. Ideal para recuerdos, graduaciones y regalos.',
      fields: ['Nombre', 'Frase o texto', 'Colores'], occ: ['Graduación', 'Cumpleaños'] }),
    P({ name: 'Vaso LED para XV años', cat: 'Vasos personalizados', img: ['vaso-led-xv'], featured: 1,
      short: 'Vaso que se ilumina, con nombre y fecha.',
      desc: 'Vaso con luz LED personalizado con nombre, inicial y fecha del evento. Un recuerdo que brilla en la pista.',
      fields: ['Nombre', 'Fecha del evento', 'Colores'], occ: ['XV años', 'Bodas'] }),
  ];

  const ins = db.prepare(`INSERT INTO products(name, slug, category_id, short_desc, description, price, unit, min_qty, mode, custom_fields, occasions, images, badge, featured, sort_order)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  products.forEach((p, i) => {
    ins.run(p.name, uniqueSlug('products', p.name), catId[p.cat], p.short, p.desc, null, p.unit || 'pieza', p.min || 1,
      p.mode || 'pedido', JSON.stringify(p.fields), JSON.stringify(p.occ), JSON.stringify(p.img.map((n) => `/img/seed/${n}.webp`)),
      p.badge || '', p.featured ? 1 : 0, i);
  });
}
seed();

module.exports = { db, getSettings, getSetting, setSetting, uniqueSlug, hydrateProduct, DATA_DIR, DEFAULT_SETTINGS };
