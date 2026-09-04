const { db } = require('../config/db');

function listarPorJefe(jefeId) {
  return db.trabajadoresPersonal
    .filter(t => t.jefeId === jefeId)
    .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
}

function buscarPorId(id) {
  return db.trabajadoresPersonal.find(t => t.id === id) || null;
}

function crear(trabajador) {
  db.trabajadoresPersonal.push(trabajador);
  return trabajador;
}

function perteneceAJefe(id, jefeId) {
  const trabajador = buscarPorId(id);
  return Boolean(trabajador && trabajador.jefeId === jefeId);
}

module.exports = { listarPorJefe, buscarPorId, crear, perteneceAJefe };
