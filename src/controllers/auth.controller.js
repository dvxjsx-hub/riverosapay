const { db, save } = require('../config/db');
const usuarios = require('../models/usuarios.model');
const {
  hashPassword, newId, newShareCode,
  USERNAME_REGEX, PASSWORD_REGEX,
  hashRecoveryCode, newRecoveryCode
} = require('../utils/utils');

async function registrar(req, res) {
  const { username, password } = req.body || {};
  const uname = (username || '').trim();
  if (!USERNAME_REGEX.test(uname)) {
    return res.status(400).json({ error: 'El usuario debe tener entre 5 y 10 letras minúsculas, sin números ni símbolos.' });
  }
  if (!PASSWORD_REGEX.test(password || '')) {
    return res.status(400).json({ error: 'La contraseña debe tener entre 6 y 12 caracteres (letras y números).' });
  }
  if (usuarios.existeUsername(uname)) {
    return res.status(409).json({ error: 'Ese usuario ya existe.' });
  }
  const recoveryCode = newRecoveryCode();
  const user = {
    id: newId('u'), username: uname, password: hashPassword(password),
    role: null, shareCode: null, nombreCompleto: null,
    recoveryCodeHash: hashRecoveryCode(recoveryCode)
  };
  usuarios.crear(user);
  await save();
  // el código de recuperación en texto plano SOLO se devuelve esta vez; no se vuelve a guardar así
  res.json({ ...usuarios.publicUser(user), recoveryCode });
}

// recuperar contraseña con el código de recuperación (no hay email/SMS conectado todavía)
async function recuperar(req, res) {
  const { username, recoveryCode, newPassword } = req.body || {};
  const user = usuarios.buscarPorUsername(username);
  if (!user || !user.recoveryCodeHash || hashRecoveryCode((recoveryCode || '').trim()) !== user.recoveryCodeHash) {
    return res.status(401).json({ error: 'Usuario o código de recuperación incorrectos.' });
  }
  if (!PASSWORD_REGEX.test(newPassword || '')) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener entre 6 y 12 caracteres (letras y números).' });
  }
  user.password = hashPassword(newPassword);
  await save();
  res.json({ ok: true });
}

// configurar "Nombre y Apellido" (opcional) — un único espacio entre las dos palabras
async function configurarNombre(req, res) {
  const { userId, nombreCompleto } = req.body || {};
  const user = usuarios.buscarPorId(userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  const limpio = (nombreCompleto || '').trim().replace(/\s+/g, ' ');
  if (!/^[A-Za-zÀ-ÿÑñ]+ [A-Za-zÀ-ÿÑñ]+$/.test(limpio)) {
    return res.status(400).json({ error: 'Ingresa un nombre y un apellido separados por un solo espacio.' });
  }
  user.nombreCompleto = limpio;
  await save();
  res.json(usuarios.publicUser(user));
}

// asistente de bienvenida: ¿eres estudiante? / ¿recibir notificaciones?
async function preferencias(req, res) {
  const { userId, esEstudiante, recibirNotificaciones } = req.body || {};
  const user = usuarios.buscarPorId(userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  if (typeof esEstudiante === 'boolean') user.esEstudiante = esEstudiante;
  if (typeof recibirNotificaciones === 'boolean') user.recibirNotificaciones = recibirNotificaciones;
  await save();
  res.json(usuarios.publicUser(user));
}

// eliminar cuenta (pide contraseña para confirmar) — borra en cascada todo lo que le pertenece
async function eliminarCuenta(req, res) {
  const { userId, password } = req.body || {};
  const user = usuarios.buscarPorId(userId);
  if (!user || user.password !== hashPassword(password || '')) {
    return res.status(401).json({ error: 'Contraseña incorrecta.' });
  }

  if (user.role === 'empleado') {
    db.turnos = db.turnos.filter(t => t.empleadoId !== userId);
    db.lugares = db.lugares.filter(l => l.empleadoId !== userId);
    db.materias = db.materias.filter(m => m.empleadoId !== userId);
    db.actividades = db.actividades.filter(a => a.empleadoId !== userId);
    db.eventos = db.eventos.filter(e => e.empleadoId !== userId);
    db.notificaciones = db.notificaciones.filter(n => n.empleadoId !== userId);
    db.joinRequests = db.joinRequests.filter(r => r.empleadoId !== userId);
    db.links = db.links.filter(l => l.empleadoId !== userId);
  } else if (user.role === 'jefe') {
    db.joinRequests = db.joinRequests.filter(r => r.jefeId !== userId);
    db.links = db.links.filter(l => l.jefeId !== userId);
    // los trabajos que este jefe tenía asignados quedan sin jefe, no se borran los datos del empleado
    db.turnos.forEach(t => { if (t.jefeAsignadoId === userId) { t.jefeAsignadoId = null; t.eliminacionPendiente = false; } });
  }
  usuarios.eliminar(userId);
  await save();
  res.json({ ok: true });
}

async function login(req, res) {
  const { username, password } = req.body || {};
  const user = usuarios.buscarPorUsername(username);
  if (!user || user.password !== hashPassword(password || '')) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  }
  res.json(usuarios.publicUser(user));
}

async function elegirRol(req, res) {
  const { userId, role } = req.body || {};
  if (!['jefe', 'empleado'].includes(role)) return res.status(400).json({ error: 'Perfil inválido.' });
  const user = usuarios.buscarPorId(userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  if (user.role) return res.status(400).json({ error: 'Ya tienes un perfil configurado.' });
  user.role = role;
  if (role === 'empleado') user.shareCode = newShareCode(db);
  await save();
  res.json(usuarios.publicUser(user));
}

module.exports = { registrar, recuperar, configurarNombre, preferencias, eliminarCuenta, login, elegirRol };
