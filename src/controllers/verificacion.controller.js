const { db, save } = require('../config/db');
const { getIO } = require('../realtime/io');
const usuarios = require('../models/usuarios.model');
const verificacion = require('../models/verificacion.model');
const trabajo = require('../models/trabajo.model');
const estudio = require('../models/estudio.model');
const evento = require('../models/evento.model');
const notificaciones = require('../models/notificaciones.model');
const auditoria = require('../models/auditoria.model');
const { newId } = require('../utils/utils');

function usuarioActual(req) { return req.userId || (req.session && req.session.userId) || null; }

async function obtenerCodigo(req, res) { return res.status(410).json({ error: 'El antiguo código de compartir fue desactivado. Usa Amistades.' }); }
async function enviarSolicitud(req, res) { return res.status(410).json({ error: 'La verificación antigua fue desactivada. Usa Amistades.' }); }

async function listarNotificaciones(req, res) {
  if (usuarioActual(req) !== req.params.empleadoId) return res.status(403).json({ error: 'No puedes consultar las notificaciones de otra cuenta.' });
  res.json(notificaciones.listaCompleta(req.params.empleadoId));
}

async function marcarLeidas(req, res) {
  if (usuarioActual(req) !== req.params.empleadoId) return res.status(403).json({ error: 'No puedes modificar las notificaciones de otra cuenta.' });
  const modo = req.body && (req.body.modo === 'jefe' || req.body.modo === 'empleado') ? req.body.modo : null;
  notificaciones.marcarLeidas(req.params.empleadoId, modo); await save(); res.json({ ok: true });
}

async function solicitudesPendientes(req, res) {
  if (usuarioActual(req) !== req.params.empleadoId) return res.status(403).json({ error: 'No puedes consultar solicitudes de otra cuenta.' });
  res.json(verificacion.solicitudesPendientes(req.params.empleadoId));
}

async function responderSolicitud(req, res) {
  const solicitud = verificacion.buscarSolicitud(req.params.id);
  if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada.' });
  if (usuarioActual(req) !== solicitud.empleadoId) return res.status(403).json({ error: 'Solo el empleado destinatario puede responder esta solicitud.' });
  if (solicitud.estado !== 'pendiente') return res.status(409).json({ error: 'Esta solicitud ya fue respondida.' });
  const { accion } = req.body || {};
  if (accion !== 'aceptar' && accion !== 'rechazar') return res.status(400).json({ error: 'Acción de solicitud no válida.' });
  solicitud.estado = accion === 'aceptar' ? 'aceptado' : 'rechazado';
  let link = null;
  if (solicitud.estado === 'aceptado') {
    const empleado = usuarios.buscarPorId(solicitud.empleadoId);
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado.' });
    link = verificacion.crearOActualizarLink({ id: newId('lnk'), jefeId: solicitud.jefeId, jefeUsername: solicitud.jefeUsername, empleadoId: solicitud.empleadoId, empleadoUsername: empleado.username, fecha: Date.now(), puedeVerAgenda: false });
  }
  await save();
  await auditoria.registrar({ actorId: solicitud.empleadoId, actorType: 'user', action: accion === 'aceptar' ? 'aceptar_vinculo_boss' : 'rechazar_vinculo_boss', resource: 'vinculo_boss', resourceId: solicitud.jefeId });
  getIO().to('jefe-' + solicitud.jefeId).emit('join:result', { solicitud, link });
  if (solicitud.estado === 'aceptado') await notificaciones.crearParaUsuario(solicitud.empleadoId, 'jefe_configurado', { jefeUsername: solicitud.jefeUsername });
  else getIO().to('emp-' + solicitud.empleadoId).emit('notificaciones:update');
  res.json({ solicitud, link });
}

async function historial(req, res) {
  if (usuarioActual(req) !== req.params.jefeId) return res.status(403).json({ error: 'No puedes consultar el historial de otro BOSS.' });
  res.json(verificacion.historialDe(req.params.jefeId));
}

async function actualizarPermisoAgendaGeneral(req, res) {
  const empleadoId = usuarioActual(req);
  const jefeId = String(req.params.jefeId || '');
  if (!jefeId || jefeId === empleadoId) return res.status(400).json({ error: 'El BOSS seleccionado no es válido.' });
  let link = verificacion.buscarLink(jefeId, empleadoId);
  if (!link && trabajo.tieneTrabajoAsignado(jefeId, empleadoId)) {
    const jefe = usuarios.buscarPorId(jefeId);
    if (!jefe) return res.status(404).json({ error: 'El BOSS seleccionado ya no existe.' });
    const empleado = usuarios.buscarPorId(empleadoId);
    link = verificacion.crearOActualizarLink({ id: newId('lnk'), jefeId, jefeUsername: jefe.username, empleadoId, empleadoUsername: empleado ? empleado.username : '', fecha: Date.now(), puedeVerAgenda: false });
  }
  if (!link) return res.status(403).json({ error: 'Solo puedes cambiar el permiso de un BOSS vinculado contigo.' });
  if (typeof req.body?.puedeVerAgenda !== 'boolean') return res.status(400).json({ error: 'El permiso de agenda no es válido.' });
  link.puedeVerAgenda = req.body.puedeVerAgenda;
  await save();
  await auditoria.registrar({ actorId: empleadoId, actorType: 'user', action: link.puedeVerAgenda ? 'conceder_acceso_agenda_boss' : 'revocar_acceso_agenda_boss', resource: 'vinculo_boss', resourceId: jefeId });
  getIO().to('jefe-' + jefeId).emit('notificaciones:update');
  res.json({ ok: true, puedeVerAgenda: link.puedeVerAgenda });
}

async function datosEmpleado(req, res) {
  const jefeId = String(req.query.jefeId || '');
  const actorId = usuarioActual(req);
  if (jefeId !== actorId) return res.status(403).json({ error: 'La identidad del BOSS no coincide con la sesión.' });
  const empleadoId = req.params.empleadoId;
  if (!verificacion.tieneAcceso(jefeId, empleadoId) && !trabajo.tieneTrabajoAsignado(jefeId, empleadoId)) return res.status(403).json({ error: 'No tienes acceso a este trabajo.' });
  const empleado = usuarios.buscarPorId(empleadoId);
  const link = verificacion.buscarLink(jefeId, empleadoId);
  res.json({ empleadoUsername: empleado ? empleado.username : (link && link.empleadoUsername), esEstudiante: empleado ? (empleado.esEstudiante === undefined ? null : empleado.esEstudiante) : null, puedeVerAgenda: verificacion.puedeVerAgenda(jefeId, empleadoId), ...trabajo.snapshot(empleadoId) });
}

function validarAccesoAgenda(req) {
  const jefeId = String(req.query.jefeId || '');
  const actorId = usuarioActual(req);
  const empleadoId = req.params.empleadoId;
  if (jefeId !== actorId) return { ok: false, status: 403, error: 'La identidad del BOSS no coincide con la sesión.' };
  if (!verificacion.tieneAcceso(jefeId, empleadoId) && !trabajo.tieneTrabajoAsignado(jefeId, empleadoId)) return { ok: false, status: 403, error: 'No tienes acceso a este empleado.' };
  if (!verificacion.puedeVerAgenda(jefeId, empleadoId)) return { ok: false, status: 403, error: 'El empleado no ha permitido que veas sus Académicos y Eventos.' };
  return { ok: true, jefeId, empleadoId };
}

async function estudioEmpleado(req, res) {
  const acceso = validarAccesoAgenda(req);
  if (!acceso.ok) return res.status(acceso.status).json({ error: acceso.error });
  res.json({ materias: estudio.materiasDe(acceso.empleadoId), actividades: estudio.actividadesDe(acceso.empleadoId) });
}

async function eventoEmpleado(req, res) {
  const acceso = validarAccesoAgenda(req);
  if (!acceso.ok) return res.status(acceso.status).json({ error: acceso.error });
  res.json(evento.eventosDe(acceso.empleadoId));
}

module.exports = { obtenerCodigo, enviarSolicitud, listarNotificaciones, marcarLeidas, solicitudesPendientes, responderSolicitud, historial, actualizarPermisoAgendaGeneral, datosEmpleado, estudioEmpleado, eventoEmpleado };