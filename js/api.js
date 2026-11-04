/* ============================================
   Capa de datos: Supabase (o modo demo)
   Todo lo que lee o guarda el sitio y el panel pasa por aquí.
   ============================================ */

import { CONFIG } from './config.js';
import { DEFAULT_SETTINGS, DEMO_CATEGORIES, DEMO_PRODUCTS } from './demo-data.js';

export const isConfigured = Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_KEY);

const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/+esm';
const CATALOG_BUCKET = 'catalogo';
const REFS_BUCKET = 'referencias';

let clientPromise = null;
function client() {
  if (!isConfigured) throw new Error('Supabase no está configurado (js/config.js)');
  clientPromise ??= import(SUPABASE_JS).then(({ createClient }) => createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY));
  return clientPromise;
}

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

const settingsFromRows = (rows) => {
  const s = { ...DEFAULT_SETTINGS };
  for (const r of rows || []) s[r.key] = r.value;
  return s;
};

/* ---------- Sitio ---------- */
export async function fetchSite() {
  if (!isConfigured) {
    return { settings: { ...DEFAULT_SETTINGS }, categories: structuredClone(DEMO_CATEGORIES), products: structuredClone(DEMO_PRODUCTS), demo: true };
  }
  const sb = await client();
  const [settings, categories, products] = await Promise.all([
    sb.from('settings').select('key, value'),
    // .eq por si la admin tiene sesión abierta: en el sitio nunca se ven los ocultos
    sb.from('categories').select('*').eq('active', true).order('sort_order').order('name'),
    sb.from('products').select('*').eq('active', true).order('sort_order').order('created_at', { ascending: false }),
  ]);
  return { settings: settingsFromRows(unwrap(settings)), categories: unwrap(categories), products: unwrap(products), demo: false };
}

/* items: [{ slug, qty, custom }] — los precios los toma la base de datos */
export async function createOrder(customer, items) {
  const sb = await client();
  return unwrap(await sb.rpc('create_order', { p_customer: customer, p_items: items }));
}

export async function createQuote(quote) {
  const sb = await client();
  return unwrap(await sb.rpc('create_quote', { p: quote }));
}

export async function uploadReference(blob) {
  const sb = await client();
  const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `cotizaciones/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  unwrap(await sb.storage.from(REFS_BUCKET).upload(path, blob, { contentType: blob.type, cacheControl: '31536000' }));
  return sb.storage.from(REFS_BUCKET).getPublicUrl(path).data.publicUrl;
}

/* ---------- Sesión (panel) ---------- */
export async function getSession() {
  const sb = await client();
  return unwrap(await sb.auth.getSession()).session;
}
export async function signIn(email, password) {
  const sb = await client();
  return unwrap(await sb.auth.signInWithPassword({ email, password })).session;
}
export async function signOut() {
  const sb = await client();
  await sb.auth.signOut();
}
export async function onAuthChange(callback) {
  const sb = await client();
  sb.auth.onAuthStateChange((event, session) => callback(event, session));
}
export async function sendPasswordReset(email, redirectTo) {
  const sb = await client();
  unwrap(await sb.auth.resetPasswordForEmail(email, { redirectTo }));
}
export async function setNewPassword(password) {
  const sb = await client();
  unwrap(await sb.auth.updateUser({ password }));
}
export async function checkIsAdmin() {
  const sb = await client();
  return Boolean(unwrap(await sb.rpc('is_admin')));
}

/* ---------- Panel: lectura ---------- */
export async function loadAll() {
  const sb = await client();
  const [settings, categories, products, quotes, orders] = await Promise.all([
    sb.from('settings').select('key, value'),
    sb.from('categories').select('*').order('sort_order').order('name'),
    sb.from('products').select('*').order('sort_order').order('created_at', { ascending: false }),
    sb.from('quotes').select('*').order('created_at', { ascending: false }).limit(500),
    sb.from('orders').select('*').order('created_at', { ascending: false }).limit(500),
  ]);
  return {
    settings: settingsFromRows(unwrap(settings)),
    categories: unwrap(categories), products: unwrap(products), quotes: unwrap(quotes), orders: unwrap(orders),
  };
}

/* ---------- Panel: guardar ---------- */
async function save(table, { id, ...fields }) {
  const sb = await client();
  const query = id ? sb.from(table).update(fields).eq('id', id) : sb.from(table).insert(fields);
  return unwrap(await query.select().single());
}
async function remove(table, id) {
  const sb = await client();
  unwrap(await sb.from(table).delete().eq('id', id));
}

export const saveProduct = (p) => save('products', { ...p, updated_at: new Date().toISOString() });
export const saveCategory = (c) => save('categories', c);
export const deleteCategory = (id) => remove('categories', id);
export async function deleteProduct(product) {
  await remove('products', product.id);
  await removeImages(product.images || []);
}
export const updateQuote = (id, fields) => save('quotes', { id, ...fields });
export const updateOrder = (id, fields) => save('orders', { id, ...fields });
export async function deleteQuote(quote) {
  await remove('quotes', quote.id);
  await removeImages(quote.images || [], REFS_BUCKET);
}
export const deleteOrder = (id) => remove('orders', id);

export async function saveSettings(values) {
  const sb = await client();
  const rows = Object.entries(values).map(([key, value]) => ({ key, value: String(value ?? '') }));
  unwrap(await sb.from('settings').upsert(rows, { onConflict: 'key' }));
}

/* ---------- Fotos del catálogo ---------- */
export async function uploadImage(blob) {
  const sb = await client();
  const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  unwrap(await sb.storage.from(CATALOG_BUCKET).upload(path, blob, { contentType: blob.type, cacheControl: '31536000' }));
  return sb.storage.from(CATALOG_BUCKET).getPublicUrl(path).data.publicUrl;
}

/* Borra del Storage solo las fotos que viven ahí (las de img/seed del repo se quedan) */
export async function removeImages(urls, bucket = CATALOG_BUCKET) {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const paths = [...new Set(urls)]
    .filter((u) => typeof u === 'string' && u.includes(marker))
    .map((u) => decodeURIComponent(u.split(marker)[1].split('?')[0]));
  if (!paths.length) return;
  const sb = await client();
  const { error } = await sb.storage.from(bucket).remove(paths);
  if (error) console.warn('No se pudieron borrar algunas fotos', error);
}
