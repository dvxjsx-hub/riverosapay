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

function eliminarDeUsuario(userId) {
  db.amistades = db.amistades.filter(a => a.usuarioId !== userId && a.amistadId !== userId);
}

module.exports = { amistadesDe, existe, existeEntre, agregar, eliminarDeUsuario };
