const { db, save } = require('../config/db');
const { getIO } = require('../realtime/io');
const usuarios = require('../models/usuarios.model');
const verificacion = require('../models/verificacion.model');
const trabajo = require('../models/trabajo.model');
const estudio = require('../models/estudio.model');
const evento = require('../models/evento.model');
const notificaciones = require('../models/notificaciones.model');
const { newId } = require('../utils/utils');

// Flujo antiguo de compartir mediante shareCode desactivado.
async function obtenerCodigo(req, res) {
  return res.status(410).json({ error: 'El antiguo código de compartir fue desactivado. Usa Amistades.' });
}

// Flujo antiguo de verificación directa desactivado; la relación nueva se hace mediante Amistades + asignación BOSS.
async function enviarSolicitud(req, res) {
  return res.status(410).json({ error: 'La verificación antigua fue desactivada. Usa Amistades.' });
}

async function listarNotificaciones(req, res) { res.json(notificaciones.listaCompleta(req.params.empleadoId)); }
async function marcarLeidas(req, res) {
  const modo = req.body && (req.body.modo === 'jefe' || req.body.modo === 'empleado') ? req.body.modo : null;
  notificaciones.marcarLeidas(req.params.empleadoId, modo);
  await save();
  res.json({ ok: true });
}
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

// Hasta que exista una opción explícita del empleado, Estudio y Evento no se exponen al BOSS.
// Esto evita que el antiguo vínculo de verificación desbloquee acceso antes de que el empleado lo autorice.
async function estudioEmpleado(req, res) {
  return res.status(403).json({ error: 'El acceso BOSS a Estudio todavía no está habilitado por el empleado.' });
}

async function eventoEmpleado(req, res) {
  return res.status(403).json({ error: 'El acceso BOSS a Evento todavía no está habilitado por el empleado.' });
}

module.exports = { obtenerCodigo, enviarSolicitud, listarNotificaciones, marcarLeidas, solicitudesPendientes, responderSolicitud, historial, datosEmpleado, estudioEmpleado, eventoEmpleado };
