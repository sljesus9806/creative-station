// Vistas del panel de administración.
const { html, raw, money, nl2br, fmtDate, fmtDateTime, waLink, prettyPhone } = require('../util');
const { icons } = require('./icons');

const FONTS = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500..700&family=Quicksand:wght@400..700&display=swap';

const QUOTE_STATUS = { nueva: 'Nueva', en_proceso: 'En proceso', cotizada: 'Cotizada', aceptada: 'Aceptada', cerrada: 'Cerrada' };
const ORDER_STATUS = { nuevo: 'Nuevo', confirmado: 'Confirmado', en_produccion: 'En producción', listo: 'Listo / enviado', entregado: 'Entregado', cancelado: 'Cancelado' };
const FIELD_PRESETS = ['Nombre', 'Edad', 'Fecha del evento', 'Temática', 'Colores', 'Frase o texto', 'Foto (te la pedimos por WhatsApp)'];
const UNITS = ['pieza', 'paquete', 'juego', 'kit', 'hoja', 'docena', 'set'];

function adminLayout({ title, body, active = '', flash, counts = {} }) {
  const nav = [
    ['/admin', 'Inicio', 'home'],
    ['/admin/productos', 'Productos', 'productos'],
    ['/admin/categorias', 'Categorías', 'categorias'],
    ['/admin/cotizaciones', 'Cotizaciones', 'cotizaciones', counts.quotes],
    ['/admin/pedidos', 'Pedidos', 'pedidos', counts.orders],
    ['/admin/ajustes', 'Ajustes', 'ajustes'],
  ];
  return html`<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title} · Panel Creative Station</title>
<link rel="icon" type="image/png" sizes="32x32" href="/img/brand/favicon-32.png">
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="/css/admin.css?v=1">
</head>
<body>
<header class="a-top">
  <a class="a-brand" href="/admin"><img src="/img/brand/icono-lavanda.png" alt="" width="30" height="30"><span>Panel</span></a>
  <nav class="a-nav" aria-label="Panel">
    ${nav.map(([href, label, key, n]) => html`<a href="${href}" class="${active === key ? 'is-on' : ''}">${label}${n ? html`<span class="dot">${n}</span>` : ''}</a>`)}
  </nav>
  <div class="a-top-actions">
    <a class="a-link" href="/" target="_blank" rel="noopener">Ver sitio ↗</a>
    <form method="post" action="/admin/salir"><button class="a-link" type="submit">Salir</button></form>
  </div>
</header>
<main class="a-main">
  ${flash ? html`<div class="flash ${flash.type || 'ok'}" role="status">${flash.text}</div>` : ''}
  ${body}
</main>
<script src="/js/admin.js?v=1" defer></script>
</body>
</html>`;
}

function login({ error, next }) {
  return html`<!doctype html>
<html lang="es-MX"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Entrar · Panel Creative Station</title>
<link rel="icon" type="image/png" sizes="32x32" href="/img/brand/favicon-32.png">
<link rel="stylesheet" href="${FONTS}"><link rel="stylesheet" href="/css/admin.css?v=1"></head>
<body class="login-body">
<form class="login card" method="post" action="/admin/login">
  <img src="/img/brand/logo-vertical-lavanda.png" alt="Creative Station" width="110" height="129">
  <h1>Panel de administración</h1>
  ${error ? html`<p class="flash err">${error}</p>` : ''}
  <label class="field"><span>Contraseña</span><input type="password" name="password" required autofocus autocomplete="current-password"></label>
  <input type="hidden" name="next" value="${next || '/admin'}">
  <button class="btn btn-primary block" type="submit">Entrar</button>
</form>
</body></html>`;
}

function statCard(n, label, href, tone = '') {
  return html`<a class="stat ${tone}" href="${href}"><strong>${n}</strong><span>${label}</span></a>`;
}

function dashboard({ stats, quotes, orders, counts }) {
  const body = html`
<div class="a-head"><h1>¡Hola! ✨</h1><p>Esto es lo que pasa en tu tienda.</p></div>
<div class="stats">
  ${statCard(stats.newQuotes, 'Cotizaciones nuevas', '/admin/cotizaciones?estado=nueva', stats.newQuotes ? 'hot' : '')}
  ${statCard(stats.newOrders, 'Pedidos nuevos', '/admin/pedidos?estado=nuevo', stats.newOrders ? 'hot' : '')}
  ${statCard(stats.products, 'Productos visibles', '/admin/productos')}
  ${statCard(stats.categories, 'Categorías', '/admin/categorias')}
</div>
<div class="quick">
  <a class="btn btn-primary" href="/admin/productos/nuevo">${icons.plus} Nuevo producto</a>
  <a class="btn btn-ghost" href="/admin/categorias/nueva">${icons.plus} Nueva categoría</a>
  <a class="btn btn-ghost" href="/admin/ajustes">Editar anuncio y promo</a>
</div>
<div class="two-col">
  <section class="card">
    <div class="card-head"><h2>Últimas cotizaciones</h2><a href="/admin/cotizaciones">Ver todas</a></div>
    ${quotes.length ? html`<ul class="rows">${quotes.map(quoteRow)}</ul>` : html`<p class="muted">Aún no hay cotizaciones.</p>`}
  </section>
  <section class="card">
    <div class="card-head"><h2>Últimos pedidos</h2><a href="/admin/pedidos">Ver todos</a></div>
    ${orders.length ? html`<ul class="rows">${orders.map(orderRow)}</ul>` : html`<p class="muted">Aún no hay pedidos.</p>`}
  </section>
</div>`;
  return adminLayout({ title: 'Inicio', body, active: 'home', counts });
}

const folioQ = (id) => `CS-C-${String(id).padStart(4, '0')}`;
const folioP = (id) => `CS-P-${String(id).padStart(4, '0')}`;

function quoteRow(q) {
  return html`<li><a class="row" href="/admin/cotizaciones/${q.id}">
    <span class="row-main"><strong>${q.name}</strong><span class="muted">${q.event_type}${q.event_date ? html` · ${fmtDate(q.event_date)}` : ''} · ${q.city}</span></span>
    <span class="row-side"><span class="status s-${q.status}">${QUOTE_STATUS[q.status] || q.status}</span><span class="muted tiny">${folioQ(q.id)} · ${fmtDateTime(q.created_at)}</span></span>
  </a></li>`;
}
function orderRow(o) {
  return html`<li><a class="row" href="/admin/pedidos/${o.id}">
    <span class="row-main"><strong>${o.name}</strong><span class="muted">${o.item_count} ${o.item_count === 1 ? 'producto' : 'productos'}${o.total != null ? html` · ${money(o.total)}${o.has_unpriced ? '+' : ''}` : ''} · ${o.city}</span></span>
    <span class="row-side"><span class="status s-${o.status}">${ORDER_STATUS[o.status] || o.status}</span><span class="muted tiny">${folioP(o.id)} · ${fmtDateTime(o.created_at)}</span></span>
  </a></li>`;
}

// ---------- Productos ----------
function productList({ products, categories, catFilter, q, counts, flash }) {
  const body = html`
<div class="a-head a-head-row">
  <div><h1>Productos</h1><p>${products.length} en total. Toca un producto para editarlo.</p></div>
  <a class="btn btn-primary" href="/admin/productos/nuevo">${icons.plus} Nuevo producto</a>
</div>
<form class="toolbar" method="get">
  <input type="search" name="q" value="${q || ''}" placeholder="Buscar producto…">
  <select name="cat" onchange="this.form.submit()">
    <option value="">Todas las categorías</option>
    ${categories.map((c) => html`<option value="${c.id}" ${String(catFilter) === String(c.id) ? raw('selected') : ''}>${c.name}</option>`)}
  </select>
  <button class="btn btn-ghost btn-sm" type="submit">Filtrar</button>
</form>
${products.length ? html`<ul class="plist">
  ${products.map((p) => html`<li class="pitem ${p.active ? '' : 'is-off'}">
    <a class="pitem-main" href="/admin/productos/${p.id}">
      <img src="${p.images[0] || '/img/brand/favicon-180.png'}" alt="" width="64" height="64" loading="lazy">
      <span class="pitem-text">
        <strong>${p.name}</strong>
        <span class="muted">${p.category_name || 'Sin categoría'} · ${p.price != null ? html`${p.price_from ? 'desde ' : ''}${money(p.price)}/${p.unit}` : 'sin precio'}${p.mode === 'cotizacion' ? ' · solo cotización' : ''}</span>
        <span class="flags">${p.featured ? html`<span class="flag star">★ Destacado</span>` : ''}${p.active ? '' : html`<span class="flag off">Oculto</span>`}${p.badge ? html`<span class="flag">${p.badge}</span>` : ''}</span>
      </span>
    </a>
    <div class="pitem-actions">
      <form method="post" action="/admin/productos/${p.id}/toggle"><button class="chip-btn" type="submit" title="${p.active ? 'Ocultar del sitio' : 'Mostrar en el sitio'}">${p.active ? 'Ocultar' : 'Mostrar'}</button></form>
      <form method="post" action="/admin/productos/${p.id}/duplicar"><button class="chip-btn" type="submit" title="Crear una copia">Duplicar</button></form>
    </div>
  </li>`)}
</ul>` : html`<div class="card empty"><p>No hay productos con ese filtro.</p><a class="btn btn-primary" href="/admin/productos/nuevo">Crear producto</a></div>`}`;
  return adminLayout({ title: 'Productos', body, active: 'productos', counts, flash });
}

function productForm({ p, categories, occasions, counts, flash, errors = [] }) {
  const isNew = !p.id;
  const presetSet = new Set(p.custom_fields || []);
  const extra = (p.custom_fields || []).filter((f) => !FIELD_PRESETS.includes(f)).join(', ');
  const occSet = new Set(p.occasions || []);
  const body = html`
<div class="a-head">
  <a class="back" href="/admin/productos">← Productos</a>
  <h1>${isNew ? 'Nuevo producto' : p.name}</h1>
  ${!isNew && p.active ? html`<p><a href="/producto/${p.slug}" target="_blank" rel="noopener">Ver en el sitio ↗</a></p>` : ''}
</div>
${errors.length ? html`<div class="flash err">${errors.map((e) => html`<p>${e}</p>`)}</div>` : ''}
<form class="form-grid" method="post" action="${isNew ? '/admin/productos/nuevo' : `/admin/productos/${p.id}`}" enctype="multipart/form-data" data-image-form>
  <section class="card">
    <h2>Información</h2>
    <label class="field"><span>Nombre del producto *</span><input name="name" required maxlength="120" value="${p.name || ''}" placeholder="Ej. Topper coquette con moño"></label>
    <label class="field"><span>Categoría *</span>
      <select name="category_id" required>
        <option value="">Elige una categoría</option>
        ${categories.map((c) => html`<option value="${c.id}" ${String(p.category_id) === String(c.id) ? raw('selected') : ''}>${c.name}</option>`)}
      </select>
      <a class="tiny" href="/admin/categorias/nueva" target="_blank">+ Crear categoría</a>
    </label>
    <label class="field"><span>Descripción corta <small>(aparece en la tarjeta)</small></span><input name="short_desc" maxlength="140" value="${p.short_desc || ''}" placeholder="Una línea que lo describa"></label>
    <label class="field"><span>Descripción completa</span><textarea name="description" rows="6" maxlength="4000" placeholder="Materiales, medidas, qué incluye, cómo se personaliza…">${p.description || ''}</textarea></label>
  </section>

  <section class="card">
    <h2>Fotos</h2>
    <p class="muted tiny">La primera foto es la portada. Puedes subir fotos desde tu celular; se optimizan automáticamente.</p>
    ${(p.images || []).length ? html`<ul class="img-list">
      ${p.images.map((src, i) => html`<li class="img-item">
        <img src="${src}" alt="" width="120" height="120">
        <label class="radio tiny"><input type="radio" name="cover" value="${src}" ${i === 0 ? raw('checked') : ''}> Portada</label>
        <label class="check tiny"><input type="checkbox" name="remove_images" value="${src}"> Quitar</label>
        <input type="hidden" name="keep_images" value="${src}">
      </li>`)}
    </ul>` : ''}
    <label class="upload">
      <input type="file" name="images" accept="image/*" multiple data-compress>
      ${icons.image}<span data-upload-label>Agregar fotos</span>
    </label>
    <div class="upload-previews" data-upload-previews></div>
  </section>

  <section class="card">
    <h2>Precio y pedido</h2>
    <div class="row-2">
      <label class="field"><span>Precio (MXN)</span><input name="price" type="number" step="0.01" min="0" inputmode="decimal" value="${p.price ?? ''}" placeholder="Déjalo vacío si se cotiza"></label>
      <label class="field"><span>Se vende por</span>
        <select name="unit">${[...new Set([...UNITS, p.unit || 'pieza'])].map((u) => html`<option ${u === (p.unit || 'pieza') ? raw('selected') : ''}>${u}</option>`)}</select>
      </label>
    </div>
    <label class="check"><input type="checkbox" name="price_from" value="1" ${p.price_from !== 0 ? raw('checked') : ''}> Mostrar como “Desde $…” (el precio puede variar según el diseño)</label>
    <label class="field"><span>Cantidad mínima</span><input name="min_qty" type="number" min="1" max="9999" value="${p.min_qty || 1}"></label>
    <fieldset class="field">
      <legend>¿Cómo se pide?</legend>
      <label class="radio"><input type="radio" name="mode" value="pedido" ${p.mode !== 'cotizacion' ? raw('checked') : ''}> Se puede agregar al pedido</label>
      <label class="radio"><input type="radio" name="mode" value="cotizacion" ${p.mode === 'cotizacion' ? raw('checked') : ''}> Solo por cotización (paquetes, bodas, pedidos grandes)</label>
    </fieldset>
  </section>

  <section class="card">
    <h2>Personalización</h2>
    <p class="muted tiny">¿Qué datos pedimos para personalizar este producto?</p>
    <div class="check-grid">
      ${FIELD_PRESETS.map((f) => html`<label class="check"><input type="checkbox" name="custom_fields" value="${f}" ${presetSet.has(f) ? raw('checked') : ''}> ${f}</label>`)}
    </div>
    <label class="field"><span>Otros campos <small>(separados por coma)</small></span><input name="custom_extra" value="${extra}" placeholder="Ej. Signo zodiacal, Carrera"></label>
    <h3>Ocasiones</h3>
    <div class="check-grid">
      ${occasions.map((o) => html`<label class="check"><input type="checkbox" name="occasions" value="${o}" ${occSet.has(o) ? raw('checked') : ''}> ${o}</label>`)}
    </div>
  </section>

  <section class="card">
    <h2>Visibilidad</h2>
    <label class="check"><input type="checkbox" name="active" value="1" ${p.active !== 0 ? raw('checked') : ''}> Visible en el sitio</label>
    <label class="check"><input type="checkbox" name="featured" value="1" ${p.featured ? raw('checked') : ''}> Destacar en la página de inicio</label>
    <div class="row-2">
      <label class="field"><span>Etiqueta <small>(opcional)</small></span><input name="badge" maxlength="20" value="${p.badge || ''}" placeholder="Nuevo, Favorito, 10% off"></label>
      <label class="field"><span>Orden</span><input name="sort_order" type="number" value="${p.sort_order ?? 0}"><small class="tiny muted">Menor número = aparece primero</small></label>
    </div>
  </section>

  <div class="form-actions">
    <button class="btn btn-primary btn-lg" type="submit" data-submit>${isNew ? 'Crear producto' : 'Guardar cambios'}</button>
    <a class="btn btn-ghost" href="/admin/productos">Cancelar</a>
  </div>
</form>
${!isNew ? html`<form class="danger-zone" method="post" action="/admin/productos/${p.id}/eliminar" data-confirm="¿Eliminar “${p.name}”? Esta acción no se puede deshacer.">
  <button class="btn btn-danger" type="submit">${icons.trash} Eliminar producto</button>
</form>` : ''}`;
  return adminLayout({ title: isNew ? 'Nuevo producto' : p.name, body, active: 'productos', counts, flash });
}

// ---------- Categorías ----------
function categoryList({ categories, counts, flash }) {
  const body = html`
<div class="a-head a-head-row">
  <div><h1>Categorías</h1><p>Ordénalas y elige cuáles se muestran en el sitio.</p></div>
  <a class="btn btn-primary" href="/admin/categorias/nueva">${icons.plus} Nueva categoría</a>
</div>
<ul class="plist">
  ${categories.map((c) => html`<li class="pitem ${c.active ? '' : 'is-off'}">
    <a class="pitem-main" href="/admin/categorias/${c.id}">
      <img src="${c.image || '/img/brand/favicon-180.png'}" alt="" width="64" height="64" loading="lazy">
      <span class="pitem-text"><strong>${c.name}</strong><span class="muted">${c.product_count} productos · orden ${c.sort_order}</span>
      ${c.active ? '' : html`<span class="flags"><span class="flag off">Oculta</span></span>`}</span>
    </a>
    <div class="pitem-actions"><a class="chip-btn" href="/admin/productos?cat=${c.id}">Ver productos</a></div>
  </li>`)}
</ul>`;
  return adminLayout({ title: 'Categorías', body, active: 'categorias', counts, flash });
}

function categoryForm({ c, counts, flash, errors = [] }) {
  const isNew = !c.id;
  const body = html`
<div class="a-head"><a class="back" href="/admin/categorias">← Categorías</a><h1>${isNew ? 'Nueva categoría' : c.name}</h1></div>
${errors.length ? html`<div class="flash err">${errors.map((e) => html`<p>${e}</p>`)}</div>` : ''}
<form class="form-grid" method="post" action="${isNew ? '/admin/categorias/nueva' : `/admin/categorias/${c.id}`}" enctype="multipart/form-data" data-image-form>
  <section class="card">
    <label class="field"><span>Nombre *</span><input name="name" required maxlength="80" value="${c.name || ''}"></label>
    <label class="field"><span>Descripción</span><textarea name="description" rows="3" maxlength="400">${c.description || ''}</textarea></label>
    <div class="row-2">
      <label class="field"><span>Orden</span><input name="sort_order" type="number" value="${c.sort_order ?? 0}"></label>
      <label class="check"><input type="checkbox" name="active" value="1" ${c.active !== 0 ? raw('checked') : ''}> Visible en el sitio</label>
    </div>
  </section>
  <section class="card">
    <h2>Imagen</h2>
    ${c.image ? html`<img class="cat-preview" src="${c.image}" alt="" width="160" height="160">` : ''}
    <label class="upload">
      <input type="file" name="image" accept="image/*" data-compress>
      ${icons.image}<span data-upload-label>${c.image ? 'Cambiar imagen' : 'Subir imagen'}</span>
    </label>
    <div class="upload-previews" data-upload-previews></div>
  </section>
  <div class="form-actions">
    <button class="btn btn-primary btn-lg" type="submit" data-submit>${isNew ? 'Crear categoría' : 'Guardar cambios'}</button>
    <a class="btn btn-ghost" href="/admin/categorias">Cancelar</a>
  </div>
</form>
${!isNew ? html`<form class="danger-zone" method="post" action="/admin/categorias/${c.id}/eliminar" data-confirm="¿Eliminar la categoría “${c.name}”?">
  <button class="btn btn-danger" type="submit">${icons.trash} Eliminar categoría</button>
  <p class="tiny muted">Solo se puede eliminar si no tiene productos.</p>
</form>` : ''}`;
  return adminLayout({ title: isNew ? 'Nueva categoría' : c.name, body, active: 'categorias', counts, flash });
}

// ---------- Cotizaciones ----------
function statusTabs(base, map, current, totals) {
  return html`<nav class="tabs">
    <a href="${base}" class="${!current ? 'is-on' : ''}">Todas</a>
    ${Object.entries(map).map(([k, label]) => html`<a href="${base}?estado=${k}" class="${current === k ? 'is-on' : ''}">${label}${totals[k] ? html` <span class="n">${totals[k]}</span>` : ''}</a>`)}
  </nav>`;
}

function quoteList({ quotes, status, totals, counts }) {
  const body = html`
<div class="a-head"><h1>Cotizaciones</h1><p>Solicitudes enviadas desde el formulario “Cotizar”.</p></div>
${statusTabs('/admin/cotizaciones', QUOTE_STATUS, status, totals)}
<section class="card">${quotes.length ? html`<ul class="rows">${quotes.map(quoteRow)}</ul>` : html`<p class="muted">No hay cotizaciones aquí.</p>`}</section>`;
  return adminLayout({ title: 'Cotizaciones', body, active: 'cotizaciones', counts });
}

function quoteDetail({ q, s, counts, flash }) {
  const folio = folioQ(q.id);
  const reply = waLink(q.phone, `¡Hola ${q.name.split(' ')[0]}! ✨ Te escribe ${s.business_name} sobre tu cotización ${folio}.`);
  const info = [
    ['Evento', q.event_type], ['Fecha', fmtDate(q.event_date)], ['Piezas / invitados', q.quantity], ['Presupuesto', q.budget],
    ['Temática y colores', q.theme], ['Le interesa', q.interests.join(', ')], ['Producto de referencia', q.product_slug ? raw(`<a href="/producto/${encodeURIComponent(q.product_slug)}" target="_blank">${q.product_slug}</a>`) : ''],
    ['Entrega', q.delivery],
  ];
  const body = html`
<div class="a-head"><a class="back" href="/admin/cotizaciones">← Cotizaciones</a><h1>${q.name}</h1><p class="muted">${folio} · recibida ${fmtDateTime(q.created_at)}</p></div>
<div class="two-col">
  <section class="card">
    <h2>Detalles</h2>
    <dl class="dl">${info.filter(([, v]) => v).map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl>
    <h3>Su idea</h3>
    <p class="note-box">${nl2br(q.details)}</p>
    ${q.images.length ? html`<h3>Referencias</h3><div class="ref-grid">${q.images.map((src) => html`<a href="${src}" target="_blank"><img src="${src}" alt="Referencia" width="160" height="160"></a>`)}</div>` : ''}
  </section>
  <div class="stack">
    <section class="card">
      <h2>Contacto</h2>
      <p><strong>${q.name}</strong><br>${prettyPhone(q.phone)}${q.email ? html`<br><a href="mailto:${q.email}">${q.email}</a>` : ''}<br>${q.city}</p>
      <a class="btn btn-wa block" href="${reply}" target="_blank" rel="noopener">${icons.whatsapp} Responder por WhatsApp</a>
    </section>
    <form class="card" method="post" action="/admin/cotizaciones/${q.id}">
      <h2>Seguimiento</h2>
      <label class="field"><span>Estado</span><select name="status">${Object.entries(QUOTE_STATUS).map(([k, l]) => html`<option value="${k}" ${q.status === k ? raw('selected') : ''}>${l}</option>`)}</select></label>
      <label class="field"><span>Notas internas</span><textarea name="admin_notes" rows="4" placeholder="Precio cotizado, anticipo, pendientes…">${q.admin_notes}</textarea></label>
      <button class="btn btn-primary block" type="submit">Guardar</button>
    </form>
    <form method="post" action="/admin/cotizaciones/${q.id}/eliminar" data-confirm="¿Eliminar esta cotización?"><button class="btn btn-danger btn-sm" type="submit">${icons.trash} Eliminar</button></form>
  </div>
</div>`;
  return adminLayout({ title: folio, body, active: 'cotizaciones', counts, flash });
}

// ---------- Pedidos ----------
function orderList({ orders, status, totals, counts }) {
  const body = html`
<div class="a-head"><h1>Pedidos</h1><p>Pedidos armados en el sitio y enviados por WhatsApp.</p></div>
${statusTabs('/admin/pedidos', ORDER_STATUS, status, totals)}
<section class="card">${orders.length ? html`<ul class="rows">${orders.map(orderRow)}</ul>` : html`<p class="muted">No hay pedidos aquí.</p>`}</section>`;
  return adminLayout({ title: 'Pedidos', body, active: 'pedidos', counts });
}

function orderDetail({ o, s, counts, flash }) {
  const folio = folioP(o.id);
  const reply = waLink(o.phone, `¡Hola ${o.name.split(' ')[0]}! ✨ Te escribe ${s.business_name} sobre tu pedido ${folio}.`);
  const body = html`
<div class="a-head"><a class="back" href="/admin/pedidos">← Pedidos</a><h1>${o.name}</h1><p class="muted">${folio} · recibido ${fmtDateTime(o.created_at)}</p></div>
<div class="two-col">
  <section class="card">
    <h2>Productos</h2>
    <ul class="order-items">
      ${o.items.map((it) => html`<li>
        <img src="${it.image || '/img/brand/favicon-180.png'}" alt="" width="56" height="56">
        <div>
          <strong>${it.qty} × ${it.name}</strong>
          ${it.price != null ? html`<span class="muted"> · ${money(it.price)} c/u = ${money(it.price * it.qty)}</span>` : html`<span class="muted"> · precio por cotizar</span>`}
          ${Object.entries(it.custom || {}).filter(([, v]) => v).length ? html`<ul class="custom-list">${Object.entries(it.custom).filter(([, v]) => v).map(([k, v]) => html`<li><span>${k}:</span> ${v}</li>`)}</ul>` : ''}
        </div>
      </li>`)}
    </ul>
    <p class="total-line">Total estimado: <strong>${o.total != null ? money(o.total) : '—'}</strong>${o.has_unpriced ? ' + productos por cotizar' : ''}</p>
    ${o.notes ? html`<h3>Comentarios</h3><p class="note-box">${nl2br(o.notes)}</p>` : ''}
  </section>
  <div class="stack">
    <section class="card">
      <h2>Contacto y entrega</h2>
      <p><strong>${o.name}</strong><br>${prettyPhone(o.phone)}<br>${o.city}<br>${o.delivery}${o.event_date ? html`<br>Evento: ${fmtDate(o.event_date)}` : ''}</p>
      <a class="btn btn-wa block" href="${reply}" target="_blank" rel="noopener">${icons.whatsapp} Responder por WhatsApp</a>
    </section>
    <form class="card" method="post" action="/admin/pedidos/${o.id}">
      <h2>Seguimiento</h2>
      <label class="field"><span>Estado</span><select name="status">${Object.entries(ORDER_STATUS).map(([k, l]) => html`<option value="${k}" ${o.status === k ? raw('selected') : ''}>${l}</option>`)}</select></label>
      <label class="field"><span>Notas internas</span><textarea name="admin_notes" rows="4" placeholder="Anticipo, guía de envío, pendientes…">${o.admin_notes}</textarea></label>
      <button class="btn btn-primary block" type="submit">Guardar</button>
    </form>
    <form method="post" action="/admin/pedidos/${o.id}/eliminar" data-confirm="¿Eliminar este pedido?"><button class="btn btn-danger btn-sm" type="submit">${icons.trash} Eliminar</button></form>
  </div>
</div>`;
  return adminLayout({ title: folio, body, active: 'pedidos', counts, flash });
}

// ---------- Ajustes ----------
function settingsPage({ s, counts, flash }) {
  const f = (key, label, opts = {}) => html`<label class="field ${opts.full ? 'field-full' : ''}"><span>${label}</span>${opts.area
    ? html`<textarea name="${key}" rows="${opts.rows || 3}">${s[key] || ''}</textarea>`
    : html`<input name="${key}" value="${s[key] || ''}" ${opts.placeholder ? raw(`placeholder="${opts.placeholder}"`) : ''}>`}${opts.help ? html`<small class="tiny muted">${opts.help}</small>` : ''}</label>`;
  const body = html`
<div class="a-head"><h1>Ajustes</h1><p>Textos y datos de contacto que aparecen en el sitio.</p></div>
<form class="form-grid" method="post" action="/admin/ajustes">
  <section class="card">
    <h2>Contacto</h2>
    ${f('whatsapp', 'Número de WhatsApp', { help: '10 dígitos. Aquí llegan los pedidos y cotizaciones.' })}
    ${f('instagram', 'Usuario de Instagram (sin @)')}
    ${f('city', 'Ciudad')}
    ${f('shipping_text', 'Texto de envíos')}
  </section>
  <section class="card">
    <h2>Anuncio y portada</h2>
    ${f('announcement', 'Barra de anuncio (arriba de todo)', { help: 'Ej. “Agenda de DICIEMBRE abierta ✨”. Déjalo vacío para ocultarla.' })}
    ${f('hero_title', 'Título principal', { help: 'Escribe palabras entre *asteriscos* para resaltarlas en rosa.' })}
    ${f('hero_text', 'Texto de la portada', { area: true })}
    ${f('occasions', 'Ocasiones (separadas por coma)', { area: true, rows: 2, help: 'Aparecen como filtros en el catálogo y en el inicio.' })}
  </section>
  <section class="card">
    <h2>Promoción</h2>
    <label class="check"><input type="checkbox" name="promo_active" value="1" ${s.promo_active === '1' ? raw('checked') : ''}> Mostrar promoción en el inicio</label>
    ${f('promo_kicker', 'Texto pequeño superior')}
    ${f('promo_title', 'Título')}
    ${f('promo_text', 'Descripción', { area: true })}
    <div class="row-2">${f('promo_cta', 'Texto del botón')}${f('promo_link', 'Enlace del botón', { help: 'Ej. /cotizar o /catalogo/graduacion' })}</div>
  </section>
  <section class="card">
    <h2>Cómo funciona y preguntas</h2>
    ${f('steps', 'Pasos (“Así de fácil es pedir”)', { area: true, rows: 10, help: 'Separa cada paso con una línea en blanco. Primera línea = título; las siguientes = descripción.' })}
    ${f('faq', 'Preguntas frecuentes', { area: true, rows: 12, help: 'Separa cada pregunta con una línea en blanco. Primera línea = pregunta; las siguientes = respuesta.' })}
  </section>
  <div class="form-actions"><button class="btn btn-primary btn-lg" type="submit">Guardar ajustes</button></div>
</form>
<form class="card narrow-card" method="post" action="/admin/ajustes/password">
  <h2>Contraseña del panel</h2>
  <label class="field"><span>Contraseña actual</span><input type="password" name="current" required autocomplete="current-password"></label>
  <label class="field"><span>Nueva contraseña <small>(mínimo 8 caracteres)</small></span><input type="password" name="password" required minlength="8" autocomplete="new-password"></label>
  <button class="btn btn-ghost" type="submit">Cambiar contraseña</button>
</form>`;
  return adminLayout({ title: 'Ajustes', body, active: 'ajustes', counts, flash });
}

module.exports = {
  login, dashboard, productList, productForm, categoryList, categoryForm,
  quoteList, quoteDetail, orderList, orderDetail, settingsPage, folioQ, folioP,
  QUOTE_STATUS, ORDER_STATUS, FIELD_PRESETS,
};
