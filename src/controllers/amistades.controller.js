const { db, save } = require('../config/db');
const usuarios = require('../models/usuarios.model');
const amistades = require('../models/amistades.model');
const notificaciones = require('../models/notificaciones.model');
const auditoria = require('../models/auditoria.model');
const { newFriendCode } = require('../utils/utils');

function asegurarCodigoAmistad(user) {
  if (!user.codigoAmistad) user.codigoAmistad = newFriendCode(db);
  return user.codigoAmistad;
}

function publicSolicitud(s) {
  return { id: s.id, emisorId: s.emisorId, emisorUsername: s.emisorUsername, receptorId: s.receptorId, receptorUsername: s.receptorUsername, fecha: s.fecha, estado: s.estado };
}

async function listar(req, res) {
  const actorId = req.userId;
  if (actorId !== req.params.userId) return res.status(403).json({ error: 'No puedes consultar las amistades de otra cuenta.' });
  const user = usuarios.buscarPorId(actorId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  asegurarCodigoAmistad(user);
  const lista = amistades.amistadesDe(user.id).map(a => {
    const amigo = usuarios.buscarPorId(a.amistadId);
    return { id: a.amistadId, username: a.amistadUsername, nombreCompleto: amigo ? (amigo.nombreCompleto || null) : null, verificada: amigo ? amigo.verificada === true : false, fecha: a.fecha };
  });
  const solicitudes = amistades.solicitudesRecibidas(user.id).map(publicSolicitud);
  await save();
  res.json({ codigoAmistad: user.codigoAmistad, amistades: lista, solicitudes });
}

async function agregar(req, res) {
  const actorId = req.userId;
  const usuario = usuarios.buscarPorId(actorId);
  const codigo = String((req.body && req.body.codigo) || '').trim();
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });
  if (!/^\d{8}$/.test(codigo)) return res.status(400).json({ error: 'El código de amistad debe tener 8 dígitos.' });
  asegurarCodigoAmistad(usuario);
  const amigo = db.users.find(u => u.codigoAmistad === codigo);
  if (!amigo) return res.status(404).json({ error: 'Código de amistad no encontrado.' });
  if (amigo.id === usuario.id) return res.status(400).json({ error: 'No puedes agregarte a ti mismo.' });
  if (amistades.existeEntre(usuario.id, amigo.id)) return res.status(409).json({ error: 'Esta persona ya está en tus amistades.' });
  if (amistades.solicitudPendienteEntre(usuario.id, amigo.id)) return res.status(409).json({ error: 'Ya existe una solicitud de amistad pendiente entre ustedes.' });

  const solicitud = amistades.crearSolicitud(usuario.id, usuario.username, amigo.id, amigo.username);
  await save();
  await auditoria.registrar({ actorId: usuario.id, actorType: 'user', action: 'enviar_solicitud_amistad', resource: 'amistad_solicitud', resourceId: solicitud.id });
  await notificaciones.crearParaUsuario(amigo.id, 'amistad_solicitud', {
    modoDestino: amigo.modoActual === 'jefe' ? 'jefe' : 'empleado', solicitudId: solicitud.id,
    solicitanteId: usuario.id, solicitanteUsername: usuario.username, solicitanteNombre: usuario.nombreCompleto || null
  });
  res.json({ ok: true, solicitud: publicSolicitud(solicitud) });
}

async function responder(req, res) {
  const actorId = req.userId;
  const accion = String((req.body && req.body.accion) || '').toLowerCase();
  if (!['aceptar', 'rechazar'].includes(accion)) return res.status(400).json({ error: 'Acción no válida.' });
  const solicitud = amistades.buscarSolicitud(req.params.solicitudId);
  if (!solicitud || solicitud.estado !== 'pendiente') return res.status(404).json({ error: 'La solicitud ya no está disponible.' });
  if (solicitud.receptorId !== actorId) return res.status(403).json({ error: 'No puedes responder esta solicitud.' });
  const receptor = usuarios.buscarPorId(solicitud.receptorId);
  const emisor = usuarios.buscarPorId(solicitud.emisorId);
  if (!receptor || !emisor) return res.status(404).json({ error: 'Una de las cuentas ya no existe.' });

  if (accion === 'aceptar') {
    amistades.agregar(emisor.id, receptor.id, receptor.username);
    amistades.agregar(receptor.id, emisor.id, emisor.username);
  }
  const tipo = accion === 'aceptar' ? 'amistad_aceptada' : 'amistad_rechazada';
  amistades.eliminarSolicitud(solicitud.id);
  notificaciones.eliminarSolicitudAmistad(actorId, solicitud.id);
  await save();
  await auditoria.registrar({ actorId, actorType: 'user', action: accion === 'aceptar' ? 'aceptar_solicitud_amistad' : 'rechazar_solicitud_amistad', resource: 'amistad_solicitud', resourceId: solicitud.id });
  await notificaciones.crearParaUsuario(emisor.id, tipo, {
    modoDestino: emisor.modoActual === 'jefe' ? 'jefe' : 'empleado', solicitudId: solicitud.id,
    amigoId: receptor.id, amigoUsername: receptor.username, amigoNombre: receptor.nombreCompleto || null
  });
  res.json({ ok: true, accion, amistad: accion === 'aceptar' ? { id: receptor.id, username: receptor.username, nombreCompleto: receptor.nombreCompleto || null, fecha: Date.now() } : null });
}

async function eliminar(req, res) {
  const actorId = req.userId;
  const amistadId = String((req.body && req.body.amistadId) || '').trim();
  if (!amistadId) return res.status(400).json({ error: 'Falta la amistad a eliminar.' });
  if (actorId === amistadId) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo.' });
  if (!amistades.existe(actorId, amistadId)) return res.status(404).json({ error: 'Esta persona no está en tus amistades.' });
  const usuario = usuarios.buscarPorId(actorId);
  const amigo = usuarios.buscarPorId(amistadId);
  amistades.eliminarEntre(actorId, amistadId);
  await save();
  await auditoria.registrar({ actorId, actorType: 'user', action: 'eliminar_amistad', resource: 'amistad', resourceId: amistadId });
  if (amigo && usuario) await notificaciones.crearParaUsuario(amigo.id, 'amistad_eliminada', {
    modoDestino: amigo.modoActual === 'jefe' ? 'jefe' : 'empleado', amigoId: usuario.id,
    amigoUsername: usuario.username, amigoNombre: usuario.nombreCompleto || null
  });
  res.json({ ok: true });
}

module.exports = { listar, agregar, responder, eliminar };