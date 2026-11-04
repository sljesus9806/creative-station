// Estructura común del sitio: barra de anuncio, encabezado, pie y botón flotante de WhatsApp.
// Se pinta en el navegador; las rutas "bonitas" de las plantillas (/catalogo/slug) se convierten
// en archivos reales de GitHub Pages (catalogo.html?cat=slug) con relink().
import { html, raw, waLink, prettyPhone } from './util.js';
import { icons, twinkle } from './icons.js';

// ---------- Rutas ----------
const ROUTES = [
  [/^\/catalogo\/([^/?#]+)\/?(\?[^#]*)?$/, (m, slug, q = '') => `catalogo.html?cat=${slug}${q ? `&${q.slice(1)}` : ''}`],
  [/^\/catalogo\/?(\?[^#]*)?$/, (m, q = '') => `catalogo.html${q}`],
  [/^\/producto\/([^/?#]+)\/?(\?[^#]*)?$/, (m, slug, q = '') => `producto.html?p=${slug}${q ? `&${q.slice(1)}` : ''}`],
  [/^\/pedido\/?$/, () => 'pedido.html'],
  [/^\/cotizar\/?(\?[^#]*)?$/, (m, q = '') => `cotizar.html${q}`],
  [/^\/(#.*)?$/, (m, h = '') => `./${h}`],
];

/** Convierte una ruta de las plantillas en un enlace relativo que funciona en GitHub Pages. */
export function link(p) {
  for (const [re, fn] of ROUTES) {
    const m = p.match(re);
    if (m) return fn(...m);
  }
  return p.replace(/^\//, '');
}

export function relink(markup) {
  return String(markup)
    .replace(/(href|src|action|data-src)="(\/(?!\/)[^"]*)"/g, (m, attr, p) => `${attr}="${link(p)}"`)
    .replace(/&quot;\/(img)\//g, '&quot;$1/');
}

// ---------- <head> ----------
function setMeta(name, content, attr = 'name') {
  let el = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
  el.setAttribute('content', content);
}

export function layout({ s, title, description, body, path = '/', jsonld }) {
  const fullTitle = title ? `${title} · ${s.business_name}` : `${s.business_name} · ${s.tagline}`;
  const desc = description || `${s.tagline} en ${s.city}. ${s.shipping_text}`;
  document.title = fullTitle;
  setMeta('description', desc);
  setMeta('og:title', fullTitle, 'property');
  setMeta('og:description', desc, 'property');
  document.head.querySelectorAll('script[data-jsonld]').forEach((n) => n.remove());
  if (jsonld) {
    const sc = document.createElement('script');
    sc.type = 'application/ld+json'; sc.dataset.jsonld = '';
    sc.textContent = JSON.stringify(jsonld);
    document.head.appendChild(sc);
  }

  const nav = [
    ['/catalogo', 'Catálogo'],
    ['/#como-funciona', 'Cómo funciona'],
    ['/#preguntas', 'Preguntas'],
    ['/cotizar', 'Cotizar'],
  ];
  const waGeneral = waLink(s.whatsapp, `¡Hola ${s.business_name}! ✨ Vengo de su página web y quiero información.`);

  return html`<a class="skip" href="#main">Saltar al contenido</a>
${s.announcement ? html`<div class="announce">${twinkle('tw-a')}<span>${s.announcement}</span>${twinkle('tw-a')}</div>` : ''}
<header class="site-header" data-header>
  <div class="wrap header-in">
    <a class="brand" href="/" aria-label="${s.business_name} — inicio">
      <img src="/img/brand/logo-horizontal-lavanda.png" alt="${s.business_name}" width="196" height="30">
    </a>
    <nav class="main-nav" id="main-nav" aria-label="Principal">
      <ul>
        ${nav.map(([href, label]) => html`<li><a href="${href}" ${path === href ? raw('aria-current="page"') : ''}>${label}</a></li>`)}
      </ul>
      <a class="btn btn-wa nav-wa" href="${waGeneral}" target="_blank" rel="noopener">${icons.whatsapp}<span>Escríbenos</span></a>
    </nav>
    <div class="header-actions">
      <a class="cart-link" href="/pedido" aria-label="Mi pedido">
        ${icons.bag}<span class="cart-label">Mi pedido</span><span class="cart-count" data-cart-count hidden>0</span>
      </a>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="main-nav" data-menu-btn>
        <span class="i-open">${icons.menu}</span><span class="i-close">${icons.close}</span><span class="sr">Menú</span>
      </button>
    </div>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="scallop-top" aria-hidden="true"></div>
  <div class="wrap footer-in">
    <div class="footer-brand">
      <img src="/img/brand/logo-vertical-blanco.png" alt="${s.business_name}" width="120" height="141">
      <p>${s.tagline} hecha con amor en ${s.city}.<br>${s.shipping_text}</p>
    </div>
    <div>
      <h2 class="footer-h">Explora</h2>
      <ul class="footer-links">
        <li><a href="/catalogo">Catálogo</a></li>
        <li><a href="/cotizar">Cotización personalizada</a></li>
        <li><a href="/pedido">Mi pedido</a></li>
        <li><a href="/#preguntas">Preguntas frecuentes</a></li>
      </ul>
    </div>
    <div>
      <h2 class="footer-h">Contacto</h2>
      <ul class="footer-links">
        <li><a href="${waGeneral}" target="_blank" rel="noopener">${icons.whatsapp} ${prettyPhone(s.whatsapp)}</a></li>
        ${s.instagram ? html`<li><a href="https://instagram.com/${s.instagram}" target="_blank" rel="noopener">${icons.instagram} @${s.instagram}</a></li>` : ''}
        <li><span>${icons.pin} ${s.city}</span></li>
        <li><span>${icons.truck} Envíos a todo México</span></li>
      </ul>
    </div>
  </div>
  <div class="wrap footer-bottom">
    <span>© ${new Date().getFullYear()} ${s.business_name}</span>
    <span class="script">hecho a mano, con amor</span>
  </div>
</footer>
<a class="wa-float" href="${waGeneral}" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">${icons.whatsapp}</a>
<div class="toast" role="status" aria-live="polite" data-toast></div>`;
}
