const { save } = require('../config/db');
const trabajo = require('../models/trabajo.model');
const amistades = require('../models/amistades.model');
const verificacion = require('../models/verificacion.model');
const notificaciones = require('../models/notificaciones.model');
const usuarios = require('../models/usuarios.model');
const { newId } = require('../utils/utils');

async function obtenerSnapshot(req, res) { res.json(trabajo.snapshot(req.params.empleadoId)); }
async function obtenerMisJefes(req, res) { res.json(trabajo.misJefes(req.params.empleadoId)); }
async function obtenerTrabajosComoJefe(req, res) { res.json(trabajo.empleadosConTrabajosAsignados(req.params.jefeId)); }

async function crearTurno(req, res) {
  const empleadoId = req.params.empleadoId;
  const { lugar, fecha, dia, horaInicio, horaFin, descripcion, jefeAsignadoId, actorJefeId, actorJefeUsername } = req.body || {};
  const nombreLugar = (lugar || '').trim();
  if (!nombreLugar || !fecha || !horaInicio || !horaFin) return res.status(400).json({ error: 'Faltan datos del trabajo (lugar, fecha u hora).' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return res.status(400).json({ error: 'La fecha del trabajo no es válida.' });

  const asignado = actorJefeId ? actorJefeId : (jefeAsignadoId || null);
  if (asignado && asignado !== empleadoId && !amistades.existe(empleadoId, asignado)) return res.status(400).json({ error: 'El BOSS seleccionado debe ser una de tus amistades.' });

  const lug = trabajo.buscarOCrearLugar(empleadoId, nombreLugar);
  const turno = { id: newId('trn'), empleadoId, lugarId: lug.id, fecha, dia: dia || '', horaInicio, horaFin, descripcion: (descripcion || '').trim(), pagado: false, valor: null, jefeAsignadoId: asignado, eliminacionPendiente: false };
  trabajo.crearTurno(turno);
  await save();
  trabajo.broadcast(empleadoId);

  if (asignado && asignado !== empleadoId && !actorJefeId) {
    const empleado = usuarios.buscarPorId(empleadoId);
    await notificaciones.crearParaUsuario(asignado, 'jefe_asignado_trabajo', { empleadoUsername: empleado ? empleado.username : '', empleadoNombre: empleado ? (empleado.nombreCompleto || empleado.username) : '', lugar: lug.nombre, fechaTrabajo: fecha });
  }
  if (actorJefeId && actorJefeId !== empleadoId) await notificaciones.crearParaUsuario(empleadoId, 'trabajo_añadido', { jefeUsername: actorJefeUsername || 'Tu BOSS', lugar: lug.nombre });
  res.json({ lugar: lug, turno });
}

async function actualizarTurno(req, res) {
  const turno = trabajo.buscarTurnoPorId(req.params.turnoId);
  if (!turno) return res.status(404).json({ error: 'Trabajo no encontrado.' });
  const anteriorJefe = turno.jefeAsignadoId || null;
  const yaEstabaPagado = turno.pagado;

  const modificaPago = req.body && (typeof req.body.pagado === 'boolean' || req.body.valor !== undefined);
  if (modificaPago) {
    const actorJefeId = req.body.actorJefeId;
    if (!actorJefeId || actorJefeId !== turno.jefeAsignadoId || actorJefeId === turno.empleadoId) {
      return res.status(403).json({ error: 'Solo el BOSS asignado puede modificar el pago de este trabajo.' });
    }
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
  const { actorRole, jefeId } = req.body || {};
  const lug = trabajo.buscarLugarPorId(turno.lugarId);
  if (actorRole === 'jefe') {
    if (!verificacion.tieneAcceso(jefeId, turno.empleadoId) && !trabajo.tieneTrabajoAsignado(jefeId, turno.empleadoId)) return res.status(403).json({ error: 'No tienes acceso a este trabajo.' });
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
  const { jefeId } = req.body || {};
  if (!verificacion.tieneAcceso(jefeId, turno.empleadoId) && !trabajo.tieneTrabajoAsignado(jefeId, turno.empleadoId)) return res.status(403).json({ error: 'No tienes acceso a este trabajo.' });
  const lug = trabajo.buscarLugarPorId(turno.lugarId); trabajo.eliminarTurno(turno.id); await save(); trabajo.broadcast(turno.empleadoId);
  await notificaciones.crearParaUsuario(turno.empleadoId, 'trabajo_eliminado', { jefeUsername: req.body.jefeUsername || 'Tu BOSS', lugar: lug ? lug.nombre : '' }); res.json({ eliminado: true });
}

async function rechazarEliminacion(req, res) {
  const turno = trabajo.buscarTurnoPorId(req.params.turnoId); if (!turno) return res.status(404).json({ error: 'Trabajo no encontrado.' });
  const { jefeId } = req.body || {};
  if (!verificacion.tieneAcceso(jefeId, turno.empleadoId) && !trabajo.tieneTrabajoAsignado(jefeId, turno.empleadoId)) return res.status(403).json({ error: 'No tienes acceso a este trabajo.' });
  turno.eliminacionPendiente = false; await save(); trabajo.broadcast(turno.empleadoId); await notificaciones.crearParaUsuario(turno.empleadoId, 'trabajo_eliminacion_rechazada', { jefeUsername: req.body.jefeUsername || 'Tu BOSS' }); res.json({ eliminado: false });
}

module.exports = { obtenerSnapshot, obtenerMisJefes, obtenerTrabajosComoJefe, crearTurno, actualizarTurno, eliminarTurno, confirmarEliminacion, rechazarEliminacion };