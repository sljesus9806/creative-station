// Creative Station — interacciones del sitio público (sin dependencias).
(() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const KEY = 'cs_pedido_v1';
  const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
  const money = (n) => mxn.format(n).replace(/\.00$/, '');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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
  updateCount();

  // ---------- Aviso ----------
  let toastTimer;
  function toast(html) {
    const t = $('[data-toast]'); if (!t) return;
    t.innerHTML = html; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 4200);
  }

  // ---------- Menú móvil ----------
  const header = $('[data-header]');
  const menuBtn = $('[data-menu-btn]');
  menuBtn?.addEventListener('click', () => {
    const open = header.classList.toggle('menu-open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  $$('#main-nav a').forEach((a) => a.addEventListener('click', () => { header.classList.remove('menu-open'); menuBtn?.setAttribute('aria-expanded', 'false'); }));

  // ---------- Galería de producto ----------
  const main = $('[data-gallery-main]');
  $$('.thumb').forEach((btn) => btn.addEventListener('click', () => {
    main.src = btn.dataset.src;
    $$('.thumb').forEach((b) => b.classList.toggle('is-on', b === btn));
  }));

  // ---------- Cantidad (+/-) ----------
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
      items.push({ id: Date.now().toString(36), slug: product.slug, name: product.name, price: product.price, unit: product.unit, min: product.min, image: product.image, qty, custom });
      store.write(items);
      updateCount(true);
      addForm.reset(); $('input[name="qty"]', addForm).value = product.min || 1; renderSubtotal(product.min || 1);
      toast(`<span>✨ Agregado a tu pedido</span><a href="/pedido">Ver pedido →</a>`);
    });

    // Barra fija en móvil
    const sticky = $('[data-sticky-buy]');
    if (sticky) {
      document.body.classList.add('has-sticky');
      $('[data-scroll-to-form]', sticky).addEventListener('click', () => {
        addForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => $('input, textarea', addForm)?.focus({ preventScroll: true }), 500);
      });
      new IntersectionObserver(([en]) => sticky.classList.toggle('is-hidden', en.isIntersecting), { threshold: .2 }).observe(addForm);
    }
  }

  // ---------- Página de pedido ----------
  const cartRoot = $('[data-cart]');
  if (cartRoot) {
    const list = $('[data-cart-items]');
    const empty = $('[data-cart-empty]');
    const checkout = $('[data-checkout]');
    const done = $('[data-order-done]');

    function render() {
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
              <a class="ci-name" href="/producto/${esc(it.slug)}">${esc(it.name)}</a>
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
        $('[data-remove]', el).addEventListener('click', () => {
          store.write(store.read().filter((a) => a.id !== it.id));
          render();
        });
      });
      summary();
    }

    function summary() {
      const items = store.read();
      const priced = items.filter((i) => i.price != null);
      $('[data-sum-count]').textContent = items.reduce((t, i) => t + i.qty, 0);
      $('[data-sum-total]').textContent = priced.length ? money(priced.reduce((t, i) => t + i.price * i.qty, 0)) + (priced.length < items.length ? ' +' : '') : 'Por cotizar';
      $('[data-sum-note]').hidden = priced.length === items.length;
    }

    const form = $('[data-order-form]');
    const err = $('[data-form-error]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.hidden = true;
      const fd = new FormData(form);
      const data = Object.fromEntries(fd.entries());
      const problems = [];
      if (!data.name.trim()) problems.push('Escribe tu nombre.');
      if (data.phone.replace(/\D/g, '').length < 10) problems.push('Escribe un WhatsApp válido de 10 dígitos.');
      if (!data.city.trim()) problems.push('Escribe tu ciudad y estado.');
      $$('input[required]', form).forEach((i) => i.setAttribute('aria-invalid', String(!i.value.trim())));
      if (problems.length) { err.innerHTML = problems.map(esc).join('<br>'); err.hidden = false; return; }
      const btn = $('button[type="submit"]', form);
      btn.disabled = true; btn.style.opacity = .7;
      try {
        const res = await fetch('/api/pedidos', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, items: store.read().map(({ slug, qty, custom }) => ({ slug, qty, custom })) }),
        });
        const out = await res.json();
        if (!out.ok) throw new Error((out.errors || ['No pudimos enviar tu pedido.']).join(' '));
        store.write([]);
        list.hidden = true; checkout.hidden = true;
        $('[data-folio]').textContent = out.folio;
        $('[data-wa-link]').href = out.wa;
        done.hidden = false;
        done.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (ex) {
        err.textContent = ex.message || 'No pudimos enviar tu pedido. Intenta de nuevo o escríbenos por WhatsApp.';
        err.hidden = false;
      } finally {
        btn.disabled = false; btn.style.opacity = '';
      }
    });

    render();
  }

  // ---------- Cotización: vista previa de imágenes ----------
  $$('[data-upload-input]').forEach((input) => {
    const label = $('[data-upload-label]', input.closest('.field'));
    const previews = $('[data-upload-previews]', input.closest('.field'));
    input.addEventListener('change', () => {
      let files = [...input.files];
      if (files.length > 3) {
        const dt = new DataTransfer(); files.slice(0, 3).forEach((f) => dt.items.add(f)); input.files = dt.files; files = [...input.files];
        toast('Solo puedes subir hasta 3 imágenes.');
      }
      previews.innerHTML = '';
      files.forEach((f) => { const img = document.createElement('img'); img.src = URL.createObjectURL(f); img.alt = ''; previews.appendChild(img); });
      label.textContent = files.length ? `${files.length} imagen${files.length > 1 ? 'es' : ''} seleccionada${files.length > 1 ? 's' : ''}` : 'Toca para subir imágenes de inspiración';
    });
  });
  $$('[data-quote-form]').forEach((f) => f.addEventListener('submit', () => {
    const b = $('[data-submit]', f); if (b) { b.disabled = true; b.textContent = 'Enviando…'; }
  }));
})();
