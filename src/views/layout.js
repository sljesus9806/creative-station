// Estructura común del sitio público: <head>, barra de anuncio, encabezado, pie y botón flotante de WhatsApp.
const { html, raw, waLink, prettyPhone } = require('../util');
const { icons, twinkle } = require('./icons');

const FONTS = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,400..700,0..100;1,9..144,400..700,0..100&family=Quicksand:wght@400..700&family=Pinyon+Script&display=swap';

function layout({ s, title, description, body, path = '/', image, jsonld, bodyClass = '' }) {
  const fullTitle = title ? `${title} · ${s.business_name}` : `${s.business_name} · ${s.tagline}`;
  const desc = description || `${s.tagline} en ${s.city}. ${s.shipping_text}`;
  const nav = [
    ['/catalogo', 'Catálogo'],
    ['/#como-funciona', 'Cómo funciona'],
    ['/#preguntas', 'Preguntas'],
    ['/cotizar', 'Cotizar'],
  ];
  const waGeneral = waLink(s.whatsapp, `¡Hola ${s.business_name}! ✨ Vengo de su página web y quiero información.`);

  return html`<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${fullTitle}</title>
<meta name="description" content="${desc}">
<meta name="theme-color" content="#7272AE">
<meta property="og:type" content="website">
<meta property="og:title" content="${fullTitle}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${image || '/img/brand/favicon-512.png'}">
<meta property="og:locale" content="es_MX">
<link rel="icon" type="image/png" sizes="32x32" href="/img/brand/favicon-32.png">
<link rel="apple-touch-icon" href="/img/brand/favicon-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="/css/site.css?v=1">
${jsonld ? raw(`<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>`) : ''}
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">Saltar al contenido</a>
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
<div class="toast" role="status" aria-live="polite" data-toast></div>
<script>window.CS = ${raw(JSON.stringify({ wa: s.whatsapp, name: s.business_name }))};</script>
<script src="/js/site.js?v=1" defer></script>
</body>
</html>`;
}

module.exports = { layout };
