// Creative Station — servidor web (Express + SQLite nativo de Node).
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const express = require('express');
const multer = require('multer');

const { db, getSettings, setSetting, uniqueSlug, hydrateProduct, DATA_DIR } = require('./src/db');
const auth = require('./src/auth');
const pub = require('./src/views/public');
const adm = require('./src/views/admin');
const { clean, money, waLink, parseJSON, fmtDate } = require('./src/util');

const PORT = Number(process.env.PORT) || 3000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

auth.ensureAdminPassword();

const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY !== '0') app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d' }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d' }));
app.use(express.urlencoded({ extended: false, limit: '200kb' }));
app.use(express.json({ limit: '200kb' }));

// ---------- Subida de imágenes ----------
const IMG_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}${IMG_TYPES[file.mimetype]}`),
});
const imageFilter = (req, file, cb) => cb(null, Boolean(IMG_TYPES[file.mimetype]));
const uploadAdmin = multer({ storage, fileFilter: imageFilter, limits: { fileSize: 12 * 1024 * 1024, files: 12 } });
const uploadPublic = multer({ storage, fileFilter: imageFilter, limits: { fileSize: 8 * 1024 * 1024, files: 3 } });
const fileUrl = (f) => `/uploads/${f.filename}`;

function removeUpload(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  const file = path.join(UPLOAD_DIR, path.basename(url));
  fs.promises.unlink(file).catch(() => {});
}

// ---------- Consultas ----------
const q = {
  activeCategories: db.prepare(`SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.active = 1) AS product_count
    FROM categories c WHERE c.active = 1 ORDER BY c.sort_order, c.name`),
  allCategories: db.prepare(`SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
    FROM categories c ORDER BY c.sort_order, c.name`),
  categoryBySlug: db.prepare('SELECT * FROM categories WHERE slug = ? AND active = 1'),
  categoryById: db.prepare('SELECT * FROM categories WHERE id = ?'),
  productBySlug: db.prepare(`SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p
    LEFT JOIN categories c ON c.id = p.category_id WHERE p.slug = ? AND p.active = 1`),
  productById: db.prepare('SELECT * FROM products WHERE id = ?'),
};

const PRODUCT_SELECT = `SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p
  LEFT JOIN categories c ON c.id = p.category_id`;

function listProducts({ active = true, categoryId, search, occasion, featured, limit } = {}) {
  const where = []; const args = [];
  if (active) where.push('p.active = 1 AND (c.active = 1 OR c.id IS NULL)');
  if (categoryId) { where.push('p.category_id = ?'); args.push(Number(categoryId)); }
  if (featured) where.push('p.featured = 1');
  if (search) {
    where.push('(p.name LIKE ? OR p.short_desc LIKE ? OR p.description LIKE ? OR c.name LIKE ?)');
    const like = `%${search}%`; args.push(like, like, like, like);
  }
  if (occasion) { where.push('p.occasions LIKE ?'); args.push(`%${JSON.stringify(occasion).slice(1, -1)}%`); }
  const sql = `${PRODUCT_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY p.sort_order, p.created_at DESC ${limit ? `LIMIT ${Number(limit)}` : ''}`;
  return db.prepare(sql).all(...args).map(hydrateProduct);
}

function adminCounts() {
  return {
    quotes: db.prepare("SELECT COUNT(*) n FROM quotes WHERE status = 'nueva'").get().n,
    orders: db.prepare("SELECT COUNT(*) n FROM orders WHERE status = 'nuevo'").get().n,
  };
}

const occasionsList = (s) => String(s.occasions || '').split(',').map((o) => o.trim()).filter(Boolean);
const send = (res, page) => res.type('html').send(String(page));

// ======================================================================
// Sitio público
// ======================================================================
app.get('/', (req, res) => {
  const s = getSettings();
  const categories = q.activeCategories.all().filter((c) => c.product_count > 0);
  const featured = listProducts({ featured: true, limit: 8 });
  const all = listProducts({ limit: 30 });
  const gallery = [...new Set([...featured, ...all].map((p) => p.images[0]).filter(Boolean))];
  send(res, pub.home({ s, categories, featured, gallery }));
});

function catalogHandler(req, res) {
  const s = getSettings();
  let current = null;
  if (req.params.slug) {
    current = q.categoryBySlug.get(req.params.slug);
    if (!current) return res.status(404).type('html').send(String(pub.notFound({ s })));
  }
  const search = clean(req.query.q, 80);
  const occasion = clean(req.query.ocasion, 60);
  const products = listProducts({ categoryId: current?.id, search, occasion });
  const categories = q.activeCategories.all().filter((c) => c.product_count > 0);
  send(res, pub.catalog({ s, categories, products, current, q: search, occasion }));
}
app.get('/catalogo', catalogHandler);
app.get('/catalogo/:slug', catalogHandler);

app.get('/producto/:slug', (req, res) => {
  const s = getSettings();
  const p = hydrateProduct(q.productBySlug.get(req.params.slug));
  if (!p) return res.status(404).type('html').send(String(pub.notFound({ s })));
  const related = listProducts({ categoryId: p.category_id, limit: 5 }).filter((r) => r.id !== p.id).slice(0, 4);
  if (related.length < 4) {
    for (const r of listProducts({ featured: true, limit: 8 })) {
      if (related.length >= 4) break;
      if (r.id !== p.id && !related.some((x) => x.id === r.id)) related.push(r);
    }
  }
  send(res, pub.product({ s, p, related }));
});

app.get('/pedido', (req, res) => send(res, pub.cart({ s: getSettings() })));

app.get('/cotizar', (req, res) => {
  const s = getSettings();
  const product = req.query.producto ? hydrateProduct(q.productBySlug.get(String(req.query.producto))) : null;
  send(res, pub.quote({ s, categories: q.activeCategories.all(), product, preset: { evento: clean(req.query.evento, 60) } }));
});

const publicLimiter = auth.rateLimiter({ windowMs: 60 * 60 * 1000, max: 15 });

app.post('/cotizar', publicLimiter, (req, res, next) => {
  uploadPublic.array('images', 3)(req, res, (err) => {
    if (err) {
      req.uploadError = err.code === 'LIMIT_FILE_SIZE' ? 'Cada imagen debe pesar menos de 8 MB.' : 'Solo puedes subir hasta 3 imágenes.';
    }
    next();
  });
}, (req, res) => {
  const s = getSettings();
  const files = req.files || [];
  const b = req.body || {};
  if (b.website) { files.forEach((f) => removeUpload(fileUrl(f))); return res.redirect('/'); } // honeypot
  const interests = [].concat(b.interests || []).map((x) => clean(x, 60)).slice(0, 20);
  const values = {
    name: clean(b.name, 80), phone: clean(b.phone, 20), email: clean(b.email, 120), city: clean(b.city, 80),
    event_type: clean(b.event_type, 60), event_date: clean(b.event_date, 10), quantity: clean(b.quantity, 60),
    budget: clean(b.budget, 40), theme: clean(b.theme, 160), details: clean(b.details, 2000),
    delivery: clean(b.delivery, 80), product_slug: clean(b.product_slug, 100), interests,
  };
  const errors = [];
  if (req.uploadError) errors.push(req.uploadError);
  if (!values.name) errors.push('Escribe tu nombre.');
  if (values.phone.replace(/\D/g, '').length < 10) errors.push('Escribe un WhatsApp válido de 10 dígitos.');
  if (!values.city) errors.push('Escribe tu ciudad y estado.');
  if (!values.event_type) errors.push('Elige el tipo de evento.');
  if (!values.details) errors.push('Cuéntanos tu idea.');
  if (errors.length) {
    files.forEach((f) => removeUpload(fileUrl(f)));
    const product = values.product_slug ? hydrateProduct(q.productBySlug.get(values.product_slug)) : null;
    return res.status(400).type('html').send(String(pub.quote({ s, categories: q.activeCategories.all(), product, errors, values })));
  }
  const images = files.map(fileUrl);
  const r = db.prepare(`INSERT INTO quotes(name, phone, email, city, event_type, event_date, quantity, interests, product_slug, theme, budget, delivery, details, images)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(values.name, values.phone, values.email, values.city, values.event_type, values.event_date,
    values.quantity, JSON.stringify(interests), values.product_slug, values.theme, values.budget, values.delivery, values.details, JSON.stringify(images));
  const folio = adm.folioQ(r.lastInsertRowid);
  const lines = [`¡Hola ${s.business_name}! ✨ Acabo de enviar una solicitud de cotización.`, `Folio: ${folio}`, ''];
  lines.push(`• Evento: ${values.event_type}${values.event_date ? ` (${fmtDate(values.event_date)})` : ''}`);
  if (values.quantity) lines.push(`• Piezas/invitados: ${values.quantity}`);
  if (interests.length) lines.push(`• Me interesa: ${interests.join(', ')}`);
  if (values.theme) lines.push(`• Temática y colores: ${values.theme}`);
  if (values.budget && values.budget !== 'Aún no lo sé') lines.push(`• Presupuesto: ${values.budget}`);
  lines.push(`• Idea: ${values.details}`, '', `Nombre: ${values.name}`, `Ciudad: ${values.city}`);
  if (values.delivery) lines.push(`Entrega: ${values.delivery}`);
  if (images.length) lines.push(`(Subí ${images.length} foto${images.length > 1 ? 's' : ''} de referencia en la página)`);
  send(res, pub.quoteDone({ s, folio, waUrl: waLink(s.whatsapp, lines.join('\n')) }));
});

// Pedido desde el carrito (JSON)
app.post('/api/pedidos', publicLimiter, (req, res) => {
  const s = getSettings();
  const b = req.body || {};
  if (b.website) return res.json({ ok: true, folio: 'CS-P-0000', wa: waLink(s.whatsapp, 'Hola') });
  const name = clean(b.name, 80); const phone = clean(b.phone, 20); const city = clean(b.city, 80);
  const errors = [];
  if (!name) errors.push('Escribe tu nombre.');
  if (phone.replace(/\D/g, '').length < 10) errors.push('Escribe un WhatsApp válido de 10 dígitos.');
  if (!city) errors.push('Escribe tu ciudad y estado.');
  const rawItems = Array.isArray(b.items) ? b.items.slice(0, 40) : [];
  const items = [];
  let needsPhoto = false;
  for (const it of rawItems) {
    const p = hydrateProduct(q.productBySlug.get(String(it.slug || '')));
    if (!p || p.mode === 'cotizacion') continue;
    const qty = Math.max(p.min_qty || 1, Math.min(9999, parseInt(it.qty, 10) || 1));
    const custom = {};
    for (const [k, v] of Object.entries(it.custom || {}).slice(0, 15)) {
      const val = clean(v, 600);
      if (val) custom[clean(k, 60)] = val;
    }
    if (p.custom_fields.some((f) => /foto/i.test(f))) needsPhoto = true;
    items.push({ slug: p.slug, name: p.name, price: p.price, unit: p.unit, qty, image: p.images[0] || '', custom });
  }
  if (!items.length) errors.push('Tu pedido está vacío o los productos ya no están disponibles.');
  if (errors.length) return res.status(400).json({ ok: false, errors });

  const priced = items.filter((i) => i.price != null);
  const total = priced.length ? priced.reduce((t, i) => t + i.price * i.qty, 0) : null;
  const hasUnpriced = items.some((i) => i.price == null);
  const delivery = clean(b.delivery, 80); const eventDate = clean(b.event_date, 10); const notes = clean(b.notes, 600);
  const r = db.prepare(`INSERT INTO orders(name, phone, city, event_date, delivery, notes, items, total, has_unpriced)
    VALUES(?,?,?,?,?,?,?,?,?)`).run(name, phone, city, eventDate, delivery, notes, JSON.stringify(items), total, hasUnpriced ? 1 : 0);
  const folio = adm.folioP(r.lastInsertRowid);

  const lines = [`¡Hola ${s.business_name}! ✨ Quiero hacer este pedido:`, `Folio: ${folio}`, ''];
  items.forEach((it, i) => {
    lines.push(`${i + 1}. ${it.name} × ${it.qty}${it.price != null ? ` — ${money(it.price * it.qty)}` : ''}`);
    for (const [k, v] of Object.entries(it.custom)) lines.push(`   • ${k}: ${v}`);
  });
  lines.push('');
  if (total != null) lines.push(`Total estimado: ${money(total)}${hasUnpriced ? ' + productos por cotizar' : ''}`);
  lines.push(`Nombre: ${name}`, `Ciudad: ${city}`, `Entrega: ${delivery}`);
  if (eventDate) lines.push(`Fecha del evento: ${fmtDate(eventDate)}`);
  if (notes) lines.push(`Comentarios: ${notes}`);
  if (needsPhoto) lines.push('', '📸 Te envío las fotos por aquí.');
  res.json({ ok: true, folio, wa: waLink(s.whatsapp, lines.join('\n')) });
});

app.get('/robots.txt', (req, res) => res.type('text').send(`User-agent: *\nDisallow: /admin\nSitemap: ${req.protocol}://${req.get('host')}/sitemap.xml\n`));
app.get('/sitemap.xml', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const urls = ['/', '/catalogo', '/cotizar',
    ...q.activeCategories.all().map((c) => `/catalogo/${c.slug}`),
    ...listProducts().map((p) => `/producto/${p.slug}`)];
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${base}${encodeURI(u)}</loc></url>`).join('')}</urlset>`);
});

// ======================================================================
// Panel de administración
// ======================================================================
const admin = express.Router();
const loginLimiter = auth.rateLimiter({ windowMs: 15 * 60 * 1000, max: 8 });

admin.get('/login', (req, res) => {
  if (auth.isLoggedIn(req)) return res.redirect('/admin');
  send(res, adm.login({ next: clean(req.query.next, 200) }));
});
admin.post('/login', loginLimiter, (req, res) => {
  const { password, next } = req.body || {};
  const stored = getSettings().admin_password_hash;
  if (!auth.verifyPassword(password || '', stored)) {
    return res.status(401).type('html').send(String(adm.login({ error: 'Contraseña incorrecta.', next })));
  }
  auth.createSession(res, req);
  const dest = typeof next === 'string' && next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin';
  res.redirect(dest);
});

admin.use(auth.sameOrigin, auth.requireAdmin);

admin.post('/salir', (req, res) => { auth.destroySession(req, res); res.redirect('/admin/login'); });

// Mensajes flash simples vía query (?ok=...)
const FLASH = {
  guardado: 'Cambios guardados ✨', creado: 'Creado correctamente ✨', eliminado: 'Eliminado.', duplicado: 'Producto duplicado. Ahora puedes editar la copia.',
  password: 'Contraseña actualizada.', pwerror: 'La contraseña actual no es correcta o la nueva es muy corta.', catuso: 'No se puede eliminar: la categoría tiene productos. Muévelos a otra categoría primero.',
};
const flashOf = (req) => (req.query.ok && FLASH[req.query.ok] ? { type: ['pwerror', 'catuso'].includes(req.query.ok) ? 'err' : 'ok', text: FLASH[req.query.ok] } : null);

admin.get('/', (req, res) => {
  const stats = {
    newQuotes: db.prepare("SELECT COUNT(*) n FROM quotes WHERE status='nueva'").get().n,
    newOrders: db.prepare("SELECT COUNT(*) n FROM orders WHERE status='nuevo'").get().n,
    products: db.prepare('SELECT COUNT(*) n FROM products WHERE active=1').get().n,
    categories: db.prepare('SELECT COUNT(*) n FROM categories').get().n,
  };
  const quotes = db.prepare('SELECT * FROM quotes ORDER BY id DESC LIMIT 5').all();
  const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 5').all().map(withItemCount);
  send(res, adm.dashboard({ stats, quotes, orders, counts: adminCounts() }));
});

// ----- Productos -----
admin.get('/productos', (req, res) => {
  const products = listProducts({ active: false, categoryId: req.query.cat, search: clean(req.query.q, 80) });
  send(res, adm.productList({ products, categories: q.allCategories.all(), catFilter: req.query.cat, q: req.query.q, counts: adminCounts(), flash: flashOf(req) }));
});

admin.get('/productos/nuevo', (req, res) => {
  const s = getSettings();
  send(res, adm.productForm({ p: { active: 1, price_from: 1, min_qty: 1, mode: 'pedido', custom_fields: ['Nombre', 'Temática', 'Colores'], occasions: [], images: [] },
    categories: q.allCategories.all(), occasions: occasionsList(s), counts: adminCounts() }));
});

function productFromBody(req, existing = {}) {
  const b = req.body || {};
  const fields = [].concat(b.custom_fields || []).map((x) => clean(x, 60));
  for (const extra of String(b.custom_extra || '').split(',')) { const e = clean(extra, 60); if (e && !fields.includes(e)) fields.push(e); }
  const priceRaw = String(b.price ?? '').replace(',', '.').trim();
  const price = priceRaw === '' ? null : Math.max(0, Number(priceRaw));
  // Imágenes: conservar, quitar, elegir portada, agregar nuevas
  const remove = new Set([].concat(b.remove_images || []));
  let images = [].concat(b.keep_images || []).filter((src) => (existing.images || []).includes(src) && !remove.has(src));
  if (b.cover && images.includes(b.cover)) images = [b.cover, ...images.filter((x) => x !== b.cover)];
  images.push(...(req.files || []).map(fileUrl));
  return {
    data: {
      name: clean(b.name, 120), category_id: b.category_id ? Number(b.category_id) : null, short_desc: clean(b.short_desc, 140),
      description: clean(b.description, 4000), price: Number.isFinite(price) ? price : null, price_from: b.price_from ? 1 : 0,
      unit: clean(b.unit, 20) || 'pieza', min_qty: Math.max(1, parseInt(b.min_qty, 10) || 1), mode: b.mode === 'cotizacion' ? 'cotizacion' : 'pedido',
      custom_fields: fields, occasions: [].concat(b.occasions || []).map((x) => clean(x, 60)), images,
      badge: clean(b.badge, 20), featured: b.featured ? 1 : 0, active: b.active ? 1 : 0, sort_order: parseInt(b.sort_order, 10) || 0,
    },
    removed: [...remove].filter((src) => (existing.images || []).includes(src)),
  };
}

function saveProduct(req, res, id) {
  const s = getSettings();
  const existing = id ? hydrateProduct(q.productById.get(id)) : {};
  if (id && !existing) return res.redirect('/admin/productos');
  const { data, removed } = productFromBody(req, existing);
  const errors = [];
  if (!data.name) errors.push('El producto necesita un nombre.');
  if (!data.category_id || !q.categoryById.get(data.category_id)) errors.push('Elige una categoría.');
  if (errors.length) {
    (req.files || []).forEach((f) => removeUpload(fileUrl(f)));
    return res.status(400).type('html').send(String(adm.productForm({ p: { ...existing, ...data, images: existing.images || [], id }, categories: q.allCategories.all(), occasions: occasionsList(s), counts: adminCounts(), errors })));
  }
  const vals = [data.name, data.category_id, data.short_desc, data.description, data.price, data.price_from, data.unit, data.min_qty, data.mode,
    JSON.stringify(data.custom_fields), JSON.stringify(data.occasions), JSON.stringify(data.images), data.badge, data.featured, data.active, data.sort_order];
  if (id) {
    const slug = existing.name === data.name ? existing.slug : uniqueSlug('products', data.name, id);
    db.prepare(`UPDATE products SET name=?, category_id=?, short_desc=?, description=?, price=?, price_from=?, unit=?, min_qty=?, mode=?, custom_fields=?, occasions=?, images=?, badge=?, featured=?, active=?, sort_order=?, slug=?, updated_at=datetime('now') WHERE id=?`)
      .run(...vals, slug, id);
    removed.forEach(removeUpload);
    return res.redirect(`/admin/productos/${id}?ok=guardado`);
  }
  const r = db.prepare(`INSERT INTO products(name, category_id, short_desc, description, price, price_from, unit, min_qty, mode, custom_fields, occasions, images, badge, featured, active, sort_order, slug)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(...vals, uniqueSlug('products', data.name));
  res.redirect(`/admin/productos/${r.lastInsertRowid}?ok=creado`);
}

const adminImages = (field, max) => (req, res, next) => uploadAdmin.array(field, max)(req, res, (err) => {
  if (err) return res.status(400).send(err.code === 'LIMIT_FILE_SIZE' ? 'Una imagen pesa más de 12 MB.' : 'Error al subir imágenes.');
  next();
});

admin.post('/productos/nuevo', adminImages('images', 12), (req, res) => saveProduct(req, res, 0));

admin.get('/productos/:id', (req, res) => {
  const p = hydrateProduct(q.productById.get(Number(req.params.id)));
  if (!p) return res.redirect('/admin/productos');
  send(res, adm.productForm({ p, categories: q.allCategories.all(), occasions: occasionsList(getSettings()), counts: adminCounts(), flash: flashOf(req) }));
});
admin.post('/productos/:id', adminImages('images', 12), (req, res) => saveProduct(req, res, Number(req.params.id)));

admin.post('/productos/:id/toggle', (req, res) => {
  db.prepare('UPDATE products SET active = 1 - active WHERE id = ?').run(Number(req.params.id));
  res.redirect(req.get('referer') || '/admin/productos');
});
admin.post('/productos/:id/duplicar', (req, res) => {
  const p = q.productById.get(Number(req.params.id));
  if (!p) return res.redirect('/admin/productos');
  const name = `${p.name} (copia)`;
  const r = db.prepare(`INSERT INTO products(name, slug, category_id, short_desc, description, price, price_from, unit, min_qty, mode, custom_fields, occasions, images, badge, featured, active, sort_order)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,?)`).run(name, uniqueSlug('products', name), p.category_id, p.short_desc, p.description, p.price, p.price_from, p.unit,
    p.min_qty, p.mode, p.custom_fields, p.occasions, p.images, p.badge, p.sort_order);
  res.redirect(`/admin/productos/${r.lastInsertRowid}?ok=duplicado`);
});
admin.post('/productos/:id/eliminar', (req, res) => {
  const p = hydrateProduct(q.productById.get(Number(req.params.id)));
  if (p) {
    db.prepare('DELETE FROM products WHERE id = ?').run(p.id);
    const stillUsed = db.prepare('SELECT images FROM products').all().flatMap((r) => parseJSON(r.images, []));
    p.images.filter((src) => !stillUsed.includes(src)).forEach(removeUpload);
  }
  res.redirect('/admin/productos?ok=eliminado');
});

// ----- Categorías -----
admin.get('/categorias', (req, res) => send(res, adm.categoryList({ categories: q.allCategories.all(), counts: adminCounts(), flash: flashOf(req) })));
admin.get('/categorias/nueva', (req, res) => send(res, adm.categoryForm({ c: { active: 1, sort_order: q.allCategories.all().length }, counts: adminCounts() })));

function saveCategory(req, res, id) {
  const existing = id ? q.categoryById.get(id) : {};
  if (id && !existing) return res.redirect('/admin/categorias');
  const b = req.body || {};
  const name = clean(b.name, 80);
  const file = (req.files || [])[0];
  if (!name) {
    if (file) removeUpload(fileUrl(file));
    return res.status(400).type('html').send(String(adm.categoryForm({ c: { ...existing, ...b, id }, counts: adminCounts(), errors: ['La categoría necesita un nombre.'] })));
  }
  const image = file ? fileUrl(file) : existing.image || '';
  const vals = [name, clean(b.description, 400), image, parseInt(b.sort_order, 10) || 0, b.active ? 1 : 0];
  if (id) {
    const slug = existing.name === name ? existing.slug : uniqueSlug('categories', name, id);
    db.prepare('UPDATE categories SET name=?, description=?, image=?, sort_order=?, active=?, slug=? WHERE id=?').run(...vals, slug, id);
    if (file && existing.image !== image) removeUpload(existing.image);
    return res.redirect(`/admin/categorias/${id}?ok=guardado`);
  }
  const r = db.prepare('INSERT INTO categories(name, description, image, sort_order, active, slug) VALUES(?,?,?,?,?,?)').run(...vals, uniqueSlug('categories', name));
  res.redirect(`/admin/categorias/${r.lastInsertRowid}?ok=creado`);
}
admin.post('/categorias/nueva', adminImages('image', 1), (req, res) => saveCategory(req, res, 0));
admin.get('/categorias/:id', (req, res) => {
  const c = q.categoryById.get(Number(req.params.id));
  if (!c) return res.redirect('/admin/categorias');
  send(res, adm.categoryForm({ c, counts: adminCounts(), flash: flashOf(req) }));
});
admin.post('/categorias/:id', adminImages('image', 1), (req, res) => saveCategory(req, res, Number(req.params.id)));
admin.post('/categorias/:id/eliminar', (req, res) => {
  const id = Number(req.params.id);
  const used = db.prepare('SELECT COUNT(*) n FROM products WHERE category_id = ?').get(id).n;
  if (used) return res.redirect(`/admin/categorias/${id}?ok=catuso`);
  const c = q.categoryById.get(id);
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  if (c) removeUpload(c.image);
  res.redirect('/admin/categorias?ok=eliminado');
});

// ----- Cotizaciones -----
function statusTotals(table) {
  const out = {};
  for (const r of db.prepare(`SELECT status, COUNT(*) n FROM ${table} GROUP BY status`).all()) out[r.status] = r.n;
  return out;
}
admin.get('/cotizaciones', (req, res) => {
  const status = adm.QUOTE_STATUS[req.query.estado] ? req.query.estado : '';
  const quotes = status ? db.prepare('SELECT * FROM quotes WHERE status = ? ORDER BY id DESC').all(status) : db.prepare('SELECT * FROM quotes ORDER BY id DESC').all();
  send(res, adm.quoteList({ quotes, status, totals: statusTotals('quotes'), counts: adminCounts() }));
});
admin.get('/cotizaciones/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM quotes WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.redirect('/admin/cotizaciones');
  const qd = { ...row, interests: parseJSON(row.interests, []), images: parseJSON(row.images, []) };
  send(res, adm.quoteDetail({ q: qd, s: getSettings(), counts: adminCounts(), flash: flashOf(req) }));
});
admin.post('/cotizaciones/:id', (req, res) => {
  const status = adm.QUOTE_STATUS[req.body.status] ? req.body.status : 'nueva';
  db.prepare('UPDATE quotes SET status = ?, admin_notes = ? WHERE id = ?').run(status, clean(req.body.admin_notes, 4000), Number(req.params.id));
  res.redirect(`/admin/cotizaciones/${req.params.id}?ok=guardado`);
});
admin.post('/cotizaciones/:id/eliminar', (req, res) => {
  const row = db.prepare('SELECT images FROM quotes WHERE id = ?').get(Number(req.params.id));
  if (row) { parseJSON(row.images, []).forEach(removeUpload); db.prepare('DELETE FROM quotes WHERE id = ?').run(Number(req.params.id)); }
  res.redirect('/admin/cotizaciones');
});

// ----- Pedidos -----
function withItemCount(o) {
  const items = parseJSON(o.items, []);
  return { ...o, items, item_count: items.length };
}
admin.get('/pedidos', (req, res) => {
  const status = adm.ORDER_STATUS[req.query.estado] ? req.query.estado : '';
  const rows = status ? db.prepare('SELECT * FROM orders WHERE status = ? ORDER BY id DESC').all(status) : db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
  send(res, adm.orderList({ orders: rows.map(withItemCount), status, totals: statusTotals('orders'), counts: adminCounts() }));
});
admin.get('/pedidos/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.redirect('/admin/pedidos');
  send(res, adm.orderDetail({ o: withItemCount(row), s: getSettings(), counts: adminCounts(), flash: flashOf(req) }));
});
admin.post('/pedidos/:id', (req, res) => {
  const status = adm.ORDER_STATUS[req.body.status] ? req.body.status : 'nuevo';
  db.prepare('UPDATE orders SET status = ?, admin_notes = ? WHERE id = ?').run(status, clean(req.body.admin_notes, 4000), Number(req.params.id));
  res.redirect(`/admin/pedidos/${req.params.id}?ok=guardado`);
});
admin.post('/pedidos/:id/eliminar', (req, res) => {
  db.prepare('DELETE FROM orders WHERE id = ?').run(Number(req.params.id));
  res.redirect('/admin/pedidos');
});

// ----- Ajustes -----
const SETTING_KEYS = ['whatsapp', 'instagram', 'city', 'shipping_text', 'announcement', 'hero_title', 'hero_text', 'occasions',
  'promo_kicker', 'promo_title', 'promo_text', 'promo_cta', 'promo_link', 'steps', 'faq'];
admin.get('/ajustes', (req, res) => send(res, adm.settingsPage({ s: getSettings(), counts: adminCounts(), flash: flashOf(req) })));
admin.post('/ajustes', (req, res) => {
  for (const k of SETTING_KEYS) if (k in req.body) setSetting(k, clean(req.body[k], 6000));
  setSetting('instagram', clean(req.body.instagram, 60).replace(/^@/, ''));
  setSetting('promo_active', req.body.promo_active ? '1' : '0');
  res.redirect('/admin/ajustes?ok=guardado');
});
admin.post('/ajustes/password', (req, res) => {
  const { current, password } = req.body || {};
  if (!auth.verifyPassword(current || '', getSettings().admin_password_hash) || String(password || '').length < 8) {
    return res.redirect('/admin/ajustes?ok=pwerror');
  }
  setSetting('admin_password_hash', auth.hashPassword(password));
  res.redirect('/admin/ajustes?ok=password');
});

app.use('/admin', admin);

// ---------- 404 y errores ----------
app.use((req, res) => res.status(404).type('html').send(String(pub.notFound({ s: getSettings() }))));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Algo salió mal. Intenta de nuevo.');
});

app.listen(PORT, () => console.log(`Creative Station lista en http://localhost:${PORT}  (panel: /admin)`));
