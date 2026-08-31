const { db } = require('../config/db');

// verifica que jefeId tenga un link aceptado con empleadoId
function tieneAcceso(jefeId, empleadoId) {
  return db.links.some(l => l.jefeId === jefeId && l.empleadoId === empleadoId);
}

function crearSolicitud(solicitud) {
  db.joinRequests.push(solicitud);
}

function buscarSolicitud(id) {
  return db.joinRequests.find(r => r.id === id);
}

function solicitudesPendientes(empleadoId) {
  return db.joinRequests.filter(r => r.empleadoId === empleadoId && r.estado === 'pendiente');
}

function solicitudesNoAceptadas(empleadoId) {
  return db.joinRequests.filter(r => r.empleadoId === empleadoId && r.estado !== 'aceptado');
}

function buscarLink(jefeId, empleadoId) {
  return db.links.find(l => l.jefeId === jefeId && l.empleadoId === empleadoId);
}

function crearOActualizarLink(link) {
  const existente = buscarLink(link.jefeId, link.empleadoId);
  if (!existente) {
    db.links.push(link);
    return link;
  }
  existente.fecha = Date.now();
  return existente;
}

function historialDe(jefeId) {
  return db.links.filter(l => l.jefeId === jefeId).sort((a, b) => b.fecha - a.fecha);
}

module.exports = {
  tieneAcceso,
  crearSolicitud, buscarSolicitud, solicitudesPendientes, solicitudesNoAceptadas,
  buscarLink, crearOActualizarLink, historialDe
};
