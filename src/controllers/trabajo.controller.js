const { save } = require('../config/db');
const trabajo = require('../models/trabajo.model');
const verificacion = require('../models/verificacion.model');
const notificaciones = require('../models/notificaciones.model');
const { newId } = require('../utils/utils');

// Nota: cualquiera con el empleadoId correcto puede añadir/editar turnos
// (así el EMPLEADO añade los suyos y el JEFE, una vez verificado, también
// puede añadir trabajos y es quien marca pagado/valor desde su vista).

async function obtenerSnapshot(req, res) {
  res.json(trabajo.snapshot(req.params.empleadoId));
}

// jefes ya verificados (link aceptado) para un empleado — usado en "¿Añadir jefe?"
async function obtenerMisJefes(req, res) {
  res.json(trabajo.misJefes(req.params.empleadoId));
}

async function crearTurno(req, res) {
  const empleadoId = req.params.empleadoId;
  const { lugar, dia, horaInicio, horaFin, descripcion, jefeAsignadoId, actorJefeId, actorJefeUsername } = req.body || {};
  const nombreLugar = (lugar || '').trim();
  if (!nombreLugar || !dia || !horaInicio || !horaFin) {
    return res.status(400).json({ error: 'Faltan datos del trabajo (lugar, día u hora).' });
  }
  const lug = trabajo.buscarOCrearLugar(empleadoId, nombreLugar);
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
  trabajo.crearTurno(turno);
  await save();
  trabajo.broadcast(empleadoId);
  if (actorJefeId && actorJefeId !== empleadoId) {
    await notificaciones.crear(empleadoId, 'trabajo_añadido', { jefeUsername: actorJefeUsername || 'Tu jefe', lugar: lug.nombre });
  }
  res.json({ lugar: lug, turno });
}

async function actualizarTurno(req, res) {
  const turno = trabajo.buscarTurnoPorId(req.params.turnoId);
  if (!turno) return res.status(404).json({ error: 'Trabajo no encontrado.' });
  const yaEstabaPagado = turno.pagado;
  if (typeof req.body.pagado === 'boolean') turno.pagado = req.body.pagado;
  if (req.body.valor !== undefined) turno.valor = req.body.valor;
  if (req.body.jefeAsignadoId !== undefined) turno.jefeAsignadoId = req.body.jefeAsignadoId || null;
  await save();
  trabajo.broadcast(turno.empleadoId);
  if (turno.pagado && !yaEstabaPagado && req.body.actorJefeUsername) {
    const lug = trabajo.buscarLugarPorId(turno.lugarId);
    await notificaciones.crear(turno.empleadoId, 'trabajo_pagado', { jefeUsername: req.body.actorJefeUsername, lugar: lug ? lug.nombre : '' });
  }
  res.json(turno);
}

// Borrar un trabajo:
//  - JEFE: siempre puede borrarlo directo (esté pagado o no).
//  - EMPLEADO: si está PAGADO, o si el trabajo no tiene jefe asignado, lo borra directo.
//              si NO está pagado y sí tiene jefe asignado, queda pendiente hasta que el jefe lo confirme.
async function eliminarTurno(req, res) {
  const turno = trabajo.buscarTurnoPorId(req.params.turnoId);
  if (!turno) return res.status(404).json({ error: 'Trabajo no encontrado.' });
  const { actorRole, jefeId } = req.body || {};
  const lug = trabajo.buscarLugarPorId(turno.lugarId);

  if (actorRole === 'jefe') {
    if (!verificacion.tieneAcceso(jefeId, turno.empleadoId)) return res.status(403).json({ error: 'No tienes acceso verificado a este empleado.' });
    trabajo.eliminarTurno(turno.id);
    await save();
    trabajo.broadcast(turno.empleadoId);
    await notificaciones.crear(turno.empleadoId, 'trabajo_eliminado', { jefeUsername: req.body.actorJefeUsername || 'Tu jefe', lugar: lug ? lug.nombre : '' });
    return res.json({ eliminado: true });
  }

  // actorRole === 'empleado'
  if (turno.pagado || !turno.jefeAsignadoId) {
    trabajo.eliminarTurno(turno.id);
    await save();
    trabajo.broadcast(turno.empleadoId);
    return res.json({ eliminado: true });
  }
  turno.eliminacionPendiente = true;
  await save();
  trabajo.broadcast(turno.empleadoId);
  res.json({ eliminado: false, pendiente: true });
}

async function confirmarEliminacion(req, res) {
  const turno = trabajo.buscarTurnoPorId(req.params.turnoId);
  if (!turno) return res.status(404).json({ error: 'Trabajo no encontrado.' });
  const { jefeId } = req.body || {};
  if (!verificacion.tieneAcceso(jefeId, turno.empleadoId)) return res.status(403).json({ error: 'No tienes acceso verificado a este empleado.' });
  const lug = trabajo.buscarLugarPorId(turno.lugarId);
  trabajo.eliminarTurno(turno.id);
  await save();
  trabajo.broadcast(turno.empleadoId);
  await notificaciones.crear(turno.empleadoId, 'trabajo_eliminado', { jefeUsername: req.body.jefeUsername || 'Tu jefe', lugar: lug ? lug.nombre : '' });
  res.json({ eliminado: true });
}

async function rechazarEliminacion(req, res) {
  const turno = trabajo.buscarTurnoPorId(req.params.turnoId);
  if (!turno) return res.status(404).json({ error: 'Trabajo no encontrado.' });
  const { jefeId } = req.body || {};
  if (!verificacion.tieneAcceso(jefeId, turno.empleadoId)) return res.status(403).json({ error: 'No tienes acceso verificado a este empleado.' });
  turno.eliminacionPendiente = false;
  await save();
  trabajo.broadcast(turno.empleadoId);
  await notificaciones.crear(turno.empleadoId, 'trabajo_eliminacion_rechazada', { jefeUsername: req.body.jefeUsername || 'Tu jefe' });
  res.json({ eliminado: false });
}

module.exports = {
  obtenerSnapshot, obtenerMisJefes,
  crearTurno, actualizarTurno, eliminarTurno,
  confirmarEliminacion, rechazarEliminacion
};
