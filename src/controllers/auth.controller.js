const { db, save } = require('../config/db');
const usuarios = require('../models/usuarios.model');
const { hashPassword, verifyPassword, newId, newShareCode, newFriendCode, USERNAME_REGEX, PASSWORD_REGEX, hashRecoveryCode, newRecoveryCode } = require('../utils/utils');
const { COOKIE_NAME, createSession, setSessionCookie, clearSessionCookie, readSession, destroySession, destroyUserSessions } = require('../middleware/session');
const auditoria = require('../models/auditoria.model');

async function registrar(req, res) {
  const { username, password } = req.body || {};
  const uname = (username || '').trim().toLowerCase();
  const adminId = (process.env.ADMIN_ID || '').trim().toLowerCase();
  if (!USERNAME_REGEX.test(uname)) return res.status(400).json({ error: 'El usuario debe tener entre 3 y 15 letras, sin números ni símbolos.' });
  if (adminId && uname === adminId) return res.status(409).json({ error: 'Ese usuario está reservado.' });
  if (!PASSWORD_REGEX.test(password || '')) return res.status(400).json({ error: 'La clave debe tener exactamente 6 dígitos.' });
  if (usuarios.existeUsername(uname)) return res.status(409).json({ error: 'Ese usuario ya existe.' });
  const recoveryCode = newRecoveryCode();
  const now = new Date().toISOString();
  const user = { id: newId('u'), username: uname, password: await hashPassword(password), role: 'empleado', shareCode: newShareCode(db), modoActual: 'empleado', codigoAmistad: newFriendCode(db), nombreCompleto: null, esEstudiante: true, recoveryCodeHash: hashRecoveryCode(recoveryCode), createdAt: now, lastLoginAt: now };
  usuarios.crear(user); await save();
  await auditoria.registrar({ actorId: user.id, actorType: 'user', action: 'crear_cuenta', resource: 'usuario', resourceId: user.id });
  const sessionToken = await createSession({ type: 'user', userId: user.id });
  setSessionCookie(res, sessionToken);
  res.json({ ...usuarios.publicUser(user), recoveryCode });
}

async function recuperar(req, res) {
  const { username, recoveryCode, newPassword } = req.body || {};
  const user = usuarios.buscarPorUsername((username || '').trim().toLowerCase());
  if (!user || !user.recoveryCodeHash || hashRecoveryCode((recoveryCode || '').trim()) !== user.recoveryCodeHash) return res.status(401).json({ error: 'Usuario o código de recuperación incorrectos.' });
  if (!PASSWORD_REGEX.test(newPassword || '')) return res.status(400).json({ error: 'La nueva clave debe tener exactamente 6 dígitos.' });
  user.password = await hashPassword(newPassword);
  await destroyUserSessions(user.id);
  await save();
  await auditoria.registrar({ actorId: user.id, actorType: 'user', action: 'recuperar_cuenta', resource: 'usuario', resourceId: user.id });
  res.json({ ok: true });
}

async function configurarNombre(req, res) {
  const { nombreCompleto } = req.body || {}; const user = usuarios.buscarPorId(req.userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  const limpio = (nombreCompleto || '').trim().replace(/\s+/g, ' ');
  if (!/^[A-Za-zÀ-ÿÑñ]+ [A-Za-zÀ-ÿÑñ]+$/.test(limpio)) return res.status(400).json({ error: 'Ingresa un nombre y un apellido separados por un solo espacio.' });
  user.nombreCompleto = limpio; await save();
  await auditoria.registrar({ actorId: user.id, actorType: 'user', action: 'cambiar_nombre', resource: 'usuario', resourceId: user.id });
  res.json(usuarios.publicUser(user));
}

async function preferencias(req, res) {
  const { esEstudiante, recibirNotificaciones } = req.body || {}; const user = usuarios.buscarPorId(req.userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  if (typeof esEstudiante === 'boolean') user.esEstudiante = esEstudiante;
  if (typeof recibirNotificaciones === 'boolean') user.recibirNotificaciones = recibirNotificaciones;
  await save();
  await auditoria.registrar({ actorId: user.id, actorType: 'user', action: 'cambiar_preferencias', resource: 'usuario', resourceId: user.id });
  res.json(usuarios.publicUser(user));
}

async function cambiarModo(req, res) {
  const { modo } = req.body || {};
  if (!['empleado', 'jefe'].includes(modo)) return res.status(400).json({ error: 'Modo inválido.' });
  const user = usuarios.buscarPorId(req.userId); if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  user.modoActual = modo; await save();
  await auditoria.registrar({ actorId: user.id, actorType: 'user', action: 'cambiar_modo', resource: 'usuario', resourceId: user.id });
  res.json(usuarios.publicUser(user));
}

async function cambiarClave(req, res) {
  const { passwordActual, nuevaClave } = req.body || {};
  const user = usuarios.buscarPorId(req.userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  const actual = await verifyPassword(passwordActual || '', user.password);
  if (!actual.valid) return res.status(401).json({ error: 'La clave actual es incorrecta.' });
  if (!PASSWORD_REGEX.test(nuevaClave || '')) return res.status(400).json({ error: 'La nueva clave debe tener exactamente 6 dígitos.' });
  if (nuevaClave === passwordActual) return res.status(400).json({ error: 'La nueva clave debe ser diferente a la actual.' });
  user.password = await hashPassword(nuevaClave);
  const recoveryCode = newRecoveryCode();
  user.recoveryCodeHash = hashRecoveryCode(recoveryCode);
  await save();
  await auditoria.registrar({ actorId: user.id, actorType: 'user', action: 'cambiar_clave', resource: 'usuario', resourceId: user.id });
  res.json({ ...usuarios.publicUser(user), recoveryCode });
}

async function obtenerNuevoCodigoRecuperacion(req, res) {
  const { username, password } = req.body || {};
  const user = usuarios.buscarPorUsername((username || '').trim().toLowerCase());
  if (!user || user.id !== req.userId) return res.status(401).json({ error: 'Usuario o clave incorrectos.' });
  const actual = await verifyPassword(password || '', user.password);
  if (!actual.valid) return res.status(401).json({ error: 'Usuario o clave incorrectos.' });
  const recoveryCode = newRecoveryCode();
  user.recoveryCodeHash = hashRecoveryCode(recoveryCode);
  await save();
  await auditoria.registrar({ actorId: user.id, actorType: 'user', action: 'renovar_codigo_recuperacion', resource: 'usuario', resourceId: user.id });
  res.json({ recoveryCode });
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
  usuarios.eliminar(userId); await destroyUserSessions(userId); await save();
}

async function eliminarCuenta(req, res) {
  const { password } = req.body || {}; const user = usuarios.buscarPorId(req.userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  const actual = await verifyPassword(password || '', user.password);
  if (!actual.valid) return res.status(401).json({ error: 'Contraseña incorrecta.' });
  await eliminarDatosCuenta(req.userId);
  await auditoria.registrar({ actorId: req.userId, actorType: 'user', action: 'eliminar_cuenta', resource: 'usuario', resourceId: req.userId });
  clearSessionCookie(res); res.json({ ok: true });
}

async function login(req, res) {
  const { username, password } = req.body || {}; const uname = (username || '').trim().toLowerCase();
  const adminId = (process.env.ADMIN_ID || '').trim().toLowerCase(); const adminPassword = process.env.ADMIN_PASSWORD || '';
  if (adminId && adminPassword && uname === adminId && password === adminPassword) {
    req.authRateLimit?.registrarExito();
    const sessionToken = await createSession({ type: 'admin' });
    setSessionCookie(res, sessionToken);
    await auditoria.registrar({ actorId: 'admin', actorType: 'admin', action: 'inicio_sesion', resource: 'sesion' });
    return res.json({ tipo: 'admin' });
  }
  if (!PASSWORD_REGEX.test(password || '')) { req.authRateLimit?.registrarFallo(); return res.status(401).json({ error: 'Usuario o clave incorrectos.' }); }
  const user = usuarios.buscarPorUsername(uname);
  if (!user) { req.authRateLimit?.registrarFallo(); return res.status(401).json({ error: 'Usuario o clave incorrectos.' }); }
  const actual = await verifyPassword(password || '', user.password);
  if (!actual.valid) { req.authRateLimit?.registrarFallo(); return res.status(401).json({ error: 'Usuario o clave incorrectos.' }); }
  req.authRateLimit?.registrarExito();
  if (actual.legacy) user.password = await hashPassword(password);
  user.lastLoginAt = new Date().toISOString(); await save();
  await auditoria.registrar({ actorId: user.id, actorType: 'user', action: 'inicio_sesion', resource: 'sesion' });
  const sessionToken = await createSession({ type: 'user', userId: user.id });
  setSessionCookie(res, sessionToken); res.json(usuarios.publicUser(user));
}

async function logout(req, res) {
  const match = (req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  const session = req.session || await readSession(req);
  if (match) await destroySession(decodeURIComponent(match[1]));
  if (session?.userId) await auditoria.registrar({ actorId: session.userId, actorType: 'user', action: 'cerrar_sesion', resource: 'sesion' });
  else if (session?.type === 'admin') await auditoria.registrar({ actorId: 'admin', actorType: 'admin', action: 'cerrar_sesion', resource: 'sesion' });
  clearSessionCookie(res); res.json({ ok: true });
}

async function elegirRol(req, res) {
  const { role } = req.body || {};
  if (!['jefe', 'empleado'].includes(role)) return res.status(400).json({ error: 'Perfil inválido.' });
  const user = usuarios.buscarPorId(req.userId); if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  if (user.role) return res.status(400).json({ error: 'Ya tienes un perfil configurado.' });
  user.role = role; if (role === 'empleado') user.shareCode = newShareCode(db); user.modoActual = role;
  if (!user.codigoAmistad) user.codigoAmistad = newFriendCode(db); await save();
  await auditoria.registrar({ actorId: user.id, actorType: 'user', action: 'elegir_rol', resource: 'usuario', resourceId: user.id });
  res.json(usuarios.publicUser(user));
}

module.exports = { registrar, recuperar, configurarNombre, preferencias, cambiarModo, cambiarClave, obtenerNuevoCodigoRecuperacion, eliminarCuenta, eliminarDatosCuenta, login, logout, elegirRol }; 
