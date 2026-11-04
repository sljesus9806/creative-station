// Panel: compresión de fotos en el navegador antes de subirlas y confirmaciones.
(() => {
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const MAX = 1600;      // lado mayor en píxeles
  const QUALITY = 0.85;

  // Confirmar acciones destructivas
  $$('form[data-confirm]').forEach((f) => f.addEventListener('submit', (e) => {
    if (!confirm(f.dataset.confirm)) e.preventDefault();
  }));

  // Vista previa de imágenes elegidas
  $$('input[type="file"][data-compress]').forEach((input) => {
    const card = input.closest('.card');
    const previews = card.querySelector('[data-upload-previews]');
    const label = card.querySelector('[data-upload-label]');
    input.addEventListener('change', () => {
      previews.innerHTML = '';
      [...input.files].forEach((f) => { const img = new Image(); img.src = URL.createObjectURL(f); img.alt = ''; previews.appendChild(img); });
      if (label) label.textContent = input.files.length ? `${input.files.length} foto${input.files.length > 1 ? 's' : ''} lista${input.files.length > 1 ? 's' : ''} para subir` : 'Agregar fotos';
    });
  });

  async function compress(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 350 * 1024) return file;
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const scale = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
      const w = Math.round(bmp.width * scale); const h = Math.round(bmp.height * scale);
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
      const type = file.type === 'image/png' ? 'image/webp' : 'image/jpeg';
      const blob = await new Promise((r) => canvas.toBlob(r, type, QUALITY));
      if (!blob || blob.size >= file.size) return file;
      return new File([blob], file.name.replace(/\.\w+$/, type === 'image/webp' ? '.webp' : '.jpg'), { type });
    } catch { return file; }
  }

  // Al guardar: comprimir fotos y enviar el formulario con fetch
  $$('form[data-image-form]').forEach((form) => form.addEventListener('submit', async (e) => {
    const inputs = $$('input[type="file"][data-compress]', form).filter((i) => i.files.length);
    if (!inputs.length || !window.fetch || !window.createImageBitmap) return; // envío normal
    e.preventDefault();
    const btn = form.querySelector('[data-submit]');
    const original = btn?.textContent;
    if (btn) { btn.disabled = true; btn.textContent = 'Optimizando fotos…'; }
    const fd = new FormData(form);
    for (const input of inputs) {
      fd.delete(input.name);
      for (const f of input.files) fd.append(input.name, await compress(f));
    }
    if (btn) btn.textContent = 'Guardando…';
    try {
      const res = await fetch(form.action, { method: 'POST', body: fd, credentials: 'same-origin' });
      if (res.redirected) { location.href = res.url; return; }
      const html = await res.text();
      document.open(); document.write(html); document.close();
    } catch {
      alert('No se pudo guardar. Revisa tu conexión e intenta de nuevo.');
      if (btn) { btn.disabled = false; btn.textContent = original; }
    }
  }));
})();
