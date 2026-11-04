// Páginas públicas: inicio, catálogo, producto, pedido, cotización.
const { html, raw, esc, money, nl2br, parseBlocks, waLink, siteConfig } = require('../util');
const { icons, bow, twinkle } = require('./icons');
const { layout } = require('./layout');

const ph = '/img/brand/favicon-512.png';

/** Permite resaltar palabras escribiéndolas entre *asteriscos* en los ajustes. */
const emph = (text) => raw(esc(text || '').replace(/\*([^*]+)\*/g, '<em>$1</em>'));

function priceLabel(p) {
  if (p.price == null) return p.mode === 'cotizacion' ? 'Precio a cotizar' : 'Precio según diseño';
  return `${p.price_from ? 'Desde ' : ''}${money(p.price)} / ${p.unit || 'pieza'}`;
}

function productCard(p, i = 0) {
  const img = p.images[0] || ph;
  const text = [p.name, p.short_desc, p.category_name, ...(p.occasions || [])].join(' ').toLowerCase();
  return html`<article class="p-card" style="--tilt:${(i % 3) - 1}deg" data-occ="${(p.occasions || []).join('|')}" data-text="${text}">
  <a href="/producto/${p.slug}" class="p-card-link">
    <div class="p-card-img">
      <img src="${img}" alt="${p.name}" loading="lazy" width="400" height="500">
      ${p.badge ? html`<span class="badge">${p.badge}</span>` : ''}
    </div>
    <div class="p-card-body">
      ${p.category_name ? html`<span class="p-card-cat">${p.category_name}</span>` : ''}
      <h3 class="p-card-title">${p.name}</h3>
      ${p.short_desc ? html`<p class="p-card-desc">${p.short_desc}</p>` : ''}
      <div class="p-card-foot">
        <span class="p-card-price ${p.price == null ? 'is-quote' : ''}">${priceLabel(p)}</span>
        <span class="p-card-go" aria-hidden="true">${icons.arrow}</span>
      </div>
    </div>
  </a>
</article>`;
}

// ---------------- Inicio ----------------
function home({ s, categories, featured, gallery }) {
  const steps = parseBlocks(s.steps);
  const faq = parseBlocks(s.faq);
  const occasions = String(s.occasions || '').split(',').map((o) => o.trim()).filter(Boolean);
  const heroImgs = gallery.slice(0, 3);

  const body = html`
<section class="hero">
  <div class="hero-bg" aria-hidden="true"></div>
  <div class="wrap hero-in">
    <div class="hero-copy">
      <p class="pill">${icons.scissors}<span>${s.tagline} · ${s.city}</span></p>
      <h1 class="display">${emph(s.hero_title)}</h1>
      <p class="lead">${s.hero_text}</p>
      <div class="cta-row">
        <a class="btn btn-primary btn-lg" href="/catalogo">Ver catálogo ${icons.arrow}</a>
        <a class="btn btn-ghost btn-lg" href="/cotizar">${icons.pencil} Cotizar mi evento</a>
      </div>
      <ul class="trust">
        <li>${icons.heart}<span>Diseño 100% personalizado</span></li>
        <li>${icons.truck}<span>Envíos a todo México</span></li>
        <li>${icons.whatsapp}<span>Atención por WhatsApp</span></li>
      </ul>
    </div>
    <div class="hero-art" aria-hidden="true">
      ${heroImgs.map((src, i) => html`<figure class="sticker st-${i + 1}"><img src="${src}" alt="" width="360" height="460"></figure>`)}
      ${bow('var(--blush-400)', 'hero-bow')}
      ${twinkle('tw-1')}${twinkle('tw-2')}${twinkle('tw-3')}
      <span class="hero-script">con amor ♡</span>
    </div>
  </div>
</section>

${occasions.length ? html`<section class="occasions" aria-labelledby="occ-h">
  <div class="wrap">
    <h2 id="occ-h" class="h-script-sm">¿Qué celebras?</h2>
    <ul class="chips">
      ${occasions.map((o) => html`<li><a class="chip" href="/catalogo?ocasion=${encodeURIComponent(o)}">${o}</a></li>`)}
    </ul>
  </div>
</section>` : ''}

<section class="section" aria-labelledby="cat-h">
  <div class="wrap">
    <header class="sec-head">
      <p class="kicker">Categorías</p>
      <h2 id="cat-h" class="h2">Todo para tu fiesta, <em>hecho a tu medida</em></h2>
    </header>
    <ul class="cat-grid">
      ${categories.map((c) => html`<li><a class="cat-card" href="/catalogo/${c.slug}">
        <span class="cat-img"><img src="${c.image || ph}" alt="" loading="lazy" width="300" height="300"></span>
        <span class="cat-name">${c.name}</span>
        <span class="cat-count">${c.product_count} ${c.product_count === 1 ? 'producto' : 'productos'}</span>
      </a></li>`)}
    </ul>
  </div>
</section>

${featured.length ? html`<section class="section section-tint" aria-labelledby="feat-h">
  <div class="wrap">
    <header class="sec-head sec-head-row">
      <div>
        <p class="kicker">Favoritos</p>
        <h2 id="feat-h" class="h2">Lo más pedido</h2>
      </div>
      <a class="link-arrow" href="/catalogo">Ver todo el catálogo ${icons.arrow}</a>
    </header>
    <div class="p-grid">${featured.map(productCard)}</div>
  </div>
</section>` : ''}

<section class="section stripes" id="como-funciona" aria-labelledby="how-h">
  <div class="torn torn-top" aria-hidden="true"></div>
  <div class="wrap">
    <header class="sec-head center">
      <p class="kicker">Paso a paso</p>
      <h2 id="how-h" class="h2">Así de fácil es pedir</h2>
    </header>
    <ol class="steps">
      ${steps.map((st, i) => html`<li class="step">
        <span class="step-n">${i + 1}</span>
        <h3>${st.title}</h3>
        <p>${st.body}</p>
      </li>`)}
    </ol>
    <div class="center mt">
      <a class="btn btn-primary" href="/catalogo">Empezar mi pedido ${icons.arrow}</a>
    </div>
  </div>
  <div class="torn torn-bottom" aria-hidden="true"></div>
</section>

${s.promo_active === '1' ? html`<section class="section" aria-labelledby="promo-h">
  <div class="wrap">
    <div class="promo">
      ${bow('var(--butter)', 'promo-bow')}
      <div class="promo-copy">
        ${s.promo_kicker ? html`<p class="kicker kicker-light">${s.promo_kicker}</p>` : ''}
        <h2 id="promo-h" class="h2">${emph(s.promo_title)}</h2>
        <p>${s.promo_text}</p>
        ${s.promo_link ? html`<a class="btn btn-butter" href="${s.promo_link}">${s.promo_cta || 'Ver más'} ${icons.arrow}</a>` : ''}
      </div>
      ${twinkle('tw-p1')}${twinkle('tw-p2')}
    </div>
  </div>
</section>` : ''}

<section class="section" aria-labelledby="custom-h">
  <div class="wrap custom">
    <div class="custom-art" aria-hidden="true">
      ${gallery.slice(3, 5).map((src, i) => html`<figure class="sticker cs-${i + 1}"><img src="${src}" alt="" loading="lazy" width="300" height="380"></figure>`)}
    </div>
    <div class="custom-copy">
      <p class="kicker">Diseño personalizado</p>
      <h2 id="custom-h" class="h2">¿Tienes una idea en mente? <em>La hacemos realidad</em></h2>
      <p>Cuéntanos tu temática, colores, fecha y cuántas piezas necesitas. Puedes subir fotos de referencia y te respondemos por WhatsApp con tu cotización.</p>
      <div class="cta-row">
        <a class="btn btn-primary" href="/cotizar">Pedir cotización ${icons.arrow}</a>
        <a class="btn btn-ghost" href="${waLink(s.whatsapp, '¡Hola! ✨ Quiero cotizar un diseño personalizado.')}" target="_blank" rel="noopener">${icons.whatsapp} WhatsApp</a>
      </div>
    </div>
  </div>
</section>

${s.instagram ? html`<section class="section section-tint ig" aria-labelledby="ig-h">
  <div class="wrap">
    <header class="sec-head center">
      <p class="kicker">Síguenos</p>
      <h2 id="ig-h" class="h2"><a href="https://instagram.com/${s.instagram}" target="_blank" rel="noopener">@${s.instagram}</a></h2>
      <p class="muted">Inspírate con nuestros trabajos más recientes.</p>
    </header>
    <ul class="ig-grid">
      ${gallery.slice(0, 6).map((src) => html`<li><a href="https://instagram.com/${s.instagram}" target="_blank" rel="noopener"><img src="${src}" alt="Trabajo de ${s.business_name}" loading="lazy" width="240" height="240"></a></li>`)}
    </ul>
  </div>
</section>` : ''}

${faq.length ? html`<section class="section" id="preguntas" aria-labelledby="faq-h">
  <div class="wrap faq-wrap">
    <header class="sec-head">
      <p class="kicker">Dudas</p>
      <h2 id="faq-h" class="h2">Preguntas frecuentes</h2>
      <p class="muted">¿No encuentras tu respuesta? <a href="${waLink(s.whatsapp, '¡Hola! Tengo una pregunta ✨')}" target="_blank" rel="noopener">Escríbenos por WhatsApp</a>.</p>
    </header>
    <div class="faq">
      ${faq.map((f, i) => html`<details ${i === 0 ? raw('open') : ''}><summary>${f.title}</summary><div>${nl2br(f.body)}</div></details>`)}
    </div>
  </div>
</section>` : ''}
`;

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: s.business_name,
    description: s.hero_text,
    telephone: `+${String(s.whatsapp).replace(/\D/g, '').length === 10 ? '52' : ''}${String(s.whatsapp).replace(/\D/g, '')}`,
    address: { '@type': 'PostalAddress', addressLocality: s.city, addressCountry: 'MX' },
    sameAs: s.instagram ? [`https://instagram.com/${s.instagram}`] : [],
  };
  return layout({ s, body, path: '/', jsonld });
}

// ---------------- Catálogo ----------------
function catalog({ s, categories, products, current, q, occasion }) {
  const occasions = String(s.occasions || '').split(',').map((o) => o.trim()).filter(Boolean);
  const title = current ? current.name : occasion || 'Catálogo';
  const keep = (extra) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (occasion) p.set('ocasion', occasion);
    for (const [k, v] of Object.entries(extra)) { if (v) p.set(k, v); else p.delete(k); }
    const str = p.toString();
    return str ? `?${str}` : '';
  };
  const body = html`
<section class="page-head">
  <div class="wrap">
    <nav class="crumbs" aria-label="Ruta"><a href="/">Inicio</a> / ${current ? html`<a href="/catalogo">Catálogo</a> / <span>${current.name}</span>` : html`<span>Catálogo</span>`}</nav>
    <h1 class="h1">${title}</h1>
    <p class="lead-sm">${current?.description || 'Elige tu producto favorito, personalízalo y envíanos tu pedido por WhatsApp. ¿Buscas algo diferente? Pide una cotización.'}</p>
  </div>
</section>
<section class="section pt0">
  <div class="wrap">
    <form class="filters" method="get" action="${current ? `/catalogo/${current.slug}` : '/catalogo'}" role="search">
      <label class="search">
        ${icons.search}
        <span class="sr">Buscar productos</span>
        <input type="search" name="q" value="${q || ''}" placeholder="Buscar: toppers, stickers, vasos…">
      </label>
      ${occasion ? html`<input type="hidden" name="ocasion" value="${occasion}">` : ''}
      <button class="btn btn-primary btn-sm" type="submit">Buscar</button>
    </form>
    <div class="filter-rows">
      <div class="scroll-chips" role="list" aria-label="Categorías">
        <a role="listitem" class="chip ${!current ? 'is-on' : ''}" href="/catalogo${keep({})}">Todo</a>
        ${categories.map((c) => html`<a role="listitem" class="chip ${current?.id === c.id ? 'is-on' : ''}" href="/catalogo/${c.slug}${keep({})}">${c.name}</a>`)}
      </div>
      ${occasions.length ? html`<div class="scroll-chips chips-soft" role="list" aria-label="Ocasiones">
        <span class="chips-label">Ocasión:</span>
        ${occasions.map((o) => html`<a role="listitem" class="chip chip-sm ${occasion === o ? 'is-on' : ''}" href="${current ? `/catalogo/${current.slug}` : '/catalogo'}${keep({ ocasion: occasion === o ? '' : o })}">${o}</a>`)}
      </div>` : ''}
    </div>
    <p class="result-count" data-count ${products.length ? '' : raw('hidden')}>${products.length} ${products.length === 1 ? 'producto' : 'productos'}${q ? html` para “${q}”` : ''}</p>
    <div class="p-grid" data-grid>${products.map(productCard)}</div>
    <div class="empty" data-empty ${products.length ? raw('hidden') : ''}>
      ${bow('var(--blush-200)', 'empty-bow')}
      <h2 class="h3">No encontramos productos con esos filtros</h2>
      <p>Pero seguro lo podemos hacer. Cuéntanos tu idea y te cotizamos.</p>
      <div class="cta-row center"><a class="btn btn-ghost" href="/catalogo">Ver todo</a><a class="btn btn-primary" href="/cotizar">Pedir cotización</a></div>
    </div>
  </div>
</section>
<section class="section pt0">
  <div class="wrap">
    <div class="band">
      <div><h2 class="h3">¿No ves lo que buscas?</h2><p>Todo lo hacemos a la medida de tu evento.</p></div>
      <a class="btn btn-primary" href="/cotizar">Cotización personalizada ${icons.arrow}</a>
    </div>
  </div>
</section>`;
  return layout({ s, title, body, path: '/catalogo', description: current?.description });
}

// ---------------- Producto ----------------
function product({ s, p, related }) {
  const imgs = p.images.length ? p.images : [ph];
  const orderable = p.mode !== 'cotizacion';
  const waAsk = waLink(s.whatsapp, `¡Hola! ✨ Me interesa: ${p.name}. ¿Me pueden dar más información?`);
  const fieldId = (f, i) => `cf-${i}`;
  const isPhotoField = (f) => /foto/i.test(f);

  const body = html`
<section class="page-head page-head-sm">
  <div class="wrap">
    <nav class="crumbs" aria-label="Ruta"><a href="/">Inicio</a> / <a href="/catalogo">Catálogo</a>${p.category_slug ? html` / <a href="/catalogo/${p.category_slug}">${p.category_name}</a>` : ''}</nav>
  </div>
</section>
<section class="section pt0">
  <div class="wrap product">
    <div class="gallery" data-gallery>
      <div class="gallery-main">
        <img src="${imgs[0]}" alt="${p.name}" width="700" height="875" data-gallery-main>
        ${p.badge ? html`<span class="badge">${p.badge}</span>` : ''}
      </div>
      ${imgs.length > 1 ? html`<div class="thumbs">
        ${imgs.map((src, i) => html`<button type="button" class="thumb ${i === 0 ? 'is-on' : ''}" data-src="${src}" aria-label="Ver foto ${i + 1}"><img src="${src}" alt="" width="90" height="90" loading="lazy"></button>`)}
      </div>` : ''}
    </div>

    <div class="p-info">
      ${p.category_name ? html`<a class="p-cat" href="/catalogo/${p.category_slug}">${p.category_name}</a>` : ''}
      <h1 class="h1">${p.name}</h1>
      <p class="p-price ${p.price == null ? 'is-quote' : ''}">${priceLabel(p)}</p>
      ${p.min_qty > 1 ? html`<p class="p-min">Pedido mínimo: ${p.min_qty} ${p.unit}s</p>` : ''}
      <div class="p-desc">${nl2br(p.description || p.short_desc)}</div>
      ${p.occasions.length ? html`<ul class="tags">${p.occasions.map((o) => html`<li><a href="/catalogo?ocasion=${encodeURIComponent(o)}">${o}</a></li>`)}</ul>` : ''}

      ${orderable ? html`
      <form class="card personalize" data-add-form
        data-product="${JSON.stringify({ slug: p.slug, name: p.name, price: p.price, unit: p.unit, min: p.min_qty, image: imgs[0], photo: p.custom_fields.some(isPhotoField) })}">
        <h2 class="h4">${icons.pencil} Personaliza tu pedido</h2>
        <div class="fields">
          ${p.custom_fields.filter((f) => !isPhotoField(f)).map((f, i) => html`<label class="field" for="${fieldId(f, i)}">
            <span>${f}</span>
            ${/fecha/i.test(f)
              ? html`<input id="${fieldId(f, i)}" type="date" name="${f}">`
              : html`<input id="${fieldId(f, i)}" type="text" name="${f}" maxlength="120" placeholder="${/nombre/i.test(f) ? 'Ej. Camila' : /edad/i.test(f) ? 'Ej. 17' : /color/i.test(f) ? 'Ej. rosa y durazno' : /tem/i.test(f) ? 'Ej. coquette, cherry, disco' : ''}">`}
          </label>`)}
          <label class="field field-full" for="cf-notes">
            <span>Notas o ideas <small>(opcional)</small></span>
            <textarea id="cf-notes" name="Notas" rows="2" maxlength="600" placeholder="Cuéntanos cualquier detalle extra"></textarea>
          </label>
        </div>
        ${p.custom_fields.some(isPhotoField) ? html`<p class="hint">${icons.image} Este producto lleva foto. Al enviar tu pedido te la pedimos por WhatsApp.</p>` : ''}
        <div class="add-row">
          <div class="qty" data-qty>
            <button type="button" data-step="-1" aria-label="Menos">${icons.minus}</button>
            <input type="number" name="qty" value="${p.min_qty || 1}" min="${p.min_qty || 1}" max="9999" inputmode="numeric" aria-label="Cantidad">
            <button type="button" data-step="1" aria-label="Más">${icons.plus}</button>
          </div>
          <button class="btn btn-primary btn-lg grow" type="submit">${icons.bag} Agregar a mi pedido</button>
        </div>
        <p class="subtotal" data-subtotal ${p.price == null ? raw('hidden') : ''}></p>
      </form>
      <div class="alt-actions">
        <a class="btn btn-ghost" href="${waAsk}" target="_blank" rel="noopener">${icons.whatsapp} Preguntar por WhatsApp</a>
        <a class="link-arrow" href="/cotizar?producto=${p.slug}">¿Lo quieres diferente? Cotiza tu versión ${icons.arrow}</a>
      </div>`
      : html`
      <div class="card quote-only">
        <h2 class="h4">${icons.sparkle} Este producto se cotiza</h2>
        <p>El precio depende del número de piezas y del diseño. Cuéntanos tu idea y te respondemos por WhatsApp.</p>
        <div class="cta-row">
          <a class="btn btn-primary btn-lg" href="/cotizar?producto=${p.slug}">Cotizar este producto ${icons.arrow}</a>
          <a class="btn btn-ghost" href="${waAsk}" target="_blank" rel="noopener">${icons.whatsapp} WhatsApp</a>
        </div>
      </div>`}

      <ul class="p-perks">
        <li>${icons.truck}<span>${s.shipping_text}</span></li>
        <li>${icons.heart}<span>Te enviamos tu diseño para aprobarlo antes de imprimir.</span></li>
      </ul>
    </div>
  </div>
</section>
${related.length ? html`<section class="section section-tint">
  <div class="wrap">
    <header class="sec-head"><p class="kicker">También te puede gustar</p><h2 class="h2">Combínalo con…</h2></header>
    <div class="p-grid">${related.map(productCard)}</div>
  </div>
</section>` : ''}
${orderable ? html`<div class="sticky-buy" data-sticky-buy>
  <div><strong>${p.name}</strong><span>${priceLabel(p)}</span></div>
  <button class="btn btn-primary" type="button" data-scroll-to-form>${icons.bag} Agregar</button>
</div>` : ''}`;

  return layout({
    s, title: p.name, description: p.short_desc || p.description?.slice(0, 150), body, path: '/catalogo', image: imgs[0],
    jsonld: {
      '@context': 'https://schema.org', '@type': 'Product', name: p.name, image: imgs, description: p.description || p.short_desc,
      brand: { '@type': 'Brand', name: s.business_name },
      ...(p.price != null ? { offers: { '@type': 'Offer', priceCurrency: 'MXN', price: p.price, availability: 'https://schema.org/InStock' } } : {}),
    },
  });
}

// ---------------- Pedido (carrito) ----------------
function cart({ s }) {
  const body = html`
<section class="page-head">
  <div class="wrap">
    <nav class="crumbs" aria-label="Ruta"><a href="/">Inicio</a> / <span>Mi pedido</span></nav>
    <h1 class="h1">Mi pedido</h1>
    <p class="lead-sm">Revisa tus productos, completa tus datos y envíanos tu pedido por WhatsApp. Te confirmamos precio final, tiempos y diseño.</p>
  </div>
</section>
<section class="section pt0">
  <div class="wrap cart-layout" data-cart>
    <div class="cart-items" data-cart-items>
      <div class="empty" data-cart-empty hidden>
        ${bow('var(--blush-200)', 'empty-bow')}
        <h2 class="h3">Tu pedido está vacío</h2>
        <p>Explora el catálogo y agrega tus favoritos.</p>
        <div class="cta-row center"><a class="btn btn-primary" href="/catalogo">Ver catálogo</a><a class="btn btn-ghost" href="/cotizar">Pedir cotización</a></div>
      </div>
    </div>
    <aside class="card checkout" data-checkout hidden>
      <h2 class="h4">Tus datos</h2>
      <form data-order-form novalidate>
        <label class="field"><span>Nombre completo *</span><input name="name" required maxlength="80" autocomplete="name"></label>
        <label class="field"><span>WhatsApp *</span><input name="phone" required inputmode="tel" autocomplete="tel" maxlength="20" placeholder="10 dígitos"></label>
        <label class="field"><span>Ciudad y estado *</span><input name="city" required maxlength="80" placeholder="Ej. Mazatlán, Sinaloa"></label>
        <label class="field"><span>Fecha del evento</span><input name="event_date" type="date"></label>
        <fieldset class="field">
          <legend>Entrega</legend>
          <label class="radio"><input type="radio" name="delivery" value="Envío a domicilio" checked> Envío a domicilio</label>
          <label class="radio"><input type="radio" name="delivery" value="Recoger en ${s.city}"> Recoger en ${s.city}</label>
        </fieldset>
        <label class="field"><span>Comentarios</span><textarea name="notes" rows="2" maxlength="600"></textarea></label>
        <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="summary">
          <div><span>Productos</span><strong data-sum-count>0</strong></div>
          <div class="sum-total"><span>Total estimado</span><strong data-sum-total>—</strong></div>
          <p class="hint" data-sum-note hidden>Algunos productos se cotizan según diseño; te confirmamos el total por WhatsApp.</p>
        </div>
        <p class="form-error" data-form-error role="alert" hidden></p>
        <button class="btn btn-wa btn-lg block" type="submit">${icons.whatsapp} Enviar pedido por WhatsApp</button>
        <p class="tiny">Al enviar, se abrirá WhatsApp con el resumen de tu pedido. El envío se cotiza según tu ciudad.</p>
      </form>
    </aside>
    <div class="card done" data-order-done hidden>
      ${bow('var(--blush-400)', 'done-bow')}
      <h2 class="h2">¡Pedido registrado!</h2>
      <p>Tu folio es <strong data-folio></strong>. Toca el botón para enviarnos el resumen por WhatsApp y te respondemos lo antes posible.</p>
      <a class="btn btn-wa btn-lg" data-wa-link href="#" target="_blank" rel="noopener">${icons.whatsapp} Abrir WhatsApp</a>
      <p class="tiny">Si tu pedido lleva fotos, mándalas en ese mismo chat.</p>
    </div>
  </div>
</section>`;
  return layout({ s, title: 'Mi pedido', body, path: '/pedido' });
}

// ---------------- Cotización ----------------
const EVENT_TYPES = ['Cumpleaños', 'XV años', 'Boda', 'Despedida de soltera', 'Baby shower', 'Primer añito', 'Bautizo / Comunión', 'Graduación', 'Empresa / evento corporativo', 'Otro'];
const BUDGETS = ['Aún no lo sé', 'Menos de $500', '$500 – $1,000', '$1,000 – $2,500', '$2,500 – $5,000', 'Más de $5,000'];

function quote({ s, categories, product, preset = {}, errors = [], values = {}, productsIndex }) {
  const v = (k) => values[k] ?? '';
  const interests = new Set(values.interests || (product?.category_name ? [product.category_name] : []));
  const OCC_TO_EVENT = { 'Bodas': 'Boda', 'Baby & primer añito': 'Primer añito', 'Bautizo y comunión': 'Bautizo / Comunión' };
  const fromProduct = product?.occasions?.length === 1 ? (OCC_TO_EVENT[product.occasions[0]] || product.occasions[0]) : '';
  const ev = v('event_type') || preset.evento || fromProduct;
  const body = html`
<section class="page-head">
  <div class="wrap">
    <nav class="crumbs" aria-label="Ruta"><a href="/">Inicio</a> / <span>Cotizar</span></nav>
    <h1 class="h1">Cotiza tu evento</h1>
    <p class="lead-sm">Cuéntanos qué imaginas. Te respondemos por WhatsApp con precio, tiempos y una propuesta de diseño.</p>
  </div>
</section>
<section class="section pt0">
  <div class="wrap quote-layout">
    <form class="card quote-form" method="post" action="/cotizar" enctype="multipart/form-data" data-quote-form>
      ${errors.length ? html`<div class="form-error" role="alert">${errors.map((e) => html`<p>${e}</p>`)}</div>` : ''}
      ${product ? html`<div class="quote-product">
        <img src="${product.images[0] || ph}" alt="" width="64" height="64">
        <div><span class="tiny">Cotizando a partir de</span><strong>${product.name}</strong></div>
        <input type="hidden" name="product_slug" value="${product.slug}">
      </div>` : ''}

      <fieldset class="fs">
        <legend><span class="fs-n">1</span> Tu evento</legend>
        <div class="fields">
          <label class="field"><span>Tipo de evento *</span>
            <select name="event_type" required>
              <option value="">Elige una opción</option>
              ${EVENT_TYPES.map((t) => html`<option ${ev === t || (ev && t.startsWith(ev)) ? raw('selected') : ''}>${t}</option>`)}
            </select>
          </label>
          <label class="field"><span>Fecha del evento</span><input type="date" name="event_date" value="${v('event_date')}"></label>
          <label class="field"><span>¿Cuántas piezas o invitados?</span><input name="quantity" maxlength="60" value="${v('quantity')}" placeholder="Ej. 30 invitados"></label>
          <label class="field"><span>Presupuesto aproximado</span>
            <select name="budget">${BUDGETS.map((b) => html`<option ${v('budget') === b ? raw('selected') : ''}>${b}</option>`)}</select>
          </label>
        </div>
      </fieldset>

      <fieldset class="fs">
        <legend><span class="fs-n">2</span> ¿Qué te gustaría?</legend>
        <div class="check-chips">
          ${categories.map((c) => html`<label class="check-chip"><input type="checkbox" name="interests" value="${c.name}" ${interests.has(c.name) ? raw('checked') : ''}><span>${c.name}</span></label>`)}
          <label class="check-chip"><input type="checkbox" name="interests" value="Algo diferente" ${interests.has('Algo diferente') ? raw('checked') : ''}><span>Algo diferente ✨</span></label>
        </div>
        <div class="fields">
          <label class="field field-full"><span>Temática y colores</span><input name="theme" maxlength="160" value="${v('theme')}" placeholder="Ej. coquette con cerezas, rosa y rojo"></label>
          <label class="field field-full"><span>Cuéntanos tu idea *</span><textarea name="details" rows="4" required maxlength="2000" placeholder="Nombre de quien festeja, edad, frases, piezas que necesitas…">${v('details')}</textarea></label>
          ${siteConfig.static
            ? html`<p class="hint field-full">${icons.image} ¿Tienes fotos de inspiración? Al enviar tu solicitud se abre WhatsApp; mándalas en ese mismo chat.</p>`
            : html`<div class="field field-full">
            <span>Fotos de referencia <small>(opcional, hasta 3)</small></span>
            <label class="upload" data-upload>
              <input type="file" name="images" accept="image/*" multiple data-upload-input>
              ${icons.image}<span data-upload-label>Toca para subir imágenes de inspiración</span>
            </label>
            <div class="upload-previews" data-upload-previews></div>
          </div>`}
        </div>
      </fieldset>

      <fieldset class="fs">
        <legend><span class="fs-n">3</span> Tus datos</legend>
        <div class="fields">
          <label class="field"><span>Nombre *</span><input name="name" required maxlength="80" autocomplete="name" value="${v('name')}"></label>
          <label class="field"><span>WhatsApp *</span><input name="phone" required inputmode="tel" autocomplete="tel" maxlength="20" placeholder="10 dígitos" value="${v('phone')}"></label>
          <label class="field"><span>Correo <small>(opcional)</small></span><input type="email" name="email" maxlength="120" autocomplete="email" value="${v('email')}"></label>
          <label class="field"><span>Ciudad y estado *</span><input name="city" required maxlength="80" placeholder="Ej. Guadalajara, Jalisco" value="${v('city')}"></label>
          <fieldset class="field field-full">
            <legend>Entrega</legend>
            <label class="radio"><input type="radio" name="delivery" value="Envío a domicilio" ${v('delivery') !== `Recoger en ${s.city}` ? raw('checked') : ''}> Envío a domicilio</label>
            <label class="radio"><input type="radio" name="delivery" value="Recoger en ${s.city}" ${v('delivery') === `Recoger en ${s.city}` ? raw('checked') : ''}> Recoger en ${s.city}</label>
          </fieldset>
        </div>
      </fieldset>
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button class="btn btn-primary btn-lg block" type="submit" data-submit>Enviar solicitud de cotización ${icons.arrow}</button>
      <p class="tiny center">Te contactamos por WhatsApp. Tus datos solo se usan para tu cotización.</p>
    </form>
    <div class="card done" data-quote-done hidden>
      ${bow('var(--blush-400)', 'done-bow')}
      <p class="kicker">Folio <span data-folio></span></p>
      <h2 class="h2">¡Tu solicitud está lista!</h2>
      <p>Toca el botón para enviarnos el resumen por WhatsApp. Si tienes fotos de referencia, mándalas en ese mismo chat.</p>
      <a class="btn btn-wa btn-lg" data-wa-link href="#" target="_blank" rel="noopener">${icons.whatsapp} Enviar por WhatsApp</a>
    </div>
    <aside class="quote-aside">
      <div class="card soft">
        ${bow('var(--blush-400)', 'aside-bow')}
        <h2 class="h4">¿Prefieres escribirnos directo?</h2>
        <p>Mándanos tus ideas y fotos por WhatsApp y te atendemos personalmente.</p>
        <a class="btn btn-wa block" href="${waLink(s.whatsapp, '¡Hola! ✨ Quiero cotizar papelería para mi evento.')}" target="_blank" rel="noopener">${icons.whatsapp} Escribir por WhatsApp</a>
      </div>
      <ul class="aside-list">
        <li>${icons.calendar}<span>${s.announcement || 'Agenda abierta'}</span></li>
        <li>${icons.truck}<span>${s.shipping_text}</span></li>
        <li>${icons.heart}<span>Diseño 100% personalizado y aprobado por ti antes de imprimir.</span></li>
      </ul>
    </aside>
  </div>
</section>`;
  const extraHead = siteConfig.static && productsIndex
    ? raw(`<script>window.CS_PRODUCTS = ${JSON.stringify(productsIndex).replace(/</g, '\\u003c')};</script>`)
    : '';
  return layout({ s, title: 'Cotizar', body, path: '/cotizar', description: 'Pide una cotización de papelería creativa personalizada para tu evento.', extraHead });
}

function quoteDone({ s, folio, waUrl }) {
  const body = html`
<section class="section">
  <div class="wrap narrow">
    <div class="card done center">
      ${bow('var(--blush-400)', 'done-bow')}
      <p class="kicker">Folio ${folio}</p>
      <h1 class="h2">¡Recibimos tu solicitud!</h1>
      <p>Para atenderte más rápido, envíanos el resumen por WhatsApp. Si subiste fotos de referencia, ya las tenemos guardadas.</p>
      <a class="btn btn-wa btn-lg" href="${waUrl}" target="_blank" rel="noopener">${icons.whatsapp} Enviar por WhatsApp</a>
      <p class="mt"><a class="link-arrow" href="/catalogo">Seguir viendo el catálogo ${icons.arrow}</a></p>
    </div>
  </div>
</section>`;
  return layout({ s, title: 'Solicitud enviada', body, path: '/cotizar' });
}

function notFound({ s }) {
  const body = html`
<section class="section">
  <div class="wrap narrow center">
    ${bow('var(--blush-200)', 'empty-bow')}
    <h1 class="h1">Ups, esta página no existe</h1>
    <p class="lead-sm">Quizá el producto ya no está disponible. Mira el catálogo o escríbenos.</p>
    <div class="cta-row center"><a class="btn btn-primary" href="/catalogo">Ver catálogo</a><a class="btn btn-ghost" href="/">Ir al inicio</a></div>
  </div>
</section>`;
  return layout({ s, title: 'No encontrado', body });
}

module.exports = { home, catalog, product, cart, quote, quoteDone, notFound, priceLabel, EVENT_TYPES };
