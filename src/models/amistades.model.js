const { db } = require('../config/db');

function amistadesDe(userId) {
  return db.amistades.filter(a => a.usuarioId === userId)
    .sort((a, b) => (b.fecha || 0) - (a.fecha || 0));
}

function existe(usuarioId, amistadId) {
  return db.amistades.some(a => a.usuarioId === usuarioId && a.amistadId === amistadId);
}

function existeEntre(a, b) {
  return existe(a, b) || existe(b, a);
}

function agregar(usuarioId, amistadId, amistadUsername) {
  if (existe(usuarioId, amistadId)) return db.amistades.find(a => a.usuarioId === usuarioId && a.amistadId === amistadId);
  const amistad = { id: `am_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, usuarioId, amistadId, amistadUsername, fecha: Date.now() };
  db.amistades.push(amistad);
  return amistad;
}

function eliminar(usuarioId, amistadId) {
  const antes = db.amistades.length;
  db.amistades = db.amistades.filter(a => !(a.usuarioId === usuarioId && a.amistadId === amistadId));
  return db.amistades.length !== antes;
}

function eliminarEntre(a, b) {
  eliminar(a, b);
  eliminar(b, a);
}

function solicitudPendienteDe(emisorId, receptorId) {
  return db.amistadSolicitudes.find(s => s.emisorId === emisorId && s.receptorId === receptorId && s.estado === 'pendiente');
}

function solicitudPendienteEntre(a, b) {
  return db.amistadSolicitudes.find(s =>
    ((s.emisorId === a && s.receptorId === b) || (s.emisorId === b && s.receptorId === a)) && s.estado === 'pendiente'
  );
}

function crearSolicitud(emisorId, emisorUsername, receptorId, receptorUsername) {
  const solicitud = {
    id: `ars_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    emisorId,
    emisorUsername,
    receptorId,
    receptorUsername,
    fecha: Date.now(),
    estado: 'pendiente'
  };
  db.amistadSolicitudes.push(solicitud);
  return solicitud;
}

function solicitudesRecibidas(userId) {
  return db.amistadSolicitudes.filter(s => s.receptorId === userId && s.estado === 'pendiente')
    .sort((a, b) => b.fecha - a.fecha);
}

function buscarSolicitud(id) {
  return db.amistadSolicitudes.find(s => s.id === id);
}

function eliminarSolicitud(id) {
  db.amistadSolicitudes = db.amistadSolicitudes.filter(s => s.id !== id);
}

function eliminarDeUsuario(userId) {
  db.amistades = db.amistades.filter(a => a.usuarioId !== userId && a.amistadId !== userId);
  db.amistadSolicitudes = db.amistadSolicitudes.filter(s => s.emisorId !== userId && s.receptorId !== userId);
}

module.exports = {
  amistadesDe, existe, existeEntre, agregar, eliminar, eliminarEntre,
  solicitudPendienteDe, solicitudPendienteEntre, crearSolicitud,
  solicitudesRecibidas, buscarSolicitud, eliminarSolicitud, eliminarDeUsuario
};
