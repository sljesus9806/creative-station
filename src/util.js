// Utilidades compartidas: escape de HTML, slugs, dinero, teléfonos y WhatsApp.

class Safe {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ESC[c]);

function renderVal(v) {
  if (v == null || v === false || v === true) return '';
  if (v instanceof Safe) return v.s;
  if (Array.isArray(v)) return v.map(renderVal).join('');
  return esc(v);
}

/** Plantilla segura: todo lo interpolado se escapa salvo lo marcado con raw(). */
function html(strings, ...vals) {
  let out = strings[0];
  for (let i = 0; i < vals.length; i++) out += renderVal(vals[i]) + strings[i + 1];
  return new Safe(out);
}
const raw = (s) => new Safe(String(s ?? ''));

function slugify(str) {
  return String(str || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
}

const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
function money(n) {
  if (n == null || n === '' || Number.isNaN(Number(n))) return '';
  const v = Number(n);
  return mxn.format(v).replace(/\.00$/, '');
}

/** Normaliza un teléfono mexicano a formato internacional para wa.me (52 + 10 dígitos). */
function waNumber(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.length === 10) d = '52' + d;
  if (d.length === 13 && d.startsWith('521')) d = '52' + d.slice(3);
  return d;
}

function waLink(phone, text) {
  const n = waNumber(phone);
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

function prettyPhone(phone) {
  const d = String(phone || '').replace(/\D/g, '').slice(-10);
  if (d.length !== 10) return phone || '';
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

function parseJSON(s, fallback) {
  try { const v = JSON.parse(s); return v ?? fallback; } catch { return fallback; }
}

function nl2br(text) {
  return raw(esc(text || '').replace(/\r?\n/g, '<br>'));
}

const dateFmt = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Mazatlan' });
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);
}
function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso.endsWith('Z') || iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? iso : dateTimeFmt.format(d);
}

/** Bloques separados por línea en blanco: primera línea = título, resto = texto. */
function parseBlocks(text) {
  return String(text || '')
    .split(/\r?\n\s*\r?\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => {
      const [title, ...rest] = b.split(/\r?\n/);
      return { title: title.trim(), body: rest.join('\n').trim() };
    });
}

function clean(s, max = 500) {
  return String(s ?? '').trim().slice(0, max);
}

module.exports = {
  Safe, html, raw, esc, slugify, money, waNumber, waLink, prettyPhone,
  parseJSON, nl2br, fmtDate, fmtDateTime, parseBlocks, clean,
};
