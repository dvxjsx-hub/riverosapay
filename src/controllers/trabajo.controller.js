const { save } = require('../config/db');
const trabajo = require('../models/trabajo.model');
const amistades = require('../models/amistades.model');
const verificacion = require('../models/verificacion.model');
const notificaciones = require('../models/notificaciones.model');
const usuarios = require('../models/usuarios.model');
const { newId } = require('../utils/utils');

function usuarioActual(req) { return req.userId || (req.session && req.session.userId) || null; }

async function obtenerSnapshot(req, res) {
  const actorId = usuarioActual(req);
  const empleadoId = req.params.empleadoId;
  if (actorId !== empleadoId && !verificacion.tieneAcceso(actorId, empleadoId) && !trabajo.tieneTrabajoAsignado(actorId, empleadoId)) return res.status(403).json({ error: 'No tienes acceso a estos trabajos.' });
  res.json(trabajo.snapshot(empleadoId));
}

async function obtenerMisJefes(req, res) {
  const actorId = usuarioActual(req);
  if (actorId !== req.params.empleadoId) return res.status(403).json({ error: 'No puedes consultar las amistades laborales de otra cuenta.' });
  res.json(trabajo.misJefes(actorId));
}

async function obtenerTrabajosComoJefe(req, res) {
  const actorId = usuarioActual(req);
  if (actorId !== req.params.jefeId) return res.status(403).json({ error: 'No puedes consultar los trabajos de otro BOSS.' });
  res.json(trabajo.empleadosConTrabajosAsignados(actorId));
}

async function crearTurno(req, res) {
  const actorId = usuarioActual(req);
  const empleadoId = req.params.empleadoId;
  const { lugar, fecha, dia, horaInicio, horaFin, descripcion, jefeAsignadoId, actorJefeId, actorJefeUsername } = req.body || {};
  const nombreLugar = (lugar || '').trim();
  if (!nombreLugar || !fecha || !horaInicio || !horaFin) return res.status(400).json({ error: 'Faltan datos del trabajo (lugar, fecha u hora).' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return res.status(400).json({ error: 'La fecha del trabajo no es válida.' });

  const creandoComoBoss = Boolean(actorJefeId);
  if (creandoComoBoss) {
    if (actorJefeId !== actorId || actorJefeId === empleadoId) return res.status(403).json({ error: 'La identidad del BOSS no coincide con la sesión.' });
  } else if (actorId !== empleadoId) {
    return res.status(403).json({ error: 'Solo el empleado puede crear un trabajo para su propia cuenta.' });
  }

  const asignado = creandoComoBoss ? actorId : (jefeAsignadoId || null);
  if (asignado && asignado !== empleadoId && !amistades.existe(empleadoId, asignado)) return res.status(400).json({ error: 'El BOSS seleccionado debe ser una de tus amistades.' });

  const lug = trabajo.buscarOCrearLugar(empleadoId, nombreLugar);
  const turno = { id: newId('trn'), empleadoId, lugarId: lug.id, fecha, dia: dia || '', horaInicio, horaFin, descripcion: (descripcion || '').trim(), pagado: false, valor: null, jefeAsignadoId: asignado, eliminacionPendiente: false };
  trabajo.crearTurno(turno);
  await save();
  trabajo.broadcast(empleadoId);

  if (asignado && asignado !== empleadoId && !creandoComoBoss) {
    const empleado = usuarios.buscarPorId(empleadoId);
    await notificaciones.crearParaUsuario(asignado, 'jefe_asignado_trabajo', { empleadoUsername: empleado ? empleado.username : '', empleadoNombre: empleado ? (empleado.nombreCompleto || empleado.username) : '', lugar: lug.nombre, fechaTrabajo: fecha });
  }
  if (creandoComoBoss) await notificaciones.crearParaUsuario(empleadoId, 'trabajo_añadido', { jefeUsername: actorJefeUsername || 'Tu BOSS', lugar: lug.nombre });
  res.json({ lugar: lug, turno });
}

async function actualizarTurno(req, res) {
  const turno = trabajo.buscarTurnoPorId(req.params.turnoId);
  if (!turno) return res.status(404).json({ error: 'Trabajo no encontrado.' });
  const actorId = usuarioActual(req);
  const anteriorJefe = turno.jefeAsignadoId || null;
  const yaEstabaPagado = turno.pagado;
  const modificaPago = req.body && (typeof req.body.pagado === 'boolean' || req.body.valor !== undefined);

  if (modificaPago) {
    if (!turno.jefeAsignadoId || actorId !== turno.jefeAsignadoId || actorId === turno.empleadoId) return res.status(403).json({ error: 'Solo el BOSS asignado puede modificar el pago de este trabajo.' });
  } else if (actorId !== turno.empleadoId) {
    return res.status(403).json({ error: 'Solo el empleado propietario puede modificar este trabajo.' });
  }

  if (typeof req.body.pagado === 'boolean') turno.pagado = req.body.pagado;
  if (req.body.valor !== undefined) {
    const valor = req.body.valor;
    if (valor !== null && (!Number.isFinite(Number(valor)) || Number(valor) < 0)) return res.status(400).json({ error: 'El valor del trabajo no es válido.' });
    turno.valor = valor === null ? null : Number(valor);
  }
  if (req.body.jefeAsignadoId !== undefined) {
    const nuevoJefe = req.body.jefeAsignadoId || null;
    if (nuevoJefe && nuevoJefe !== turno.empleadoId && !amistades.existe(turno.empleadoId, nuevoJefe)) return res.status(400).json({ error: 'El BOSS seleccionado debe ser una de las amistades del usuario.' });
    turno.jefeAsignadoId = nuevoJefe;
  }
  await save();
  trabajo.broadcast(turno.empleadoId);

  const lug = trabajo.buscarLugarPorId(turno.lugarId);
  if (turno.pagado && !yaEstabaPagado && req.body.actorJefeUsername) await notificaciones.crearParaUsuario(turno.empleadoId, 'trabajo_pagado', { jefeUsername: req.body.actorJefeUsername, lugar: lug ? lug.nombre : '' });
  if (req.body.jefeAsignadoId !== undefined && anteriorJefe !== turno.jefeAsignadoId && turno.jefeAsignadoId && turno.jefeAsignadoId !== turno.empleadoId) {
    const empleado = usuarios.buscarPorId(turno.empleadoId);
    await notificaciones.crearParaUsuario(turno.jefeAsignadoId, 'jefe_asignado_trabajo', { empleadoUsername: empleado ? empleado.username : '', empleadoNombre: empleado ? (empleado.nombreCompleto || empleado.username) : '', lugar: lug ? lug.nombre : '', fechaTrabajo: turno.fecha || '' });
  }
  res.json(turno);
}

async function eliminarTurno(req, res) {
  const turno = trabajo.buscarTurnoPorId(req.params.turnoId);
  if (!turno) return res.status(404).json({ error: 'Trabajo no encontrado.' });
  const actorId = usuarioActual(req);
  const lug = trabajo.buscarLugarPorId(turno.lugarId);

  if (actorId !== turno.empleadoId && !verificacion.tieneAcceso(actorId, turno.empleadoId) && !trabajo.tieneTrabajoAsignado(actorId, turno.empleadoId)) return res.status(403).json({ error: 'No tienes acceso a este trabajo.' });

  if (actorId !== turno.empleadoId) {
    trabajo.eliminarTurno(turno.id); await save(); trabajo.broadcast(turno.empleadoId);
    await notificaciones.crearParaUsuario(turno.empleadoId, 'trabajo_eliminado', { jefeUsername: req.body.actorJefeUsername || 'Tu BOSS', lugar: lug ? lug.nombre : '' });
    return res.json({ eliminado: true });
  }

  if (turno.pagado || !turno.jefeAsignadoId) { trabajo.eliminarTurno(turno.id); await save(); trabajo.broadcast(turno.empleadoId); return res.json({ eliminado: true }); }
  turno.eliminacionPendiente = true;
  await save();
  trabajo.broadcast(turno.empleadoId);
  await notificaciones.crearParaUsuario(turno.jefeAsignadoId, 'trabajo_eliminacion_solicitada', {
    empleadoUsername: (usuarios.buscarPorId(turno.empleadoId) || {}).username || '',
    empleadoNombre: ((usuarios.buscarPorId(turno.empleadoId) || {}).nombreCompleto || (usuarios.buscarPorId(turno.empleadoId) || {}).username || ''),
    lugar: lug ? lug.nombre : '',
    fechaTrabajo: turno.fecha || ''
  });
  res.json({ eliminado: false, pendiente: true });
}

async function confirmarEliminacion(req, res) {
  const turno = trabajo.buscarTurnoPorId(req.params.turnoId); if (!turno) return res.status(404).json({ error: 'Trabajo no encontrado.' });
  const actorId = usuarioActual(req);
  if (actorId === turno.empleadoId || (!verificacion.tieneAcceso(actorId, turno.empleadoId) && !trabajo.tieneTrabajoAsignado(actorId, turno.empleadoId))) return res.status(403).json({ error: 'Solo el BOSS autorizado puede confirmar esta eliminación.' });
  const lug = trabajo.buscarLugarPorId(turno.lugarId); trabajo.eliminarTurno(turno.id); await save(); trabajo.broadcast(turno.empleadoId);
  await notificaciones.crearParaUsuario(turno.empleadoId, 'trabajo_eliminado', { jefeUsername: req.body.jefeUsername || 'Tu BOSS', lugar: lug ? lug.nombre : '' }); res.json({ eliminado: true });
}

async function rechazarEliminacion(req, res) {
  const turno = trabajo.buscarTurnoPorId(req.params.turnoId); if (!turno) return res.status(404).json({ error: 'Trabajo no encontrado.' });
  const actorId = usuarioActual(req);
  if (actorId === turno.empleadoId || (!verificacion.tieneAcceso(actorId, turno.empleadoId) && !trabajo.tieneTrabajoAsignado(actorId, turno.empleadoId))) return res.status(403).json({ error: 'Solo el BOSS autorizado puede rechazar esta eliminación.' });
  turno.eliminacionPendiente = false; await save(); trabajo.broadcast(turno.empleadoId); await notificaciones.crearParaUsuario(turno.empleadoId, 'trabajo_eliminacion_rechazada', { jefeUsername: req.body.jefeUsername || 'Tu BOSS' }); res.json({ eliminado: false });
}

module.exports = { obtenerSnapshot, obtenerMisJefes, obtenerTrabajosComoJefe, crearTurno, actualizarTurno, eliminarTurno, confirmarEliminacion, rechazarEliminacion };