/* ============================================
   Creative Station — arranque del sitio
   Cada página HTML dice qué es (<body data-page="…">); aquí se cargan los datos
   (Supabase o modo demo), se pinta la página y se activan las interacciones.
   ============================================ */

import * as api from './api.js';
import * as views from './lib/views.js';
import { relink } from './lib/layout.js';
import { siteConfig } from './lib/util.js';
import { initInteractions } from './interactions.js';

const root = document.getElementById('app');
const page = document.body.dataset.page || 'home';
const params = new URLSearchParams(location.search);
const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function prepare({ settings, categories, products }) {
  const catById = new Map(categories.map((c) => [c.id, c]));
  const list = products
    .filter((p) => !p.category_id || catById.has(p.category_id))
    .map((p) => ({
      ...p,
      price: p.price === '' || p.price == null ? null : Number(p.price),
      min_qty: Number(p.min_qty) || 1,
      custom_fields: p.custom_fields || [], occasions: p.occasions || [], images: p.images || [],
      category_name: catById.get(p.category_id)?.name || '',
      category_slug: catById.get(p.category_id)?.slug || '',
    }));
  const cats = categories.map((c) => ({ ...c, product_count: list.filter((p) => p.category_id === c.id).length }));
  return { s: settings, products: list, categories: cats, visibleCats: cats.filter((c) => c.product_count > 0) };
}

function render({ s, products, categories, visibleCats }) {
  switch (page) {
    case 'home': {
      const featured = products.filter((p) => p.featured).slice(0, 8);
      const gallery = [...new Set([...featured, ...products].map((p) => p.images[0]).filter(Boolean))];
      return views.home({ s, categories: visibleCats, featured, gallery });
    }
    case 'catalogo': {
      const catSlug = params.get('cat');
      const current = catSlug ? categories.find((c) => c.slug === catSlug) : null;
      if (catSlug && !current) return views.notFound({ s });
      const q = (params.get('q') || '').trim().slice(0, 80);
      const occasion = (params.get('ocasion') || '').trim().slice(0, 60);
      const words = norm(q).split(/\s+/).filter(Boolean);
      const list = products.filter((p) => (!current || p.category_id === current.id)
        && (!occasion || p.occasions.includes(occasion))
        && words.every((w) => norm(`${p.name} ${p.short_desc} ${p.description} ${p.category_name}`).includes(w)));
      return views.catalog({ s, categories: visibleCats, products: list, current, q, occasion });
    }
    case 'producto': {
      const p = products.find((x) => x.slug === params.get('p'));
      if (!p) return views.notFound({ s });
      const related = products.filter((r) => r.category_id === p.category_id && r.id !== p.id).slice(0, 4);
      for (const r of products.filter((x) => x.featured)) {
        if (related.length >= 4) break;
        if (r.id !== p.id && !related.includes(r)) related.push(r);
      }
      return views.product({ s, p, related });
    }
    case 'pedido':
      return views.cart({ s });
    case 'cotizar': {
      const product = products.find((x) => x.slug === params.get('producto')) || null;
      return views.quote({ s, categories: visibleCats, product, preset: { evento: (params.get('evento') || '').slice(0, 60) } });
    }
    default:
      return views.notFound({ s });
  }
}

async function main() {
  let data;
  try {
    data = await api.fetchSite();
    siteConfig.uploads = !api.usingDemo;
  } catch (e) {
    console.error(e);
    root.innerHTML = `<div style="max-width:520px;margin:15vh auto;padding:24px;text-align:center;font-family:system-ui">
      <h1 style="font-size:1.4rem">No pudimos cargar el catálogo</h1>
      <p>Revisa tu conexión y vuelve a intentar. Si el problema sigue, escríbenos por WhatsApp.</p>
      <p><a href="">Reintentar</a> · <a href="https://wa.me/526691669855" target="_blank" rel="noopener">WhatsApp</a></p></div>`;
    return;
  }
  const ctx = prepare(data);
  root.innerHTML = relink(String(render(ctx)));
  root.removeAttribute('aria-busy');
  initInteractions({ api, settings: ctx.s });
  if (location.hash.length > 1) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
}

main();
