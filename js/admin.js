/* ============================================
   Creative Station — panel de administración
   Entra con correo y contraseña (Supabase). Productos, categorías,
   cotizaciones, pedidos y ajustes del sitio.
   ============================================ */

import * as api from './api.js';
import { compress } from './lib/images.js';

const app = document.getElementById('app');
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const money = (n) => mxn.format(Number(n)).replace(/\.00$/, '');
const slugify = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'item';
const dateFmt = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const fmtDate = (d) => (d ? dateFmt.format(new Date(`${String(d).slice(0, 10)}T12:00:00`)) : '');
const fmtDateTime = (d) => (d ? dateTimeFmt.format(new Date(d)) : '');
const folioQ = (id) => `CS-C-${String(id).padStart(4, '0')}`;
const folioP = (id) => `CS-P-${String(id).padStart(4, '0')}`;
const prettyPhone = (p) => { const d = String(p || '').replace(/\D/g, '').slice(-10); return d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : p || ''; };
const waLink = (phone, text) => { let n = String(phone || '').replace(/\D/g, ''); if (n.length === 10) n = `52${n}`; return `https://wa.me/${n}?text=${encodeURIComponent(text)}`; };

const QUOTE_STATUS = { nueva: 'Nueva', en_proceso: 'En proceso', cotizada: 'Cotizada', aceptada: 'Aceptada', cerrada: 'Cerrada' };
const ORDER_STATUS = { nuevo: 'Nuevo', confirmado: 'Confirmado', en_produccion: 'En producción', listo: 'Listo / enviado', entregado: 'Entregado', cancelado: 'Cancelado' };
const FIELD_PRESETS = ['Nombre', 'Edad', 'Fecha del evento', 'Temática', 'Colores', 'Frase o texto', 'Foto (te la pedimos por WhatsApp)'];
const UNITS = ['pieza', 'paquete', 'juego', 'kit', 'hoja', 'docena', 'set'];
const SAVED = 'Guardado ✨ Ya se ve en el sitio.';
const icon = {
  plus: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  image: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m20 16-4.5-4.5L6 19.5"/></svg>',
  wa: '<svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M16 3.2A12.7 12.7 0 0 0 5.1 22.4L3.3 28.8l6.6-1.7A12.7 12.7 0 1 0 16 3.2Zm0 23.2a10.5 10.5 0 0 1-5.4-1.5l-.4-.2-3.9 1 1-3.8-.2-.4A10.5 10.5 0 1 1 16 26.4Zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1a8.6 8.6 0 0 1-4.3-3.7c-.3-.6.3-.5.9-1.7a.6.6 0 0 0 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.7 3.7 0 0 0-1.1 2.7 6.5 6.5 0 0 0 1.4 3.4 14.6 14.6 0 0 0 5.6 5c2.1.9 2.9 1 4 .8a3.4 3.4 0 0 0 2.2-1.6 2.8 2.8 0 0 0 .2-1.6c-.1-.1-.3-.2-.6-.3Z"/></svg>',
};

/* ---------- Estado ---------- */
let db = null; // { settings, categories, products, quotes, orders }
let flash = null;
let userEmail = '';
let recovering = location.hash.includes('type=recovery');

const setFlash = (text, type = 'ok') => { flash = { text, type }; };
const catName = (id) => db.categories.find((c) => c.id === id)?.name || 'Sin categoría';
const occasionsList = () => String(db.settings.occasions || '').split(',').map((o) => o.trim()).filter(Boolean);
const imgTag = (src, w = 64) => `<img src="${esc(src || 'img/brand/favicon-180.png')}" alt="" width="${w}" height="${w}" loading="lazy">`;
function uniqueSlug(list, name, id) {
  const base = slugify(name); let slug = base; let i = 2;
  while (list.some((x) => x.slug === slug && x.id !== id)) slug = `${base}-${i++}`;
  return slug;
}
const SCHEMA_HINT = 'La base de datos aún no está lista: en Supabase → SQL Editor corre supabase/schema.sql y después supabase/seed.sql.';
const errText = (e) => {
  const m = (e && (e.message || e.error_description)) || '';
  if (api.isMissingSchema(e)) return SCHEMA_HINT;
  if (/duplicate key/i.test(m)) return 'Ya existe otro elemento con ese nombre. Usa un nombre distinto.';
  if (/row-level security|permission denied/i.test(m)) return 'Tu cuenta no tiene permiso para hacer esto.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Sin conexión. Revisa tu internet e intenta de nuevo.';
  return m || 'No se pudo guardar. Intenta de nuevo.';
};

async function busy(btn, label, fn) {
  const original = btn?.innerHTML;
  if (btn) { btn.disabled = true; btn.textContent = label; }
  try { await fn(); } catch (e) { console.error(e); alert(errText(e)); } finally {
    if (btn && document.body.contains(btn)) { btn.disabled = false; btn.innerHTML = original; }
  }
}

async function reload() { db = await api.loadAll(); }

/* ---------- Estructura ---------- */
function shell(active, body) {
  const newQuotes = db.quotes.filter((q) => q.status === 'nueva').length;
  const newOrders = db.orders.filter((o) => o.status === 'nuevo').length;
  const tabs = [['inicio', 'Inicio'], ['productos', 'Productos'], ['categorias', 'Categorías'], ['cotizaciones', 'Cotizaciones', newQuotes], ['pedidos', 'Pedidos', newOrders], ['ajustes', 'Ajustes']];
  app.innerHTML = `
<header class="a-top">
  <a class="a-brand" href="#inicio"><img src="img/brand/icono-lavanda.png" alt="" width="30" height="30"><span>Panel</span></a>
  <nav class="a-nav" aria-label="Panel">${tabs.map(([k, l, n]) => `<a href="#${k}" class="${active === k ? 'is-on' : ''}">${l}${n ? `<span class="dot">${n}</span>` : ''}</a>`).join('')}</nav>
  <div class="a-top-actions">
    <a class="a-link" href="./" target="_blank" rel="noopener">Ver sitio ↗</a>
    <button class="a-link" type="button" data-logout>Salir</button>
  </div>
</header>
<main class="a-main">
  ${flash ? `<div class="flash ${flash.type}" role="status">${esc(flash.text)}</div>` : ''}
  ${body}
</main>`;
  flash = null;
  $('[data-logout]').addEventListener('click', async () => { await api.signOut(); db = null; renderLogin(); });
}

/* ---------- Sin Supabase ---------- */
function renderSetup() {
  app.innerHTML = `
<div class="login-body"><div class="login card" style="max-width:560px;text-align:left;justify-items:start">
  <img src="img/brand/logo-vertical-lavanda.png" alt="Creative Station" width="100" height="117" style="justify-self:center">
  <h1 style="justify-self:center">Falta conectar la base de datos</h1>
  <p class="muted">El sitio está en <b>modo demo</b>: se ve el catálogo de ejemplo y los pedidos llegan solo por WhatsApp. Para usar el panel:</p>
  <ol style="display:grid;gap:.4rem;padding-left:1.2rem;margin:0">
    <li>Crea un proyecto gratis en <a href="https://supabase.com" target="_blank" rel="noopener">supabase.com</a>.</li>
    <li>En <b>SQL Editor</b> corre <code>supabase/schema.sql</code> y luego <code>supabase/seed.sql</code>.</li>
    <li>En <b>Authentication → Users</b> crea el usuario de la dueña y agrega su correo a <code>admins</code>.</li>
    <li>Pega la <b>Project URL</b> y la <b>publishable key</b> en <code>js/config.js</code>.</li>
  </ol>
  <p class="tiny muted">Los pasos completos están en el README del repositorio.</p>
</div></div>`;
}

/* ---------- Inicio de sesión ---------- */
function renderLogin(error, info) {
  app.innerHTML = `
<div class="login-body">
  <form class="login card" data-login>
    <img src="img/brand/logo-vertical-lavanda.png" alt="Creative Station" width="100" height="117">
    <h1>Panel de administración</h1>
    ${error ? `<p class="flash err">${esc(error)}</p>` : ''}${info ? `<p class="flash">${esc(info)}</p>` : ''}
    <label class="field"><span>Correo</span><input type="email" name="email" required autocomplete="username"></label>
    <label class="field"><span>Contraseña</span><input type="password" name="password" required autocomplete="current-password"></label>
    <button class="btn btn-primary block" type="submit">Entrar</button>
    <button class="a-link" type="button" data-forgot>¿Olvidaste tu contraseña?</button>
  </form>
</div>`;
  const form = $('[data-login]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const btn = $('button[type="submit"]', form);
    btn.disabled = true; btn.textContent = 'Entrando…';
    try {
      await api.signIn(String(fd.get('email')).trim(), String(fd.get('password')));
      await afterLogin();
    } catch (err) {
      renderLogin(/invalid login/i.test(err.message || '') ? 'Correo o contraseña incorrectos.' : errText(err));
    }
  });
  $('[data-forgot]').addEventListener('click', async () => {
    const email = $('input[name="email"]', form).value.trim();
    if (!email) { alert('Escribe tu correo arriba y vuelve a tocar “¿Olvidaste tu contraseña?”.'); return; }
    try {
      await api.sendPasswordReset(email, location.href.split('#')[0]);
      renderLogin('', 'Te mandamos un correo con un enlace para crear una contraseña nueva.');
    } catch (err) { renderLogin(errText(err)); }
  });
}

function renderNewPassword() {
  app.innerHTML = `
<div class="login-body">
  <form class="login card" data-newpass>
    <img src="img/brand/logo-vertical-lavanda.png" alt="Creative Station" width="100" height="117">
    <h1>Crea tu contraseña nueva</h1>
    <label class="field"><span>Contraseña nueva <small>(mínimo 8 caracteres)</small></span><input type="password" name="password" required minlength="8" autocomplete="new-password"></label>
    <button class="btn btn-primary block" type="submit">Guardar contraseña</button>
  </form>
</div>`;
  $('[data-newpass]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = String(new FormData(e.target).get('password'));
    if (pw.length < 8) { alert('La contraseña debe tener al menos 8 caracteres.'); return; }
    try {
      await api.setNewPassword(pw);
      recovering = false;
      history.replaceState(null, '', location.pathname);
      setFlash('Contraseña actualizada ✨');
      await afterLogin();
    } catch (err) { alert(errText(err)); }
  });
}

async function afterLogin() {
  const session = await api.getSession();
  if (!session) { renderLogin(); return; }
  userEmail = session.user?.email || '';
  if (!(await api.checkIsAdmin())) {
    app.innerHTML = `<div class="login-body"><div class="login card" style="max-width:520px">
      <h1>Esta cuenta no tiene acceso</h1>
      <p class="muted">El correo <b>${esc(userEmail)}</b> no está en la lista de administradoras. En Supabase → SQL Editor corre:</p>
      <pre style="white-space:pre-wrap;background:var(--lavanda-50);padding:.8rem;border-radius:12px;text-align:left;width:100%">insert into public.admins (email) values ('${esc(userEmail)}');</pre>
      <button class="btn btn-ghost" type="button" data-logout>Salir</button></div></div>`;
    $('[data-logout]').addEventListener('click', async () => { await api.signOut(); renderLogin(); });
    return;
  }
  await reload();
  route();
}

/* ---------- Inicio ---------- */
const quoteRow = (q) => `<li><a class="row" href="#cotizacion-${q.id}">
  <span class="row-main"><strong>${esc(q.name)}</strong><span class="muted">${esc(q.event_type)}${q.event_date ? ` · ${fmtDate(q.event_date)}` : ''} · ${esc(q.city)}</span></span>
  <span class="row-side"><span class="status s-${esc(q.status)}">${QUOTE_STATUS[q.status] || esc(q.status)}</span><span class="muted tiny">${folioQ(q.id)} · ${fmtDateTime(q.created_at)}</span></span></a></li>`;
const orderRow = (o) => `<li><a class="row" href="#pedido-${o.id}">
  <span class="row-main"><strong>${esc(o.name)}</strong><span class="muted">${o.items.length} ${o.items.length === 1 ? 'producto' : 'productos'}${o.total != null ? ` · ${money(o.total)}${o.has_unpriced ? '+' : ''}` : ''} · ${esc(o.city)}</span></span>
  <span class="row-side"><span class="status s-${esc(o.status)}">${ORDER_STATUS[o.status] || esc(o.status)}</span><span class="muted tiny">${folioP(o.id)} · ${fmtDateTime(o.created_at)}</span></span></a></li>`;

function renderHome() {
  const newQ = db.quotes.filter((q) => q.status === 'nueva').length;
  const newO = db.orders.filter((o) => o.status === 'nuevo').length;
  const stat = (n, label, href, hot) => `<a class="stat ${hot ? 'hot' : ''}" href="${href}"><strong>${n}</strong><span>${label}</span></a>`;
  shell('inicio', `
<div class="a-head"><h1>¡Hola! ✨</h1><p>Esto es lo que pasa en tu tienda.</p></div>
<div class="stats">
  ${stat(newQ, 'Cotizaciones nuevas', '#cotizaciones', newQ)}${stat(newO, 'Pedidos nuevos', '#pedidos', newO)}
  ${stat(db.products.filter((p) => p.active).length, 'Productos visibles', '#productos')}${stat(db.categories.length, 'Categorías', '#categorias')}
</div>
<div class="quick">
  <a class="btn btn-primary" href="#producto-nuevo">${icon.plus} Nuevo producto</a>
  <a class="btn btn-ghost" href="#categoria-nueva">${icon.plus} Nueva categoría</a>
  <a class="btn btn-ghost" href="#ajustes">Editar anuncio y promo</a>
</div>
<div class="two-col">
  <section class="card"><div class="card-head"><h2>Últimas cotizaciones</h2><a href="#cotizaciones">Ver todas</a></div>
    ${db.quotes.length ? `<ul class="rows">${db.quotes.slice(0, 5).map(quoteRow).join('')}</ul>` : '<p class="muted">Aún no hay cotizaciones.</p>'}</section>
  <section class="card"><div class="card-head"><h2>Últimos pedidos</h2><a href="#pedidos">Ver todos</a></div>
    ${db.orders.length ? `<ul class="rows">${db.orders.slice(0, 5).map(orderRow).join('')}</ul>` : '<p class="muted">Aún no hay pedidos.</p>'}</section>
</div>`);
}

/* ---------- Productos ---------- */
let productQuery = '';
let productCat = '';
function renderProducts() {
  const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const list = db.products.filter((p) => (!productCat || String(p.category_id) === productCat) && (!productQuery || norm(p.name).includes(norm(productQuery))));
  shell('productos', `
<div class="a-head a-head-row"><div><h1>Productos</h1><p>${db.products.length} en total. Toca un producto para editarlo.</p></div>
  <a class="btn btn-primary" href="#producto-nuevo">${icon.plus} Nuevo producto</a></div>
<form class="toolbar" data-filter>
  <input type="search" name="q" value="${esc(productQuery)}" placeholder="Buscar producto…">
  <select name="cat"><option value="">Todas las categorías</option>${db.categories.map((c) => `<option value="${c.id}" ${String(c.id) === productCat ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
</form>
${list.length ? `<ul class="plist">${list.map((p) => `
  <li class="pitem ${p.active ? '' : 'is-off'}">
    <a class="pitem-main" href="#producto-${p.id}">${imgTag(p.images?.[0])}
      <span class="pitem-text"><strong>${esc(p.name)}</strong>
        <span class="muted">${esc(catName(p.category_id))} · ${p.price != null ? `${p.price_from ? 'desde ' : ''}${money(p.price)}/${esc(p.unit)}` : 'sin precio'}${p.mode === 'cotizacion' ? ' · solo cotización' : ''}</span>
        <span class="flags">${p.featured ? '<span class="flag star">★ Destacado</span>' : ''}${p.active ? '' : '<span class="flag off">Oculto</span>'}${p.badge ? `<span class="flag">${esc(p.badge)}</span>` : ''}</span></span></a>
    <div class="pitem-actions">
      <button class="chip-btn" type="button" data-toggle="${p.id}">${p.active ? 'Ocultar' : 'Mostrar'}</button>
      <button class="chip-btn" type="button" data-dup="${p.id}">Duplicar</button>
    </div>
  </li>`).join('')}</ul>` : '<div class="card empty"><p>No hay productos con ese filtro.</p></div>'}`);
  const f = $('[data-filter]');
  $('input', f).addEventListener('input', (e) => { productQuery = e.target.value; clearTimeout(f.t); f.t = setTimeout(() => { renderProducts(); const i = $('[data-filter] input'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); });
  $('select', f).addEventListener('change', (e) => { productCat = e.target.value; renderProducts(); });
  f.addEventListener('submit', (e) => e.preventDefault());
  $$('[data-toggle]').forEach((b) => b.addEventListener('click', () => busy(b, '…', async () => {
    const p = db.products.find((x) => x.id === Number(b.dataset.toggle));
    Object.assign(p, await api.saveProduct({ id: p.id, active: !p.active }));
    setFlash(SAVED); renderProducts();
  })));
  $$('[data-dup]').forEach((b) => b.addEventListener('click', () => busy(b, 'Duplicando…', async () => {
    const p = db.products.find((x) => x.id === Number(b.dataset.dup));
    const { id, created_at, updated_at, ...rest } = p; // eslint-disable-line no-unused-vars
    const name = `${p.name} (copia)`;
    const copy = await api.saveProduct({ ...rest, name, slug: uniqueSlug(db.products, name, 0), featured: false, active: false });
    db.products.push(copy);
    setFlash('Producto duplicado (oculto). Edítalo y márcalo como visible.');
    location.hash = `producto-${copy.id}`;
  })));
}

function bindPreviews(scope) {
  $$('[data-files]', scope).forEach((input) => {
    const card = input.closest('.card');
    input.addEventListener('change', () => {
      const box = $('[data-previews]', card); box.innerHTML = '';
      [...input.files].forEach((f) => { const i = new Image(); i.src = URL.createObjectURL(f); i.alt = ''; box.appendChild(i); });
      const label = $('[data-upload-label]', card);
      if (label) label.textContent = input.files.length ? `${input.files.length} foto${input.files.length > 1 ? 's' : ''} lista${input.files.length > 1 ? 's' : ''} para subir` : 'Agregar fotos';
    });
  });
}

function renderProductForm(id) {
  const isNew = id === 'nuevo';
  const p = isNew
    ? { active: true, price_from: true, min_qty: 1, mode: 'pedido', unit: 'pieza', custom_fields: ['Nombre', 'Temática', 'Colores'], occasions: [], images: [], sort_order: 0 }
    : db.products.find((x) => x.id === Number(id));
  if (!p) { location.hash = 'productos'; return; }
  const extra = (p.custom_fields || []).filter((f) => !FIELD_PRESETS.includes(f)).join(', ');
  const units = [...new Set([...UNITS, p.unit || 'pieza'])];
  shell('productos', `
<div class="a-head"><a class="back" href="#productos">← Productos</a><h1>${isNew ? 'Nuevo producto' : esc(p.name)}</h1>
${!isNew && p.active ? `<p><a href="producto.html?p=${encodeURIComponent(p.slug)}" target="_blank" rel="noopener">Ver en el sitio ↗</a></p>` : ''}</div>
<form class="form-grid" data-form novalidate>
  <section class="card"><h2>Información</h2>
    <label class="field"><span>Nombre del producto *</span><input name="name" required maxlength="120" value="${esc(p.name || '')}" placeholder="Ej. Topper coquette con moño"></label>
    <label class="field"><span>Categoría *</span><select name="category_id" required><option value="">Elige una categoría</option>
      ${db.categories.map((c) => `<option value="${c.id}" ${p.category_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
    <label class="field"><span>Descripción corta <small>(aparece en la tarjeta)</small></span><input name="short_desc" maxlength="140" value="${esc(p.short_desc || '')}"></label>
    <label class="field"><span>Descripción completa</span><textarea name="description" rows="6" maxlength="4000" placeholder="Materiales, medidas, qué incluye, cómo se personaliza…">${esc(p.description || '')}</textarea></label>
  </section>
  <section class="card"><h2>Fotos</h2>
    <p class="muted tiny">La primera foto es la portada. Puedes subirlas desde tu celular; se optimizan solas.</p>
    ${(p.images || []).length ? `<ul class="img-list">${p.images.map((src, i) => `<li class="img-item">${imgTag(src, 120)}
      <label class="radio tiny"><input type="radio" name="cover" value="${esc(src)}" ${i === 0 ? 'checked' : ''}> Portada</label>
      <label class="check tiny"><input type="checkbox" name="remove_images" value="${esc(src)}"> Quitar</label></li>`).join('')}</ul>` : ''}
    <label class="upload"><input type="file" name="images" accept="image/*" multiple data-files>${icon.image}<span data-upload-label>Agregar fotos</span></label>
    <div class="upload-previews" data-previews></div>
  </section>
  <section class="card"><h2>Precio y pedido</h2>
    <div class="row-2">
      <label class="field"><span>Precio (MXN)</span><input name="price" type="number" step="0.01" min="0" inputmode="decimal" value="${p.price ?? ''}" placeholder="Vacío si se cotiza"></label>
      <label class="field"><span>Se vende por</span><select name="unit">${units.map((u) => `<option ${u === (p.unit || 'pieza') ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select></label>
    </div>
    <label class="check"><input type="checkbox" name="price_from" ${p.price_from ? 'checked' : ''}> Mostrar como “Desde $…” (el precio puede variar según el diseño)</label>
    <label class="field"><span>Cantidad mínima</span><input name="min_qty" type="number" min="1" max="9999" value="${p.min_qty || 1}"></label>
    <fieldset class="field"><legend>¿Cómo se pide?</legend>
      <label class="radio"><input type="radio" name="mode" value="pedido" ${p.mode !== 'cotizacion' ? 'checked' : ''}> Se puede agregar al pedido</label>
      <label class="radio"><input type="radio" name="mode" value="cotizacion" ${p.mode === 'cotizacion' ? 'checked' : ''}> Solo por cotización (paquetes, bodas, pedidos grandes)</label>
    </fieldset>
  </section>
  <section class="card"><h2>Personalización</h2>
    <p class="muted tiny">¿Qué datos pedimos para personalizar este producto?</p>
    <div class="check-grid">${FIELD_PRESETS.map((f) => `<label class="check"><input type="checkbox" name="custom_fields" value="${esc(f)}" ${(p.custom_fields || []).includes(f) ? 'checked' : ''}> ${esc(f)}</label>`).join('')}</div>
    <label class="field"><span>Otros campos <small>(separados por coma)</small></span><input name="custom_extra" value="${esc(extra)}" placeholder="Ej. Signo zodiacal, Carrera"></label>
    <h3>Ocasiones</h3>
    <div class="check-grid">${occasionsList().map((o) => `<label class="check"><input type="checkbox" name="occasions" value="${esc(o)}" ${(p.occasions || []).includes(o) ? 'checked' : ''}> ${esc(o)}</label>`).join('')}</div>
  </section>
  <section class="card"><h2>Visibilidad</h2>
    <label class="check"><input type="checkbox" name="active" ${p.active ? 'checked' : ''}> Visible en el sitio</label>
    <label class="check"><input type="checkbox" name="featured" ${p.featured ? 'checked' : ''}> Destacar en la página de inicio</label>
    <div class="row-2">
      <label class="field"><span>Etiqueta <small>(opcional)</small></span><input name="badge" maxlength="20" value="${esc(p.badge || '')}" placeholder="Nuevo, Favorito, 10% off"></label>
      <label class="field"><span>Orden</span><input name="sort_order" type="number" value="${p.sort_order ?? 0}"></label>
    </div>
  </section>
  <div class="form-actions">
    <button class="btn btn-primary btn-lg" type="submit">${isNew ? 'Crear producto' : 'Guardar cambios'}</button>
    <a class="btn btn-ghost" href="#productos">Cancelar</a>
  </div>
</form>
${isNew ? '' : '<div class="danger-zone"><button class="btn btn-danger" type="button" data-delete>Eliminar producto</button></div>'}`);
  bindPreviews(app);
  const form = $('[data-form]');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get('name') || '').trim();
    const categoryId = Number(fd.get('category_id'));
    if (!name || !categoryId) { alert('El producto necesita nombre y categoría.'); return; }
    const btn = $('button[type="submit"]', form);
    busy(btn, 'Guardando…', async () => {
      const fields = fd.getAll('custom_fields').map(String);
      String(fd.get('custom_extra') || '').split(',').map((x) => x.trim()).filter(Boolean).forEach((x) => { if (!fields.includes(x)) fields.push(x); });
      const removeSet = new Set(fd.getAll('remove_images').map(String));
      let images = (p.images || []).filter((src) => !removeSet.has(src));
      const cover = String(fd.get('cover') || '');
      if (cover && images.includes(cover)) images = [cover, ...images.filter((x) => x !== cover)];
      const files = [...$('[data-files]', form).files];
      for (let i = 0; i < files.length; i++) {
        btn.textContent = `Subiendo foto ${i + 1} de ${files.length}…`;
        images.push(await api.uploadImage(await compress(files[i])));
      }
      btn.textContent = 'Guardando…';
      const priceRaw = String(fd.get('price') || '').replace(',', '.').trim();
      const data = {
        name, category_id: categoryId,
        short_desc: String(fd.get('short_desc') || '').trim(), description: String(fd.get('description') || '').trim(),
        price: priceRaw === '' ? null : Math.max(0, Number(priceRaw)), price_from: Boolean(fd.get('price_from')),
        unit: String(fd.get('unit') || 'pieza'), min_qty: Math.max(1, parseInt(fd.get('min_qty'), 10) || 1),
        mode: fd.get('mode') === 'cotizacion' ? 'cotizacion' : 'pedido',
        custom_fields: fields, occasions: fd.getAll('occasions').map(String), images,
        badge: String(fd.get('badge') || '').trim(), featured: Boolean(fd.get('featured')), active: Boolean(fd.get('active')),
        sort_order: parseInt(fd.get('sort_order'), 10) || 0,
        slug: isNew || p.name !== name ? uniqueSlug(db.products, name, isNew ? 0 : p.id) : p.slug,
      };
      const saved = await api.saveProduct(isNew ? data : { id: p.id, ...data });
      if (!isNew) await api.removeImages([...removeSet].filter((src) => (p.images || []).includes(src)));
      if (isNew) db.products.push(saved); else Object.assign(p, saved);
      setFlash(SAVED);
      if (isNew) location.hash = `producto-${saved.id}`; else renderProductForm(String(p.id));
    });
  });
  $('[data-delete]')?.addEventListener('click', (e) => {
    if (!confirm(`¿Eliminar “${p.name}”? Esta acción no se puede deshacer.`)) return;
    busy(e.target, 'Eliminando…', async () => {
      await api.deleteProduct(p);
      db.products = db.products.filter((x) => x.id !== p.id);
      setFlash('Producto eliminado.'); location.hash = 'productos';
    });
  });
}

/* ---------- Categorías ---------- */
function renderCategories() {
  shell('categorias', `
<div class="a-head a-head-row"><div><h1>Categorías</h1><p>Ordénalas y elige cuáles se muestran en el sitio.</p></div>
  <a class="btn btn-primary" href="#categoria-nueva">${icon.plus} Nueva categoría</a></div>
<ul class="plist">${db.categories.map((c) => {
    const n = db.products.filter((p) => p.category_id === c.id).length;
    return `<li class="pitem ${c.active ? '' : 'is-off'}"><a class="pitem-main" href="#categoria-${c.id}">${imgTag(c.image)}
      <span class="pitem-text"><strong>${esc(c.name)}</strong><span class="muted">${n} productos · orden ${c.sort_order}</span>
      ${c.active ? '' : '<span class="flags"><span class="flag off">Oculta</span></span>'}</span></a></li>`;
  }).join('')}</ul>`);
}

function renderCategoryForm(id) {
  const isNew = id === 'nueva';
  const c = isNew ? { active: true, sort_order: db.categories.length } : db.categories.find((x) => x.id === Number(id));
  if (!c) { location.hash = 'categorias'; return; }
  shell('categorias', `
<div class="a-head"><a class="back" href="#categorias">← Categorías</a><h1>${isNew ? 'Nueva categoría' : esc(c.name)}</h1></div>
<form class="form-grid" data-form novalidate>
  <section class="card">
    <label class="field"><span>Nombre *</span><input name="name" required maxlength="80" value="${esc(c.name || '')}"></label>
    <label class="field"><span>Descripción</span><textarea name="description" rows="3" maxlength="400">${esc(c.description || '')}</textarea></label>
    <div class="row-2"><label class="field"><span>Orden</span><input name="sort_order" type="number" value="${c.sort_order ?? 0}"></label>
      <label class="check"><input type="checkbox" name="active" ${c.active ? 'checked' : ''}> Visible en el sitio</label></div>
  </section>
  <section class="card"><h2>Imagen</h2>
    ${c.image ? `<img class="cat-preview" src="${esc(c.image)}" alt="" width="140" height="140">` : ''}
    <label class="upload"><input type="file" name="image" accept="image/*" data-files>${icon.image}<span data-upload-label>${c.image ? 'Cambiar imagen' : 'Subir imagen'}</span></label>
    <div class="upload-previews" data-previews></div>
  </section>
  <div class="form-actions"><button class="btn btn-primary btn-lg" type="submit">${isNew ? 'Crear categoría' : 'Guardar cambios'}</button><a class="btn btn-ghost" href="#categorias">Cancelar</a></div>
</form>
${isNew ? '' : '<div class="danger-zone"><button class="btn btn-danger" type="button" data-delete>Eliminar categoría</button><p class="tiny muted">Solo se puede eliminar si no tiene productos.</p></div>'}`);
  bindPreviews(app);
  const form = $('[data-form]');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get('name') || '').trim();
    if (!name) { alert('La categoría necesita un nombre.'); return; }
    busy($('button[type="submit"]', form), 'Guardando…', async () => {
      const file = $('[data-files]', form).files[0];
      const oldImage = c.image;
      const image = file ? await api.uploadImage(await compress(file, { max: 900 })) : c.image || '';
      const data = {
        name, description: String(fd.get('description') || '').trim(), sort_order: parseInt(fd.get('sort_order'), 10) || 0,
        active: Boolean(fd.get('active')), image,
        slug: isNew || c.name !== name ? uniqueSlug(db.categories, name, isNew ? 0 : c.id) : c.slug,
      };
      const saved = await api.saveCategory(isNew ? data : { id: c.id, ...data });
      if (file && oldImage) await api.removeImages([oldImage]);
      if (isNew) db.categories.push(saved); else Object.assign(c, saved);
      setFlash(SAVED);
      if (isNew) location.hash = `categoria-${saved.id}`; else renderCategoryForm(String(c.id));
    });
  });
  $('[data-delete]')?.addEventListener('click', (e) => {
    if (db.products.some((p) => p.category_id === c.id)) { alert('No se puede eliminar: la categoría tiene productos. Muévelos a otra categoría primero.'); return; }
    if (!confirm(`¿Eliminar la categoría “${c.name}”?`)) return;
    busy(e.target, 'Eliminando…', async () => {
      await api.deleteCategory(c.id);
      await api.removeImages([c.image]);
      db.categories = db.categories.filter((x) => x.id !== c.id);
      setFlash('Categoría eliminada.'); location.hash = 'categorias';
    });
  });
}

/* ---------- Cotizaciones y pedidos ---------- */
let quoteFilter = '';
let orderFilter = '';
function statusTabs(map, current, list, key) {
  const totals = {};
  list.forEach((x) => { totals[x.status] = (totals[x.status] || 0) + 1; });
  return `<nav class="tabs" data-tabs="${key}">
    <a href="#" data-status="" class="${!current ? 'is-on' : ''}">Todas</a>
    ${Object.entries(map).map(([k, l]) => `<a href="#" data-status="${k}" class="${current === k ? 'is-on' : ''}">${l}${totals[k] ? ` <span class="n">${totals[k]}</span>` : ''}</a>`).join('')}
  </nav>`;
}

function renderQuotes() {
  const list = db.quotes.filter((q) => !quoteFilter || q.status === quoteFilter);
  shell('cotizaciones', `
<div class="a-head"><h1>Cotizaciones</h1><p>Solicitudes enviadas desde “Cotizar”.</p></div>
${statusTabs(QUOTE_STATUS, quoteFilter, db.quotes, 'q')}
<section class="card">${list.length ? `<ul class="rows">${list.map(quoteRow).join('')}</ul>` : '<p class="muted">No hay cotizaciones aquí.</p>'}</section>`);
  $$('[data-tabs] a').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); quoteFilter = a.dataset.status; renderQuotes(); }));
}

function renderQuote(id) {
  const q = db.quotes.find((x) => x.id === Number(id));
  if (!q) { location.hash = 'cotizaciones'; return; }
  const folio = folioQ(q.id);
  const info = [['Evento', q.event_type], ['Fecha', fmtDate(q.event_date)], ['Piezas / invitados', q.quantity], ['Presupuesto', q.budget],
    ['Temática y colores', q.theme], ['Le interesa', (q.interests || []).join(', ')], ['Entrega', q.delivery]];
  shell('cotizaciones', `
<div class="a-head"><a class="back" href="#cotizaciones">← Cotizaciones</a><h1>${esc(q.name)}</h1><p class="muted">${folio} · recibida ${fmtDateTime(q.created_at)}</p></div>
<div class="two-col">
  <section class="card"><h2>Detalles</h2>
    <dl class="dl">${info.filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}
    ${q.product_slug ? `<dt>Producto de referencia</dt><dd><a href="producto.html?p=${encodeURIComponent(q.product_slug)}" target="_blank">${esc(q.product_slug)}</a></dd>` : ''}</dl>
    <h3>Su idea</h3><p class="note-box">${esc(q.details).replace(/\n/g, '<br>')}</p>
    ${(q.images || []).length ? `<h3>Referencias</h3><div class="ref-grid">${q.images.map((src) => `<a href="${esc(src)}" target="_blank" rel="noopener"><img src="${esc(src)}" alt="Referencia" width="140" height="140"></a>`).join('')}</div>` : ''}
  </section>
  <div class="stack">
    <section class="card"><h2>Contacto</h2>
      <p><strong>${esc(q.name)}</strong><br>${esc(prettyPhone(q.phone))}${q.email ? `<br><a href="mailto:${esc(q.email)}">${esc(q.email)}</a>` : ''}<br>${esc(q.city)}</p>
      <a class="btn btn-wa block" href="${esc(waLink(q.phone, `¡Hola ${q.name.split(' ')[0]}! ✨ Te escribe ${db.settings.business_name} sobre tu cotización ${folio}.`))}" target="_blank" rel="noopener">${icon.wa} Responder por WhatsApp</a>
    </section>
    <form class="card" data-form><h2>Seguimiento</h2>
      <label class="field"><span>Estado</span><select name="status">${Object.entries(QUOTE_STATUS).map(([k, l]) => `<option value="${k}" ${q.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field"><span>Notas internas</span><textarea name="admin_notes" rows="4" placeholder="Precio cotizado, anticipo, pendientes…">${esc(q.admin_notes)}</textarea></label>
      <button class="btn btn-primary block" type="submit">Guardar</button>
    </form>
    <button class="btn btn-danger btn-sm" type="button" data-delete>Eliminar</button>
  </div>
</div>`);
  $('[data-form]').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    busy($('button', e.target), 'Guardando…', async () => {
      Object.assign(q, await api.updateQuote(q.id, { status: fd.get('status'), admin_notes: String(fd.get('admin_notes') || '') }));
      setFlash('Cambios guardados ✨'); renderQuote(q.id);
    });
  });
  $('[data-delete]').addEventListener('click', (e) => {
    if (!confirm('¿Eliminar esta cotización?')) return;
    busy(e.target, 'Eliminando…', async () => {
      await api.deleteQuote(q);
      db.quotes = db.quotes.filter((x) => x.id !== q.id);
      setFlash('Cotización eliminada.'); location.hash = 'cotizaciones';
    });
  });
}

function renderOrders() {
  const list = db.orders.filter((o) => !orderFilter || o.status === orderFilter);
  shell('pedidos', `
<div class="a-head"><h1>Pedidos</h1><p>Pedidos armados en “Mi pedido” y enviados por WhatsApp.</p></div>
${statusTabs(ORDER_STATUS, orderFilter, db.orders, 'o')}
<section class="card">${list.length ? `<ul class="rows">${list.map(orderRow).join('')}</ul>` : '<p class="muted">No hay pedidos aquí.</p>'}</section>`);
  $$('[data-tabs] a').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); orderFilter = a.dataset.status; renderOrders(); }));
}

function renderOrder(id) {
  const o = db.orders.find((x) => x.id === Number(id));
  if (!o) { location.hash = 'pedidos'; return; }
  const folio = folioP(o.id);
  shell('pedidos', `
<div class="a-head"><a class="back" href="#pedidos">← Pedidos</a><h1>${esc(o.name)}</h1><p class="muted">${folio} · recibido ${fmtDateTime(o.created_at)}</p></div>
<div class="two-col">
  <section class="card"><h2>Productos</h2>
    <ul class="order-items">${o.items.map((it) => {
      const custom = Object.entries(it.custom || {}).filter(([, v]) => v);
      return `<li>${imgTag(it.image, 56)}<div><strong>${it.qty} × ${esc(it.name)}</strong>
        ${it.price != null ? `<span class="muted"> · ${money(it.price)} c/u = ${money(it.price * it.qty)}</span>` : '<span class="muted"> · precio por cotizar</span>'}
        ${custom.length ? `<ul class="custom-list">${custom.map(([k, v]) => `<li><span>${esc(k)}:</span> ${esc(v)}</li>`).join('')}</ul>` : ''}</div></li>`;
    }).join('')}</ul>
    <p class="total-line">Total estimado: <strong>${o.total != null ? money(o.total) : '—'}</strong>${o.has_unpriced ? ' + productos por cotizar' : ''}</p>
    ${o.notes ? `<h3>Comentarios</h3><p class="note-box">${esc(o.notes).replace(/\n/g, '<br>')}</p>` : ''}
  </section>
  <div class="stack">
    <section class="card"><h2>Contacto y entrega</h2>
      <p><strong>${esc(o.name)}</strong><br>${esc(prettyPhone(o.phone))}<br>${esc(o.city)}<br>${esc(o.delivery)}${o.event_date ? `<br>Evento: ${fmtDate(o.event_date)}` : ''}</p>
      <a class="btn btn-wa block" href="${esc(waLink(o.phone, `¡Hola ${o.name.split(' ')[0]}! ✨ Te escribe ${db.settings.business_name} sobre tu pedido ${folio}.`))}" target="_blank" rel="noopener">${icon.wa} Responder por WhatsApp</a>
    </section>
    <form class="card" data-form><h2>Seguimiento</h2>
      <label class="field"><span>Estado</span><select name="status">${Object.entries(ORDER_STATUS).map(([k, l]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field"><span>Notas internas</span><textarea name="admin_notes" rows="4" placeholder="Anticipo, guía de envío, pendientes…">${esc(o.admin_notes)}</textarea></label>
      <button class="btn btn-primary block" type="submit">Guardar</button>
    </form>
    <button class="btn btn-danger btn-sm" type="button" data-delete>Eliminar</button>
  </div>
</div>`);
  $('[data-form]').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    busy($('button', e.target), 'Guardando…', async () => {
      Object.assign(o, await api.updateOrder(o.id, { status: fd.get('status'), admin_notes: String(fd.get('admin_notes') || '') }));
      setFlash('Cambios guardados ✨'); renderOrder(o.id);
    });
  });
  $('[data-delete]').addEventListener('click', (e) => {
    if (!confirm('¿Eliminar este pedido?')) return;
    busy(e.target, 'Eliminando…', async () => {
      await api.deleteOrder(o.id);
      db.orders = db.orders.filter((x) => x.id !== o.id);
      setFlash('Pedido eliminado.'); location.hash = 'pedidos';
    });
  });
}

/* ---------- Ajustes ---------- */
function renderSettings() {
  const s = db.settings;
  const f = (key, label, opts = {}) => `<label class="field"><span>${esc(label)}</span>${opts.area
    ? `<textarea name="${key}" rows="${opts.rows || 3}">${esc(s[key] || '')}</textarea>`
    : `<input name="${key}" value="${esc(s[key] || '')}">`}${opts.help ? `<small class="tiny muted">${esc(opts.help)}</small>` : ''}</label>`;
  shell('ajustes', `
<div class="a-head"><h1>Ajustes</h1><p>Textos y datos de contacto que aparecen en el sitio.</p></div>
<form class="form-grid" data-form>
  <section class="card"><h2>Contacto</h2>
    ${f('whatsapp', 'Número de WhatsApp', { help: '10 dígitos. Aquí llegan los pedidos y cotizaciones.' })}
    ${f('instagram', 'Usuario de Instagram (sin @)')}${f('city', 'Ciudad')}${f('shipping_text', 'Texto de envíos')}</section>
  <section class="card"><h2>Anuncio y portada</h2>
    ${f('announcement', 'Barra de anuncio (arriba de todo)', { help: 'Ej. “Agenda de DICIEMBRE abierta ✨”. Déjalo vacío para ocultarla.' })}
    ${f('hero_title', 'Título principal', { help: 'Escribe palabras entre *asteriscos* para resaltarlas en rosa.' })}
    ${f('hero_text', 'Texto de la portada', { area: true })}
    ${f('occasions', 'Ocasiones (separadas por coma)', { area: true, rows: 2, help: 'Aparecen como filtros en el catálogo y en el inicio.' })}</section>
  <section class="card"><h2>Promoción</h2>
    <label class="check"><input type="checkbox" name="promo_active" ${s.promo_active === '0' ? '' : 'checked'}> Mostrar promoción en el inicio</label>
    ${f('promo_kicker', 'Texto pequeño superior')}${f('promo_title', 'Título')}${f('promo_text', 'Descripción', { area: true })}
    <div class="row-2">${f('promo_cta', 'Texto del botón')}${f('promo_link', 'Enlace del botón', { help: 'Ej. cotizar.html o catalogo.html' })}</div></section>
  <section class="card"><h2>Cómo funciona y preguntas</h2>
    ${f('steps', 'Pasos (“Así de fácil es pedir”)', { area: true, rows: 10, help: 'Separa cada paso con una línea en blanco. Primera línea = título; las siguientes = descripción.' })}
    ${f('faq', 'Preguntas frecuentes', { area: true, rows: 12, help: 'Separa cada pregunta con una línea en blanco. Primera línea = pregunta; las siguientes = respuesta.' })}</section>
  <div class="form-actions"><button class="btn btn-primary btn-lg" type="submit">Guardar ajustes</button></div>
</form>
<form class="card narrow-card" data-pass>
  <h2>Tu contraseña</h2>
  <p class="muted tiny">Sesión iniciada como ${esc(userEmail)}.</p>
  <label class="field"><span>Contraseña nueva <small>(mínimo 8 caracteres)</small></span><input type="password" name="password" minlength="8" required autocomplete="new-password"></label>
  <button class="btn btn-ghost" type="submit">Cambiar contraseña</button>
</form>`);
  const form = $('[data-form]');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    busy($('button[type="submit"]', form), 'Guardando…', async () => {
      const fd = new FormData(form);
      const values = {};
      for (const [k, v] of fd.entries()) if (k !== 'promo_active') values[k] = String(v).trim();
      values.instagram = String(values.instagram || '').replace(/^@/, '');
      values.promo_active = fd.get('promo_active') ? '1' : '0';
      await api.saveSettings(values);
      Object.assign(db.settings, values);
      setFlash(SAVED); renderSettings();
    });
  });
  $('[data-pass]').addEventListener('submit', (e) => {
    e.preventDefault();
    const pw = String(new FormData(e.target).get('password'));
    if (pw.length < 8) { alert('La contraseña debe tener al menos 8 caracteres.'); return; }
    busy($('button', e.target), 'Guardando…', async () => { await api.setNewPassword(pw); setFlash('Contraseña actualizada ✨'); renderSettings(); });
  });
}

/* ---------- Rutas (#productos, #producto-3, #cotizacion-5…) ---------- */
function route() {
  if (!db) return;
  const h = location.hash.replace(/^#/, '') || 'inicio';
  window.scrollTo(0, 0);
  if (h === 'productos') renderProducts();
  else if (h.startsWith('producto-')) renderProductForm(h.slice(9));
  else if (h === 'categorias') renderCategories();
  else if (h.startsWith('categoria-')) renderCategoryForm(h.slice(10));
  else if (h === 'cotizaciones') renderQuotes();
  else if (h.startsWith('cotizacion-')) renderQuote(h.slice(11));
  else if (h === 'pedidos') renderOrders();
  else if (h.startsWith('pedido-')) renderOrder(h.slice(7));
  else if (h === 'ajustes') renderSettings();
  else renderHome();
}
window.addEventListener('hashchange', () => { if (!recovering) route(); });

/* ---------- Arranque ---------- */
(async () => {
  if (!api.isConfigured) { renderSetup(); return; }
  try {
    await api.onAuthChange((event) => {
      if (event === 'PASSWORD_RECOVERY') { recovering = true; renderNewPassword(); }
    });
    if (recovering) { renderNewPassword(); return; }
    const session = await api.getSession();
    if (session) await afterLogin(); else renderLogin();
  } catch (e) {
    console.error(e);
    renderLogin(errText(e));
  }
})();
