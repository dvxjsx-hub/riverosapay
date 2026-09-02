const { db, save } = require('../config/db');
const usuarios = require('../models/usuarios.model');
const { hashPassword, newId, newShareCode, newFriendCode, USERNAME_REGEX, PASSWORD_REGEX, LEGACY_USERNAME_REGEX, LEGACY_PASSWORD_REGEX, hashRecoveryCode, newRecoveryCode } = require('../utils/utils');
const { COOKIE_NAME, createSession, setSessionCookie, clearSessionCookie, readSession, destroySession, destroyUserSessions } = require('../middleware/session');

async function registrar(req, res) {
  const { username, password } = req.body || {};
  const uname = (username || '').trim().toLowerCase();
  const adminId = (process.env.ADMIN_ID || '').trim().toLowerCase();
  if (!USERNAME_REGEX.test(uname)) return res.status(400).json({ error: 'El usuario debe tener entre 3 y 15 letras, sin números ni símbolos.' });
  if (adminId && uname === adminId) return res.status(409).json({ error: 'Ese usuario está reservado.' });
  if (!PASSWORD_REGEX.test(password || '')) return res.status(400).json({ error: 'La clave debe tener exactamente 4 dígitos.' });
  if (usuarios.existeUsername(uname)) return res.status(409).json({ error: 'Ese usuario ya existe.' });

  const recoveryCode = newRecoveryCode();
  const now = new Date().toISOString();
  const user = {
    id: newId('u'), username: uname, password: hashPassword(password), role: 'empleado',
    shareCode: newShareCode(db), modoActual: 'empleado', codigoAmistad: newFriendCode(db),
    nombreCompleto: null, recoveryCodeHash: hashRecoveryCode(recoveryCode), createdAt: now,
    lastLoginAt: now, claveMigrada: true
  };
  usuarios.crear(user); await save();
  setSessionCookie(res, createSession({ type: 'user', userId: user.id }));
  res.json({ ...usuarios.publicUser(user), recoveryCode });
}

async function recuperar(req, res) {
  const { username, recoveryCode, newPassword } = req.body || {};
  const user = usuarios.buscarPorUsername(username);
  if (!user || !user.recoveryCodeHash || hashRecoveryCode((recoveryCode || '').trim()) !== user.recoveryCodeHash) return res.status(401).json({ error: 'Usuario o código de recuperación incorrectos.' });
  if (!PASSWORD_REGEX.test(newPassword || '')) return res.status(400).json({ error: 'La nueva clave debe tener exactamente 4 dígitos.' });
  user.password = hashPassword(newPassword);
  user.claveMigrada = true;
  const recoveryCodeNuevo = newRecoveryCode();
  user.recoveryCodeHash = hashRecoveryCode(recoveryCodeNuevo);
  destroyUserSessions(user.id);
  await save(); res.json({ ok: true, recoveryCode: recoveryCodeNuevo });
}

async function migrarCuenta(req, res) {
  const user = usuarios.buscarPorId(req.userId);
  const { newPassword, confirmPassword } = req.body || {};
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  if (user.claveMigrada === true) return res.status(409).json({ error: 'Esta cuenta ya utiliza la nueva clave.' });
  if (!PASSWORD_REGEX.test(newPassword || '')) return res.status(400).json({ error: 'La nueva clave debe tener exactamente 4 dígitos.' });
  if (newPassword !== confirmPassword) return res.status(400).json({ error: 'Las claves no coinciden.' });
  user.password = hashPassword(newPassword);
  user.claveMigrada = true;
  const recoveryCodeNuevo = newRecoveryCode();
  user.recoveryCodeHash = hashRecoveryCode(recoveryCodeNuevo);
  await save();
  res.json({ ...usuarios.publicUser(user), recoveryCode: recoveryCodeNuevo });
}

async function login(req, res) {
  const { username, password } = req.body || {};
  const uname = (username || '').trim().toLowerCase();
  const adminId = (process.env.ADMIN_ID || '').trim().toLowerCase(); const adminPassword = process.env.ADMIN_PASSWORD || '';
  if (adminId && adminPassword && uname === adminId && password === adminPassword) { setSessionCookie(res, createSession({ type: 'admin' })); return res.json({ tipo: 'admin' }); }
  if (!USERNAME_REGEX.test(uname) || !PASSWORD_REGEX.test(password || '')) return res.status(401).json({ error: 'Usuario o clave incorrectos.' });
  const user = usuarios.buscarPorUsername(uname);
  if (!user || user.claveMigrada !== true || user.password !== hashPassword(password || '')) return res.status(401).json({ error: 'Usuario o clave incorrectos.' });
  user.lastLoginAt = new Date().toISOString(); await save();
  setSessionCookie(res, createSession({ type: 'user', userId: user.id })); res.json(usuarios.publicUser(user));
}

async function loginLegacy(req, res) {
  const { username, password } = req.body || {};
  const uname = (username || '').trim().toLowerCase();
  if (!LEGACY_USERNAME_REGEX.test(uname) || !LEGACY_PASSWORD_REGEX.test(password || '')) return res.status(401).json({ error: 'Usuario o contraseña anteriores incorrectos.' });
  const user = usuarios.buscarPorUsername(uname);
  if (!user || user.claveMigrada === true || user.password !== hashPassword(password || '')) return res.status(401).json({ error: 'Usuario o contraseña anteriores incorrectos.' });
  user.lastLoginAt = new Date().toISOString(); await save();
  setSessionCookie(res, createSession({ type: 'user', userId: user.id }));
  res.json({ ...usuarios.publicUser(user), requiereMigracion: true });
}

async function configurarNombre(req, res) {
  const { nombreCompleto } = req.body || {}; const user = usuarios.buscarPorId(req.userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  const limpio = (nombreCompleto || '').trim().replace(/\s+/g, ' ');
  if (!/^[A-Za-zÀ-ÿÑñ]+ [A-Za-zÀ-ÿÑñ]+$/.test(limpio)) return res.status(400).json({ error: 'Ingresa un nombre y un apellido separados por un solo espacio.' });
  user.nombreCompleto = limpio; await save(); res.json(usuarios.publicUser(user));
}

async function preferencias(req, res) {
  const { esEstudiante, recibirNotificaciones } = req.body || {}; const user = usuarios.buscarPorId(req.userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  if (typeof esEstudiante === 'boolean') user.esEstudiante = esEstudiante;
  if (typeof recibirNotificaciones === 'boolean') user.recibirNotificaciones = recibirNotificaciones;
  await save(); res.json(usuarios.publicUser(user));
}

async function cambiarModo(req, res) {
  const { modo } = req.body || {};
  if (!['empleado', 'jefe'].includes(modo)) return res.status(400).json({ error: 'Modo inválido.' });
  const user = usuarios.buscarPorId(req.userId); if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  user.modoActual = modo; await save(); res.json(usuarios.publicUser(user));
}

async function eliminarDatosCuenta(userId) {
  db.turnos = db.turnos.filter(t => t.empleadoId !== userId);
  db.lugares = db.lugares.filter(l => l.empleadoId !== userId);
  db.materias = db.materias.filter(m => m.empleadoId !== userId);
  db.actividades = db.actividades.filter(a => a.empleadoId !== userId);
  db.eventos = db.eventos.filter(e => e.empleadoId !== userId);
  db.notificaciones = db.notificaciones.filter(n => n.usuarioId !== userId && n.empleadoId !== userId);
  db.joinRequests = db.joinRequests.filter(r => r.empleadoId !== userId && r.jefeId !== userId);
  db.links = db.links.filter(l => l.empleadoId !== userId && l.jefeId !== userId);
  if (Array.isArray(db.amistades)) db.amistades = db.amistades.filter(a => a.usuarioId !== userId && a.amistadId !== userId);
  db.turnos.forEach(t => { if (t.jefeAsignadoId === userId) { t.jefeAsignadoId = null; t.eliminacionPendiente = false; } });
  usuarios.eliminar(userId); destroyUserSessions(userId); await save();
}

async function eliminarCuenta(req, res) {
  const { password } = req.body || {}; const user = usuarios.buscarPorId(req.userId);
  if (!user || user.password !== hashPassword(password || '')) return res.status(401).json({ error: 'Contraseña incorrecta.' });
  await eliminarDatosCuenta(req.userId);
  clearSessionCookie(res); res.json({ ok: true });
}

async function logout(req, res) {
  const match = (req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (match) destroySession(decodeURIComponent(match[1]));
  clearSessionCookie(res); res.json({ ok: true });
}

async function elegirRol(req, res) {
  const { role } = req.body || {};
  if (!['jefe', 'empleado'].includes(role)) return res.status(400).json({ error: 'Perfil inválido.' });
  const user = usuarios.buscarPorId(req.userId); if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  if (user.role) return res.status(400).json({ error: 'Ya tienes un perfil configurado.' });
  user.role = role; if (role === 'empleado') user.shareCode = newShareCode(db); user.modoActual = role;
  if (!user.codigoAmistad) user.codigoAmistad = newFriendCode(db); await save(); res.json(usuarios.publicUser(user));
}

module.exports = { registrar, recuperar, migrarCuenta, login, loginLegacy, configurarNombre, preferencias, cambiarModo, eliminarCuenta, eliminarDatosCuenta, logout, elegirRol };