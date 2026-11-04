// Página del panel para la versión estática (GitHub Pages).
// El panel guarda los cambios directamente en el repositorio usando la API de GitHub.
const { html, raw } = require('../util');
const { FIELD_PRESETS } = require('./admin');

const FONTS = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500..700&family=Quicksand:wght@400..700&display=swap';

function adminStaticPage({ base, repo, branch }) {
  const config = { base, repo, branch, presets: FIELD_PRESETS, units: ['pieza', 'paquete', 'juego', 'kit', 'hoja', 'docena', 'set'] };
  return html`<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Panel · Creative Station</title>
<link rel="icon" type="image/png" sizes="32x32" href="/img/brand/favicon-32.png">
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="/css/admin.css?v=2">
</head>
<body>
<div id="app" aria-live="polite"><p style="padding:2rem;text-align:center">Cargando panel…</p></div>
<script>window.CS_ADMIN = ${raw(JSON.stringify(config).replace(/</g, '\\u003c'))};</script>
<script src="/js/admin-static.js?v=1" defer></script>
</body>
</html>`;
}

module.exports = { adminStaticPage };
