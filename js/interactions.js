// Creative Station — interacciones del sitio (menú, galería, "Mi pedido", cotización).
import { link } from './lib/layout.js';
import { compress } from './lib/images.js';

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const KEY = 'cs_pedido_v1';
const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const money = (n) => mxn.format(n).replace(/\.00$/, '');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
};
/** Folio local para el modo demo (sin base de datos). */
const demoFolio = (kind) => {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `CS-${kind}-${ymd}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
};
const errMsg = (e) => (e && (e.message || e.error_description)) || 'Algo salió mal. Intenta de nuevo o escríbenos por WhatsApp.';

// ---------- Almacenamiento del pedido ----------
const store = {
  read() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } },
  write(items) { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* modo privado */ } updateCount(); },
};
function updateCount(bump) {
  const n = store.read().length;
  $$('[data-cart-count]').forEach((el) => {
    el.textContent = n; el.hidden = n === 0;
    if (bump) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  });
}

let toastTimer;
function toast(markup) {
  const t = $('[data-toast]'); if (!t) return;
  t.innerHTML = markup; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 4200);
}

function bindQty(wrap, onChange) {
  const input = $('input', wrap);
  const min = Number(input.min) || 1;
  $$('[data-step]', wrap).forEach((b) => b.addEventListener('click', () => {
    input.value = Math.max(min, Math.min(9999, (parseInt(input.value, 10) || min) + Number(b.dataset.step)));
    input.dispatchEvent(new Event('change'));
  }));
  input.addEventListener('change', () => {
    input.value = Math.max(min, Math.min(9999, parseInt(input.value, 10) || min));
    onChange?.(Number(input.value));
  });
}

export function initInteractions({ api, settings }) {
  const waUrl = (text) => {
    let n = String(settings.whatsapp || '').replace(/\D/g, '');
    if (n.length === 10) n = `52${n}`;
    return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
  };

  updateCount();

  // ---------- Menú móvil ----------
  const header = $('[data-header]');
  const menuBtn = $('[data-menu-btn]');
  menuBtn?.addEventListener('click', () => {
    const open = header.classList.toggle('menu-open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  $$('#main-nav a').forEach((a) => a.addEventListener('click', () => { header.classList.remove('menu-open'); menuBtn?.setAttribute('aria-expanded', 'false'); }));

  // ---------- Galería de producto ----------
  const mainImg = $('[data-gallery-main]');
  $$('.thumb').forEach((btn) => btn.addEventListener('click', () => {
    mainImg.src = btn.dataset.src;
    $$('.thumb').forEach((b) => b.classList.toggle('is-on', b === btn));
  }));

  // ---------- Agregar al pedido ----------
  const addForm = $('[data-add-form]');
  if (addForm) {
    const product = JSON.parse(addForm.dataset.product);
    const subtotal = $('[data-subtotal]', addForm);
    const renderSubtotal = (qty) => {
      if (product.price == null || !subtotal) return;
      subtotal.textContent = `Subtotal estimado: ${money(product.price * qty)} (${qty} ${product.unit}${qty > 1 ? 's' : ''})`;
    };
    const qtyWrap = $('[data-qty]', addForm);
    bindQty(qtyWrap, renderSubtotal);
    renderSubtotal(Number($('input', qtyWrap).value));

    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(addForm);
      const custom = {};
      for (const [k, v] of fd.entries()) if (k !== 'qty' && String(v).trim()) custom[k] = String(v).trim();
      const qty = Math.max(product.min || 1, parseInt(fd.get('qty'), 10) || 1);
      const items = store.read();
      items.push({ id: Date.now().toString(36), slug: product.slug, name: product.name, price: product.price, unit: product.unit, min: product.min, image: product.image, photo: Boolean(product.photo), qty, custom });
      store.write(items);
      updateCount(true);
      addForm.reset(); $('input[name="qty"]', addForm).value = product.min || 1; renderSubtotal(product.min || 1);
      toast(`<span>✨ Agregado a tu pedido</span><a href="${esc(link('/pedido'))}">Ver pedido →</a>`);
    });

    const sticky = $('[data-sticky-buy]');
    if (sticky) {
      document.body.classList.add('has-sticky');
      $('[data-scroll-to-form]', sticky).addEventListener('click', () => {
        addForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => $('input, textarea', addForm)?.focus({ preventScroll: true }), 500);
      });
      new IntersectionObserver(([en]) => sticky.classList.toggle('is-hidden', en.isIntersecting), { threshold: 0.2 }).observe(addForm);
    }
  }

  // ---------- Página "Mi pedido" ----------
  const cartRoot = $('[data-cart]');
  if (cartRoot) {
    const list = $('[data-cart-items]');
    const empty = $('[data-cart-empty]');
    const checkout = $('[data-checkout]');
    const done = $('[data-order-done]');

    const summary = () => {
      const items = store.read();
      const priced = items.filter((i) => i.price != null);
      $('[data-sum-count]').textContent = items.reduce((t, i) => t + i.qty, 0);
      $('[data-sum-total]').textContent = priced.length ? money(priced.reduce((t, i) => t + i.price * i.qty, 0)) + (priced.length < items.length ? ' +' : '') : 'Por cotizar';
      $('[data-sum-note]').hidden = priced.length === items.length;
    };

    const render = () => {
      const items = store.read();
      $$('.cart-item', list).forEach((n) => n.remove());
      empty.hidden = items.length > 0;
      checkout.hidden = items.length === 0;
      items.forEach((it) => {
        const el = document.createElement('article');
        el.className = 'cart-item';
        const custom = Object.entries(it.custom || {}).map(([k, v]) => `<li><b>${esc(k)}:</b> ${esc(v)}</li>`).join('');
        el.innerHTML = `
          <img src="${esc(it.image)}" alt="" width="92" height="108">
          <div>
            <div class="ci-head">
              <a class="ci-name" href="${esc(link(`/producto/${it.slug}`))}">${esc(it.name)}</a>
              <button class="ci-remove" type="button" aria-label="Quitar ${esc(it.name)}" data-remove>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>
              </button>
            </div>
            ${custom ? `<ul class="ci-custom">${custom}</ul>` : '<p class="ci-custom">Sin datos de personalización (te los pedimos por WhatsApp).</p>'}
            <div class="ci-foot">
              <div class="qty qty-sm">
                <button type="button" data-step="-1" aria-label="Menos">−</button>
                <input type="number" value="${it.qty}" min="${it.min || 1}" max="9999" inputmode="numeric" aria-label="Cantidad">
                <button type="button" data-step="1" aria-label="Más">+</button>
              </div>
              <span class="ci-price ${it.price == null ? 'is-quote' : ''}">${it.price == null ? 'Precio según diseño' : money(it.price * it.qty)}</span>
            </div>
          </div>`;
        list.appendChild(el);
        bindQty($('.qty', el), (qty) => {
          const all = store.read(); const x = all.find((a) => a.id === it.id);
          if (x) { x.qty = qty; store.write(all); }
          summary();
          $('.ci-price', el).textContent = it.price == null ? 'Precio según diseño' : money(it.price * qty);
        });
        $('[data-remove]', el).addEventListener('click', () => { store.write(store.read().filter((a) => a.id !== it.id)); render(); });
      });
      summary();
    };

    const orderMessage = ({ folio, items, total, hasUnpriced, needsPhoto }, data) => {
      const lines = [`¡Hola ${settings.business_name}! ✨ Quiero hacer este pedido:`, `Folio: ${folio}`, ''];
      items.forEach((it, i) => {
        lines.push(`${i + 1}. ${it.name} × ${it.qty}${it.price != null ? ` — ${money(it.price * it.qty)}` : ''}`);
        for (const [k, v] of Object.entries(it.custom || {})) lines.push(`   • ${k}: ${v}`);
      });
      lines.push('');
      if (total != null) lines.push(`Total estimado: ${money(total)}${hasUnpriced ? ' + productos por cotizar' : ''}`);
      lines.push(`Nombre: ${data.name.trim()}`, `Ciudad: ${data.city.trim()}`, `Entrega: ${data.delivery}`);
      if (data.event_date) lines.push(`Fecha del evento: ${fmtDate(data.event_date)}`);
      if (data.notes?.trim()) lines.push(`Comentarios: ${data.notes.trim()}`);
      if (needsPhoto) lines.push('', '📸 Te envío las fotos por aquí.');
      return lines.join('\n');
    };

    const form = $('[data-order-form]');
    const err = $('[data-form-error]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.hidden = true;
      const data = Object.fromEntries(new FormData(form).entries());
      const problems = [];
      if (!data.name.trim()) problems.push('Escribe tu nombre.');
      if (data.phone.replace(/\D/g, '').length < 10) problems.push('Escribe un WhatsApp válido de 10 dígitos.');
      if (!data.city.trim()) problems.push('Escribe tu ciudad y estado.');
      $$('input[required]', form).forEach((i) => i.setAttribute('aria-invalid', String(!i.value.trim())));
      if (problems.length) { err.innerHTML = problems.map(esc).join('<br>'); err.hidden = false; return; }
      if (data.website) return;
      const btn = $('button[type="submit"]', form);
      btn.disabled = true; btn.style.opacity = 0.7;
      try {
        const items = store.read();
        let result;
        if (!api.usingDemo) {
          const customer = { name: data.name, phone: data.phone, city: data.city, event_date: data.event_date, delivery: data.delivery, notes: data.notes };
          const r = await api.createOrder(customer, items.map(({ slug, qty, custom }) => ({ slug, qty, custom })));
          result = { folio: r.folio, items: r.items, total: r.total == null ? null : Number(r.total), hasUnpriced: r.has_unpriced, needsPhoto: r.needs_photo };
        } else {
          const priced = items.filter((i) => i.price != null);
          result = {
            folio: demoFolio('P'), items,
            total: priced.length ? priced.reduce((t, i) => t + i.price * i.qty, 0) : null,
            hasUnpriced: priced.length < items.length, needsPhoto: items.some((i) => i.photo),
          };
        }
        store.write([]);
        list.hidden = true; checkout.hidden = true;
        $('[data-folio]', done).textContent = result.folio;
        $('[data-wa-link]', done).href = waUrl(orderMessage(result, data));
        done.hidden = false;
        done.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (ex) {
        err.textContent = errMsg(ex);
        err.hidden = false;
      } finally {
        btn.disabled = false; btn.style.opacity = '';
      }
    });

    render();
  }

  // ---------- Cotización ----------
  const quoteForm = $('[data-quote-form]');
  if (quoteForm) {
    const fileInput = $('[data-upload-input]', quoteForm);
    if (fileInput) {
      const label = $('[data-upload-label]', quoteForm);
      const previews = $('[data-upload-previews]', quoteForm);
      fileInput.addEventListener('change', () => {
        let files = [...fileInput.files];
        if (files.length > 3) {
          const dt = new DataTransfer(); files.slice(0, 3).forEach((f) => dt.items.add(f)); fileInput.files = dt.files; files = [...fileInput.files];
          toast('Solo puedes subir hasta 3 imágenes.');
        }
        previews.innerHTML = '';
        files.forEach((f) => { const img = document.createElement('img'); img.src = URL.createObjectURL(f); img.alt = ''; previews.appendChild(img); });
        label.textContent = files.length ? `${files.length} imagen${files.length > 1 ? 'es' : ''} seleccionada${files.length > 1 ? 's' : ''}` : 'Toca para subir imágenes de inspiración';
      });
    }

    quoteForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(quoteForm);
      const d = Object.fromEntries(fd.entries());
      const interests = fd.getAll('interests').map(String);
      const problems = [];
      if (!d.event_type) problems.push('Elige el tipo de evento.');
      if (!d.details?.trim()) problems.push('Cuéntanos tu idea.');
      if (!d.name?.trim()) problems.push('Escribe tu nombre.');
      if ((d.phone || '').replace(/\D/g, '').length < 10) problems.push('Escribe un WhatsApp válido de 10 dígitos.');
      if (!d.city?.trim()) problems.push('Escribe tu ciudad y estado.');
      let err = $('.form-error', quoteForm);
      const showErr = (msgs) => {
        if (!err) { err = document.createElement('div'); err.className = 'form-error'; err.setAttribute('role', 'alert'); quoteForm.prepend(err); }
        err.innerHTML = msgs.map((p) => `<p>${esc(p)}</p>`).join('');
        err.hidden = false;
        err.scrollIntoView({ behavior: 'smooth', block: 'center' });
      };
      if (problems.length) { showErr(problems); return; }
      if (d.website) return;
      if (err) err.hidden = true;

      const btn = $('[data-submit]', quoteForm);
      const original = btn.innerHTML;
      btn.disabled = true;
      try {
        let folio;
        let images = [];
        if (!api.usingDemo) {
          const files = fileInput ? [...fileInput.files].slice(0, 3) : [];
          for (let i = 0; i < files.length; i++) {
            btn.textContent = `Subiendo foto ${i + 1} de ${files.length}…`;
            images.push(await api.uploadReference(await compress(files[i], { max: 1400 })));
          }
          btn.textContent = 'Enviando…';
          const r = await api.createQuote({ ...d, interests, images });
          folio = r.folio;
        } else {
          folio = demoFolio('C');
        }
        const productName = $('.quote-product strong', quoteForm)?.textContent;
        const lines = [`¡Hola ${settings.business_name}! ✨ Quiero cotizar papelería para mi evento.`, `Folio: ${folio}`, ''];
        if (productName) lines.push(`• A partir de: ${productName}`);
        lines.push(`• Evento: ${d.event_type}${d.event_date ? ` (${fmtDate(d.event_date)})` : ''}`);
        if (d.quantity?.trim()) lines.push(`• Piezas/invitados: ${d.quantity.trim()}`);
        if (interests.length) lines.push(`• Me interesa: ${interests.join(', ')}`);
        if (d.theme?.trim()) lines.push(`• Temática y colores: ${d.theme.trim()}`);
        if (d.budget && d.budget !== 'Aún no lo sé') lines.push(`• Presupuesto: ${d.budget}`);
        lines.push(`• Idea: ${d.details.trim()}`, '', `Nombre: ${d.name.trim()}`, `Ciudad: ${d.city.trim()}`);
        if (d.email?.trim()) lines.push(`Correo: ${d.email.trim()}`);
        if (d.delivery) lines.push(`Entrega: ${d.delivery}`);
        if (images.length) lines.push(`(Subí ${images.length} foto${images.length > 1 ? 's' : ''} de referencia en la página)`);
        const done = $('[data-quote-done]');
        $('[data-folio]', done).textContent = folio;
        $('[data-wa-link]', done).href = waUrl(lines.join('\n'));
        quoteForm.hidden = true;
        done.hidden = false;
        done.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (ex) {
        showErr([errMsg(ex)]);
      } finally {
        btn.disabled = false; btn.innerHTML = original;
      }
    });
  }
}
