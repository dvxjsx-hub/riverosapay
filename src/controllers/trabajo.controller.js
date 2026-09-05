const { db, save } = require('../config/db');
const trabajo = require('../models/trabajo.model');
const amistades = require('../models/amistades.model');
const trabajoSolicitudes = require('../models/trabajoSolicitudes.model');
const verificacion = require('../models/verificacion.model');
const notificaciones = require('../models/notificaciones.model');
const usuarios = require('../models/usuarios.model');
const auditoria = require('../models/auditoria.model');
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
  const { lugar, fecha, dia, horaInicio, horaFin, descripcion, jefeAsignadoId, actorJefeId, actorJefeUsername, puedeVerAgendaJefe } = req.body || {};
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
  const permisoAgenda = Boolean(!creandoComoBoss && asignado && puedeVerAgendaJefe === true);

  const lug = trabajo.buscarOCrearLugar(empleadoId, nombreLugar);
  const turno = { id: newId('trn'), empleadoId, lugarId: lug.id, fecha, dia: dia || '', horaInicio, horaFin, descripcion: (descripcion || '').trim(), pagado: false, valor: null, jefeAsignadoId: asignado, puedeVerAgendaJefe: permisoAgenda, eliminacionPendiente: false, finalizado: false, finalizadoAt: null };
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

async function crearSolicitudTrabajo(req, res) {
  const jefeId = usuarioActual(req);
  if (jefeId !== req.params.jefeId) return res.status(403).json({ error: 'La identidad del BOSS no coincide con la sesión.' });
  const jefe = usuarios.buscarPorId(jefeId);
  if (!jefe || (jefe.modoActual || jefe.role) !== 'jefe') return res.status(403).json({ error: 'Esta acción solo está disponible en modo BOSS.' });

  const empleadoId = String((req.body && req.body.empleadoId) || '').trim();
  const nombreLugar = String((req.body && req.body.lugar) || '').trim();
  const fecha = String((req.body && req.body.fecha) || '').trim();
  const horaInicio = String((req.body && req.body.horaInicio) || '').trim();
  const horaFin = String((req.body && req.body.horaFin) || '').trim();
  const dia = String((req.body && req.body.dia) || '').trim();
  const descripcion = String((req.body && req.body.descripcion) || '').trim();

  if (!empleadoId || !nombreLugar || !fecha || !horaInicio || !horaFin) return res.status(400).json({ error: 'Faltan datos del trabajo (amistad, lugar, fecha u hora).' });
  if (empleadoId === jefeId) return res.status(400).json({ error: 'No puedes enviarte un trabajo a ti mismo.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return res.status(400).json({ error: 'La fecha del trabajo no es válida.' });
  if (!amistades.existe(jefeId, empleadoId)) return res.status(403).json({ error: 'Solo puedes enviar trabajos a una de tus amistades.' });
  const empleado = usuarios.buscarPorId(empleadoId);
  if (!empleado) return res.status(404).json({ error: 'La amistad seleccionada ya no existe.' });

  const solicitud = trabajoSolicitudes.crear({
    id: newId('tsol'), jefeId, jefeUsername: jefe.username, jefeNombre: jefe.nombreCompleto || jefe.username,
    empleadoId, empleadoUsername: empleado.username, lugar: nombreLugar, fecha,
    dia: dia || new Intl.DateTimeFormat('es-CO', { weekday: 'long' }).format(new Date(`${fecha}T12:00:00`)),
    horaInicio, horaFin, descripcion
  });
  await save();
  await auditoria.registrar({ actorId: jefeId, actorType: 'user', action: 'enviar_solicitud_trabajo', resource: 'trabajo_solicitud', resourceId: solicitud.id });
  await notificaciones.crearParaUsuario(empleadoId, 'trabajo_solicitud', {
    modoDestino: 'empleado', trabajoSolicitudId: solicitud.id,
    jefeId, jefeUsername: jefe.username, jefeNombre: jefe.nombreCompleto || jefe.username,
    lugar: nombreLugar, fechaTrabajo: solicitud.fecha, dia: solicitud.dia,
    horaInicio, horaFin, descripcion
  });
  res.json({ ok: true, solicitud });
}

async function responderSolicitudTrabajo(req, res) {
  const empleadoId = usuarioActual(req);
  const solicitud = trabajoSolicitudes.buscarPorId(req.params.solicitudId);
  if (!solicitud) return res.status(404).json({ error: 'Solicitud de trabajo no encontrada.' });
  if (solicitud.empleadoId !== empleadoId) return res.status(403).json({ error: 'Solo el destinatario puede responder esta solicitud.' });
  if (solicitud.estado !== 'pendiente') return res.status(409).json({ error: 'Esta solicitud de trabajo ya fue respondida.' });

  const accion = String((req.body && req.body.accion) || '').toLowerCase();
  if (accion !== 'aceptar' && accion !== 'rechazar') return res.status(400).json({ error: 'Acción de solicitud no válida.' });

  solicitud.estado = accion === 'aceptar' ? 'aceptado' : 'rechazado';
  let turno = null;
  if (accion === 'aceptar') {
    const jefe = usuarios.buscarPorId(solicitud.jefeId);
    if (!jefe || !amistades.existe(solicitud.jefeId, empleadoId)) {
      solicitud.estado = 'rechazado';
      await save();
      return res.status(409).json({ error: 'La amistad con el BOSS ya no está disponible.' });
    }
    const lug = trabajo.buscarOCrearLugar(empleadoId, solicitud.lugar);
    turno = {
      id: newId('trn'), empleadoId, lugarId: lug.id, fecha: solicitud.fecha, dia: solicitud.dia || '',
      horaInicio: solicitud.horaInicio, horaFin: solicitud.horaFin, descripcion: solicitud.descripcion || '',
      pagado: false, valor: null, jefeAsignadoId: solicitud.jefeId, puedeVerAgendaJefe: false,
      eliminacionPendiente: false, finalizado: false, finalizadoAt: null
    };
    trabajo.crearTurno(turno);
  }

  await save();
  await auditoria.registrar({ actorId: empleadoId, actorType: 'user', action: accion === 'aceptar' ? 'aceptar_solicitud_trabajo' : 'rechazar_solicitud_trabajo', resource: 'trabajo_solicitud', resourceId: solicitud.id });
  if (accion === 'aceptar') {
    trabajo.broadcast(empleadoId);
    await notificaciones.crearParaUsuario(solicitud.jefeId, 'trabajo_solicitud_aceptada', {
      modoDestino: 'jefe', empleadoId, empleadoUsername: solicitud.empleadoUsername,
      empleadoNombre: (usuarios.buscarPorId(empleadoId) || {}).nombreCompleto || solicitud.empleadoUsername,
      lugar: solicitud.lugar, fechaTrabajo: solicitud.fecha
    });
  } else {
    await notificaciones.crearParaUsuario(solicitud.jefeId, 'trabajo_solicitud_rechazada', {
      modoDestino: 'jefe', empleadoId, empleadoUsername: solicitud.empleadoUsername,
      empleadoNombre: (usuarios.buscarPorId(empleadoId) || {}).nombreCompleto || solicitud.empleadoUsername,
      lugar: solicitud.lugar, fechaTrabajo: solicitud.fecha
    });
  }
  res.json({ ok: true, accion, solicitud, turno });
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
  if (req.body.jefeAsignadoId !== undefined && anteriorJefe !== turno.jefeAsignadoId) {
    await auditoria.registrar({ actorId, actorType: 'user', action: turno.jefeAsignadoId ? 'asignar_boss_trabajo' : 'quitar_boss_trabajo', resource: 'trabajo', resourceId: turno.id });
  }
  if (turno.pagado && !yaEstabaPagado && req.body.actorJefeUsername) await notificaciones.crearParaUsuario(turno.empleadoId, 'trabajo_pagado', { jefeUsername: req.body.actorJefeUsername, lugar: lug ? lug.nombre : '' });
  if (req.body.jefeAsignadoId !== undefined && anteriorJefe !== turno.jefeAsignadoId && turno.jefeAsignadoId && turno.jefeAsignadoId !== turno.empleadoId) {
    const empleado = usuarios.buscarPorId(turno.empleadoId);
    await notificaciones.crearParaUsuario(turno.jefeAsignadoId, 'jefe_asignado_trabajo', { empleadoUsername: empleado ? empleado.username : '', empleadoNombre: empleado ? (empleado.nombreCompleto || empleado.username) : '', lugar: lug ? lug.nombre : '', fechaTrabajo: turno.fecha || '' });
  }
  res.json(turno);
}

async function actualizarPermisoAgenda(req, res) {
  const turno = trabajo.buscarTurnoPorId(req.params.turnoId);
  if (!turno) return res.status(404).json({ error: 'Trabajo no encontrado.' });
  const actorId = usuarioActual(req);
  if (actorId !== turno.empleadoId) return res.status(403).json({ error: 'Solo el empleado propietario puede cambiar este permiso.' });
  if (!turno.jefeAsignadoId) return res.status(400).json({ error: 'Este trabajo no tiene un BOSS asignado.' });
  if (turno.congelado === true) return res.status(409).json({ error: 'Este trabajo está congelado y ya no admite cambios.' });
  if (typeof req.body?.puedeVerAgendaJefe !== 'boolean') return res.status(400).json({ error: 'El permiso de agenda no es válido.' });
  turno.puedeVerAgendaJefe = req.body.puedeVerAgendaJefe;
  await save();
  trabajo.broadcast(turno.empleadoId);
  await auditoria.registrar({ actorId, actorType: 'user', action: turno.puedeVerAgendaJefe ? 'conceder_acceso_agenda_boss' : 'revocar_acceso_agenda_boss', resource: 'trabajo', resourceId: turno.id });
  res.json({ ok: true, turno });
}

async function finalizarTurno(req, res) {
  const turno = trabajo.buscarTurnoPorId(req.params.turnoId);
  if (!turno) return res.status(404).json({ error: 'Trabajo no encontrado.' });
  const actorId = usuarioActual(req);
  const esEmpleado = actorId === turno.empleadoId;
  const esBossAsignado = actorId === turno.jefeAsignadoId;
  if (!esEmpleado && !esBossAsignado) return res.status(403).json({ error: 'Solo el empleado o el BOSS asignado puede finalizar este trabajo.' });
  if (turno.finalizado === true) return res.status(400).json({ error: 'Este trabajo ya está finalizado.' });

  trabajo.marcarFinalizado(turno.id);
  await save();
  trabajo.broadcast(turno.empleadoId);

  const lug = trabajo.buscarLugarPorId(turno.lugarId);
  if (esBossAsignado) {
    const boss = usuarios.buscarPorId(actorId);
    await notificaciones.crearParaUsuario(turno.empleadoId, 'trabajo_finalizado', { modoDestino: 'empleado', jefeUsername: boss ? boss.username : 'Tu BOSS', lugar: lug ? lug.nombre : '' });
  } else if (turno.jefeAsignadoId) {
    const empleado = usuarios.buscarPorId(actorId);
    await notificaciones.crearParaUsuario(turno.jefeAsignadoId, 'trabajo_finalizado_boss', { modoDestino: 'jefe', empleadoUsername: empleado ? empleado.username : '', empleadoNombre: empleado ? (empleado.nombreCompleto || empleado.username) : '', lugar: lug ? lug.nombre : '' });
  }
  res.json({ turno });
}

async function eliminarTurno(req, res) {
  const turno = trabajo.buscarTurnoPorId(req.params.turnoId);
  if (!turno) return res.status(404).json({ error: 'Trabajo no encontrado.' });
  const actorId = usuarioActual(req);
  const lug = trabajo.buscarLugarPorId(turno.lugarId);
  const esEmpleado = actorId === turno.empleadoId;
  const esBossAsignado = actorId === turno.jefeAsignadoId;

  if (!esEmpleado && !esBossAsignado) return res.status(403).json({ error: 'No tienes acceso a este trabajo.' });

  if (esBossAsignado) {
    trabajo.eliminarTurno(turno.id); await save(); trabajo.broadcast(turno.empleadoId);
    await auditoria.registrar({ actorId, actorType: 'user', action: 'eliminar_trabajo_boss', resource: 'trabajo', resourceId: turno.id });
    await notificaciones.crearParaUsuario(turno.empleadoId, 'trabajo_eliminado', { jefeUsername: req.body.actorJefeUsername || 'Tu BOSS', lugar: lug ? lug.nombre : '' });
    return res.json({ eliminado: true });
  }

  if (turno.pagado || !turno.jefeAsignadoId) { trabajo.eliminarTurno(turno.id); await save(); trabajo.broadcast(turno.empleadoId); await auditoria.registrar({ actorId, actorType: 'user', action: 'eliminar_trabajo_empleado', resource: 'trabajo', resourceId: turno.id }); return res.json({ eliminado: true }); }
  turno.eliminacionPendiente = true;
  await save();
  trabajo.broadcast(turno.empleadoId);
  await auditoria.registrar({ actorId, actorType: 'user', action: 'solicitar_eliminacion_trabajo', resource: 'trabajo', resourceId: turno.id });
  await notificaciones.crearParaUsuario(turno.jefeAsignadoId, 'trabajo_eliminacion_solicitada', { empleadoUsername: (usuarios.buscarPorId(turno.empleadoId) || {}).username || '', lugar: lug ? lug.nombre : '', modoDestino: 'jefe' });
  res.json({ eliminado: false, pendiente: true });
}

async function confirmarEliminacion(req, res) {
  const turno = trabajo.buscarTurnoPorId(req.params.turnoId); if (!turno) return res.status(404).json({ error: 'Trabajo no encontrado.' });
  const actorId = usuarioActual(req);
  if (actorId !== turno.jefeAsignadoId) return res.status(403).json({ error: 'Solo el BOSS asignado puede confirmar esta eliminación.' });
  const lug = trabajo.buscarLugarPorId(turno.lugarId); trabajo.eliminarTurno(turno.id); await save(); trabajo.broadcast(turno.empleadoId);
  await auditoria.registrar({ actorId, actorType: 'user', action: 'confirmar_eliminacion_trabajo', resource: 'trabajo', resourceId: turno.id });
  await notificaciones.crearParaUsuario(turno.empleadoId, 'trabajo_eliminado', { jefeUsername: req.body.jefeUsername || 'Tu BOSS', lugar: lug ? lug.nombre : '' }); res.json({ eliminado: true });
}

async function rechazarEliminacion(req, res) {
  const turno = trabajo.buscarTurnoPorId(req.params.turnoId); if (!turno) return res.status(404).json({ error: 'Trabajo no encontrado.' });
  const actorId = usuarioActual(req);
  if (actorId !== turno.jefeAsignadoId) return res.status(403).json({ error: 'Solo el BOSS asignado puede rechazar esta eliminación.' });
  turno.eliminacionPendiente = false; await save(); trabajo.broadcast(turno.empleadoId); await auditoria.registrar({ actorId, actorType: 'user', action: 'rechazar_eliminacion_trabajo', resource: 'trabajo', resourceId: turno.id }); await notificaciones.crearParaUsuario(turno.empleadoId, 'trabajo_eliminacion_rechazada', { jefeUsername: req.body.jefeUsername || 'Tu BOSS' }); res.json({ eliminado: false });
}

module.exports = { obtenerSnapshot, obtenerMisJefes, obtenerTrabajosComoJefe, crearTurno, crearSolicitudTrabajo, responderSolicitudTrabajo, actualizarTurno, actualizarPermisoAgenda, finalizarTurno, eliminarTurno, confirmarEliminacion, rechazarEliminacion };