const crypto = require('crypto');

const sessions = new Map();
const COOKIE_NAME = 'riverosapay_session';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

function createSession(data) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { ...data, createdAt: Date.now(), lastSeenAt: Date.now() });
  return token;
}

function getSession(token) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() - session.createdAt > MAX_AGE_MS) { sessions.delete(token); return null; }
  session.lastSeenAt = Date.now();
  return session;
}

function destroySession(token) { if (token) sessions.delete(token); }

function destroyUserSessions(userId) {
  for (const [token, session] of sessions.entries()) {
    if (session.type === 'user' && session.userId === userId) sessions.delete(token);
  }
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
  const parts = [`${COOKIE_NAME}=${token}`, 'HttpOnly', 'SameSite=Lax', 'Path=/', `Max-Age=${Math.floor(MAX_AGE_MS / 1000)}`];
  if (secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res) { res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`); }

function readSession(req) {
  const raw = req.headers.cookie || '';
  const match = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return getSession(match ? decodeURIComponent(match[1]) : null);
}

function requireUser(req, res, next) {
  const session = readSession(req);
  if (!session || session.type !== 'user' || !session.userId) return res.status(401).json({ error: 'Sesión de usuario requerida.' });
  req.session = session; req.userId = session.userId; next();
}

function requireAdmin(req, res, next) {
  const session = readSession(req);
  if (!session || session.type !== 'admin') return res.status(401).json({ error: 'Acceso de administrador requerido.' });
  req.session = session; next();
}

module.exports = { COOKIE_NAME, createSession, getSession, destroySession, destroyUserSessions, setSessionCookie, clearSessionCookie, readSession, requireUser, requireAdmin };