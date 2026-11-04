// Autenticación del panel: una sola cuenta de administradora con contraseña (scrypt) y sesión en cookie.
const crypto = require('node:crypto');
const { db, getSetting, setSetting } = require('./db');

const COOKIE = 'cs_admin';
const SESSION_DAYS = 14;

function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 64);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}
function verifyPassword(pw, stored) {
  if (!stored || !stored.startsWith('scrypt:')) return false;
  const [, saltHex, hashHex] = stored.split(':');
  const hash = crypto.scryptSync(String(pw), Buffer.from(saltHex, 'hex'), 64);
  const expected = Buffer.from(hashHex, 'hex');
  return expected.length === hash.length && crypto.timingSafeEqual(hash, expected);
}

/** Primera ejecución: usa ADMIN_PASSWORD o genera una contraseña temporal y la muestra en consola. */
function ensureAdminPassword() {
  if (getSetting('admin_password_hash')) return;
  let pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    pw = crypto.randomBytes(6).toString('base64url');
    console.log('\n──────────────────────────────────────────────');
    console.log('  Contraseña temporal del panel (/admin):', pw);
    console.log('  Cámbiala en Panel → Ajustes → Contraseña.');
    console.log('──────────────────────────────────────────────\n');
  }
  setSetting('admin_password_hash', hashPassword(pw));
}

function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function createSession(res, req) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + SESSION_DAYS * 864e5;
  db.prepare('INSERT INTO sessions(token, expires_at) VALUES(?, ?)').run(token, expires);
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  const secure = req.secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}${secure}`);
}

function destroySession(req, res) {
  const token = parseCookies(req)[COOKIE];
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

function isLoggedIn(req) {
  const token = parseCookies(req)[COOKIE];
  if (!token) return false;
  const s = db.prepare('SELECT expires_at FROM sessions WHERE token = ?').get(token);
  return Boolean(s && s.expires_at > Date.now());
}

function requireAdmin(req, res, next) {
  if (isLoggedIn(req)) return next();
  if (req.method === 'GET') return res.redirect(`/admin/login?next=${encodeURIComponent(req.originalUrl)}`);
  return res.status(401).send('Sesión expirada. Vuelve a iniciar sesión.');
}

/** Protección CSRF básica: los POST del panel deben venir de este mismo sitio. */
function sameOrigin(req, res, next) {
  if (req.method !== 'POST') return next();
  const origin = req.headers.origin || req.headers.referer || '';
  if (!origin) return next(); // algunos navegadores no envían Origin en formularios; SameSite=Lax cubre este caso
  try {
    const host = new URL(origin).host;
    if (host === req.headers.host || host === req.headers['x-forwarded-host']) return next();
  } catch { /* cae al rechazo */ }
  return res.status(403).send('Solicitud no permitida.');
}

// Límite simple de intentos por IP (en memoria).
function rateLimiter({ windowMs, max }) {
  const hits = new Map();
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) return res.status(429).send('Demasiados intentos. Intenta de nuevo en unos minutos.');
    arr.push(now);
    hits.set(key, arr);
    if (hits.size > 5000) hits.clear();
    next();
  };
}

module.exports = {
  hashPassword, verifyPassword, ensureAdminPassword, createSession, destroySession,
  isLoggedIn, requireAdmin, sameOrigin, rateLimiter,
};
