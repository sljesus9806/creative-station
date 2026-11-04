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
const { DEFAULT_SETTINGS, SEED_CATEGORIES, SEED_PRODUCTS } = require('./seed-data');

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

  const cats = SEED_CATEGORIES;
  const insCat = db.prepare('INSERT INTO categories(name, slug, description, image, sort_order) VALUES(?,?,?,?,?)');
  const catId = {};
  cats.forEach(([name, desc, img], i) => {
    const r = insCat.run(name, slugify(name), desc, `/img/seed/${img}.webp`, i);
    catId[name] = Number(r.lastInsertRowid);
  });

  const products = SEED_PRODUCTS;
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
