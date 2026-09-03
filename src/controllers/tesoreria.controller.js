const { db, save } = require('../config/db');
const tesoreria = require('../models/tesoreria.model');
const amistades = require('../models/amistades.model');
const usuarios = require('../models/usuarios.model');
const notificaciones = require('../models/notificaciones.model');
const { newId } = require('../utils/utils');

function usuarioActual(req) {
  return req.userId || (req.session && req.session.userId) || null;
}

function esJefe(user) {
  return user && (user.modoActual || user.role) === 'jefe';
}

function publicSolicitud(s) {
  return {
    id: s.id,
    jefeId: s.jefeId,
    jefeUsername: s.jefeUsername,
    jefeNombre: s.jefeNombre,
    tesoreroId: s.tesoreroId,
    tesoreroUsername: s.tesoreroUsername,
    tesoreroNombre: s.tesoreroNombre,
    fechaCreacion: s.fechaCreacion,
    estado: s.estado
  };
}

function publicRelacion(t) {
  return {
    id: t.id,
    jefeId: t.jefeId,
    jefeUsername: t.jefeUsername,
    jefeNombre: t.jefeNombre,
    tesoreroId: t.tesoreroId,
    tesoreroUsername: t.tesoreroUsername,
    tesoreroNombre: t.tesoreroNombre,
    saldo: Number(t.saldo) || 0,
    estado: t.estado,
    fechaCreacion: t.fechaCreacion,
    fechaAceptacion: t.fechaAceptacion
  };
}

async function listarMisTesoreros(req, res) {
  const jefeId = usuarioActual(req);
  if (jefeId !== req.params.jefeId) return res.status(403).json({ error: 'No puedes consultar la tesorería de otro BOSS.' });
  const jefe = usuarios.buscarPorId(jefeId);
  if (!esJefe(jefe)) return res.status(403).json({ error: 'Esta acción solo está disponible en modo BOSS.' });
  res.json({ tesoreros: tesoreria.tesorerosDeJefe(jefeId).map(publicRelacion) });
}

async function crearSolicitudTesorero(req, res) {
  const jefeId = usuarioActual(req);
  if (jefeId !== req.params.jefeId) return res.status(403).json({ error: 'La identidad del BOSS no coincide con la sesión.' });
  const jefe = usuarios.buscarPorId(jefeId);
  if (!esJefe(jefe)) return res.status(403).json({ error: 'Esta acción solo está disponible en modo BOSS.' });

  const tesoreroId = String((req.body && req.body.tesoreroId) || '').trim();
  if (!tesoreroId) return res.status(400).json({ error: 'Falta seleccionar el tesorero.' });
  if (tesoreroId === jefeId) return res.status(400).json({ error: 'No puedes ser tu propio tesorero.' });
  if (!amistades.existe(jefeId, tesoreroId)) return res.status(403).json({ error: 'Solo puedes solicitar como tesorero a una de tus amistades.' });

  const candidato = usuarios.buscarPorId(tesoreroId);
  if (!candidato) return res.status(404).json({ error: 'La amistad seleccionada ya no existe.' });
  if (tesoreria.relacionActiva(jefeId, tesoreroId)) return res.status(409).json({ error: 'Esta persona ya es tu tesorero.' });
  if (tesoreria.solicitudPendienteEntre(jefeId, tesoreroId)) return res.status(409).json({ error: 'Ya existe una solicitud de tesorero pendiente.' });

  const solicitud = tesoreria.crearSolicitud({
    id: newId('tsr'),
    jefeId,
    jefeUsername: jefe.username,
    jefeNombre: jefe.nombreCompleto || jefe.username,
    tesoreroId,
    tesoreroUsername: candidato.username,
    tesoreroNombre: candidato.nombreCompleto || candidato.username
  });
  await save();
  await notificaciones.crearParaUsuario(tesoreroId, 'tesorero_solicitud', {
    modoDestino: 'empleado',
    tesoreriaSolicitudId: solicitud.id,
    jefeId,
    jefeUsername: jefe.username,
    jefeNombre: jefe.nombreCompleto || jefe.username,
    mensaje: `${jefe.nombreCompleto || jefe.username} te ha enviado una solicitud para ser su tesorero.`
  });
  res.json({ ok: true, solicitud: publicSolicitud(solicitud) });
}

async function listarSolicitudesRecibidas(req, res) {
  const tesoreroId = usuarioActual(req);
  if (tesoreroId !== req.params.tesoreroId) return res.status(403).json({ error: 'No puedes consultar solicitudes de otra cuenta.' });
  res.json({ solicitudes: tesoreria.solicitudesRecibidas(tesoreroId).map(publicSolicitud) });
}

async function responderSolicitudTesorero(req, res) {
  const tesoreroId = usuarioActual(req);
  const solicitud = tesoreria.buscarSolicitud(req.params.solicitudId);
  if (!solicitud) return res.status(404).json({ error: 'Solicitud de tesorero no encontrada.' });
  if (solicitud.tesoreroId !== tesoreroId) return res.status(403).json({ error: 'Solo el destinatario puede responder esta solicitud.' });
  if (solicitud.estado !== 'pendiente') return res.status(409).json({ error: 'Esta solicitud ya fue respondida.' });

  const accion = String((req.body && req.body.accion) || '').toLowerCase();
  if (!['aceptar', 'rechazar'].includes(accion)) return res.status(400).json({ error: 'Acción de solicitud no válida.' });

  const jefe = usuarios.buscarPorId(solicitud.jefeId);
  const tesorero = usuarios.buscarPorId(tesoreroId);
  if (!jefe || !tesorero) return res.status(404).json({ error: 'Una de las cuentas ya no existe.' });
  if (!amistades.existe(solicitud.jefeId, tesoreroId)) return res.status(409).json({ error: 'La amistad con el BOSS ya no está disponible.' });

  solicitud.estado = accion === 'aceptar' ? 'aceptado' : 'rechazado';
  let relacion = null;
  if (accion === 'aceptar') {
    relacion = tesoreria.relacionActiva(solicitud.jefeId, tesoreroId) || tesoreria.crearRelacion({
      id: newId('tes'),
      jefeId: solicitud.jefeId,
      jefeUsername: jefe.username,
      jefeNombre: jefe.nombreCompleto || jefe.username,
      tesoreroId,
      tesoreroUsername: tesorero.username,
      tesoreroNombre: tesorero.nombreCompleto || tesorero.username
    });
  }
  await save();

  await notificaciones.crearParaUsuario(solicitud.jefeId, accion === 'aceptar' ? 'tesorero_solicitud_aceptada' : 'tesorero_solicitud_rechazada', {
    modoDestino: 'jefe',
    tesoreriaSolicitudId: solicitud.id,
    tesoreroId,
    tesoreroUsername: tesorero.username,
    tesoreroNombre: tesorero.nombreCompleto || tesorero.username
  });
  res.json({ ok: true, accion, relacion: relacion ? publicRelacion(relacion) : null });
}

async function listarMisRelaciones(req, res) {
  const tesoreroId = usuarioActual(req);
  if (tesoreroId !== req.params.tesoreroId) return res.status(403).json({ error: 'No puedes consultar las relaciones de otra cuenta.' });
  res.json({ relaciones: tesoreria.relacionesDeTesorero(tesoreroId).map(publicRelacion) });
}

module.exports = {
  listarMisTesoreros,
  crearSolicitudTesorero,
  listarSolicitudesRecibidas,
  responderSolicitudTesorero,
  listarMisRelaciones
};
