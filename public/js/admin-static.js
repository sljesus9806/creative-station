// Panel de Creative Station para la versión estática (GitHub Pages).
// Lee y guarda content/catalogo.json y las fotos (content/uploads/) en el repositorio con la API de GitHub.
// Cada cambio es un commit; GitHub Actions vuelve a publicar el sitio en 1–2 minutos.
(() => {
  const C = window.CS_ADMIN || {};
  const API = 'https://api.github.com';
  const LS_KEY = 'cs_panel_github';
  const app = document.getElementById('app');
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
  const money = (n) => mxn.format(n).replace(/\.00$/, '');
  const slugify = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'item';
  const on = (v) => v !== 0 && v !== false && v !== '0';
  const b64enc = (str) => btoa(unescape(encodeURIComponent(str)));
  const b64dec = (b) => decodeURIComponent(escape(atob(String(b).replace(/\s/g, ''))));
  const icon = {
    plus: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    image: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m20 16-4.5-4.5L6 19.5"/></svg>',
  };

  let cfg = readCfg();
  let content = null;
  let sha = null;
  let flash = null;
  const previews = {}; // fotos recién subidas → data URL (para verlas antes de que se publique el sitio)

  function readCfg() {
    try { return { repo: C.repo, branch: C.branch || 'main', ...JSON.parse(localStorage.getItem(LS_KEY) || '{}') }; } catch { return { repo: C.repo, branch: C.branch || 'main' }; }
  }
  function saveCfg() { try { localStorage.setItem(LS_KEY, JSON.stringify(cfg)); } catch { /* sin almacenamiento */ } }

  // ---------- API de GitHub ----------
  async function gh(pathname, opts = {}) {
    const res = await fetch(`${API}/repos/${cfg.repo}${pathname}`, {
      cache: 'no-store',
      ...opts,
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    if (!res.ok) {
      let msg = `GitHub respondió ${res.status}`;
      try { msg = (await res.json()).message || msg; } catch { /* sin cuerpo */ }
      const e = new Error(msg); e.status = res.status; throw e;
    }
    return res.status === 204 ? null : res.json();
  }

  async function loadContent() {
    const r = await gh(`/contents/content/catalogo.json?ref=${encodeURIComponent(cfg.branch)}&t=${Date.now()}`);
    sha = r.sha;
    content = JSON.parse(b64dec(r.content));
    content.settings ||= {}; content.categories ||= []; content.products ||= [];
  }

  async function saveContent(message) {
    try {
      const r = await gh('/contents/content/catalogo.json', {
        method: 'PUT',
        body: JSON.stringify({ message: `Panel: ${message}`, content: b64enc(`${JSON.stringify(content, null, 2)}\n`), sha, branch: cfg.branch }),
      });
      sha = r.content.sha;
    } catch (e) {
      if (e.status === 409 || e.status === 422) {
        await loadContent();
        throw new Error('Los datos cambiaron mientras editabas (quizá desde otro dispositivo). Ya los recargué: vuelve a hacer tu cambio.');
      }
      throw e;
    }
  }

  const readDataURL = (blob) => new Promise((ok, fail) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = fail; r.readAsDataURL(blob); });

  async function compress(file) {
    const MAX = 1600;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const scale = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
      const w = Math.round(bmp.width * scale); const h = Math.round(bmp.height * scale);
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
      return blob && blob.size < file.size ? blob : file;
    } catch { return file; }
  }

  async function uploadImage(file) {
    if (!/^image\//.test(file.type)) throw new Error(`"${file.name}" no es una imagen.`);
    const blob = await compress(file);
    if (blob.size > 15 * 1024 * 1024) throw new Error(`"${file.name}" pesa demasiado.`);
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[blob.type] || 'jpg';
    const name = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const dataUrl = await readDataURL(blob);
    await gh(`/contents/content/uploads/${name}`, {
      method: 'PUT',
      body: JSON.stringify({ message: `Panel: sube foto ${name}`, content: dataUrl.split(',')[1], branch: cfg.branch }),
    });
    const p = `/uploads/${name}`;
    previews[p] = dataUrl;
    return p;
  }

  const imgSrc = (p) => previews[p] || (p ? `${C.base || ''}${p}` : `${C.base || ''}/img/brand/favicon-180.png`);
  const rawSrc = (p) => (p && p.startsWith('/uploads/') ? `https://raw.githubusercontent.com/${cfg.repo}/${cfg.branch}/content${p}` : '');
  const img = (p, w = 64) => `<img src="${esc(imgSrc(p))}" ${rawSrc(p) ? `onerror="this.onerror=null;this.src='${esc(rawSrc(p))}'"` : ''} alt="" width="${w}" height="${w}" loading="lazy">`;

  const nextId = (list) => list.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1;
  function uniqueSlug(list, name, id) {
    const base = slugify(name); let slug = base; let i = 2;
    while (list.some((x) => x.slug === slug && x.id !== id)) slug = `${base}-${i++}`;
    return slug;
  }
  const occasionsList = () => String(content.settings.occasions || '').split(',').map((o) => o.trim()).filter(Boolean);
  const catName = (id) => content.categories.find((c) => c.id === id)?.name || 'Sin categoría';

  // ---------- Estructura ----------
  function shell(active, body) {
    const tabs = [['productos', 'Productos'], ['categorias', 'Categorías'], ['ajustes', 'Ajustes']];
    app.innerHTML = `
<header class="a-top">
  <a class="a-brand" href="#productos"><img src="${esc(imgSrc('/img/brand/icono-lavanda.png'))}" alt="" width="30" height="30"><span>Panel</span></a>
  <nav class="a-nav" aria-label="Panel">${tabs.map(([k, l]) => `<a href="#${k}" class="${active === k ? 'is-on' : ''}">${l}</a>`).join('')}</nav>
  <div class="a-top-actions">
    <a class="a-link" href="${esc((C.base || '') + '/')}" target="_blank" rel="noopener">Ver sitio ↗</a>
    <button class="a-link" type="button" data-logout>Salir</button>
  </div>
</header>
<main class="a-main">
  ${flash ? `<div class="flash ${flash.type}" role="status">${esc(flash.text)}</div>` : ''}
  ${body}
</main>`;
    flash = null;
    $('[data-logout]').addEventListener('click', () => {
      if (!confirm('¿Cerrar sesión en este dispositivo? Tendrás que pegar tu token otra vez.')) return;
      delete cfg.token; saveCfg(); content = null; renderLogin();
    });
  }

  function setFlash(text, type = 'ok') { flash = { text, type }; }
  const SAVED = 'Guardado ✨ El sitio público se actualiza en 1–2 minutos.';

  async function busy(btn, label, fn) {
    const original = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.textContent = label; }
    try { await fn(); } catch (e) {
      if (e.status === 401) { delete cfg.token; saveCfg(); renderLogin('Tu token ya no es válido o expiró. Crea uno nuevo.'); return; }
      alert(e.message || 'No se pudo guardar. Revisa tu conexión e intenta de nuevo.');
    } finally { if (btn && document.body.contains(btn)) { btn.disabled = false; btn.innerHTML = original; } }
  }

  // ---------- Inicio de sesión ----------
  function renderLogin(error) {
    app.innerHTML = `
<div class="login-body">
  <form class="login card" data-login style="max-width:460px">
    <img src="${esc(imgSrc('/img/brand/logo-vertical-lavanda.png'))}" alt="Creative Station" width="100" height="117">
    <h1>Panel de administración</h1>
    ${error ? `<p class="flash err">${esc(error)}</p>` : ''}
    <p class="muted tiny" style="text-align:left">Este panel guarda los cambios en GitHub. Para entrar necesitas un <b>token</b> (una llave) con permiso solo sobre este repositorio:</p>
    <ol class="tiny" style="text-align:left;margin:0;padding-left:1.2rem;display:grid;gap:.25rem">
      <li>Abre <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">crear token en GitHub</a>.</li>
      <li>En <b>Repository access</b> elige <b>Only select repositories</b> → <b>${esc((cfg.repo || '').split('/')[1] || 'tu repositorio')}</b>.</li>
      <li>En <b>Permissions → Contents</b> elige <b>Read and write</b>.</li>
      <li>Crea el token, cópialo y pégalo aquí. Solo se guarda en este navegador.</li>
    </ol>
    <label class="field"><span>Token de GitHub</span><input type="password" name="token" required autocomplete="off" placeholder="github_pat_…"></label>
    <details style="width:100%;text-align:left" class="tiny"><summary>Repositorio</summary>
      <div class="row-2" style="margin-top:.5rem">
        <label class="field"><span>Repositorio</span><input name="repo" value="${esc(cfg.repo || '')}" placeholder="usuario/repositorio" required></label>
        <label class="field"><span>Rama</span><input name="branch" value="${esc(cfg.branch || 'main')}" required></label>
      </div>
    </details>
    <button class="btn btn-primary block" type="submit">Entrar</button>
  </form>
</div>`;
    $('[data-login]').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      cfg = { token: String(fd.get('token')).trim(), repo: String(fd.get('repo')).trim(), branch: String(fd.get('branch')).trim() || 'main' };
      const btn = $('button[type="submit"]', e.target);
      btn.disabled = true; btn.textContent = 'Entrando…';
      try {
        await loadContent();
        saveCfg();
        route();
      } catch (err) {
        delete cfg.token;
        renderLogin(err.status === 401 ? 'El token no es válido.' : err.status === 404 ? 'No encontré el repositorio o el token no tiene acceso a él.' : `No se pudo entrar: ${err.message}`);
      }
    });
  }

  // ---------- Productos ----------
  function renderProducts() {
    const list = [...content.products].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || b.id - a.id);
    shell('productos', `
<div class="a-head a-head-row">
  <div><h1>Productos</h1><p>${list.length} en total. Toca un producto para editarlo.</p></div>
  <a class="btn btn-primary" href="#producto-nuevo">${icon.plus} Nuevo producto</a>
</div>
<p class="flash" style="background:var(--butter-50);color:var(--ink)">En esta versión de prueba los pedidos y cotizaciones llegan directo a tu WhatsApp.</p>
<ul class="plist">${list.map((p) => `
  <li class="pitem ${on(p.active) ? '' : 'is-off'}">
    <a class="pitem-main" href="#producto-${p.id}">
      ${img((p.images || [])[0])}
      <span class="pitem-text">
        <strong>${esc(p.name)}</strong>
        <span class="muted">${esc(catName(p.category_id))} · ${p.price != null && p.price !== '' ? `${p.price_from ? 'desde ' : ''}${money(p.price)}/${esc(p.unit || 'pieza')}` : 'sin precio'}${p.mode === 'cotizacion' ? ' · solo cotización' : ''}</span>
        <span class="flags">${on(p.featured) ? '<span class="flag star">★ Destacado</span>' : ''}${on(p.active) ? '' : '<span class="flag off">Oculto</span>'}${p.badge ? `<span class="flag">${esc(p.badge)}</span>` : ''}</span>
      </span>
    </a>
    <div class="pitem-actions">
      <button class="chip-btn" type="button" data-toggle="${p.id}">${on(p.active) ? 'Ocultar' : 'Mostrar'}</button>
      <button class="chip-btn" type="button" data-dup="${p.id}">Duplicar</button>
    </div>
  </li>`).join('')}
</ul>`);
    $$('[data-toggle]').forEach((b) => b.addEventListener('click', () => busy(b, 'Guardando…', async () => {
      const p = content.products.find((x) => x.id === Number(b.dataset.toggle));
      p.active = on(p.active) ? 0 : 1;
      await saveContent(`${p.active ? 'muestra' : 'oculta'} ${p.name}`);
      setFlash(SAVED); renderProducts();
    })));
    $$('[data-dup]').forEach((b) => b.addEventListener('click', () => busy(b, 'Duplicando…', async () => {
      const p = content.products.find((x) => x.id === Number(b.dataset.dup));
      const copy = { ...structuredClone(p), id: nextId(content.products), name: `${p.name} (copia)`, featured: 0, active: 0 };
      copy.slug = uniqueSlug(content.products, copy.name, copy.id);
      content.products.push(copy);
      await saveContent(`duplica ${p.name}`);
      setFlash('Producto duplicado (oculto). Edítalo y márcalo como visible.');
      location.hash = `producto-${copy.id}`;
    })));
  }

  function renderProductForm(id) {
    const isNew = id === 'nuevo';
    const p = isNew
      ? { active: 1, price_from: 1, min_qty: 1, mode: 'pedido', unit: 'pieza', custom_fields: ['Nombre', 'Temática', 'Colores'], occasions: [], images: [], sort_order: 0 }
      : content.products.find((x) => x.id === Number(id));
    if (!p) { location.hash = 'productos'; return; }
    const presets = C.presets || [];
    const extra = (p.custom_fields || []).filter((f) => !presets.includes(f)).join(', ');
    const units = [...new Set([...(C.units || []), p.unit || 'pieza'])];
    shell('productos', `
<div class="a-head"><a class="back" href="#productos">← Productos</a><h1>${isNew ? 'Nuevo producto' : esc(p.name)}</h1>
${!isNew && on(p.active) ? `<p><a href="${esc(`${C.base || ''}/producto/${p.slug}/`)}" target="_blank" rel="noopener">Ver en el sitio ↗</a></p>` : ''}</div>
<form class="form-grid" data-form novalidate>
  <section class="card">
    <h2>Información</h2>
    <label class="field"><span>Nombre del producto *</span><input name="name" required maxlength="120" value="${esc(p.name || '')}" placeholder="Ej. Topper coquette con moño"></label>
    <label class="field"><span>Categoría *</span><select name="category_id" required><option value="">Elige una categoría</option>
      ${content.categories.map((c) => `<option value="${c.id}" ${p.category_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
    <label class="field"><span>Descripción corta <small>(aparece en la tarjeta)</small></span><input name="short_desc" maxlength="140" value="${esc(p.short_desc || '')}"></label>
    <label class="field"><span>Descripción completa</span><textarea name="description" rows="6" maxlength="4000">${esc(p.description || '')}</textarea></label>
  </section>
  <section class="card">
    <h2>Fotos</h2>
    <p class="muted tiny">La primera foto es la portada. Puedes subirlas desde tu celular; se optimizan solas.</p>
    ${(p.images || []).length ? `<ul class="img-list">${p.images.map((src, i) => `<li class="img-item">${img(src, 120)}
      <label class="radio tiny"><input type="radio" name="cover" value="${esc(src)}" ${i === 0 ? 'checked' : ''}> Portada</label>
      <label class="check tiny"><input type="checkbox" name="remove_images" value="${esc(src)}"> Quitar</label></li>`).join('')}</ul>` : ''}
    <label class="upload"><input type="file" name="images" accept="image/*" multiple data-files>${icon.image}<span data-upload-label>Agregar fotos</span></label>
    <div class="upload-previews" data-previews></div>
  </section>
  <section class="card">
    <h2>Precio y pedido</h2>
    <div class="row-2">
      <label class="field"><span>Precio (MXN)</span><input name="price" type="number" step="0.01" min="0" inputmode="decimal" value="${p.price ?? ''}" placeholder="Vacío si se cotiza"></label>
      <label class="field"><span>Se vende por</span><select name="unit">${units.map((u) => `<option ${u === (p.unit || 'pieza') ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select></label>
    </div>
    <label class="check"><input type="checkbox" name="price_from" ${on(p.price_from) ? 'checked' : ''}> Mostrar como “Desde $…”</label>
    <label class="field"><span>Cantidad mínima</span><input name="min_qty" type="number" min="1" max="9999" value="${p.min_qty || 1}"></label>
    <fieldset class="field"><legend>¿Cómo se pide?</legend>
      <label class="radio"><input type="radio" name="mode" value="pedido" ${p.mode !== 'cotizacion' ? 'checked' : ''}> Se puede agregar al pedido</label>
      <label class="radio"><input type="radio" name="mode" value="cotizacion" ${p.mode === 'cotizacion' ? 'checked' : ''}> Solo por cotización</label>
    </fieldset>
  </section>
  <section class="card">
    <h2>Personalización</h2>
    <p class="muted tiny">¿Qué datos pedimos para personalizar este producto?</p>
    <div class="check-grid">${presets.map((f) => `<label class="check"><input type="checkbox" name="custom_fields" value="${esc(f)}" ${(p.custom_fields || []).includes(f) ? 'checked' : ''}> ${esc(f)}</label>`).join('')}</div>
    <label class="field"><span>Otros campos <small>(separados por coma)</small></span><input name="custom_extra" value="${esc(extra)}" placeholder="Ej. Signo zodiacal, Carrera"></label>
    <h3>Ocasiones</h3>
    <div class="check-grid">${occasionsList().map((o) => `<label class="check"><input type="checkbox" name="occasions" value="${esc(o)}" ${(p.occasions || []).includes(o) ? 'checked' : ''}> ${esc(o)}</label>`).join('')}</div>
  </section>
  <section class="card">
    <h2>Visibilidad</h2>
    <label class="check"><input type="checkbox" name="active" ${on(p.active) ? 'checked' : ''}> Visible en el sitio</label>
    <label class="check"><input type="checkbox" name="featured" ${on(p.featured) ? 'checked' : ''}> Destacar en la página de inicio</label>
    <div class="row-2">
      <label class="field"><span>Etiqueta <small>(opcional)</small></span><input name="badge" maxlength="20" value="${esc(p.badge || '')}" placeholder="Nuevo, Favorito"></label>
      <label class="field"><span>Orden</span><input name="sort_order" type="number" value="${p.sort_order ?? 0}"></label>
    </div>
  </section>
  <div class="form-actions">
    <button class="btn btn-primary btn-lg" type="submit">${isNew ? 'Crear producto' : 'Guardar cambios'}</button>
    <a class="btn btn-ghost" href="#productos">Cancelar</a>
  </div>
</form>
${isNew ? '' : '<div class="danger-zone"><button class="btn btn-danger" type="button" data-delete>Eliminar producto</button></div>'}`);

    bindPreviews();
    const form = $('[data-form]');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const name = String(fd.get('name') || '').trim();
      const categoryId = Number(fd.get('category_id'));
      if (!name || !categoryId) { alert('El producto necesita nombre y categoría.'); return; }
      busy($('button[type="submit"]', form), 'Guardando…', async () => {
        const fields = fd.getAll('custom_fields').map(String);
        String(fd.get('custom_extra') || '').split(',').map((x) => x.trim()).filter(Boolean).forEach((x) => { if (!fields.includes(x)) fields.push(x); });
        const remove = new Set(fd.getAll('remove_images').map(String));
        let images = (p.images || []).filter((src) => !remove.has(src));
        const cover = String(fd.get('cover') || '');
        if (cover && images.includes(cover)) images = [cover, ...images.filter((x) => x !== cover)];
        const files = [...$('[data-files]', form).files];
        for (let i = 0; i < files.length; i++) {
          $('button[type="submit"]', form).textContent = `Subiendo foto ${i + 1} de ${files.length}…`;
          images.push(await uploadImage(files[i]));
        }
        const priceRaw = String(fd.get('price') || '').replace(',', '.').trim();
        const data = {
          name, category_id: categoryId, short_desc: String(fd.get('short_desc') || '').trim(), description: String(fd.get('description') || '').trim(),
          price: priceRaw === '' ? null : Math.max(0, Number(priceRaw)), price_from: fd.get('price_from') ? 1 : 0, unit: String(fd.get('unit') || 'pieza'),
          min_qty: Math.max(1, parseInt(fd.get('min_qty'), 10) || 1), mode: fd.get('mode') === 'cotizacion' ? 'cotizacion' : 'pedido',
          custom_fields: fields, occasions: fd.getAll('occasions').map(String), images,
          badge: String(fd.get('badge') || '').trim(), featured: fd.get('featured') ? 1 : 0, active: fd.get('active') ? 1 : 0,
          sort_order: parseInt(fd.get('sort_order'), 10) || 0,
        };
        $('button[type="submit"]', form).textContent = 'Guardando…';
        if (isNew) {
          const np = { id: nextId(content.products), ...data };
          np.slug = uniqueSlug(content.products, name, np.id);
          content.products.push(np);
          await saveContent(`crea ${name}`);
          setFlash(SAVED); location.hash = `producto-${np.id}`;
        } else {
          if (p.name !== name) p.slug = uniqueSlug(content.products, name, p.id);
          Object.assign(p, data);
          await saveContent(`edita ${name}`);
          setFlash(SAVED); renderProductForm(String(p.id));
        }
      });
    });
    $('[data-delete]')?.addEventListener('click', (e) => {
      if (!confirm(`¿Eliminar “${p.name}”? Esta acción no se puede deshacer.`)) return;
      busy(e.target, 'Eliminando…', async () => {
        content.products = content.products.filter((x) => x.id !== p.id);
        await saveContent(`elimina ${p.name}`);
        setFlash('Producto eliminado.'); location.hash = 'productos';
      });
    });
  }

  function bindPreviews() {
    $$('[data-files]').forEach((input) => {
      const card = input.closest('.card');
      input.addEventListener('change', () => {
        const box = $('[data-previews]', card); box.innerHTML = '';
        [...input.files].forEach((f) => { const i = new Image(); i.src = URL.createObjectURL(f); i.alt = ''; box.appendChild(i); });
        const label = $('[data-upload-label]', card);
        if (label) label.textContent = input.files.length ? `${input.files.length} foto${input.files.length > 1 ? 's' : ''} lista${input.files.length > 1 ? 's' : ''} para subir` : 'Agregar fotos';
      });
    });
  }

  // ---------- Categorías ----------
  function renderCategories() {
    const list = [...content.categories].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    shell('categorias', `
<div class="a-head a-head-row"><div><h1>Categorías</h1><p>Ordénalas y elige cuáles se muestran en el sitio.</p></div>
<a class="btn btn-primary" href="#categoria-nueva">${icon.plus} Nueva categoría</a></div>
<ul class="plist">${list.map((c) => {
    const n = content.products.filter((p) => p.category_id === c.id).length;
    return `<li class="pitem ${on(c.active) ? '' : 'is-off'}"><a class="pitem-main" href="#categoria-${c.id}">${img(c.image)}
      <span class="pitem-text"><strong>${esc(c.name)}</strong><span class="muted">${n} productos · orden ${c.sort_order ?? 0}</span>
      ${on(c.active) ? '' : '<span class="flags"><span class="flag off">Oculta</span></span>'}</span></a></li>`;
  }).join('')}</ul>`);
  }

  function renderCategoryForm(id) {
    const isNew = id === 'nueva';
    const c = isNew ? { active: 1, sort_order: content.categories.length } : content.categories.find((x) => x.id === Number(id));
    if (!c) { location.hash = 'categorias'; return; }
    shell('categorias', `
<div class="a-head"><a class="back" href="#categorias">← Categorías</a><h1>${isNew ? 'Nueva categoría' : esc(c.name)}</h1></div>
<form class="form-grid" data-form novalidate>
  <section class="card">
    <label class="field"><span>Nombre *</span><input name="name" required maxlength="80" value="${esc(c.name || '')}"></label>
    <label class="field"><span>Descripción</span><textarea name="description" rows="3" maxlength="400">${esc(c.description || '')}</textarea></label>
    <div class="row-2"><label class="field"><span>Orden</span><input name="sort_order" type="number" value="${c.sort_order ?? 0}"></label>
    <label class="check"><input type="checkbox" name="active" ${on(c.active) ? 'checked' : ''}> Visible en el sitio</label></div>
  </section>
  <section class="card">
    <h2>Imagen</h2>
    ${c.image ? img(c.image, 140) : ''}
    <label class="upload"><input type="file" name="image" accept="image/*" data-files>${icon.image}<span data-upload-label>${c.image ? 'Cambiar imagen' : 'Subir imagen'}</span></label>
    <div class="upload-previews" data-previews></div>
  </section>
  <div class="form-actions"><button class="btn btn-primary btn-lg" type="submit">${isNew ? 'Crear categoría' : 'Guardar cambios'}</button><a class="btn btn-ghost" href="#categorias">Cancelar</a></div>
</form>
${isNew ? '' : '<div class="danger-zone"><button class="btn btn-danger" type="button" data-delete>Eliminar categoría</button><p class="tiny muted">Solo se puede eliminar si no tiene productos.</p></div>'}`);
    bindPreviews();
    const form = $('[data-form]');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const name = String(fd.get('name') || '').trim();
      if (!name) { alert('La categoría necesita un nombre.'); return; }
      busy($('button[type="submit"]', form), 'Guardando…', async () => {
        const file = $('[data-files]', form).files[0];
        const image = file ? await uploadImage(file) : c.image || '';
        const data = { name, description: String(fd.get('description') || '').trim(), sort_order: parseInt(fd.get('sort_order'), 10) || 0, active: fd.get('active') ? 1 : 0, image };
        if (isNew) {
          const nc = { id: nextId(content.categories), ...data };
          nc.slug = uniqueSlug(content.categories, name, nc.id);
          content.categories.push(nc);
          await saveContent(`crea categoría ${name}`);
          setFlash(SAVED); location.hash = `categoria-${nc.id}`;
        } else {
          if (c.name !== name) c.slug = uniqueSlug(content.categories, name, c.id);
          Object.assign(c, data);
          await saveContent(`edita categoría ${name}`);
          setFlash(SAVED); renderCategoryForm(String(c.id));
        }
      });
    });
    $('[data-delete]')?.addEventListener('click', (e) => {
      if (content.products.some((p) => p.category_id === c.id)) { alert('No se puede eliminar: la categoría tiene productos. Muévelos a otra categoría primero.'); return; }
      if (!confirm(`¿Eliminar la categoría “${c.name}”?`)) return;
      busy(e.target, 'Eliminando…', async () => {
        content.categories = content.categories.filter((x) => x.id !== c.id);
        await saveContent(`elimina categoría ${c.name}`);
        setFlash('Categoría eliminada.'); location.hash = 'categorias';
      });
    });
  }

  // ---------- Ajustes ----------
  function renderSettings() {
    const s = content.settings;
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
    ${f('announcement', 'Barra de anuncio', { help: 'Ej. “Agenda de DICIEMBRE abierta ✨”. Vacío para ocultarla.' })}
    ${f('hero_title', 'Título principal', { help: 'Escribe palabras entre *asteriscos* para resaltarlas en rosa.' })}
    ${f('hero_text', 'Texto de la portada', { area: true })}
    ${f('occasions', 'Ocasiones (separadas por coma)', { area: true, rows: 2 })}</section>
  <section class="card"><h2>Promoción</h2>
    <label class="check"><input type="checkbox" name="promo_active" ${s.promo_active === '0' ? '' : 'checked'}> Mostrar promoción en el inicio</label>
    ${f('promo_kicker', 'Texto pequeño superior')}${f('promo_title', 'Título')}${f('promo_text', 'Descripción', { area: true })}
    <div class="row-2">${f('promo_cta', 'Texto del botón')}${f('promo_link', 'Enlace del botón', { help: 'Ej. /cotizar o /catalogo' })}</div></section>
  <section class="card"><h2>Cómo funciona y preguntas</h2>
    ${f('steps', 'Pasos', { area: true, rows: 10, help: 'Separa cada paso con una línea en blanco. Primera línea = título.' })}
    ${f('faq', 'Preguntas frecuentes', { area: true, rows: 12, help: 'Separa cada pregunta con una línea en blanco. Primera línea = pregunta.' })}</section>
  <div class="form-actions"><button class="btn btn-primary btn-lg" type="submit">Guardar ajustes</button></div>
</form>`);
    const form = $('[data-form]');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      busy($('button[type="submit"]', form), 'Guardando…', async () => {
        const fd = new FormData(form);
        for (const [k, v] of fd.entries()) if (k !== 'promo_active') s[k] = String(v).trim();
        s.instagram = String(s.instagram || '').replace(/^@/, '');
        s.promo_active = fd.get('promo_active') ? '1' : '0';
        await saveContent('actualiza ajustes');
        setFlash(SAVED); renderSettings();
      });
    });
  }

  // ---------- Rutas (#productos, #producto-3, #categorias, #ajustes…) ----------
  function route() {
    if (!cfg.token || !content) { renderLogin(); return; }
    const h = location.hash.replace(/^#/, '') || 'productos';
    window.scrollTo(0, 0);
    if (h === 'productos') renderProducts();
    else if (h.startsWith('producto-')) renderProductForm(h.slice(9));
    else if (h === 'categorias') renderCategories();
    else if (h.startsWith('categoria-')) renderCategoryForm(h.slice(10));
    else if (h === 'ajustes') renderSettings();
    else renderProducts();
  }
  window.addEventListener('hashchange', route);

  (async () => {
    if (!cfg.token) { renderLogin(); return; }
    try { await loadContent(); route(); } catch (e) {
      renderLogin(e.status === 401 ? 'Tu token ya no es válido o expiró. Crea uno nuevo.' : `No se pudo cargar el contenido: ${e.message}`);
    }
  })();
})();
