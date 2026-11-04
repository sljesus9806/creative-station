// Genera la versión estática del sitio (para GitHub Pages) en la carpeta _site/.
//
//   node scripts/build-static.js            → usa content/catalogo.json (lo crea si no existe)
//   BASE_PATH=/creative-station node scripts/build-static.js
//
// En GitHub Pages el sitio vive en https://USUARIO.github.io/REPO/, por eso BASE_PATH = "/REPO".
const fs = require('node:fs');
const path = require('node:path');
const { siteConfig, slugify } = require('../src/util');
const { DEFAULT_SETTINGS, SEED_CATEGORIES, SEED_PRODUCTS } = require('../src/seed-data');
const pub = require('../src/views/public');
const { adminStaticPage } = require('../src/views/admin-static');

const ROOT = path.join(__dirname, '..');
const OUT = path.resolve(ROOT, process.env.OUT_DIR || '_site');
const CONTENT_DIR = path.join(ROOT, 'content');
const CONTENT = path.join(CONTENT_DIR, 'catalogo.json');
const BASE = (process.env.BASE_PATH || '').replace(/\/+$/, '');

siteConfig.base = BASE;
siteConfig.static = true;
siteConfig.repo = process.env.GITHUB_REPOSITORY || '';
siteConfig.branch = process.env.BRANCH || 'main';

// ---------- Contenido ----------
function seedContent() {
  const { admin_password_hash, ...settings } = DEFAULT_SETTINGS; // eslint-disable-line no-unused-vars
  const categories = SEED_CATEGORIES.map(([name, description, img], i) => ({
    id: i + 1, name, slug: slugify(name), description, image: `/img/seed/${img}.webp`, sort_order: i, active: 1,
  }));
  const catId = Object.fromEntries(categories.map((c) => [c.name, c.id]));
  const products = SEED_PRODUCTS.map((p, i) => ({
    id: i + 1, name: p.name, slug: slugify(p.name), category_id: catId[p.cat], short_desc: p.short, description: p.desc,
    price: null, price_from: 1, unit: p.unit || 'pieza', min_qty: p.min || 1, mode: p.mode || 'pedido',
    custom_fields: p.fields, occasions: p.occ, images: p.img.map((n) => `/img/seed/${n}.webp`),
    badge: p.badge || '', featured: p.featured ? 1 : 0, active: 1, sort_order: i,
  }));
  return { settings, categories, products };
}

if (!fs.existsSync(CONTENT)) {
  fs.mkdirSync(CONTENT_DIR, { recursive: true });
  fs.writeFileSync(CONTENT, `${JSON.stringify(seedContent(), null, 2)}\n`);
  console.log('Creado content/catalogo.json con el contenido inicial.');
}
const content = JSON.parse(fs.readFileSync(CONTENT, 'utf8'));
const s = { ...DEFAULT_SETTINGS, ...(content.settings || {}) };
const on = (v) => v !== 0 && v !== false && v !== '0';

const categories = (content.categories || []).filter((c) => on(c.active))
  .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.name.localeCompare(b.name, 'es'));
const catById = new Map(categories.map((c) => [c.id, c]));
const products = (content.products || [])
  .filter((p) => on(p.active) && (!p.category_id || catById.has(p.category_id)))
  .map((p) => ({
    price_from: 1, unit: 'pieza', min_qty: 1, mode: 'pedido', badge: '', short_desc: '', description: '',
    ...p,
    custom_fields: p.custom_fields || [], occasions: p.occasions || [], images: p.images || [],
    price: p.price === '' || p.price == null ? null : Number(p.price),
    category_name: catById.get(p.category_id)?.name || '', category_slug: catById.get(p.category_id)?.slug || '',
  }))
  .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || b.id - a.id);
for (const c of categories) c.product_count = products.filter((p) => p.category_id === c.id).length;
const visibleCats = categories.filter((c) => c.product_count > 0);

// ---------- Rutas con prefijo y diagonal final (GitHub Pages sirve carpetas) ----------
const PAGE_DIR = /^\/(catalogo|producto|pedido|cotizar|admin)(\/|$)/;
function fixPath(p) {
  const i = p.search(/[?#]/);
  let pathname = i === -1 ? p : p.slice(0, i);
  const suffix = i === -1 ? '' : p.slice(i);
  if (PAGE_DIR.test(pathname) && !pathname.endsWith('/')) pathname += '/';
  return `${BASE}${pathname}${suffix}`;
}
function staticize(html) {
  return String(html)
    .replace(/(href|src|action|data-src|content)="\/(?!\/)([^"]*)"/g, (m, attr, rest) => `${attr}="${fixPath(`/${rest}`)}"`)
    .replace(/"\/(img|uploads|css|js)\//g, `"${BASE}/$1/`)
    .replace(/&quot;\/(img|uploads)\//g, `&quot;${BASE}/$1/`);
}

function write(route, html) {
  const file = route === '/404' ? path.join(OUT, '404.html') : path.join(OUT, route, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, staticize(html));
}

// ---------- Generar ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync(path.join(ROOT, 'public'), OUT, { recursive: true });
if (fs.existsSync(path.join(CONTENT_DIR, 'uploads'))) fs.cpSync(path.join(CONTENT_DIR, 'uploads'), path.join(OUT, 'uploads'), { recursive: true });
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

const featured = products.filter((p) => on(p.featured)).slice(0, 8);
const gallery = [...new Set([...featured, ...products].map((p) => p.images[0]).filter(Boolean))];
write('/', pub.home({ s, categories: visibleCats, featured, gallery }));
write('/catalogo', pub.catalog({ s, categories: visibleCats, products, current: null, q: '', occasion: '' }));
for (const c of visibleCats) {
  write(`/catalogo/${c.slug}`, pub.catalog({ s, categories: visibleCats, products: products.filter((p) => p.category_id === c.id), current: c, q: '', occasion: '' }));
}
for (const p of products) {
  const related = products.filter((r) => r.category_id === p.category_id && r.id !== p.id).slice(0, 4);
  for (const r of featured) { if (related.length >= 4) break; if (r.id !== p.id && !related.includes(r)) related.push(r); }
  write(`/producto/${p.slug}`, pub.product({ s, p, related }));
}
write('/pedido', pub.cart({ s }));
const productsIndex = Object.fromEntries(products.map((p) => [p.slug, { name: p.name, image: p.images[0] || '', category: p.category_name, occasions: p.occasions }]));
write('/cotizar', pub.quote({ s, categories: visibleCats, product: null, preset: {}, productsIndex }));
write('/404', pub.notFound({ s }));
write('/admin', adminStaticPage({ base: BASE, repo: siteConfig.repo, branch: siteConfig.branch }));

console.log(`Sitio estático listo en ${path.relative(ROOT, OUT)}/ — ${products.length} productos, ${visibleCats.length} categorías, base "${BASE || '/'}"`);
