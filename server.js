/* ============================================================
   server.js — backend de Riverospay (prototipo / actualización)
   Express + Socket.IO. La info se guarda vía db.js (MongoDB
   Atlas si hay MONGODB_URI, si no data/db.json local).
   ============================================================ */

const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const { db, save, init } = require('./db');
const {
  hashPassword, newId, newShareCode,
  USERNAME_REGEX, PASSWORD_REGEX,
  hashRecoveryCode, newRecoveryCode
} = require('./utils');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server);

/* ---------- helpers ---------- */
function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    nombreCompleto: u.nombreCompleto || null,
    esEstudiante: u.esEstudiante === undefined ? null : u.esEstudiante,
    recibirNotificaciones: u.recibirNotificaciones === undefined ? null : u.recibirNotificaciones,
    shareCode: u.role === 'empleado' ? u.shareCode : undefined
  };
}

// crea una notificación de info (no confundir con las solicitudes de verificación)
async function crearNotificacion(empleadoId, tipo, extra) {
  const notif = { id: newId('not'), empleadoId, tipo, fecha: Date.now(), leida: false, ...extra };
  db.notificaciones.push(notif);
  await save();
  io.to('emp-' + empleadoId).emit('notificaciones:update');
  return notif;
}

function trabajoSnapshot(empleadoId) {
  const lugares = db.lugares.filter(l => l.empleadoId === empleadoId);
  const turnos = db.turnos.filter(t => t.empleadoId === empleadoId);
  return { lugares, turnos };
}

function broadcastTrabajo(empleadoId) {
  io.to('emp-' + empleadoId).emit('trabajo:update', trabajoSnapshot(empleadoId));
}

function broadcastEstudio(empleadoId) {
  const materias = db.materias.filter(m => m.empleadoId === empleadoId);
  const actividades = db.actividades.filter(a => a.empleadoId === empleadoId);
  io.to('emp-' + empleadoId).emit('estudio:update', { materias, actividades });
}

function broadcastEvento(empleadoId) {
  io.to('emp-' + empleadoId).emit('evento:update', db.eventos.filter(e => e.empleadoId === empleadoId));
}

// verifica que jefeId tenga un link aceptado con empleadoId
function tieneAcceso(jefeId, empleadoId) {
  return db.links.some(l => l.jefeId === jefeId && l.empleadoId === empleadoId);
}

/* ================= AUTH ================= */

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body || {};
  const uname = (username || '').trim();
  if (!USERNAME_REGEX.test(uname)) {
    return res.status(400).json({ error: 'El usuario debe tener entre 5 y 10 letras minúsculas, sin números ni símbolos.' });
  }
  if (!PASSWORD_REGEX.test(password || '')) {
    return res.status(400).json({ error: 'La contraseña debe tener entre 6 y 12 caracteres (letras y números).' });
  }
  if (db.users.some(u => u.username.toLowerCase() === uname.toLowerCase())) {
    return res.status(409).json({ error: 'Ese usuario ya existe.' });
  }
  const recoveryCode = newRecoveryCode();
  const user = {
    id: newId('u'), username: uname, password: hashPassword(password),
    role: null, shareCode: null, nombreCompleto: null,
    recoveryCodeHash: hashRecoveryCode(recoveryCode)
  };
  db.users.push(user);
  await save();
  // el código de recuperación en texto plano SOLO se devuelve esta vez; no se vuelve a guardar así
  res.json({ ...publicUser(user), recoveryCode });
});

// recuperar contraseña con el código de recuperación (no hay email/SMS configurado todavía)
app.post('/api/auth/recuperar', async (req, res) => {
  const { username, recoveryCode, newPassword } = req.body || {};
  const user = db.users.find(u => u.username.toLowerCase() === (username || '').trim().toLowerCase());
  if (!user || !user.recoveryCodeHash || hashRecoveryCode((recoveryCode || '').trim()) !== user.recoveryCodeHash) {
    return res.status(401).json({ error: 'Usuario o código de recuperación incorrectos.' });
  }
  if (!PASSWORD_REGEX.test(newPassword || '')) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener entre 6 y 12 caracteres (letras y números).' });
  }
  user.password = hashPassword(newPassword);
  await save();
  res.json({ ok: true });
});

// configurar "Nombre y Apellido" (opcional) — un único espacio entre las dos palabras
app.post('/api/auth/nombre', async (req, res) => {
  const { userId, nombreCompleto } = req.body || {};
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  const limpio = (nombreCompleto || '').trim().replace(/\s+/g, ' ');
  if (!/^[A-Za-zÀ-ÿÑñ]+ [A-Za-zÀ-ÿÑñ]+$/.test(limpio)) {
    return res.status(400).json({ error: 'Ingresa un nombre y un apellido separados por un solo espacio.' });
  }
  user.nombreCompleto = limpio;
  await save();
  res.json(publicUser(user));
});

// asistente de bienvenida: ¿eres estudiante? / ¿recibir notificaciones?
app.post('/api/auth/preferencias', async (req, res) => {
  const { userId, esEstudiante, recibirNotificaciones } = req.body || {};
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  if (typeof esEstudiante === 'boolean') user.esEstudiante = esEstudiante;
  if (typeof recibirNotificaciones === 'boolean') user.recibirNotificaciones = recibirNotificaciones;
  await save();
  res.json(publicUser(user));
});

// eliminar cuenta (pide contraseña para confirmar) — borra en cascada todo lo que le pertenece
app.post('/api/auth/eliminar-cuenta', async (req, res) => {
  const { userId, password } = req.body || {};
  const user = db.users.find(u => u.id === userId);
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
  db.users = db.users.filter(u => u.id !== userId);
  await save();
  res.json({ ok: true });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  const user = db.users.find(u => u.username.toLowerCase() === (username || '').trim().toLowerCase());
  if (!user || user.password !== hashPassword(password || '')) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  }
  res.json(publicUser(user));
});

app.post('/api/auth/role', async (req, res) => {
  const { userId, role } = req.body || {};
  if (!['jefe', 'empleado'].includes(role)) return res.status(400).json({ error: 'Perfil inválido.' });
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  if (user.role) return res.status(400).json({ error: 'Ya tienes un perfil configurado.' });
  user.role = role;
  if (role === 'empleado') user.shareCode = newShareCode(db);
  await save();
  res.json(publicUser(user));
});

/* ================= TRABAJO ================= */
// Nota: cualquiera con el empleadoId correcto puede añadir/editar turnos
// (así el EMPLEADO añade los suyos y el JEFE, una vez verificado, también
// puede añadir trabajos y es quien marca pagado/valor desde su vista).

app.get('/api/trabajo/:empleadoId', (req, res) => {
  res.json(trabajoSnapshot(req.params.empleadoId));
});

// jefes ya verificados (link aceptado) para un empleado — usado en "¿Añadir jefe?"
app.get('/api/mis-jefes/:empleadoId', (req, res) => {
  const lista = db.links
    .filter(l => l.empleadoId === req.params.empleadoId)
    .map(l => ({ jefeId: l.jefeId, jefeUsername: l.jefeUsername }));
  res.json(lista);
});

app.post('/api/trabajo/:empleadoId/turnos', async (req, res) => {
  const empleadoId = req.params.empleadoId;
  const { lugar, dia, horaInicio, horaFin, descripcion, jefeAsignadoId, actorJefeId, actorJefeUsername } = req.body || {};
  const nombreLugar = (lugar || '').trim();
  if (!nombreLugar || !dia || !horaInicio || !horaFin) {
    return res.status(400).json({ error: 'Faltan datos del trabajo (lugar, día u hora).' });
  }
  let lug = db.lugares.find(l => l.empleadoId === empleadoId && l.nombre.toLowerCase() === nombreLugar.toLowerCase());
  if (!lug) {
    lug = { id: newId('lug'), empleadoId, nombre: nombreLugar };
    db.lugares.push(lug);
  }
  // si lo añade el JEFE, el trabajo queda asignado automáticamente a ese jefe;
  // si lo añade el EMPLEADO, respeta lo que haya elegido en "¿Añadir jefe?"
  const asignado = actorJefeId ? actorJefeId : (jefeAsignadoId || null);
  const turno = {
    id: newId('trn'), empleadoId, lugarId: lug.id,
    dia, horaInicio, horaFin,
    descripcion: (descripcion || '').trim(),
    pagado: false, valor: null,
    jefeAsignadoId: asignado, eliminacionPendiente: false
  };
  db.turnos.push(turno);
  await save();
  broadcastTrabajo(empleadoId);
  if (actorJefeId && actorJefeId !== empleadoId) {
    await crearNotificacion(empleadoId, 'trabajo_añadido', { jefeUsername: actorJefeUsername || 'Tu jefe', lugar: lug.nombre });
  }
  res.json({ lugar: lug, turno });
});

app.patch('/api/trabajo/turnos/:turnoId', async (req, res) => {
  const turno = db.turnos.find(t => t.id === req.params.turnoId);
  if (!turno) return res.status(404).json({ error: 'Trabajo no encontrado.' });
  const yaEstabaPagado = turno.pagado;
  if (typeof req.body.pagado === 'boolean') turno.pagado = req.body.pagado;
  if (req.body.valor !== undefined) turno.valor = req.body.valor;
  if (req.body.jefeAsignadoId !== undefined) turno.jefeAsignadoId = req.body.jefeAsignadoId || null;
  await save();
  broadcastTrabajo(turno.empleadoId);
  if (turno.pagado && !yaEstabaPagado && req.body.actorJefeUsername) {
    const lug = db.lugares.find(l => l.id === turno.lugarId);
    await crearNotificacion(turno.empleadoId, 'trabajo_pagado', { jefeUsername: req.body.actorJefeUsername, lugar: lug ? lug.nombre : '' });
  }
  res.json(turno);
});

// Borrar un trabajo:
//  - JEFE: siempre puede borrarlo directo (esté pagado o no).
//  - EMPLEADO: si está PAGADO, o si el trabajo no tiene jefe asignado, lo borra directo.
//              si NO está pagado y sí tiene jefe asignado, queda pendiente hasta que el jefe lo confirme.
app.delete('/api/trabajo/turnos/:turnoId', async (req, res) => {
  const turno = db.turnos.find(t => t.id === req.params.turnoId);
  if (!turno) return res.status(404).json({ error: 'Trabajo no encontrado.' });
  const { actorRole, jefeId } = req.body || {};
  const lug = db.lugares.find(l => l.id === turno.lugarId);

  if (actorRole === 'jefe') {
    if (!tieneAcceso(jefeId, turno.empleadoId)) return res.status(403).json({ error: 'No tienes acceso verificado a este empleado.' });
    db.turnos = db.turnos.filter(t => t.id !== turno.id);
    await save();
    broadcastTrabajo(turno.empleadoId);
    await crearNotificacion(turno.empleadoId, 'trabajo_eliminado', { jefeUsername: req.body.actorJefeUsername || 'Tu jefe', lugar: lug ? lug.nombre : '' });
    return res.json({ eliminado: true });
  }

  // actorRole === 'empleado'
  if (turno.pagado || !turno.jefeAsignadoId) {
    db.turnos = db.turnos.filter(t => t.id !== turno.id);
    await save();
    broadcastTrabajo(turno.empleadoId);
    return res.json({ eliminado: true });
  }
  turno.eliminacionPendiente = true;
  await save();
  broadcastTrabajo(turno.empleadoId);
  res.json({ eliminado: false, pendiente: true });
});

app.post('/api/trabajo/turnos/:turnoId/confirmar-eliminacion', async (req, res) => {
  const turno = db.turnos.find(t => t.id === req.params.turnoId);
  if (!turno) return res.status(404).json({ error: 'Trabajo no encontrado.' });
  const { jefeId } = req.body || {};
  if (!tieneAcceso(jefeId, turno.empleadoId)) return res.status(403).json({ error: 'No tienes acceso verificado a este empleado.' });
  const lug = db.lugares.find(l => l.id === turno.lugarId);
  db.turnos = db.turnos.filter(t => t.id !== turno.id);
  await save();
  broadcastTrabajo(turno.empleadoId);
  await crearNotificacion(turno.empleadoId, 'trabajo_eliminado', { jefeUsername: req.body.jefeUsername || 'Tu jefe', lugar: lug ? lug.nombre : '' });
  res.json({ eliminado: true });
});

app.post('/api/trabajo/turnos/:turnoId/rechazar-eliminacion', async (req, res) => {
  const turno = db.turnos.find(t => t.id === req.params.turnoId);
  if (!turno) return res.status(404).json({ error: 'Trabajo no encontrado.' });
  const { jefeId } = req.body || {};
  if (!tieneAcceso(jefeId, turno.empleadoId)) return res.status(403).json({ error: 'No tienes acceso verificado a este empleado.' });
  turno.eliminacionPendiente = false;
  await save();
  broadcastTrabajo(turno.empleadoId);
  await crearNotificacion(turno.empleadoId, 'trabajo_eliminacion_rechazada', { jefeUsername: req.body.jefeUsername || 'Tu jefe' });
  res.json({ eliminado: false });
});

/* ================= ESTUDIO (horario) ================= */

app.get('/api/estudio/:empleadoId', (req, res) => {
  res.json(db.materias.filter(m => m.empleadoId === req.params.empleadoId));
});

app.post('/api/estudio/:empleadoId', async (req, res) => {
  const empleadoId = req.params.empleadoId;
  const { dia, nombre, horaInicio, horaFin } = req.body || {};
  if (!dia || !nombre || !nombre.trim() || !horaInicio || !horaFin) {
    return res.status(400).json({ error: 'Faltan datos de la materia.' });
  }
  const materia = { id: newId('mat'), empleadoId, dia, nombre: nombre.trim(), horaInicio, horaFin };
  db.materias.push(materia);
  await save();
  broadcastEstudio(empleadoId);
  res.json(materia);
});

/* ---- actividades pendientes (dentro de Estudio) ---- */
app.get('/api/estudio/:empleadoId/actividades', (req, res) => {
  res.json(db.actividades.filter(a => a.empleadoId === req.params.empleadoId));
});

app.post('/api/estudio/:empleadoId/actividades', async (req, res) => {
  const empleadoId = req.params.empleadoId;
  const { nombre, dia, nota } = req.body || {};
  if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'La actividad necesita un nombre.' });
  const actividad = {
    id: newId('act'), empleadoId,
    nombre: nombre.trim(), dia: dia || '', nota: (nota || '').trim(), hecha: false
  };
  db.actividades.push(actividad);
  await save();
  broadcastEstudio(empleadoId);
  res.json(actividad);
});

app.patch('/api/estudio/actividades/:actividadId', async (req, res) => {
  const actividad = db.actividades.find(a => a.id === req.params.actividadId);
  if (!actividad) return res.status(404).json({ error: 'Actividad no encontrada.' });
  if (typeof req.body.hecha === 'boolean') actividad.hecha = req.body.hecha;
  await save();
  broadcastEstudio(actividad.empleadoId);
  res.json(actividad);
});

app.delete('/api/estudio/actividades/:actividadId', async (req, res) => {
  const idx = db.actividades.findIndex(a => a.id === req.params.actividadId);
  if (idx === -1) return res.status(404).json({ error: 'Actividad no encontrada.' });
  const empleadoId = db.actividades[idx].empleadoId;
  db.actividades.splice(idx, 1);
  await save();
  broadcastEstudio(empleadoId);
  res.json({ ok: true });
});

/* ================= EVENTO ================= */

app.get('/api/evento/:empleadoId', (req, res) => {
  res.json(db.eventos.filter(e => e.empleadoId === req.params.empleadoId));
});

app.post('/api/evento/:empleadoId', async (req, res) => {
  const empleadoId = req.params.empleadoId;
  const { lugar, dia, hora, gastoMonto, gastoDescripcion, descripcion } = req.body || {};
  if (!lugar || !lugar.trim() || !dia || !hora) {
    return res.status(400).json({ error: 'Faltan datos del evento.' });
  }
  const evento = {
    id: newId('evt'), empleadoId,
    lugar: lugar.trim(), dia, hora,
    gastoMonto: (gastoMonto === undefined || gastoMonto === '') ? null : Number(gastoMonto),
    gastoDescripcion: (gastoDescripcion || '').trim(),
    descripcion: (descripcion || '').trim()
  };
  db.eventos.push(evento);
  await save();
  broadcastEvento(empleadoId);
  res.json(evento);
});

/* ================= COMPARTIR / VERIFICAR ================= */

app.get('/api/share/:empleadoId', (req, res) => {
  const user = db.users.find(u => u.id === req.params.empleadoId);
  if (!user || user.role !== 'empleado') return res.status(404).json({ error: 'No disponible.' });
  res.json({ code: user.shareCode });
});

app.post('/api/verificar', async (req, res) => {
  const { jefeId, jefeUsername, code } = req.body || {};
  const empleado = db.users.find(u => u.role === 'empleado' && u.shareCode === String(code || '').trim());
  if (!empleado) return res.status(404).json({ error: 'Código no encontrado.' });
  if (empleado.id === jefeId) return res.status(400).json({ error: 'No puedes verificarte a ti mismo.' });

  const solicitud = { id: newId('req'), jefeId, jefeUsername, empleadoId: empleado.id, estado: 'pendiente', fecha: Date.now() };
  db.joinRequests.push(solicitud);
  await save();

  io.to('emp-' + empleado.id).emit('join:request', solicitud);
  res.json({ ok: true, solicitudId: solicitud.id });
});

// panel de Notificaciones: solicitudes de verificación (sin las ya aceptadas,
// esas se reemplazan por la notificación "jefe configurado") + notificaciones de info
app.get('/api/notificaciones/:empleadoId', (req, res) => {
  const empleadoId = req.params.empleadoId;
  const solicitudes = db.joinRequests
    .filter(r => r.empleadoId === empleadoId && r.estado !== 'aceptado')
    .map(r => ({ id: r.id, tipo: 'solicitud', estado: r.estado, jefeUsername: r.jefeUsername, fecha: r.fecha, leida: true }));
  const infos = db.notificaciones.filter(n => n.empleadoId === empleadoId);
  const lista = [...solicitudes, ...infos].sort((a, b) => b.fecha - a.fecha);
  res.json(lista);
});

// marca como leídas todas las notificaciones de info (las solicitudes pendientes se marcan al aceptar/rechazar)
app.post('/api/notificaciones/:empleadoId/marcar-leidas', async (req, res) => {
  db.notificaciones.filter(n => n.empleadoId === req.params.empleadoId).forEach(n => { n.leida = true; });
  await save();
  res.json({ ok: true });
});

// respaldo: solo las pendientes (usado al recuperar sesión)
app.get('/api/join-requests/:empleadoId', (req, res) => {
  res.json(db.joinRequests.filter(r => r.empleadoId === req.params.empleadoId && r.estado === 'pendiente'));
});

app.post('/api/join-requests/:id/responder', async (req, res) => {
  const solicitud = db.joinRequests.find(r => r.id === req.params.id);
  if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada.' });
  const { accion } = req.body || {};
  solicitud.estado = accion === 'aceptar' ? 'aceptado' : 'rechazado';

  let link = null;
  if (solicitud.estado === 'aceptado') {
    const empleado = db.users.find(u => u.id === solicitud.empleadoId);
    link = db.links.find(l => l.jefeId === solicitud.jefeId && l.empleadoId === solicitud.empleadoId);
    if (!link) {
      link = {
        id: newId('lnk'), jefeId: solicitud.jefeId, jefeUsername: solicitud.jefeUsername,
        empleadoId: solicitud.empleadoId, empleadoUsername: empleado.username, fecha: Date.now()
      };
      db.links.push(link);
    } else {
      link.fecha = Date.now();
    }
  }
  await save();
  io.to('jefe-' + solicitud.jefeId).emit('join:result', { solicitud, link });
  if (solicitud.estado === 'aceptado') {
    await crearNotificacion(solicitud.empleadoId, 'jefe_configurado', { jefeUsername: solicitud.jefeUsername });
  } else {
    io.to('emp-' + solicitud.empleadoId).emit('notificaciones:update');
  }
  res.json({ solicitud, link });
});

app.get('/api/historial/:jefeId', (req, res) => {
  const links = db.links.filter(l => l.jefeId === req.params.jefeId).sort((a, b) => b.fecha - a.fecha);
  res.json(links);
});

app.get('/api/verificar/datos/:empleadoId', (req, res) => {
  const jefeId = req.query.jefeId;
  if (!tieneAcceso(jefeId, req.params.empleadoId)) return res.status(403).json({ error: 'No tienes acceso verificado a este empleado.' });
  const empleado = db.users.find(u => u.id === req.params.empleadoId);
  const link = db.links.find(l => l.jefeId === jefeId && l.empleadoId === req.params.empleadoId);
  res.json({
    empleadoUsername: empleado ? empleado.username : (link && link.empleadoUsername),
    esEstudiante: empleado ? (empleado.esEstudiante === undefined ? null : empleado.esEstudiante) : null,
    ...trabajoSnapshot(req.params.empleadoId)
  });
});

// el jefe, ya verificado, también puede consultar estudio y evento del empleado
app.get('/api/verificar/estudio/:empleadoId', (req, res) => {
  const jefeId = req.query.jefeId;
  if (!tieneAcceso(jefeId, req.params.empleadoId)) return res.status(403).json({ error: 'No tienes acceso verificado a este empleado.' });
  res.json({
    materias: db.materias.filter(m => m.empleadoId === req.params.empleadoId),
    actividades: db.actividades.filter(a => a.empleadoId === req.params.empleadoId)
  });
});

app.get('/api/verificar/evento/:empleadoId', (req, res) => {
  const jefeId = req.query.jefeId;
  if (!tieneAcceso(jefeId, req.params.empleadoId)) return res.status(403).json({ error: 'No tienes acceso verificado a este empleado.' });
  res.json(db.eventos.filter(e => e.empleadoId === req.params.empleadoId));
});

/* ================= SOCKET.IO (tiempo real) ================= */

io.on('connection', (socket) => {
  socket.on('register-empleado', ({ empleadoId }) => {
    if (empleadoId) socket.join('emp-' + empleadoId);
  });
  socket.on('register-jefe', ({ jefeId }) => {
    if (jefeId) socket.join('jefe-' + jefeId);
  });
  socket.on('jefe-ver-empleado', ({ jefeId, empleadoId }) => {
    if (tieneAcceso(jefeId, empleadoId)) socket.join('emp-' + empleadoId);
  });
});

/* ================= START ================= */

(async () => {
  await init();
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log('Riverospay backend escuchando en el puerto ' + PORT));
})();
