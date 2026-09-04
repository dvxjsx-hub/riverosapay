const crypto = require('crypto');
const { db, save } = require('../config/db');

const COOKIE_NAME = 'riverosapay_session';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function limpiarSesionesExpiradas() {
  const limite = Date.now() - MAX_AGE_MS;
  const anteriores = db.sessions.length;
  db.sessions = db.sessions.filter(session => session.createdAt > limite);
  return db.sessions.length !== anteriores;
}

async function createSession(data) {
  limpiarSesionesExpiradas();
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  db.sessions.push({ tokenHash: hashToken(token), ...data, createdAt: now, lastSeenAt: now });
  await save();
  return token;
}

async function getSession(token) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const session = db.sessions.find(s => s.tokenHash === tokenHash);
  if (!session) return null;
  if (Date.now() - session.createdAt > MAX_AGE_MS) {
    db.sessions = db.sessions.filter(s => s.tokenHash !== tokenHash);
    await save();
    return null;
  }
  session.lastSeenAt = Date.now();
  return session;
}

async function destroySession(token) {
  if (!token) return;
  const tokenHash = hashToken(token);
  const anteriores = db.sessions.length;
  db.sessions = db.sessions.filter(session => session.tokenHash !== tokenHash);
  if (db.sessions.length !== anteriores) await save();
}

async function destroyUserSessions(userId) {
  const anteriores = db.sessions.length;
  db.sessions = db.sessions.filter(session => !(session.type === 'user' && session.userId === userId));
  if (db.sessions.length !== anteriores) await save();
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
  const parts = [`${COOKIE_NAME}=${encodeURIComponent(token)}`, 'HttpOnly', 'SameSite=Lax', 'Path=/', `Max-Age=${Math.floor(MAX_AGE_MS / 1000)}`];
  if (secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res) { res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`); }

async function readSession(req) {
  const raw = req.headers.cookie || '';
  const match = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return getSession(match ? decodeURIComponent(match[1]) : null);
}

async function requireUser(req, res, next) {
  const session = await readSession(req);
  if (!session || session.type !== 'user' || !session.userId) return res.status(401).json({ error: 'Sesión de usuario requerida.' });
  req.session = session; req.userId = session.userId; next();
}

async function requireAdmin(req, res, next) {
  const session = await readSession(req);
  if (!session || session.type !== 'admin') return res.status(401).json({ error: 'Acceso de administrador requerido.' });
  req.session = session; next();
}

module.exports = { COOKIE_NAME, createSession, getSession, destroySession, destroyUserSessions, setSessionCookie, clearSessionCookie, readSession, requireUser, requireAdmin };