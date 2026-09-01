const { db, save } = require('../config/db');
const { getIO } = require('../realtime/io');
const usuarios = require('../models/usuarios.model');
const verificacion = require('../models/verificacion.model');
const trabajo = require('../models/trabajo.model');
const estudio = require('../models/estudio.model');
const evento = require('../models/evento.model');
const notificaciones = require('../models/notificaciones.model');
const { newId } = require('../utils/utils');

async function obtenerCodigo(req, res) {
  const user = usuarios.buscarPorId(req.params.empleadoId);
  if (!user || user.role !== 'empleado') return res.status(404).json({ error: 'No disponible.' });
  res.json({ code: user.shareCode });
}

async function enviarSolicitud(req, res) {
  const { jefeId, jefeUsername, code } = req.body || {};
  const empleado = db.users.find(u => u.role === 'empleado' && u.shareCode === String(code || '').trim());
  if (!empleado) return res.status(404).json({ error: 'Código no encontrado.' });
  if (empleado.id === jefeId) return res.status(400).json({ error: 'No puedes verificarte a ti mismo.' });
  const solicitud = { id: newId('req'), jefeId, jefeUsername, empleadoId: empleado.id, estado: 'pendiente', fecha: Date.now() };
  verificacion.crearSolicitud(solicitud); await save();
  getIO().to('emp-' + empleado.id).emit('join:request', solicitud);
  res.json({ ok: true, solicitudId: solicitud.id });
}

async function listarNotificaciones(req, res) { res.json(notificaciones.listaCompleta(req.params.empleadoId)); }
async function marcarLeidas(req, res) { notificaciones.marcarLeidas(req.params.empleadoId); await save(); res.json({ ok: true }); }
async function solicitudesPendientes(req, res) { res.json(verificacion.solicitudesPendientes(req.params.empleadoId)); }

async function responderSolicitud(req, res) {
  const solicitud = verificacion.buscarSolicitud(req.params.id);
  if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada.' });
  const { accion } = req.body || {};
  solicitud.estado = accion === 'aceptar' ? 'aceptado' : 'rechazado';
  let link = null;
  if (solicitud.estado === 'aceptado') {
    const empleado = usuarios.buscarPorId(solicitud.empleadoId);
    link = verificacion.crearOActualizarLink({ id: newId('lnk'), jefeId: solicitud.jefeId, jefeUsername: solicitud.jefeUsername, empleadoId: solicitud.empleadoId, empleadoUsername: empleado.username, fecha: Date.now() });
  }
  await save();
  getIO().to('jefe-' + solicitud.jefeId).emit('join:result', { solicitud, link });
  if (solicitud.estado === 'aceptado') await notificaciones.crearParaUsuario(solicitud.empleadoId, 'jefe_configurado', { jefeUsername: solicitud.jefeUsername });
  else getIO().to('emp-' + solicitud.empleadoId).emit('notificaciones:update');
  res.json({ solicitud, link });
}

async function historial(req, res) { res.json(verificacion.historialDe(req.params.jefeId)); }

async function datosEmpleado(req, res) {
  const jefeId = req.query.jefeId;
  if (!verificacion.tieneAcceso(jefeId, req.params.empleadoId) && !trabajo.tieneTrabajoAsignado(jefeId, req.params.empleadoId)) return res.status(403).json({ error: 'No tienes acceso a este trabajo.' });
  const empleado = usuarios.buscarPorId(req.params.empleadoId);
  const link = verificacion.buscarLink(jefeId, req.params.empleadoId);
  res.json({ empleadoUsername: empleado ? empleado.username : (link && link.empleadoUsername), esEstudiante: empleado ? (empleado.esEstudiante === undefined ? null : empleado.esEstudiante) : null, ...trabajo.snapshot(req.params.empleadoId) });
}

async function estudioEmpleado(req, res) {
  const jefeId = req.query.jefeId;
  if (!verificacion.tieneAcceso(jefeId, req.params.empleadoId)) return res.status(403).json({ error: 'No tienes acceso verificado a este empleado.' });
  res.json({ materias: estudio.materiasDe(req.params.empleadoId), actividades: estudio.actividadesDe(req.params.empleadoId) });
}

async function eventoEmpleado(req, res) {
  const jefeId = req.query.jefeId;
  if (!verificacion.tieneAcceso(jefeId, req.params.empleadoId)) return res.status(403).json({ error: 'No tienes acceso verificado a este empleado.' });
  res.json(evento.eventosDe(req.params.empleadoId));
}

module.exports = { obtenerCodigo, enviarSolicitud, listarNotificaciones, marcarLeidas, solicitudesPendientes, responderSolicitud, historial, datosEmpleado, estudioEmpleado, eventoEmpleado };
