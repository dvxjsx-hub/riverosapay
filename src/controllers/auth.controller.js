const { db, save } = require('../config/db');
const usuarios = require('../models/usuarios.model');
const {
  hashPassword, newId, newShareCode, newFriendCode,
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
    // role/shareCode antiguos se conservan temporalmente para no romper datos existentes.
    role: 'empleado', shareCode: newShareCode(db), modoActual: 'empleado',
    codigoAmistad: newFriendCode(db),
    nombreCompleto: null,
    recoveryCodeHash: hashRecoveryCode(recoveryCode)
  };
  usuarios.crear(user);
  await save();
  res.json({ ...usuarios.publicUser(user), recoveryCode });
}

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

async function preferencias(req, res) {
  const { userId, esEstudiante, recibirNotificaciones } = req.body || {};
  const user = usuarios.buscarPorId(userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  if (typeof esEstudiante === 'boolean') user.esEstudiante = esEstudiante;
  if (typeof recibirNotificaciones === 'boolean') user.recibirNotificaciones = recibirNotificaciones;
  await save();
  res.json(usuarios.publicUser(user));
}

// Cambia el modo visual/operativo de la misma cuenta. La ID nunca cambia.
async function cambiarModo(req, res) {
  const { userId, modo } = req.body || {};
  if (!['empleado', 'jefe'].includes(modo)) {
    return res.status(400).json({ error: 'Modo inválido.' });
  }
  const user = usuarios.buscarPorId(userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  user.modoActual = modo;
  await save();
  res.json(usuarios.publicUser(user));
}

async function eliminarCuenta(req, res) {
  const { userId, password } = req.body || {};
  const user = usuarios.buscarPorId(userId);
  if (!user || user.password !== hashPassword(password || '')) {
    return res.status(401).json({ error: 'Contraseña incorrecta.' });
  }

  db.turnos = db.turnos.filter(t => t.empleadoId !== userId);
  db.lugares = db.lugares.filter(l => l.empleadoId !== userId);
  db.materias = db.materias.filter(m => m.empleadoId !== userId);
  db.actividades = db.actividades.filter(a => a.empleadoId !== userId);
  db.eventos = db.eventos.filter(e => e.empleadoId !== userId);
  db.notificaciones = db.notificaciones.filter(n => n.empleadoId !== userId);
  db.joinRequests = db.joinRequests.filter(r => r.empleadoId !== userId && r.jefeId !== userId);
  db.links = db.links.filter(l => l.empleadoId !== userId && l.jefeId !== userId);
  if (Array.isArray(db.amistades)) {
    db.amistades = db.amistades.filter(a => a.usuarioId !== userId && a.amistadId !== userId);
  }
  db.turnos.forEach(t => {
    if (t.jefeAsignadoId === userId) {
      t.jefeAsignadoId = null;
      t.eliminacionPendiente = false;
    }
  });

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

// Endpoint legado: se conserva durante la migración de cuentas antiguas.
async function elegirRol(req, res) {
  const { userId, role } = req.body || {};
  if (!['jefe', 'empleado'].includes(role)) return res.status(400).json({ error: 'Perfil inválido.' });
  const user = usuarios.buscarPorId(userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  if (user.role) return res.status(400).json({ error: 'Ya tienes un perfil configurado.' });
  user.role = role;
  if (role === 'empleado') user.shareCode = newShareCode(db);
  user.modoActual = role;
  if (!user.codigoAmistad) user.codigoAmistad = newFriendCode(db);
  await save();
  res.json(usuarios.publicUser(user));
}

module.exports = { registrar, recuperar, configurarNombre, preferencias, cambiarModo, eliminarCuenta, login, elegirRol };
